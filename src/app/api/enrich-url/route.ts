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
 * - Tier 2: AI (summary + tags for recall)
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

        // ===== TIER 2: AI Summary + Tags (async, non-blocking) =====
        // Fire and forget - don't await, don't block response
        generateAISummary(itemId, url).catch(err => {
            console.error('AI summary generation failed:', err);
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
 * Tier 2: Generate AI summary and tags using Kimi
 * Runs async after Tier 1 completes
 */
async function generateAISummary(itemId: string, url: string): Promise<void> {
    try {
        // Use Kimi for AI summary/tags
        const aiResult = await enrichUrlWithKimi(url);

        // Extract tags from description or generate simple ones
        const tags = generateTagsFromContent(aiResult.title, aiResult.description, url);

        // Update with Tier 2 results
        await db.update(items)
            .set({
                aiSummary: aiResult.description?.slice(0, 200),
                aiTags: tags,
                updatedAt: new Date()
            })
            .where(eq(items.id, itemId));

        console.log(`Tier 2 AI enrichment complete for ${itemId}`);
    } catch (error) {
        console.error('Tier 2 AI enrichment failed:', error);
        // Silent failure - Tier 1 data is still available
    }
}

/**
 * Generate simple tags from content
 */
function generateTagsFromContent(title: string, description: string, url: string): string {
    const tags: string[] = [];

    // Add domain-based tag
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        tags.push(domain.split('.')[0]); // e.g., 'medium', 'github'
    } catch { }

    // Add content type as tag
    const lower = url.toLowerCase();
    if (lower.includes('youtube') || lower.includes('vimeo')) tags.push('video');
    if (lower.includes('github') || lower.includes('gitlab')) tags.push('code');
    if (lower.includes('twitter') || lower.includes('x.com')) tags.push('social');
    if (lower.includes('medium') || lower.includes('substack')) tags.push('blog');
    if (lower.includes('reddit')) tags.push('discussion');
    if (lower.includes('linkedin')) tags.push('professional');

    // Extract keywords from title (simple approach)
    if (title) {
        const words = title.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 4 && w.length < 15)
            .slice(0, 3);
        tags.push(...words);
    }

    // Deduplicate and limit
    return [...new Set(tags)].slice(0, 8).join(',');
}
