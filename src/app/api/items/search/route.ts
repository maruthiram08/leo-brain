import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { desc, and, eq, ilike, sql, getTableColumns, or } from 'drizzle-orm';
import { logError } from '@/lib/logger';
import { generateEmbedding } from '@/lib/embeddings';

// Helper to detect query intent
function detectQueryIntent(query: string) {
    const intent = {
        cleanQuery: query,
        filters: {} as any,
        boosts: {} as any
    };

    const lower = query.toLowerCase();

    // Time filters
    if (lower.includes('last week')) {
        intent.filters.after = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        intent.cleanQuery = lower.replace('last week', '').trim();
    } else if (lower.includes('last month')) {
        intent.filters.after = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        intent.cleanQuery = lower.replace('last month', '').trim();
    } else if (lower.includes('yesterday')) {
        intent.filters.after = new Date(Date.now() - 24 * 60 * 60 * 1000);
        intent.cleanQuery = lower.replace('yesterday', '').trim();
    }

    // Type filters
    if (lower.includes('pdf')) {
        intent.filters.contentType = 'file'; // Assuming file type for PDF
        intent.cleanQuery = intent.cleanQuery.replace('pdf', '').trim();
    } else if (lower.includes('tweet') || lower.includes('twitter')) {
        intent.filters.domain = 'twitter'; // Heuristic
        intent.cleanQuery = intent.cleanQuery.replace(/tweet|twitter/g, '').trim();
    } else if (lower.includes('reddit')) {
        intent.filters.domain = 'reddit';
        intent.cleanQuery = intent.cleanQuery.replace('reddit', '').trim();
    } else if (lower.includes('screenshot') || lower.includes('image')) {
        intent.filters.contentType = 'image';
        intent.cleanQuery = intent.cleanQuery.replace(/screenshot|image/g, '').trim();
    }

    return intent;
}

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    try {
        const { searchParams } = new URL(request.url);
        const rawQuery = searchParams.get('q');
        const isDebug = searchParams.get('debug') === 'true';

        if (!rawQuery) return NextResponse.json({ items: [] });

        // 1. Detect Intent & Clean Query
        const { cleanQuery, filters } = detectQueryIntent(rawQuery);

        if (!cleanQuery && Object.keys(filters).length === 0) {
            return NextResponse.json({ items: [] });
        }

        // 2. Build Filter Conditions
        const activeFilters = [eq(items.isArchived, false)];

        if (filters.after) {
            activeFilters.push(sql`${items.createdAt} > ${filters.after.toISOString()}`);
        }
        if (filters.domain) {
            // Check both sourceDomain and content for robust matching
            const domainFilter = or(
                ilike(items.sourceDomain, `%${filters.domain}%`),
                ilike(items.content, `%${filters.domain}%`)
            );
            if (domainFilter) {
                activeFilters.push(domainFilter);
            }
        }

        // 3. Generate Embedding (if meaningful query remains)
        let queryEmbedding: number[] | null = null;
        if (cleanQuery.length > 2) {
            try {
                queryEmbedding = await generateEmbedding(cleanQuery);
            } catch (e) {
                console.error('Embedding generation failed:', e);
            }
        }

        // 4. Parallel Search Strategies

        // Define matchScore expression once to use in select and orderBy
        const matchScoreExpr = sql<number>`
            CASE 
                WHEN ${items.enrichedTitle} ILIKE ${cleanQuery + '%'} THEN 1.2 -- Prefix in Title
                WHEN ${items.content} ILIKE ${cleanQuery + '%'} THEN 1.0 -- Prefix in Content
                WHEN ${items.enrichedTitle} ILIKE ${'%' + cleanQuery + '%'} THEN 0.9 -- Mid-word in Title
                WHEN ${items.content} ILIKE ${'%' + cleanQuery + '%'} THEN 0.8 -- Mid-word in Content
                WHEN similarity(${items.enrichedTitle}, ${cleanQuery}) > 0.3 THEN 0.7 -- Fuzzy Title
                ELSE 0.6 -- Fuzzy Content
            END
        `;

        const [keywordResults, semanticResults] = await Promise.all([
            // A. Keyword Search: Tiered Matching
            db.select({
                ...getTableColumns(items),
                matchScore: matchScoreExpr
            }).from(items).where(
                and(
                    ...activeFilters,
                    or(
                        // Prefix match (High value)
                        ilike(items.content, `${cleanQuery}%`),
                        ilike(items.enrichedTitle, `${cleanQuery}%`),

                        // Mid-word match (Medium value - standard ILIKE)
                        ilike(items.content, `%${cleanQuery}%`),

                        // Fuzzy match (Low value - for typos)
                        sql`similarity(${items.content}, ${cleanQuery}) > 0.2`,
                        sql`similarity(${items.enrichedTitle}, ${cleanQuery}) > 0.2`
                    )
                )
            ).orderBy(desc(matchScoreExpr), desc(items.createdAt)).limit(30),

            // B. Semantic Search (Vector)
            queryEmbedding ?
                db.select({
                    ...getTableColumns(items),
                    similarity: sql<number>`1 - (${items.embedding} <=> ${toSql(queryEmbedding)})`
                })
                    .from(items)
                    .where(and(...activeFilters))
                    .orderBy(sql`${items.embedding} <=> ${toSql(queryEmbedding)}`) // Nearest neighbors
                    .limit(20)
                : Promise.resolve([])
        ]);

        // 5. Merge & Rank
        const allItems = new Map();

        // Process Keyword Results
        keywordResults.forEach(item => {
            const baseScore = Number(item.matchScore) || 0;
            allItems.set(item.id, {
                ...item,
                matchType: baseScore >= 1.0 ? 'prefix' : (baseScore >= 0.8 ? 'mid-word' : 'fuzzy'),
                score: baseScore
            });
        });

        // Process Semantic Results
        const MIN_SEMANTIC_SIMILARITY = 0.42; // Match recall threshold
        semanticResults.forEach((item: any) => {
            if (item.similarity < MIN_SEMANTIC_SIMILARITY) return;

            // Semantic boost is generally lower than exact keyword match but higher than weak fuzzy
            // Map 0.4-0.9 similarity to 0.5-0.9 score range
            const normalizedScore = 0.5 + (item.similarity * 0.4);

            if (!allItems.has(item.id)) {
                allItems.set(item.id, { ...item, matchType: 'semantic', score: normalizedScore });
            } else {
                // Boost existing item
                const existing = allItems.get(item.id);
                // Boost logic: 10% semantic boost to keyword match
                existing.score = Math.min(existing.score + 0.1, 1.5);
                existing.matchType = 'hybrid';
            }
        });

        // 6. Sort and Limit
        const results = Array.from(allItems.values())
            .sort((a, b) => b.score - a.score)
            .slice(0, 50);

        // Identify Recall (High Importance) items
        const recall = results.filter(i => i.importanceScore > 0 || i.score > 1.0).slice(0, 5);

        const response: any = {
            results: results,
            recall: recall
        };

        if (isDebug) {
            response.debug = {
                rawQuery,
                cleanQuery,
                filters,
                keywordCount: keywordResults.length,
                semanticCount: semanticResults.length,
            };
        }

        return NextResponse.json(response);

    } catch (error) {
        logError({
            event: 'search_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        });
        return NextResponse.json({ error: 'Failed to search' }, { status: 500 });
    }
}

// Helper to format vector for SQL
function toSql(vector: number[]) {
    return JSON.stringify(vector);
}
