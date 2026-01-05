import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { desc, eq, and } from 'drizzle-orm';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const showArchived = searchParams.get('archived') === 'true';

        const result = await db
            .select()
            .from(items)
            .where(eq(items.isArchived, showArchived))
            .orderBy(desc(items.createdAt))
            .limit(500);

        return NextResponse.json({ items: result });
    } catch (error) {
        console.error('Failed to fetch items:', error);
        return NextResponse.json(
            { error: 'Failed to fetch items' },
            { status: 500 }
        );
    }
}
