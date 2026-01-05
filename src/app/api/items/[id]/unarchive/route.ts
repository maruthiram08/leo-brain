import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logError } from '@/lib/logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const startTime = Date.now();
    try {
        const { id } = await params;

        await db
            .update(items)
            .set({ isArchived: false, updatedAt: new Date() })
            .where(eq(items.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({
            event: 'unarchive_item_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        });
        return NextResponse.json(
            { error: 'Failed to unarchive item' },
            { status: 500 }
        );
    }
}
