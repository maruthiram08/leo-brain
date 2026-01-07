import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, and, isNull, or } from 'drizzle-orm';
import { enrichUrlWithGemini, extractDomain } from '@/lib/gemini';
import { enrichUrlWithKimi } from '@/lib/kimi';

/**
 * POST /api/admin/enrich
 * Enriches pending URL items with metadata using Kimi-k2 (primary) or Gemini (fallback)
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Get params from query (default limit 10)
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '10');
        const force = searchParams.get('force') === 'true';

        // Find URL items that need enrichment
        const pendingItems = await db.select()
            .from(items)
            .where(
                force
                    ? eq(items.contentType, 'url') // Force: re-enrich all URLs
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
                let enrichment;

                // Try Kimi-k2 first (better web scraping)
                try {
                    enrichment = await enrichUrlWithKimi(item.content);
                    // If Kimi returns fallback (just hostname), try Gemini
                    if (enrichment.title === new URL(item.content).hostname) {
                        throw new Error('Kimi returned fallback');
                    }
                } catch (kimiError) {
                    console.log('Kimi failed, falling back to Gemini:', kimiError);
                    // Fall back to Gemini with metadata
                    const metadata = await fetchUrlMetadata(item.content);
                    enrichment = await enrichUrlWithGemini(item.content, metadata);
                }

                // Update item
                await db.update(items)
                    .set({
                        enrichedTitle: enrichment.title,
                        enrichedDescription: enrichment.description,
                        enrichmentContentType: enrichment.contentType,
                        sourceDomain: extractDomain(item.content),
                        enrichmentStatus: 'success',
                        enrichmentAttemptedAt: new Date(),
                        updatedAt: new Date()
                    })
                    .where(eq(items.id, item.id));

                results.push({ id: item.id, status: 'success', title: enrichment.title, source: 'kimi' });
            } catch (error) {
                // Mark as failed but don't stop processing
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
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        return NextResponse.json({
            message: `Processed ${results.length} items`,
            processed: results.length,
            duration: Date.now() - startTime,
            results
        });

    } catch (error) {
        console.error('Enrichment batch failed:', error);
        return NextResponse.json(
            { error: 'Enrichment failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}

/**
 * Fetch basic metadata from URL without JavaScript execution
 */
async function fetchUrlMetadata(url: string): Promise<{
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
}> {
    try {
        // Special handling for Reddit URLs
        if (url.includes('reddit.com')) {
            const redditMeta = await fetchRedditMetadata(url);
            if (redditMeta.title) return redditMeta;
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeoBot/1.0)'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) return {};

        const html = await response.text();

        // Extract metadata with regex (no DOM parsing needed)
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);
        const ogDescMatch = html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);

        return {
            title: titleMatch?.[1]?.trim(),
            description: descMatch?.[1]?.trim(),
            ogTitle: ogTitleMatch?.[1]?.trim(),
            ogDescription: ogDescMatch?.[1]?.trim()
        };
    } catch {
        return {}; // Silent failure
    }
}

/**
 * Fetch Reddit post metadata using Reddit's JSON API
 */
async function fetchRedditMetadata(url: string): Promise<{
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
}> {
    try {
        // Reddit JSON API - append .json to the URL
        let jsonUrl = url;
        if (url.includes('?')) {
            jsonUrl = url.split('?')[0] + '.json';
        } else {
            jsonUrl = url.replace(/\/$/, '') + '.json';
        }

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);

        const response = await fetch(jsonUrl, {
            signal: controller.signal,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeoBot/1.0)'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) return {};

        const data = await response.json();

        // Handle post URLs (e.g., /r/subreddit/comments/...)
        if (Array.isArray(data) && data[0]?.data?.children?.[0]?.data) {
            const post = data[0].data.children[0].data;
            const subreddit = post.subreddit_name_prefixed || `r/${post.subreddit}`;
            return {
                title: post.title,
                description: `${subreddit} • ${post.author ? `u/${post.author}` : ''} • ${post.num_comments || 0} comments`,
                ogTitle: post.title,
                ogDescription: post.selftext?.slice(0, 200) || ''
            };
        }

        // Handle user profile URLs (e.g., /u/username)
        if (url.includes('/u/') || url.includes('/user/')) {
            const username = url.match(/\/u(?:ser)?\/([^\/\?]+)/)?.[1];
            if (username) {
                return {
                    title: `u/${username}`,
                    description: 'Reddit User Profile',
                    ogTitle: `u/${username}`,
                    ogDescription: ''
                };
            }
        }

        // Handle subreddit URLs (e.g., /r/subreddit, /r/subreddit/s/...)
        if (url.includes('/r/')) {
            const subreddit = url.match(/\/r\/([^\/\?]+)/)?.[1];
            if (subreddit) {
                return {
                    title: `r/${subreddit}`,
                    description: 'Reddit Community',
                    ogTitle: `r/${subreddit}`,
                    ogDescription: ''
                };
            }
        }

        return {};
    } catch {
        return {}; // Silent failure
    }
}
