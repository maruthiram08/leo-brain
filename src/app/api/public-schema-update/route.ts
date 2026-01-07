
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        console.log('Starting Schema Update...');

        // 1. Extensions
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent;`);
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log('Extensions enabled.');

        // 2. Add Column
        await db.execute(sql`ALTER TABLE items ADD COLUMN IF NOT EXISTS embedding vector(1536);`);
        console.log('Column embedding added.');

        // 3. Create Indices (Warning: These might take time)
        // HNSW Index for Vector
        await db.execute(sql`CREATE INDEX IF NOT EXISTS embedding_idx ON items USING hnsw (embedding vector_cosine_ops);`);
        console.log('HNSW Index created.');

        // GIN Index for Trigram
        await db.execute(sql`CREATE INDEX IF NOT EXISTS content_trgm_idx ON items USING gin (content gin_trgm_ops);`);
        console.log('GIN Index created.');

        return NextResponse.json({ success: true, message: 'Schema updated successfully' });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
