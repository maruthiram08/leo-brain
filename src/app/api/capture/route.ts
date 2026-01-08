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

        const contentToSave = payload.type === 'image' || payload.type === 'page'
            ? payload.url
            : payload.content || payload.url; // Fallback to URL if content empty (e.g. page capture)

        if (!contentToSave) {
            return NextResponse.json({ error: 'No content to save' }, { status: 400 });
        }

        // Use a dedicated "extension" user ID or similar for now, 
        // or we could pass a userId in the payload if we had user auth in extension.
        // Spec says "static token for MVP", implies single user or shared token.
        // For MVP, we'll associate it with a default extension user ID or similar, 
        // BUT since we don't have multi-user yet, we can just use "extension-user".
        const userId = "extension-user";

        // Generate embedding (asynchronously or check await?)
        // For MVP, await it. Speed is less critical than consistency.
        let embedding: number[] | null = null;
        try {
            // Context strategy: Content + Type
            const context = `${contentToSave} ${dbContentType === 'url' ? 'URL' : 'Note'}`;
            embedding = await generateEmbedding(context);
        } catch (e) {
            console.error('Failed to generate embedding during capture:', e);
            // Proceed without embedding (will be null)
        }

        const [inserted] = await db.insert(items).values({
            telegramUserId: userId, // We're using this field for generic user ID for now
            contentType: dbContentType,
            content: contentToSave,
            embedding,
        }).returning({ id: items.id });

        // Fire-and-forget enrichment (non-blocking)
        if (dbContentType === 'url' && inserted?.id) {
            const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://leo-brain.vercel.app';

            // If we have full page content from extension, use it for AI analysis directly
            // This is better for pages behind login (Reddit, Mem.ai, etc.)
            if (payload.type === 'page' && payload.content && payload.content.length > 200) {
                // We still call enrich-url for Tier 1 metadata (favicon, etc.)
                fetch(`${baseUrl}/api/enrich-url`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ itemId: inserted.id, url: contentToSave })
                }).catch(() => { });

                // Trigger content analysis
                processPageContent(inserted.id, payload.content, payload.url).catch(err => {
                    console.error('Content analysis failed:', err);
                });
            } else {
                // Standard URL enrichment (visits URL)
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

import { enrichContentWithKimi } from '@/lib/kimi';

async function processPageContent(itemId: string, content: string, url: string) {
    try {
        const aiResult = await enrichContentWithKimi(content, url);

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
