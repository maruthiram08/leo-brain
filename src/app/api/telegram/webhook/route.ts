import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { sendTelegramMessage, isUrl, TelegramUpdate } from '@/lib/telegram';
import { isRateLimited } from '@/lib/rate-limiter';
import { logInfo, logError, logWarn, withRetry } from '@/lib/logger';

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        const update: TelegramUpdate = await request.json();

        // Only process text messages
        const message = update.message;
        if (!message?.text) {
            return NextResponse.json({ ok: true });
        }

        const userId = message.from?.id?.toString();
        const chatId = message.chat.id;
        const content = message.text;

        // Skip if no user ID
        if (!userId) {
            logWarn({ event: 'webhook_no_user_id', chatId: chatId.toString() });
            return NextResponse.json({ ok: true });
        }

        // Skip bot commands for now
        if (content.startsWith('/')) {
            await sendTelegramMessage(chatId, '👋 Send me any text or URL to save it!');
            return NextResponse.json({ ok: true });
        }

        // Rate limit check
        if (isRateLimited(userId)) {
            logWarn({ event: 'rate_limited', userId });
            await sendTelegramMessage(chatId, '⚠️ Too fast! Please slow down.');
            return NextResponse.json({ ok: true });
        }

        // Detect content type
        const contentType = isUrl(content) ? 'url' : 'text';

        // Save to database with retry logic
        let saved = false;
        try {
            await withRetry(
                async () => {
                    await db.insert(items).values({
                        telegramUserId: userId,
                        contentType,
                        content,
                    });
                },
                {
                    maxRetries: 1,
                    baseDelayMs: 100,
                    onRetry: (attempt, error) => {
                        logWarn({
                            event: 'db_insert_retry',
                            userId,
                            contentPreview: content.substring(0, 50),
                            attempt,
                            error: error.message,
                        });
                    },
                }
            );

            saved = true;

            logInfo({
                event: 'item_saved',
                userId,
                contentType,
                contentPreview: content.substring(0, 50),
                duration: Date.now() - startTime,
            });

            await sendTelegramMessage(chatId, 'Saved ✅');
        } catch (dbError) {
            logError({
                event: 'db_insert_failed',
                userId,
                contentPreview: content.substring(0, 50),
                error: dbError instanceof Error ? dbError.message : 'Unknown error',
                duration: Date.now() - startTime,
            });

            // Only send error message if save actually failed
            if (!saved) {
                await sendTelegramMessage(chatId, '❌ Failed to save. Please try again.');
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        logError({
            event: 'webhook_error',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        });
        return NextResponse.json({ ok: true }); // Always return 200 to Telegram
    }
}

// Telegram sends GET to verify webhook
export async function GET() {
    return NextResponse.json({ status: 'Leo webhook is active' });
}
