import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * POST /api/admin/schema-v5
 * Adds V5 Ambient Memory Layer columns to the items table
 */
export async function POST() {
    try {
        // Add V5 columns for Earned Recall
        await db.execute(sql`
            ALTER TABLE items 
            ADD COLUMN IF NOT EXISTS decay_score INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS dismiss_count INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN IF NOT EXISTS source_url TEXT,
            ADD COLUMN IF NOT EXISTS source_page_title TEXT,
            ADD COLUMN IF NOT EXISTS last_recall_shown_at TIMESTAMPTZ
        `);

        return NextResponse.json({
            success: true,
            message: 'V5 Ambient Memory columns added successfully'
        });
    } catch (error) {
        console.error('Schema update failed:', error);
        return NextResponse.json(
            { error: 'Schema update failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
