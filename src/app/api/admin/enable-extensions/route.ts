
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';

export async function GET() {
    try {
        console.log('Enabling extensions...');
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent;`);
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);

        return NextResponse.json({ success: true, message: 'Extensions enabled: pg_trgm, unaccent, vector' });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
