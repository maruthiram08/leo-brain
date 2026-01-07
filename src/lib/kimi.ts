import OpenAI from 'openai';

let kimiClient: OpenAI | null = null;

function getKimiClient(): OpenAI {
    if (!kimiClient) {
        const apiKey = process.env.KIMI_API_KEY;
        if (!apiKey) {
            throw new Error('KIMI_API_KEY environment variable is not set');
        }
        // Kimi-k2 uses OpenAI-compatible API
        kimiClient = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.moonshot.cn/v1'
        });
    }
    return kimiClient;
}

export interface KimiEnrichmentResult {
    title: string;
    description: string;
    contentType: 'article' | 'video' | 'tweet' | 'doc' | 'unknown';
    topics: string[];    // Core concepts/technologies
    intent: string[];    // tutorial, reference, news, discussion, tool, opinion
    domain: string;      // tech, finance, design, science, lifestyle, business
}

/**
 * Enrich a URL using Kimi-k2 with web browsing capability
 * Generates structured semantic tags for hot/cold recall matching
 */
export async function enrichUrlWithKimi(url: string): Promise<KimiEnrichmentResult> {
    const client = getKimiClient();

    const prompt = `Visit and analyze this URL, then extract metadata AND semantic tags:
${url}

Return ONLY a JSON object with:
{
  "title": "Page title or descriptive name (max 100 chars)",
  "description": "One-sentence summary (max 200 chars)",
  "contentType": "article" | "video" | "tweet" | "doc" | "unknown",
  "topics": ["3-5 core concepts, technologies, or subjects - be GENERIC not domain-specific"],
  "intent": ["1-2 from: tutorial, reference, news, discussion, tool, opinion, learn, build"],
  "domain": "ONE of: tech, finance, design, science, lifestyle, business, entertainment"
}

IMPORTANT for topics:
- Use generic terms that apply across sources (e.g. "react" not "reactjs.org")
- Include related concepts (e.g. for Next.js routing: ["nextjs", "react", "routing", "web-development", "frontend"])
- Think: "What other content should this match with?"

Respond with ONLY the JSON, no other text.`;

    try {
        const completion = await client.chat.completions.create({
            model: 'kimi-k2-0711-preview',
            messages: [
                {
                    role: 'system',
                    content: 'You are a semantic content analyzer. Extract metadata and generate tags that help match related content across different sources. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3,
            max_tokens: 600
        });

        const text = completion.choices[0]?.message?.content || '';

        // Parse JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                title: (parsed.title || '').slice(0, 200),
                description: (parsed.description || '').slice(0, 240),
                contentType: ['article', 'video', 'tweet', 'doc', 'unknown'].includes(parsed.contentType)
                    ? parsed.contentType
                    : 'unknown',
                topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).map((t: string) => t.toLowerCase()) : [],
                intent: Array.isArray(parsed.intent) ? parsed.intent.slice(0, 2).map((i: string) => i.toLowerCase()) : [],
                domain: typeof parsed.domain === 'string' ? parsed.domain.toLowerCase() : 'unknown'
            };
        }
    } catch (error) {
        console.error('Kimi enrichment failed:', error);
    }

    // Fallback
    return {
        title: new URL(url).hostname,
        description: '',
        contentType: 'unknown',
        topics: [],
        intent: [],
        domain: 'unknown'
    };
}
