import { NextResponse } from 'next/server';

export async function GET() {
    return NextResponse.json({
        envChecks: {
            NODE_ENV: process.env.NODE_ENV,
            HAS_OPENAI_KEY: !!process.env.OPENAI_API_KEY,
            OPENAI_KEY_PREFIX: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.slice(0, 5) + '...' : 'MISSING',
            HAS_DB_URL: !!process.env.DATABASE_URL,
            HAS_EXT_TOKEN: !!process.env.EXTENSION_TOKEN,
        }
    });
}
