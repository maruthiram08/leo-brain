import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { enrichUrl } from '@/lib/url-enrichment';
import { enrichUrlWithAi } from '@/lib/ai';

/**
 * POST /api/admin/enrich-v2
 * Backfill enrichment for existing URLs using two-tier approach:
 * - Tier 1: Cheerio (fast metadata)
 * - Tier 2: AI (summary + semantic tags) with fallback
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const force = searchParams.get('force') === 'true';
        const tier = searchParams.get('tier') || '2';

        const pendingItems = await db.select()
            .from(items)
            .where(
                force
                    ? eq(items.contentType, 'url')
                    : and(
                        eq(items.contentType, 'url'),
                        or(
                            eq(items.enrichmentStatus, 'pending'),
                            isNull(items.enrichmentStatus)
                        )
                    )
            )
            .limit(limit);

        if (pendingItems.length === 0) {
            return NextResponse.json({ message: 'No pending items to enrich', processed: 0 });
        }

        const results = [];

        for (const item of pendingItems) {
            try {
                // ===== TIER 1: Cheerio =====
                const enrichment = await enrichUrl(item.content);

                await db.update(items)
                    .set({
                        enrichedTitle: enrichment.enrichedTitle,
                        enrichedDescription: enrichment.enrichedDescription,
                        sourceDomain: enrichment.sourceDomain,
                        faviconUrl: enrichment.faviconUrl,
                        enrichmentContentType: enrichment.contentType,
                        enrichmentStatus: enrichment.enrichmentStatus,
                        enrichmentAttemptedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(items.id, item.id));

                let aiResult = null;

                // ===== TIER 2: AI + Fallback =====
                if (tier === '2') {
                    try {
                        const kimiResult = await enrichUrlWithAi(item.content);
                        const hasValidTags = kimiResult.topics.length > 0;

                        if (hasValidTags) {
                            await db.update(items)
                                .set({
                                    aiSummary: kimiResult.description?.slice(0, 200),
                                    aiTopics: kimiResult.topics.join(','),
                                    aiIntent: kimiResult.intent.join(','),
                                    aiDomain: kimiResult.domain,
                                    updatedAt: new Date()
                                })
                                .where(eq(items.id, item.id));
                            aiResult = { topics: kimiResult.topics, source: 'ai' };
                        } else {
                            // Fallback tags
                            const fallback = generateFallbackTags(
                                item.content,
                                enrichment.enrichedTitle,
                                enrichment.enrichedDescription
                            );
                            await db.update(items)
                                .set({
                                    aiTopics: fallback.topics.join(','),
                                    aiIntent: fallback.intent.join(','),
                                    aiDomain: fallback.domain,
                                    updatedAt: new Date()
                                })
                                .where(eq(items.id, item.id));
                            aiResult = { topics: fallback.topics, source: 'fallback' };
                        }
                    } catch (aiError) {
                        console.error('Tier 2 failed:', aiError);
                        const fallback = generateFallbackTags(item.content, enrichment.enrichedTitle, enrichment.enrichedDescription);
                        await db.update(items)
                            .set({
                                aiTopics: fallback.topics.join(','),
                                aiIntent: fallback.intent.join(','),
                                aiDomain: fallback.domain,
                                updatedAt: new Date()
                            })
                            .where(eq(items.id, item.id));
                        aiResult = { topics: fallback.topics, source: 'fallback-error' };
                    }
                }

                results.push({
                    id: item.id,
                    url: item.content.slice(0, 40) + '...',
                    tier1: enrichment.enrichmentStatus,
                    title: enrichment.enrichedTitle?.slice(0, 30),
                    tier2: aiResult
                });

            } catch (error) {
                await db.update(items)
                    .set({ enrichmentStatus: 'failed', enrichmentAttemptedAt: new Date() })
                    .where(eq(items.id, item.id));
                results.push({ id: item.id, status: 'failed', error: error instanceof Error ? error.message : 'Unknown' });
            }
        }

        return NextResponse.json({
            message: `Processed ${results.length} items`,
            processed: results.length,
            duration: Date.now() - startTime,
            results
        });

    } catch (error) {
        return NextResponse.json({ error: 'Enrichment failed' }, { status: 500 });
    }
}

/**
 * Generate semantic tags from content when AI fails
 * Comprehensive keyword extraction for finance, tech, AI, design, etc.
 */
function generateFallbackTags(
    url: string,
    title: string | null,
    description: string | null
): { topics: string[], intent: string[], domain: string } {
    const topics: string[] = [];
    const intent: string[] = [];
    let domain = 'unknown';

    const lower = url.toLowerCase();
    const titleLower = (title || '').toLowerCase();
    const descLower = (description || '').toLowerCase();
    const combined = `${titleLower} ${descLower}`;

    // === COMPREHENSIVE KEYWORD GROUPS ===
    const keywordGroups: Record<string, string[]> = {
        tech: ['react', 'nextjs', 'javascript', 'typescript', 'python', 'node', 'api', 'database',
            'frontend', 'backend', 'web', 'mobile', 'docker', 'kubernetes', 'aws', 'cloud',
            'vue', 'angular', 'svelte', 'tailwind', 'vercel', 'deploy', 'code', 'programming',
            'developer', 'software', 'algorithm', 'data structure', 'rust', 'golang'],

        ai: ['ai', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'chatgpt',
            'claude', 'gemini', 'openai', 'anthropic', 'model', 'training', 'inference', 'agent'],

        finance: ['trading', 'algorithmic', 'hedge fund', 'investment', 'stock', 'crypto', 'bitcoin',
            'finance', 'market', 'investor', 'portfolio', 'quant', 'quantitative', 'forex',
            'options', 'derivatives', 'fintech', 'banking', 'wealth', 'strategy'],

        design: ['design', 'ui', 'ux', 'figma', 'sketch', 'prototype', 'wireframe', 'visual',
            'typography', 'color', 'layout', 'interface', 'user experience'],

        business: ['startup', 'entrepreneur', 'marketing', 'growth', 'product', 'saas', 'b2b',
            'sales', 'revenue', 'strategy', 'leadership', 'management', 'founder']
    };

    // Match keywords and set domain
    for (const [domainName, keywords] of Object.entries(keywordGroups)) {
        for (const keyword of keywords) {
            if (combined.includes(keyword)) {
                topics.push(keyword.replace(/\s+/g, '-'));
                if (domain === 'unknown') domain = domainName;
            }
        }
    }

    // === URL-BASED TOPICS ===
    if (lower.includes('github')) { topics.push('code', 'github'); domain = domain === 'unknown' ? 'tech' : domain; }
    if (lower.includes('youtube')) { topics.push('video'); domain = domain === 'unknown' ? 'entertainment' : domain; }
    if (lower.includes('reddit')) { topics.push('community', 'discussion'); }
    if (lower.includes('twitter') || lower.includes('x.com')) { topics.push('social'); }
    if (lower.includes('medium')) { topics.push('blog', 'article'); domain = domain === 'unknown' ? 'tech' : domain; }

    // === INTENT DETECTION ===
    if (combined.includes('tutorial') || combined.includes('how to') || combined.includes('guide') ||
        combined.includes('learn') || combined.includes('explains') || combined.includes('build')) {
        intent.push('tutorial');
    }
    if (combined.includes('documentation') || combined.includes('docs') || combined.includes('reference')) {
        intent.push('reference');
    }
    if (combined.includes('discussion') || lower.includes('reddit')) {
        intent.push('discussion');
    }
    if (combined.includes('news') || combined.includes('announce')) {
        intent.push('news');
    }
    if (intent.length === 0) intent.push('reference');

    // === EXTRACT MEANINGFUL WORDS FROM TITLE ===
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'will',
        'about', 'their', 'would', 'could', 'should', 'there', 'where', 'which', 'while',
        'being', 'https', 'http', 'www', 'they', 'them', 'these', 'those', 'what', 'when',
        'actually', 'really', 'literally', 'every', 'some', 'just', 'your', 'into', 'work']);

    const words = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && w.length < 15 && !stopWords.has(w));

    for (const word of words.slice(0, 5)) {
        if (!topics.includes(word) && !topics.some(t => t.includes(word))) {
            topics.push(word);
        }
    }

    const uniqueTopics = [...new Set(topics)].slice(0, 8);

    return {
        topics: uniqueTopics.length > 0 ? uniqueTopics : ['general'],
        intent: intent.slice(0, 2),
        domain
    };
}
