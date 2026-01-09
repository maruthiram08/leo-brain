import OpenAI from 'openai';

let aiClient: OpenAI | null = null;

function getAiClient(): OpenAI {
    if (!aiClient) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        aiClient = new OpenAI({
            apiKey: apiKey,
            // baseURL: 'https://api.openai.com/v1' // Default
        });
    }
    return aiClient;
}

export interface EnrichmentResult {
    title: string;
    description: string;
    contentType: 'article' | 'video' | 'tweet' | 'doc' | 'unknown';
    topics: string[];    // Core concepts/technologies
    intent: string[];    // tutorial, reference, news, discussion, tool, opinion
    domain: string;      // tech, finance, design, science, lifestyle, business
}

/**
 * Enrich a URL using AI
 * Generates structured semantic tags for hot/cold recall matching
 */
export async function enrichUrlWithAi(url: string): Promise<EnrichmentResult> {
    const client = getAiClient();

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
            model: 'gpt-4o-mini',
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
        console.error('AI enrichment failed:', error);
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

/**
 * Enrich raw text content using AI
 * Used when the extension captures full page text (e.g. behind login)
 * 
 * @param content - Full text content of the page (will be truncated to ~15k chars)
 * @param sourceUrl - Origin URL for context
 */
export async function enrichContentWithAi(content: string, sourceUrl: string): Promise<EnrichmentResult> {
    const client = getAiClient();

    // Limit content to ~15k characters to fit within prompt safely (standard context window)
    const safeContent = content.slice(0, 15000);

    const prompt = `Analyze this webpage content from ${sourceUrl} and extract metadata AND semantic tags:

CONTENT START:
${safeContent}
CONTENT END

Return ONLY a JSON object with:
{
  "title": "Descriptive title based on content (max 100 chars)",
  "description": "One-sentence summary of the main points (max 200 chars)",
  "contentType": "article" | "video" | "tweet" | "doc" | "unknown",
  "topics": ["3-5 core concepts/technologies - be GENERIC"],
  "intent": ["1-2 from: tutorial, reference, news, discussion, tool, opinion, learn, build"],
  "domain": "ONE of: tech, finance, design, science, lifestyle, business, entertainment"
}

Respond with ONLY the JSON.`;

    try {
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            // Increase temperature slightly for better creativity in summarization
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: 'You are a semantic content analyzer. Extract metadata and generate tags. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 800
        });

        const text = completion.choices[0]?.message?.content || '';
        const jsonMatch = text.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            try {
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
            } catch (e) {
                console.error('Failed to parse AI JSON response:', e);
            }
        }
    } catch (error) {
        console.error('AI content enrichment failed:', error);
    }

    return {
        title: '',
        description: '',
        contentType: 'unknown',
        topics: [],
        intent: [],
        domain: 'unknown'
    };
}
