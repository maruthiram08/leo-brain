import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { desc, and, eq, ilike } from 'drizzle-orm';
import { logError } from '@/lib/logger';

export async function GET(request: NextRequest) {
    const startTime = Date.now();
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query) {
            return NextResponse.json({ items: [] });
        }

        // 1. Recall Logic: High importance items matching query
        const recall = await db
            .select()
            .from(items)
            .where(
                and(
                    eq(items.isArchived, false),
                    ilike(items.content, `%${query}%`)
                )
            )
            .orderBy(desc(items.importanceScore))
            .limit(3);

        const recallIds = recall.map(i => i.id);

        // 2. Standard Results: Chronological
        const results = await db
            .select()
            .from(items)
            .where(
                and(
                    eq(items.isArchived, false),
                    ilike(items.content, `%${query}%`)
                )
            )
            .orderBy(desc(items.createdAt))
            .limit(100);

        // Filter out recall items from standard results
        const filteredResults = results.filter(item => !recallIds.includes(item.id));

        return NextResponse.json({
            results: filteredResults,
            recall: recall.length > 0 && recall[0].importanceScore > 0 ? recall : [] // Only show recall if it has some score signal
        });
    } catch (error) {
        logError({
            event: 'search_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        });
        return NextResponse.json(
            { error: 'Failed to search items' },
            { status: 500 }
        );
    }
}
