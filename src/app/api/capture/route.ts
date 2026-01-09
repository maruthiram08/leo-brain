import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { logInfo, logError, logWarn } from '@/lib/logger';
import { generateEmbedding } from '@/lib/embeddings';

const EXTENSION_TOKEN = process.env.EXTENSION_TOKEN;

interface CapturePayload {
    type: 'selection' | 'image' | 'page' | 'clipboard';
    content: string;
    url: string;
    title: string;
    timestamp: number;
    source: string;
    device: string;
}

export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Auth Check
        const authHeader = request.headers.get('Authorization');
        if (!EXTENSION_TOKEN || authHeader !== `Bearer ${EXTENSION_TOKEN}`) {
            logWarn({ event: 'capture_unauthorized', ip: request.headers.get('x-forwarded-for') ?? 'unknown' });
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload: CapturePayload = await request.json();

        // Determine content type for storage
        // If it's an image capture, we might store as 'url' or distinct type later
        // For now, map extension types to DB contentTypes
        let dbContentType = 'text';
        if (payload.type === 'page' || payload.type === 'image') {
            dbContentType = 'url';
        }

        // If it's a URL selection, treat as URL
        if (payload.type === 'selection' && /^https?:\/\//.test(payload.content.trim())) {
            dbContentType = 'url';
        }

        const contentToSave = payload.type === 'page'
            ? payload.url
            : payload.type === 'image'
                ? '(Processing Image...)' // Do not save base64 to DB
                : payload.content || payload.url;

        if (!contentToSave) {
            return NextResponse.json({ error: 'No content to save' }, { status: 400 });
        }

        const userId = "extension-user";
        let embedding: number[] | null = null;

        // Skip embedding for initial image placeholder
        if (payload.type !== 'image') {
            try {
                const context = `${contentToSave} ${dbContentType === 'url' ? 'URL' : 'Note'}`;
                embedding = await generateEmbedding(context);
            } catch (e) {
                console.error('Failed to generate embedding during capture:', e);
            }
        }

        const [inserted] = await db.insert(items).values({
            telegramUserId: userId,
            contentType: dbContentType,
            content: contentToSave,
            embedding,
        }).returning({ id: items.id });

        // Handle Image Processing (Blocking)
        if (payload.type === 'image' && payload.content) {
            // We await this so the user sees "Leo Saved" only after OCR is done (3-5s)
            // This ensures the DB is updated with text before the user tries to recall it.
            await processImageContent(inserted.id, payload.content);
        }

        // Fire-and-forget enrichment (non-blocking) for URLs
        if (dbContentType === 'url' && payload.type !== 'image' && inserted?.id) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://leo-brain.vercel.app';

            // If we have full page content from extension, use it for AI analysis directly
            if (payload.type === 'page' && payload.content && payload.content.length > 200) {
                fetch(`${baseUrl}/api/enrich-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: inserted.id, url: contentToSave })
                }).catch(() => { });

                processPageContent(inserted.id, payload.content, payload.url).catch(err => {
                    console.error('Content analysis failed:', err);
                });
            } else {
                fetch(`${baseUrl}/api/enrich-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: inserted.id, url: contentToSave })
                }).catch(() => { });
            }
        }

        logInfo({
            event: 'capture_saved',
            source: payload.source,
            type: payload.type,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ success: true, id: inserted?.id });

    } catch (error) {
        logError({
            event: 'capture_failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime,
        });
        return NextResponse.json(
            { error: 'Failed to save capture' },
            { status: 500 }
        );
    }
}

import { enrichContentWithAi, enrichImageWithAi } from '@/lib/ai';

async function processPageContent(itemId: string, content: string, url: string) {
    try {
        const aiResult = await enrichContentWithAi(content, url);

        if (aiResult.topics.length > 0 || aiResult.description) {
            await db.update(items)
                .set({
                    aiSummary: aiResult.description?.slice(0, 200),
                    aiTopics: aiResult.topics.join(','),
                    aiIntent: aiResult.intent.join(','),
                    aiDomain: aiResult.domain,
                    updatedAt: new Date()
                })
                .where(eq(items.id, itemId));

            console.log(`Content analysis complete for ${itemId}: ${aiResult.topics.join(',')}`);
        }
    } catch (e) {
        console.error('Error in processPageContent:', e);
    }
}

async function processImageContent(itemId: string, base64Image: string) {
    try {
        console.log(`Processing image for item ${itemId}`);
        const aiResult = await enrichImageWithAi(base64Image);

        await db.update(items)
            .set({
                // Replace the temporary content with the OCR text
                content: aiResult.extractedText || '(Image with no readable text)',
                aiSummary: aiResult.description?.slice(0, 200),
                aiTopics: aiResult.topics.join(','),
                aiDomain: 'content', // generic
                contentType: 'note', // Convert from 'image' to 'note' since we just have text now
                updatedAt: new Date()
            })
            .where(eq(items.id, itemId));

        console.log(`Image analysis complete for ${itemId}: ${aiResult.topics.join(',')}`);
    } catch (e) {
        console.error('Error in processImageContent:', e);
    }
}
