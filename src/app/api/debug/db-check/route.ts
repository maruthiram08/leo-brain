
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const query = 'test';
        // Test 1: Simple Select
        await db.select().from(items).limit(1);

        // Test 2: Similarity Function
        try {
            await db.execute(sql`SELECT similarity('a', 'b')`);
        } catch (e) {
            return NextResponse.json({ error: 'pg_trgm missing', details: String(e) });
        }

        return NextResponse.json({ success: true, message: 'DB and pg_trgm OK' });
    } catch (e) {
        return NextResponse.json({ error: 'DB Connection Failed', details: String(e) });
    }
}
