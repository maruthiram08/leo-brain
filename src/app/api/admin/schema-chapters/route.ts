
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * POST /api/admin/schema-chapters
 * Creates the timeline_chapters table for "Timeline Chapters" feature
 */
export async function POST() {
    try {
        console.log('Running schema migration for timeline_chapters...');

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS timeline_chapters (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                title TEXT NOT NULL,
                summary TEXT,
                start_date TIMESTAMPTZ NOT NULL,
                end_date TIMESTAMPTZ NOT NULL,
                topics JSONB,
                score DOUBLE PRECISION DEFAULT 0.0,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // Add index on start_date for efficient timeline sorting and querying
        await db.execute(sql`
            CREATE INDEX IF NOT EXISTS idx_timeline_chapters_start_date ON timeline_chapters (start_date);
        `);

        return NextResponse.json({
            success: true,
            message: 'timeline_chapters table created successfully'
        });
    } catch (error) {
        console.error('Schema update failed:', error);
        return NextResponse.json(
            { error: 'Schema update failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
