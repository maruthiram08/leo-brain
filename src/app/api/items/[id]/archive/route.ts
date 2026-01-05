import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await db
            .update(items)
            .set({ isArchived: true, updatedAt: new Date() })
            .where(eq(items.id, id));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Failed to archive item:', error);
        return NextResponse.json(
            { error: 'Failed to archive item' },
            { status: 500 }
        );
    }
}
