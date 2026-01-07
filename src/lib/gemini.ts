import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

// ... imports

/**
 * Generic helper to generate content from prompt
 */
export async function generateGeminiContent(prompt: string): Promise<string | null> {
    const client = getClient();
    const model = client.getGenerativeModel({ model: 'gemini-2.0-flash' });

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Gemini generation failed:', error);
        return null;
    }
}

export function getClient(): GoogleGenerativeAI {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('GEMINI_API_KEY environment variable is not set');
        }
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

export interface EnrichmentResult {
    title: string;
    description: string;
    contentType: 'article' | 'video' | 'tweet' | 'doc' | 'unknown';
}

/**
 * Generate a brief enrichment for a URL using Gemini with native URL fetching
 * Returns title, description (≤240 chars), and content type
 */
export async function enrichUrlWithGemini(url: string, rawMetadata?: {
    title?: string;
    description?: string;
    ogTitle?: string;
    ogDescription?: string;
}): Promise<EnrichmentResult> {
    const client = getClient();
    // Use gemini-2.0-flash with URL context capability
    const model = client.getGenerativeModel({
        model: 'gemini-2.0-flash',
        tools: [{ urlContext: {} }] as any // Enable URL fetching
    });

    // If we already have good metadata, just use it
    if (rawMetadata?.title || rawMetadata?.ogTitle) {
        const title = rawMetadata.ogTitle || rawMetadata.title || '';
        const description = rawMetadata.ogDescription || rawMetadata.description || '';

        return {
            title: title.slice(0, 200),
            description: description.slice(0, 240),
            contentType: inferContentType(url)
        };
    }

    // Let Gemini fetch and analyze the URL content directly
    const prompt = `Analyze this URL and extract metadata:
${url}

Respond with JSON only:
{"title": "page title or descriptive name (max 100 chars)", "description": "one sentence summary of the content (max 200 chars)", "contentType": "article|video|tweet|doc|unknown"}

For Reddit posts: Extract the actual post title if visible.
For user profiles or subreddits: Create a descriptive title.
Be factual and neutral.`;

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: (parsed.title || '').slice(0, 200),
                description: (parsed.description || '').slice(0, 240),
                contentType: ['article', 'video', 'tweet', 'doc', 'unknown'].includes(parsed.contentType)
                    ? parsed.contentType
                    : 'unknown'
            };
        }
    } catch (error) {
        console.error('Gemini enrichment failed:', error);
    }

    // Fallback
    return {
        title: new URL(url).hostname,
        description: '',
        contentType: inferContentType(url)
    };
}

/**
 * Infer content type from URL patterns
 */
function inferContentType(url: string): 'article' | 'video' | 'tweet' | 'doc' | 'unknown' {
    const urlLower = url.toLowerCase();

    // Video platforms
    if (urlLower.includes('youtube.com') || urlLower.includes('youtu.be') ||
        urlLower.includes('vimeo.com') || urlLower.includes('tiktok.com')) {
        return 'video';
    }

    // Social/tweets
    if (urlLower.includes('twitter.com') || urlLower.includes('x.com') ||
        urlLower.includes('/status/')) {
        return 'tweet';
    }

    // Documents
    if (urlLower.includes('docs.google.com') || urlLower.includes('notion.so') ||
        urlLower.endsWith('.pdf') || urlLower.endsWith('.doc')) {
        return 'doc';
    }

    // Articles (common patterns)
    if (urlLower.includes('/article') || urlLower.includes('/post') ||
        urlLower.includes('medium.com') || urlLower.includes('substack.com')) {
        return 'article';
    }

    return 'unknown';
}

/**
 * Extract domain from URL
 */
export function extractDomain(url: string): string {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return '';
    }
}
