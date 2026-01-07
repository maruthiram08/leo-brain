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
 * - Tier 2: Kimi AI (summary + tags)
 * 
 * Query params:
 * - limit: number of items to process (default: 10)
 * - force: 're-enrich all URLs regardless of status
 * - tier: '1' for cheerio only, '2' for both (default: '2')
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const force = searchParams.get('force') === 'true';
        const tier = searchParams.get('tier') || '2';

        // Find URL items that need enrichment
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
            return NextResponse.json({
                message: 'No pending items to enrich',
                processed: 0
            });
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

                // ===== TIER 2: AI Summary + Tags =====
                if (tier === '2') {
                    try {
                        const kimiResult = await enrichUrlWithKimi(item.content);
                        const tags = generateTagsFromContent(kimiResult.title, kimiResult.description, item.content);

                        await db.update(items)
                            .set({
                                aiSummary: kimiResult.description?.slice(0, 200),
                                aiTags: tags,
                                updatedAt: new Date()
                            })
                            .where(eq(items.id, item.id));

                        aiResult = { summary: kimiResult.description?.slice(0, 50), tags };
                    } catch (aiError) {
                        console.error('Tier 2 AI failed for', item.id, aiError);
                        aiResult = 'failed';
                    }
                }

                results.push({
                    id: item.id,
                    url: item.content.slice(0, 50) + '...',
                    tier1: enrichment.enrichmentStatus,
                    title: enrichment.enrichedTitle?.slice(0, 40),
                    tier2: aiResult
                });

            } catch (error) {
                await db.update(items)
                    .set({
                        enrichmentStatus: 'failed',
                        enrichmentAttemptedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(items.id, item.id));

                results.push({
                    id: item.id,
                    status: 'failed',
                    error: error instanceof Error ? error.message : 'Unknown'
                });
            }
        }

        return NextResponse.json({
            message: `Processed ${results.length} items`,
            processed: results.length,
            duration: Date.now() - startTime,
            tier: tier,
            results
        });

    } catch (error) {
        console.error('Batch enrichment failed:', error);
        return NextResponse.json(
            { error: 'Enrichment failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

/**
 * Generate simple tags from content
 */
function generateTagsFromContent(title: string, description: string, url: string): string {
    const tags: string[] = [];

    try {
        const domain = new URL(url).hostname.replace('www.', '');
        tags.push(domain.split('.')[0]);
    } catch { }

    const lower = url.toLowerCase();
    if (lower.includes('youtube') || lower.includes('vimeo')) tags.push('video');
    if (lower.includes('github') || lower.includes('gitlab')) tags.push('code');
    if (lower.includes('twitter') || lower.includes('x.com')) tags.push('social');
    if (lower.includes('medium') || lower.includes('substack')) tags.push('blog');
    if (lower.includes('reddit')) tags.push('discussion');
    if (lower.includes('linkedin')) tags.push('professional');

    if (title) {
        const words = title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 4 && w.length < 15)
            .slice(0, 3);
        tags.push(...words);
    }

    return [...new Set(tags)].slice(0, 8).join(',');
}
