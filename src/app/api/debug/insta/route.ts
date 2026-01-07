import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { ilike } from 'drizzle-orm';

export async function GET() {
    try {
        const results = await db.select().from(items).where(ilike(items.content, '%insta%'));
        return NextResponse.json({
            count: results.length,
            items: results.map(i => ({
                id: i.id,
                content: i.content,
                isArchived: i.isArchived,
                score: i.importanceScore
            }))
        });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
