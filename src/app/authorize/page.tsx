import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import { createAppToken } from '@/lib/auth';

import AuthorizeClient from './AuthorizeClient';

// Server Component
export default async function AuthorizePage() {
    // 1. Check Clerk Auth
    const { userId } = await auth();

    if (!userId) {
        redirect('/sign-in?redirect_url=/authorize');
    }

    // 2. Mint App Token
    const token = await createAppToken(userId);

    // 3. Pass to Client
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <Suspense fallback={<div className="text-gray-400">Loading...</div>}>
                <AuthorizeClient token={token} />
            </Suspense>
        </div>
    );
}
