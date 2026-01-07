import * as cheerio from 'cheerio';

export interface EnrichmentResult {
    enrichedTitle: string | null;
    enrichedDescription: string | null;
    sourceDomain: string;
    faviconUrl: string;
    contentType: 'article' | 'video' | 'tweet' | 'doc' | 'unknown';
    enrichmentStatus: 'success' | 'failed';
}

/**
 * Detect content type based on URL domain heuristics
 * Per spec: cheap detection, no over-engineering
 */
export function detectContentType(url: string): EnrichmentResult['contentType'] {
    const lower = url.toLowerCase();

    if (lower.includes('youtube.com') || lower.includes('youtu.be') || lower.includes('vimeo.com')) {
        return 'video';
    }
    if (lower.includes('twitter.com') || lower.includes('x.com')) {
        return 'tweet';
    }
    if (lower.includes('medium.com') || lower.includes('substack.com') || lower.includes('dev.to') || lower.includes('hashnode.')) {
        return 'article';
    }
    if (lower.includes('github.com') || lower.includes('gitlab.com') || lower.includes('notion.so') || lower.includes('docs.google.com')) {
        return 'doc';
    }
    if (lower.includes('linkedin.com/posts') || lower.includes('linkedin.com/feed')) {
        return 'article';
    }
    if (lower.includes('reddit.com')) {
        return 'article';
    }

    return 'unknown';
}

/**
 * Lightweight URL enrichment using cheerio
 * Per spec: 3s timeout, no JS execution, silent failure
 */
export async function enrichUrl(url: string): Promise<EnrichmentResult> {
    const parsedUrl = new URL(url);
    const fallbackResult: EnrichmentResult = {
        enrichedTitle: null,
        enrichedDescription: null,
        sourceDomain: parsedUrl.hostname,
        faviconUrl: `${parsedUrl.origin}/favicon.ico`,
        contentType: detectContentType(url),
        enrichmentStatus: 'failed'
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout per spec

        const response = await fetch(url, {
            signal: controller.signal,
            redirect: 'follow',
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; LeoBot/1.0; +https://leo-brain.vercel.app)'
            }
        });
        clearTimeout(timeout);

        if (!response.ok) {
            return fallbackResult;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // Priority order per spec: og:title > <title> > hostname
        const title =
            $('meta[property="og:title"]').attr('content') ||
            $('title').text() ||
            null;

        // Priority order: og:description > meta description
        const description =
            $('meta[property="og:description"]').attr('content') ||
            $('meta[name="description"]').attr('content') ||
            null;

        return {
            enrichedTitle: title?.trim()?.slice(0, 200) || null,
            enrichedDescription: description?.trim()?.slice(0, 240) || null,
            sourceDomain: parsedUrl.hostname,
            faviconUrl: `${parsedUrl.origin}/favicon.ico`,
            contentType: detectContentType(url),
            enrichmentStatus: 'success'
        };
    } catch (err) {
        // Silent failure per spec
        console.error('URL enrichment failed:', err instanceof Error ? err.message : 'Unknown');
        return fallbackResult;
    }
}
