
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { NextResponse } from 'next/server';

export async function POST() {
    try {
        await db.insert(items).values({
            telegramUserId: 'debug-user',
            content: 'https://investopedia.com/algorithmic-trading',
            contentType: 'url',
            enrichedTitle: 'Understanding Algorithmic Trading Strategies',
            enrichedDescription: 'A guide to algo trading including mean reversion and trend following.',
            sourceDomain: 'investopedia.com',
            createdAt: new Date(),
            updatedAt: new Date()
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
