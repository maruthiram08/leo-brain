
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { sql, desc, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const query = 'algo';

        // Test 1: Just ILIKE
        await db.select().from(items).where(ilike(items.content, `%${query}%`)).limit(1);

        // Test 2: Similarity
        await db.select().from(items).where(sql`similarity(${items.content}, ${query}) > 0.1`).limit(1);

        // Test 3: The Complex CASE WHEN (stripped)
        const results = await db.select({
            id: items.id,
            matchScore: sql<number>`
                CASE 
                    WHEN ${items.content} ILIKE ${query + '%'} THEN 1.0
                    ELSE 0.0
                END
            `
        }).from(items).limit(1);

        // Test 4: Order By Alias
        await db.select({
            id: items.id,
            matchScore: sql<number>`1`
        }).from(items).orderBy(desc(sql`matchScore`)).limit(1);

        return NextResponse.json({ success: true, steps: 'All passed' });
    } catch (e) {
        return NextResponse.json({ error: String(e), stack: e instanceof Error ? e.stack : undefined }, { status: 500 });
    }
}
