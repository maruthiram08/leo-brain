import { NextRequest, NextResponse } from 'next/server';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { password } = body;

        if (!password) {
            return NextResponse.json(
                { error: 'Password is required' },
                { status: 400 }
            );
        }

        if (!verifyPassword(password)) {
            return NextResponse.json(
                { error: 'Invalid password' },
                { status: 401 }
            );
        }

        // Create session and set cookie
        const token = await createSession();
        await setSessionCookie(token);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { error: 'Login failed' },
            { status: 500 }
        );
    }
}
