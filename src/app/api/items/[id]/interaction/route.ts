import { NextRequest, NextResponse } from 'next/server';
import { updateImportance, SignalType } from '@/lib/scoring';
import { logError } from '@/lib/logger';

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const signal = body.signal as SignalType;

        if (!['view', 'copy', 'recall_click'].includes(signal)) {
            return NextResponse.json({ error: 'Invalid signal' }, { status: 400 });
        }

        // Fire and forget - don't wait for scoring to update
        // This ensures UI stays snappy
        updateImportance(id, signal).catch(err =>
            console.error('Background scoring update failed:', err)
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        logError({
            event: 'interaction_error',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        return NextResponse.json(
            { error: 'Failed to record interaction' },
            { status: 500 }
        );
    }
}
