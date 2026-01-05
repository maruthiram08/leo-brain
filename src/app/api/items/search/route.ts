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

        const result = await db
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

        return NextResponse.json({ items: result });
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
