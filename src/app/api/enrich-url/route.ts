import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { enrichUrl } from '@/lib/url-enrichment';
import { enrichUrlWithAi } from '@/lib/ai';

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
        // in Serverless, we MUST await this or use waitUntil. For now, await it to guarantee execution.
        try {
            await generateAISemanticTags(itemId, url, enrichment.enrichedTitle, enrichment.enrichedDescription);
        } catch (err) {
            console.error('AI semantic tagging failed:', err);
        }

        return NextResponse.json({
            success: true,
            tier1: enrichment.enrichmentStatus,
            message: 'Enrichment complete (Tier 1 & Tier 2)'
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
 * Tier 2: Generate AI summary and semantic tags using OpenAI
 * Falls back to smart heuristic tag generation if AI returns empty
 */
async function generateAISemanticTags(
    itemId: string,
    url: string,
    title: string | null,
    description: string | null
): Promise<void> {
    try {
        const aiResult = await enrichUrlWithAi(url);
        const hasValidTags = aiResult.topics.length > 0;

        if (hasValidTags) {
            await db.update(items)
                .set({
                    aiSummary: aiResult.description?.slice(0, 200),
                    aiTopics: aiResult.topics.join(','),
                    aiIntent: aiResult.intent.join(','),
                    aiDomain: aiResult.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
            console.log(`AI tags for ${itemId}: ${aiResult.topics.join(',')}`);
        } else {
            const fallback = generateFallbackTags(url, title, description);
            await db.update(items)
                .set({
                    aiSummary: description?.slice(0, 200) || null,
                    aiTopics: fallback.topics.join(','),
                    aiIntent: fallback.intent.join(','),
                    aiDomain: fallback.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
            console.log(`Fallback tags for ${itemId}: ${fallback.topics.join(',')}`);
        }
    } catch (error) {
        console.error('Tier 2 failed:', error);
        try {
            const fallback = generateFallbackTags(url, title, description);
            await db.update(items)
                .set({
                    aiTopics: fallback.topics.join(','),
                    aiIntent: fallback.intent.join(','),
                    aiDomain: fallback.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));
        } catch { }
    }
}

/**
 * Generate semantic tags from content when AI fails
 * Comprehensive keyword extraction for finance, tech, AI, design, etc.
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

    // === COMPREHENSIVE KEYWORD GROUPS ===
    const keywordGroups: Record<string, string[]> = {
        tech: ['react', 'nextjs', 'javascript', 'typescript', 'python', 'node', 'api', 'database',
            'frontend', 'backend', 'web', 'mobile', 'docker', 'kubernetes', 'aws', 'cloud',
            'vue', 'angular', 'svelte', 'tailwind', 'vercel', 'deploy', 'code', 'programming',
            'developer', 'software', 'algorithm', 'data structure', 'rust', 'golang'],

        ai: ['ai', 'machine learning', 'ml', 'deep learning', 'neural', 'gpt', 'llm', 'chatgpt',
            'claude', 'gemini', 'openai', 'anthropic', 'model', 'training', 'inference', 'agent'],

        finance: ['trading', 'algorithmic', 'hedge fund', 'investment', 'stock', 'crypto', 'bitcoin',
            'finance', 'market', 'investor', 'portfolio', 'quant', 'quantitative', 'forex',
            'options', 'derivatives', 'fintech', 'banking', 'wealth', 'strategy'],

        design: ['design', 'ui', 'ux', 'figma', 'sketch', 'prototype', 'wireframe', 'visual',
            'typography', 'color', 'layout', 'interface', 'user experience'],

        business: ['startup', 'entrepreneur', 'marketing', 'growth', 'product', 'saas', 'b2b',
            'sales', 'revenue', 'strategy', 'leadership', 'management', 'founder']
    };

    // Match keywords and set domain
    for (const [domainName, keywords] of Object.entries(keywordGroups)) {
        for (const keyword of keywords) {
            if (combined.includes(keyword)) {
                topics.push(keyword.replace(/\s+/g, '-'));
                if (domain === 'unknown') domain = domainName;
            }
        }
    }

    // === URL-BASED TOPICS ===
    if (lower.includes('github')) { topics.push('code', 'github'); domain = domain === 'unknown' ? 'tech' : domain; }
    if (lower.includes('youtube')) { topics.push('video'); domain = domain === 'unknown' ? 'entertainment' : domain; }
    if (lower.includes('reddit')) { topics.push('community', 'discussion'); }
    if (lower.includes('twitter') || lower.includes('x.com')) { topics.push('social'); }
    if (lower.includes('medium')) { topics.push('blog', 'article'); domain = domain === 'unknown' ? 'tech' : domain; }

    // === INTENT DETECTION ===
    if (combined.includes('tutorial') || combined.includes('how to') || combined.includes('guide') ||
        combined.includes('learn') || combined.includes('explains') || combined.includes('build')) {
        intent.push('tutorial');
    }
    if (combined.includes('documentation') || combined.includes('docs') || combined.includes('reference')) {
        intent.push('reference');
    }
    if (combined.includes('discussion') || lower.includes('reddit')) {
        intent.push('discussion');
    }
    if (combined.includes('news') || combined.includes('announce')) {
        intent.push('news');
    }
    if (intent.length === 0) intent.push('reference');

    // === EXTRACT MEANINGFUL WORDS FROM TITLE ===
    const stopWords = new Set(['this', 'that', 'with', 'from', 'have', 'been', 'were', 'will',
        'about', 'their', 'would', 'could', 'should', 'there', 'where', 'which', 'while',
        'being', 'https', 'http', 'www', 'they', 'them', 'these', 'those', 'what', 'when',
        'actually', 'really', 'literally', 'every', 'some', 'just', 'your', 'into', 'work']);

    const words = (title || '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 3 && w.length < 15 && !stopWords.has(w));

    for (const word of words.slice(0, 5)) {
        if (!topics.includes(word) && !topics.some(t => t.includes(word))) {
            topics.push(word);
        }
    }

    const uniqueTopics = [...new Set(topics)].slice(0, 8);

    return {
        topics: uniqueTopics.length > 0 ? uniqueTopics : ['general'],
        intent: intent.slice(0, 2),
        domain: domain || 'unknown'
    };
}
