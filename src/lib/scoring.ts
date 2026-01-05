import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import { logInfo } from '@/lib/logger';

export type SignalType = 'view' | 'copy' | 'recall_click';

const SIGNAL_WEIGHTS = {
    view: 1,
    copy: 3,
    recall_click: 5,
};

/**
 * Updates the importance score of an item based on a user interaction.
 * This is the "Invisible Brain" logic.
 */
export async function updateImportance(itemId: string, signal: SignalType) {
    const weight = SIGNAL_WEIGHTS[signal];

    try {
        // We increment the count and the score atomically
        const updateData: Record<string, any> = {
            importanceScore: sql`${items.importanceScore} + ${weight}`,
            updatedAt: new Date(),
        };

        if (signal === 'view') {
            updateData.viewCount = sql`${items.viewCount} + 1`;
            updateData.lastViewedAt = new Date();
        } else if (signal === 'copy') {
            updateData.copyCount = sql`${items.copyCount} + 1`;
            updateData.lastViewedAt = new Date(); // Copy implies view
        } else if (signal === 'recall_click') {
            updateData.viewCount = sql`${items.viewCount} + 1`;
            updateData.lastViewedAt = new Date();
            updateData.lastRecallAt = new Date();
        }

        await db
            .update(items)
            .set(updateData)
            .where(eq(items.id, itemId));

        logInfo({
            event: 'importance_updated',
            itemId,
            signal,
            weightAdded: weight,
        });
    } catch (error) {
        console.error('Failed to update importance:', error);
        // We don't throw here to avoid blocking the UI for an "invisible" background op
    }
}
