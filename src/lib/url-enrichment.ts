import * as cheerio from 'cheerio';

export interface EnrichmentResult {
    enrichedTitle: string | null;
    enrichedDescription: string | null;
    sourceDomain: string;
    faviconUrl: string;
    contentType: 'article' | 'video' | 'tweet' | 'doc' | 'reddit_post' | 'unknown';
    enrichmentStatus: 'success' | 'failed';
}

/**
 * Detect content type based on URL domain heuristics
 */
export function detectContentType(url: string): EnrichmentResult['contentType'] {
    const lower = url.toLowerCase();

    if (lower.includes('reddit.com')) return 'reddit_post';
    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) return 'video';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'tweet';
    if (lower.includes('medium.com') || lower.includes('substack.com') || lower.includes('dev.to')) return 'article';
    if (lower.includes('github.com') || lower.includes('gitlab.com') || lower.includes('notion.so')) return 'doc';

    return 'unknown';
}

/**
 * Domain-aware URL enrichment
 * Uses specialized APIs for sites that block naive scraping (per urlv3 spec)
 */
export async function enrichUrl(url: string): Promise<EnrichmentResult> {
    const parsedUrl = new URL(url);
    const lower = url.toLowerCase();

    // Domain-specific enrichment
    if (lower.includes('reddit.com')) {
        return enrichReddit(url, parsedUrl);
    }
    if (lower.includes('twitter.com') || lower.includes('x.com')) {
        return enrichTwitter(url, parsedUrl);
    }

    // Default: HTML scraping with cheerio
    return enrichHtml(url, parsedUrl);
}

/**
 * Reddit: Try JSON endpoint, fallback to URL-based extraction
 * Reddit blocks many server IPs, so graceful degradation is essential
 */
async function enrichReddit(url: string, parsedUrl: URL): Promise<EnrichmentResult> {
    // Extract info from URL first (always works)
    let subreddit: string | null = null;
    let username: string | null = null;
    let isPost = false;

    const subredditMatch = url.match(/\/r\/([^\/\?]+)/);
    const usernameMatch = url.match(/\/u(?:ser)?\/([^\/\?]+)/);

    if (subredditMatch) subreddit = subredditMatch[1];
    if (usernameMatch) username = usernameMatch[1];
    if (url.includes('/comments/')) isPost = true;

    // Base result from URL parsing (guaranteed to work)
    let result: EnrichmentResult = {
        enrichedTitle: username ? `u/${username}` : subreddit ? `r/${subreddit}` : 'Reddit',
        enrichedDescription: username ? 'Reddit User' : subreddit ? (isPost ? 'Reddit Post' : 'Reddit Community') : null,
        sourceDomain: 'reddit.com',
        faviconUrl: 'https://www.reddit.com/favicon.ico',
        contentType: 'reddit_post',
        enrichmentStatus: 'success' // Mark success because we got useful info from URL
    };

    // Try JSON API for richer data (may fail due to IP blocking)
    try {
        // Skip share URLs (/s/) - they don't support .json
        if (url.includes('/s/')) {
            return result;
        }

        let jsonUrl = url.replace(/\/$/, '') + '.json';
        if (url.includes('?')) jsonUrl = url.split('?')[0] + '.json';

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(jsonUrl, {
            signal: controller.signal,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
        });
        clearTimeout(timeout);

        if (!response.ok) return result;

        const text = await response.text();
        // Check if blocked
        if (text.includes('Blocked') || text.includes('<!doctype html>')) {
            return result;
        }

        const data = JSON.parse(text);

        // Extract post data if available
        if (Array.isArray(data) && data[0]?.data?.children?.[0]?.data) {
            const post = data[0].data.children[0].data;
            result.enrichedTitle = post.title || result.enrichedTitle;
            result.enrichedDescription = `r/${post.subreddit} • u/${post.author} • ${post.num_comments || 0} comments`;
        }
    } catch {
        // JSON failed - use URL-parsed result (already set)
    }

    return result;
}


/**
 * Twitter/X: Use oEmbed API
 */
async function enrichTwitter(url: string, parsedUrl: URL): Promise<EnrichmentResult> {
    const fallback: EnrichmentResult = {
        enrichedTitle: null,
        enrichedDescription: null,
        sourceDomain: parsedUrl.hostname.replace('www.', ''),
        faviconUrl: 'https://twitter.com/favicon.ico',
        contentType: 'tweet',
        enrichmentStatus: 'failed'
    };

    try {
        const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(oembedUrl, { signal: controller.signal });
        clearTimeout(timeout);

        if (!response.ok) return fallback;

        const data = await response.json();

        // Extract clean text from HTML (remove links)
        const htmlContent = data.html || '';
        const textMatch = htmlContent.match(/<p[^>]*>([^<]+)</);
        const tweetText = textMatch?.[1]?.slice(0, 200) || null;

        return {
            enrichedTitle: data.author_name ? `@${data.author_name}` : null,
            enrichedDescription: tweetText,
            sourceDomain: parsedUrl.hostname.replace('www.', ''),
            faviconUrl: 'https://twitter.com/favicon.ico',
            contentType: 'tweet',
            enrichmentStatus: 'success'
        };
    } catch {
        return fallback;
    }
}

/**
 * Default HTML enrichment with cheerio
 */
async function enrichHtml(url: string, parsedUrl: URL): Promise<EnrichmentResult> {
    const fallback: EnrichmentResult = {
        enrichedTitle: null,
        enrichedDescription: null,
        sourceDomain: parsedUrl.hostname.replace('www.', ''),
        faviconUrl: `${parsedUrl.origin}/favicon.ico`,
        contentType: detectContentType(url),
        enrichmentStatus: 'failed'
    };

    try {
        const controller = new AbortController();

        const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout

        const response = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) return fallback;

        const html = await response.text();
        const $ = cheerio.load(html);

        const title = $('meta[property="og:title"]').attr('content') || $('title').text() || null;
        const description = $('meta[property="og:description"]').attr('content') || $('meta[name="description"]').attr('content') || null;

        return {
            enrichedTitle: title?.trim()?.slice(0, 200) || null,
            enrichedDescription: description?.trim()?.slice(0, 240) || null,
            sourceDomain: parsedUrl.hostname.replace('www.', ''),
            faviconUrl: `${parsedUrl.origin}/favicon.ico`,
            contentType: detectContentType(url),
            enrichmentStatus: 'success'
        };
    } catch {
        return fallback;
    }
}
