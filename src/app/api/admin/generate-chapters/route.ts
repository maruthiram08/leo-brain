
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items, timeline_chapters } from '@/lib/db/schema';
import { generateChaptersFromItems } from '@/lib/chapters';
import { desc, eq } from 'drizzle-orm';

export const maxDuration = 300; // Allow 5 minutes for AI processing

/**
 * POST /api/admin/generate-chapters
 * Clusters historic items and generates "Timeline Chapters"
 */
export async function POST() {
    try {
        // 1. Fetch all items (limit 500 for now to avoid timeout)
        const allItems = await db.select()
            .from(items)
            .orderBy(desc(items.createdAt))
            .limit(500);

        // 2. Generate Chapters
        const chapters = await generateChaptersFromItems(allItems);

        if (chapters.length === 0) {
            return NextResponse.json({ message: 'No chapters generated' });
        }

        // 3. Save to DB
        console.log(`Generated ${chapters.length} chapters. Saving...`);

        let savedCount = 0;
        for (const chap of chapters) {
            // Check if we already have a chapter starting at this time
            const existing = await db.select()
                .from(timeline_chapters)
                .where(eq(timeline_chapters.startDate, chap.startDate))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(timeline_chapters).values({
                    title: chap.title,
                    summary: chap.summary,
                    startDate: chap.startDate,
                    endDate: chap.endDate,
                    topics: chap.topics,
                    score: chap.score
                });
                savedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            count: chapters.length,
            chapters: chapters.map(c => c.title)
        });

    } catch (error) {
        console.error('Chapter generation failed:', error);
        return NextResponse.json(
            { error: 'Chapter generation failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
