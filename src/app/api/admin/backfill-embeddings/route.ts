
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { isNull, eq } from 'drizzle-orm';
import { generateEmbedding } from '@/lib/embeddings';

export const maxDuration = 60; // Allow 60s for batch processing

export async function GET() {
    try {
        // Fetch items without embeddings
        const pendingItems = await db
            .select()
            .from(items)
            .where(isNull(items.embedding))
            .limit(20);

        if (pendingItems.length === 0) {
            return NextResponse.json({ message: 'No pending embeddings', count: 0 });
        }

        console.log(`Processing ${pendingItems.length} items...`);

        let successCount = 0;
        let failCount = 0;

        // Process in parallel
        await Promise.all(pendingItems.map(async (item) => {
            try {
                // Combine content + metadata for embedding context
                const textToEmbed = `${item.content} ${item.contentType === 'url' ? 'URL' : 'Note'}`;
                const embedding = await generateEmbedding(textToEmbed);

                await db
                    .update(items)
                    .set({ embedding })
                    .where(eq(items.id, item.id));

                successCount++;
            } catch (error) {
                console.error(`Failed to embed item ${item.id}`, error);
                failCount++;
            }
        }));

        return NextResponse.json({
            success: true,
            processed: successCount,
            failed: failCount,
            remaining: pendingItems.length === 20 ? 'More pending' : 'Done'
        });

    } catch (e) {
        return NextResponse.json({ error: String(e) }, { status: 500 });
    }
}
