import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, desc, and, sql, getTableColumns } from 'drizzle-orm';
import { generateEmbedding } from '@/lib/embeddings';
import { auth } from '@clerk/nextjs/server';
import { verifyAppToken } from '@/lib/auth';

const EXTENSION_TOKEN = process.env.EXTENSION_TOKEN;

// Vector SQL helper
function toSql(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
}

// Extract domain from URL
function extractDomain(url: string): string | null {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return null;
    }
}

// Check if string is a URL
function isUrl(str: string): boolean {
    return str.startsWith('http://') || str.startsWith('https://');
}

// Relevance thresholds - tuned for broader recall with semantic tags
const MIN_SIMILARITY = 0.35;     // Minimum to consider (lowered to allow tag boost to help)
const STRONG_MATCH = 0.42;       // Considered a strong/confident match
const DOMAIN_BOOST = 0.05;       // Boost for matching domains
const TAG_OVERLAP_BOOST = 0.12;  // Max boost for semantic tag overlap (hot/cold matching)

/**
 * Extract topic tags from context text for tag overlap matching
 * Uses simple keyword extraction - quick and good enough for recall
 */
function extractContextTags(context: string): string[] {
    const lower = context.toLowerCase();
    const tags: string[] = [];

    // Tech keywords to detect
    const techTerms = ['react', 'nextjs', 'next.js', 'javascript', 'typescript', 'python',
        'api', 'frontend', 'backend', 'web', 'ai', 'machine learning', 'ml', 'docker',
        'database', 'sql', 'node', 'vue', 'angular', 'css', 'html', 'cloud', 'aws',
        'github', 'git', 'code', 'programming', 'developer', 'software'];

    for (const term of techTerms) {
        if (lower.includes(term)) tags.push(term.replace('.', ''));
    }

    // Domain detection
    if (lower.includes('reddit.com')) tags.push('community', 'discussion');
    if (lower.includes('github.com')) tags.push('code', 'github');
    if (lower.includes('youtube.com')) tags.push('video');
    if (lower.includes('twitter.com') || lower.includes('x.com')) tags.push('social');

    return [...new Set(tags)];
}

/**
 * Calculate overlap ratio between context tags and item tags
 * Returns 0-1 score based on Jaccard-ish similarity
 */
function calculateTagOverlap(contextTags: string[], itemTopics: string | null): number {
    if (!itemTopics || contextTags.length === 0) return 0;

    const itemTags = itemTopics.toLowerCase().split(',').map(t => t.trim()).filter(Boolean);
    if (itemTags.length === 0) return 0;

    // Count matching tags
    let matches = 0;
    for (const contextTag of contextTags) {
        for (const itemTag of itemTags) {
            if (itemTag.includes(contextTag) || contextTag.includes(itemTag)) {
                matches++;
                break; // Avoid double-counting
            }
        }
    }

    // Score: matches / min(contextTags, itemTags) to favor items with relevant tags
    const minTags = Math.min(contextTags.length, itemTags.length);
    return minTags > 0 ? matches / minTags : 0;
}

export async function POST(request: NextRequest) {
    try {
        let userId = 'extension-user';



        // 1. Try Clerk Auth
        const { userId: clerkUserId } = await auth();
        if (clerkUserId) {
            userId = clerkUserId;
        } else {
            // 2. Try App Token (New Desktop Auth)
            const authHeader = request.headers.get('Authorization');
            const token = authHeader?.replace('Bearer ', '');

            if (token) {
                const appUserId = await verifyAppToken(token);
                if (appUserId) {
                    userId = appUserId;
                } else if (EXTENSION_TOKEN && token === EXTENSION_TOKEN) {
                    // 3. Fallback to Extension Token (Legacy)
                    userId = 'extension-user';
                } else {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
                }
            } else {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const body = await request.json();
        const { context, contextType } = body;

        if (!context) {
            return NextResponse.json({ error: 'Context required' }, { status: 400 });
        }

        // Detect if context is a URL
        const contextIsUrl = isUrl(context);
        const contextDomain = contextIsUrl ? extractDomain(context) : null;

        // Generate embedding for semantic matching
        let queryEmbedding: number[] | null = null;
        try {
            queryEmbedding = await generateEmbedding(context);
        } catch (e) {
            console.error('Embedding generation failed:', e);
        }

        const now = new Date();
        let candidates: any[] = [];

        if (queryEmbedding) {
            // Semantic search with scoring
            candidates = await db.select({
                ...getTableColumns(items),
                similarity: sql<number>`1 - (${items.embedding} <=> ${toSql(queryEmbedding)})`,
                daysSinceAccess: sql<number>`EXTRACT(EPOCH FROM (NOW() - COALESCE(${items.lastViewedAt}, ${items.createdAt}))) / 86400`
            })
                .from(items)
                .where(
                    and(
                        eq(items.isArchived, false),
                        eq(items.userId, userId),
                        sql`${items.embedding} IS NOT NULL`,
                        sql`${items.dismissCount} < 50`
                    )
                )
                .orderBy(desc(sql`
                    (1 - (${items.embedding} <=> ${toSql(queryEmbedding)})) * 0.5 +
                    (1.0 / (1.0 + EXTRACT(EPOCH FROM (NOW() - ${items.createdAt})) / 86400 / 7)) * 0.3 +
                    (${items.importanceScore}::float / 10.0) * 0.2 -
                    (${items.dismissCount}::float / 10.0) * 0.1
                `))
                .limit(10);
        }

        // Extract context tags for semantic matching
        const contextTags = extractContextTags(context);

        // Apply domain boost AND tag overlap boost
        if (candidates.length > 0) {
            candidates = candidates.map(item => {
                const itemDomain = item.sourceDomain || (item.contentType === 'url' ? extractDomain(item.content) : null);
                const domainMatch = contextDomain && itemDomain && itemDomain.includes(contextDomain);

                // Calculate tag overlap boost (hot/cold matching)
                const tagOverlap = calculateTagOverlap(contextTags, item.aiTopics);
                const tagBoost = tagOverlap * TAG_OVERLAP_BOOST;

                // Combined boost: domain + tags
                let adjustedSimilarity = item.similarity;
                if (domainMatch) adjustedSimilarity += DOMAIN_BOOST;
                adjustedSimilarity += tagBoost;
                adjustedSimilarity = Math.min(1, adjustedSimilarity); // Cap at 1

                return {
                    ...item,
                    similarity: adjustedSimilarity,
                    domainMatch,
                    tagOverlap: Math.round(tagOverlap * 100) // For debugging
                };
            });
            // Re-sort by boosted similarity
            candidates.sort((a, b) => b.similarity - a.similarity);
        }

        // Filter by minimum similarity threshold
        let filtered = candidates.filter(item => item.similarity >= MIN_SIMILARITY);

        // Only require strong match for URL-only context (no text selection)
        // If user has selected text + URL, semantic matching is more important
        if (contextIsUrl && contextType !== 'combined' && filtered.length > 0) {
            const hasDomainMatch = filtered.some(item => item.domainMatch);
            const hasStrongMatch = filtered.some(item => item.similarity >= STRONG_MATCH);

            // For pure URL context with no domain match, require at least one strong semantic match
            if (!hasDomainMatch && !hasStrongMatch) {
                filtered = [];
            }
        }

        // For any context, require at least one strong match to show results
        if (filtered.length > 0) {
            const hasStrongMatch = filtered.some(item => item.similarity >= STRONG_MATCH);
            if (!hasStrongMatch) {
                filtered = [];
            }
        }

        // DIVERSITY LOGIC: Prioritize variety in top 2
        let finalResults = [];

        if (contextDomain && filtered.length > 0) {
            try {
                // Split into "matches current domain" and "other sources"
                const sameDomain = filtered.filter(item => item.domainMatch);
                const crossDomain = filtered.filter(item => !item.domainMatch);

                if (crossDomain.length > 0 && sameDomain.length > 0) {
                    // We have both! Mix them.
                    // 1. Best overall
                    finalResults.push(filtered[0]);

                    // 2. Best CROSS domain (to show variety)
                    // Ensure we don't duplicate if filtered[0] is already from crossDomain
                    if (finalResults[0] && crossDomain[0] && finalResults[0].id === crossDomain[0].id) {
                        // Top item IS cross-domain. Great. Pick next best overall.
                        if (filtered[1]) finalResults.push(filtered[1]);
                    } else if (crossDomain[0]) {
                        // Top item is SAME domain. Force second slot to be CROSS domain.
                        finalResults.push(crossDomain[0]);
                    }
                } else {
                    // Only have one type, just take top 2
                    finalResults = filtered.slice(0, 2);
                }
            } catch (e) {
                console.error('Diversity logic failed, falling back:', e);
                finalResults = filtered.slice(0, 2);
            }
        } else {
            // No context domain (or text query), just take top 2
            finalResults = filtered.slice(0, 2);
        }

        // Final slice to be safe
        const results = finalResults
            .slice(0, 2)
            .map(item => ({
                id: item.id,
                content: item.content,
                contentType: item.contentType,
                enrichedTitle: item.enrichedTitle,
                enrichedDescription: item.enrichedDescription,
                sourceDomain: item.sourceDomain,
                sourceUrl: item.sourceUrl,
                createdAt: item.createdAt,
                importanceScore: item.importanceScore,
                similarity: Math.round(item.similarity * 100) / 100
            }));

        // Mark items as shown in recall
        for (const result of results) {
            await db.update(items)
                .set({
                    lastRecallShownAt: now,
                    updatedAt: now
                })
                .where(eq(items.id, result.id));
        }

        return NextResponse.json({
            results,
            meta: {
                contextType,
                contextIsUrl,
                contextDomain,
                candidateCount: candidates.length,
                filteredCount: filtered.length,
                returnedCount: results.length
            }
        });

    } catch (error) {
        console.error('Recall failed:', error);
        return NextResponse.json(
            { error: 'Recall failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/recall
 * Track when user dismisses a recall result
 * Body: { itemId, permanent?: boolean }
 */
export async function PUT(request: NextRequest) {
    try {
        const body = await request.json();
        const { itemId, permanent } = body;

        if (!itemId) {
            return NextResponse.json({ error: 'itemId required' }, { status: 400 });
        }

        if (permanent) {
            // "Never show again" - set very high dismiss count
            await db.update(items)
                .set({
                    dismissCount: 100, // Effectively never show
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
        } else {
            // Normal dismiss - increment count
            await db.update(items)
                .set({
                    dismissCount: sql`${items.dismissCount} + 1`,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
        }

        return NextResponse.json({ success: true, permanent });

    } catch (error) {
        console.error('Dismiss tracking failed:', error);
        return NextResponse.json(
            { error: 'Dismiss tracking failed' },
            { status: 500 }
        );
    }
}
