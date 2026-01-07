import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { enrichUrl } from '@/lib/url-enrichment';
import { enrichUrlWithKimi } from '@/lib/kimi';

/**
 * POST /api/admin/enrich-v2
 * Backfill enrichment for existing URLs using two-tier approach:
 * - Tier 1: Cheerio (fast metadata)
 * - Tier 2: Kimi AI (summary + semantic tags) with fallback
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
                        const kimiResult = await enrichUrlWithKimi(item.content);
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

function generateFallbackTags(url: string, title: string | null, description: string | null) {
    const topics: string[] = [];
    const intent: string[] = [];
    let domain = 'unknown';

    const lower = url.toLowerCase();
    const combined = `${(title || '').toLowerCase()} ${(description || '').toLowerCase()}`;

    // Domain
    if (lower.includes('github') || lower.includes('dev.to') || combined.includes('programming')) domain = 'tech';
    else if (lower.includes('youtube') || lower.includes('vimeo')) domain = 'entertainment';
    else if (lower.includes('twitter') || lower.includes('linkedin')) domain = 'business';
    else if (lower.includes('reddit')) domain = 'lifestyle';
    else if (combined.includes('invest') || combined.includes('finance')) domain = 'finance';

    // Intent
    if (combined.includes('tutorial') || combined.includes('how to')) intent.push('tutorial');
    if (combined.includes('documentation') || combined.includes('docs')) intent.push('reference');
    if (combined.includes('discussion') || lower.includes('reddit')) intent.push('discussion');
    if (intent.length === 0) intent.push('reference');

    // Topics from URL/title
    const techKeywords = ['react', 'nextjs', 'javascript', 'typescript', 'python', 'api', 'frontend', 'backend', 'web', 'ai', 'docker'];
    for (const kw of techKeywords) {
        if (combined.includes(kw)) topics.push(kw);
    }
    if (lower.includes('github')) topics.push('code');
    if (lower.includes('youtube')) topics.push('video');
    if (lower.includes('reddit')) topics.push('community');

    // Words from title
    const words = (title || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
        .filter(w => w.length > 4 && w.length < 15);
    topics.push(...words.slice(0, 3));

    return {
        topics: [...new Set(topics)].slice(0, 5) || ['general'],
        intent: intent.slice(0, 2),
        domain
    };
}
