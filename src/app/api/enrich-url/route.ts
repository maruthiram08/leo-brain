import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enrichUrl } from '@/lib/url-enrichment';
import { enrichUrlWithKimi } from '@/lib/kimi';

/**
 * POST /api/enrich-url
 * Two-tier URL enrichment:
 * - Tier 1: Cheerio (fast metadata extraction)
 * - Tier 2: AI (summary + semantic tags for recall)
 */
export async function POST(request: NextRequest) {
    try {
        const { itemId, url } = await request.json();

        if (!itemId || !url) {
            return NextResponse.json(
                { error: 'itemId and url are required' },
                { status: 400 }
            );
        }

        // ===== TIER 1: Fast Cheerio Enrichment =====
        const enrichment = await enrichUrl(url);

        // Update with Tier 1 results immediately
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
            .where(eq(items.id, itemId));

        // ===== TIER 2: AI Summary + Semantic Tags (async, non-blocking) =====
        // Fire and forget - don't await, don't block response
        generateAISemanticTags(itemId, url, enrichment.enrichedTitle, enrichment.enrichedDescription).catch(err => {
            console.error('AI semantic tagging failed:', err);
        });

        return NextResponse.json({
            success: true,
            tier1: enrichment.enrichmentStatus,
            message: 'Tier 1 enrichment complete, Tier 2 (AI) running in background'
        });

    } catch (error) {
        console.error('Enrichment failed:', error);
        return NextResponse.json(
            { error: 'Enrichment failed' },
            { status: 500 }
        );
    }
}

/**
 * Tier 2: Generate AI summary and semantic tags using Kimi
 * Falls back to heuristic tag generation if AI returns empty
 */
async function generateAISemanticTags(
    itemId: string,
    url: string,
    title: string | null,
    description: string | null
): Promise<void> {
    try {
        // Try Kimi for AI enrichment with structured tags
        const aiResult = await enrichUrlWithKimi(url);

        // Check if Kimi returned meaningful tags
        const hasValidTags = aiResult.topics.length > 0 || aiResult.intent.length > 0;

        if (hasValidTags) {
            // Use AI-generated tags
            await db.update(items)
                .set({
                    aiSummary: aiResult.description?.slice(0, 200),
                    aiTopics: aiResult.topics.join(','),
                    aiIntent: aiResult.intent.join(','),
                    aiDomain: aiResult.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
            console.log(`Tier 2 AI tags for ${itemId}: topics=${aiResult.topics.join(',')}`);
        } else {
            // Fallback: Generate heuristic tags from title/description/URL
            const fallbackTags = generateFallbackTags(url, title, description);
            await db.update(items)
                .set({
                    aiSummary: description?.slice(0, 200) || null,
                    aiTopics: fallbackTags.topics.join(','),
                    aiIntent: fallbackTags.intent.join(','),
                    aiDomain: fallbackTags.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
            console.log(`Tier 2 fallback tags for ${itemId}: topics=${fallbackTags.topics.join(',')}`);
        }
    } catch (error) {
        console.error('Tier 2 AI enrichment failed:', error);
        // Even on error, try fallback tags
        try {
            const fallbackTags = generateFallbackTags(url, title, description);
            await db.update(items)
                .set({
                    aiTopics: fallbackTags.topics.join(','),
                    aiIntent: fallbackTags.intent.join(','),
                    aiDomain: fallbackTags.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
        } catch { }
    }
}

/**
 * Generate heuristic tags when AI fails
 * Uses URL patterns, title keywords, and domain detection
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

    // === DOMAIN DETECTION ===
    if (lower.includes('github') || lower.includes('gitlab') || combined.includes('code') || combined.includes('programming')) {
        domain = 'tech';
    } else if (lower.includes('medium') || lower.includes('substack') || lower.includes('dev.to')) {
        domain = 'tech';
    } else if (lower.includes('youtube') || lower.includes('vimeo') || lower.includes('twitch')) {
        domain = 'entertainment';
    } else if (lower.includes('twitter') || lower.includes('x.com') || lower.includes('linkedin')) {
        domain = 'business';
    } else if (lower.includes('reddit')) {
        domain = 'lifestyle';
    } else if (combined.includes('invest') || combined.includes('stock') || combined.includes('finance')) {
        domain = 'finance';
    } else if (combined.includes('design') || combined.includes('ui') || combined.includes('ux')) {
        domain = 'design';
    }

    // === INTENT DETECTION ===
    if (combined.includes('tutorial') || combined.includes('how to') || combined.includes('guide') || combined.includes('learn')) {
        intent.push('tutorial');
    }
    if (combined.includes('documentation') || combined.includes('docs') || combined.includes('reference') || combined.includes('api')) {
        intent.push('reference');
    }
    if (combined.includes('discussion') || lower.includes('reddit') || combined.includes('comment')) {
        intent.push('discussion');
    }
    if (combined.includes('news') || combined.includes('announce') || combined.includes('release')) {
        intent.push('news');
    }
    if (intent.length === 0) intent.push('reference');

    // === TOPIC EXTRACTION from title ===
    // Extract meaningful words from title
    const techKeywords = ['react', 'nextjs', 'next.js', 'javascript', 'typescript', 'python', 'node', 'api', 'database', 'frontend', 'backend', 'web', 'app', 'mobile', 'ai', 'machine learning', 'css', 'html', 'vue', 'angular', 'svelte', 'tailwind', 'vercel', 'deploy', 'docker', 'kubernetes', 'aws', 'cloud'];

    for (const keyword of techKeywords) {
        if (combined.includes(keyword)) {
            topics.push(keyword.replace('.', ''));
        }
    }

    // Add domain-based topics
    if (lower.includes('github')) topics.push('github', 'code');
    if (lower.includes('youtube')) topics.push('video');
    if (lower.includes('reddit')) topics.push('community');
    if (lower.includes('twitter') || lower.includes('x.com')) topics.push('social');

    // Extract nouns from title (simple heuristic - words > 4 chars, not common words)
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'about', 'their', 'would', 'could', 'should', 'there', 'where', 'which', 'while', 'being', 'https', 'http', 'www']);
    const words = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 4 && w.length < 15 && !stopWords.has(w));

    topics.push(...words.slice(0, 3));

    // Deduplicate
    const uniqueTopics = [...new Set(topics)].slice(0, 5);

    return {
        topics: uniqueTopics.length > 0 ? uniqueTopics : ['general'],
        intent: intent.slice(0, 2),
        domain
    };
}
