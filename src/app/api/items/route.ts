import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, timeline_chapters } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const showArchived = searchParams.get('archived') === 'true';

        // 1. Fetch Working Set (Top 7 by importance, not archived)
        // Only valid for non-archived view
        let workingSet: typeof items.$inferSelect[] = [];
        if (!showArchived) {
            workingSet = await db
                .select()
                .from(items)
                .where(eq(items.isArchived, false))
                .orderBy(desc(items.importanceScore), desc(items.createdAt))
                .limit(7);
        }

        const workingSetIds = workingSet.map(i => i.id);

        // 2. Fetch Stream (Chronological, excluding Working Set)
        let streamQuery = db
            .select()
            .from(items)
            .where(eq(items.isArchived, showArchived))
            .orderBy(desc(items.createdAt))
            .limit(100); // Pagination later

        const stream = await streamQuery;

        // Filter out working set items from stream to avoid dupes in UI
        const filteredStream = stream.filter(item => !workingSetIds.includes(item.id));

        // 3. Fetch Chapters
        const chapters = await db
            .select()
            .from(timeline_chapters)
            .orderBy(desc(timeline_chapters.startDate));

        return NextResponse.json({
            stream: filteredStream,
            workingSet: workingSet,
            chapters: chapters
        });
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}
