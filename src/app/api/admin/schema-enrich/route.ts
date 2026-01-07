import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

/**
 * POST /api/admin/schema-enrich
 * Adds URL enrichment columns to the items table
 */
export async function POST() {
    try {
        // Add enrichment columns
        await db.execute(sql`
            ALTER TABLE items 
            ADD COLUMN IF NOT EXISTS enriched_title TEXT,
            ADD COLUMN IF NOT EXISTS enriched_description TEXT,
            ADD COLUMN IF NOT EXISTS enrichment_content_type TEXT,
            ADD COLUMN IF NOT EXISTS source_domain TEXT,
            ADD COLUMN IF NOT EXISTS favicon_url TEXT,
            ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS enrichment_attempted_at TIMESTAMPTZ
        `);

        return NextResponse.json({
            success: true,
            message: 'Enrichment columns added successfully'
        });
    } catch (error) {
        console.error('Schema update failed:', error);
        return NextResponse.json(
            { error: 'Schema update failed', details: error instanceof Error ? error.message : 'Unknown' },
            { status: 500 }
        );
    }
}
