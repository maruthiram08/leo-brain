import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { items } from '@/lib/db/schema';
import { logInfo, logError, logWarn } from '@/lib/logger';

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

        await db.insert(items).values({
            telegramUserId: userId, // We're using this field for generic user ID for now
            contentType: dbContentType,
            content: contentToSave,
        });

        logInfo({
            event: 'capture_saved',
            source: payload.source,
            type: payload.type,
            duration: Date.now() - startTime
        });

        return NextResponse.json({ success: true });

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
