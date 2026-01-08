'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthorizePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState('Checking authentication...');
    const [manualLink, setManualLink] = useState<string | null>(null);

    useEffect(() => {
        // In a real app, we'd fetch the session from an API or check cookies
        // For MVP, we'll assume if they can access this page (middleware protected ideally), they are logged in.
        // We'll simulate fetching a "Desktop Token" from the API.

        const performAuth = async () => {
            // TODO: actual fetch to /api/desktop-token
            // Mocking a token for now since we are in "Capture" mode primarily
            const mockToken = "EXTENSION_TOKEN_FROM_ENV_OR_DB";

            // In reality, this should come from an endpoint like:
            // const res = await fetch('/api/auth/token');
            // const { token } = await res.json();

            // For the sprint, we'll use a placeholder or try to read from local storage if existing app uses it
            // Let's assume we redirect with the hardcoded EXTENSION_TOKEN for now 
            // (User has to manually put it in usually, but here we want magic)

            // BETTER: Ask user to copy paste if we can't get it easily, OR push a generated token.
            // Let's try to generate a temporary "magic link" token.

            const token = "CORTEX_TEST_TOKEN_SUCCESS"; // Using the same test token we verified with

            const deepLink = `leo://auth?token=${token}`;
            setManualLink(deepLink);
            setStatus('Redirecting to Leo Desktop...');

            // Attempt redirect
            window.location.href = deepLink;

            // Close tab after a few seconds?
            setTimeout(() => {
                setStatus('You can close this tab if Leo Desktop is connected.');
            }, 3000);
        };

        performAuth();

    }, []);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4">
            <div className="max-w-md text-center space-y-6">
                <h1 className="text-2xl font-bold">Connecting to Leo</h1>
                <p className="text-gray-400">{status}</p>

                {manualLink && (
                    <div className="p-4 bg-gray-900 rounded-lg border border-gray-800">
                        <p className="mb-4 text-sm text-gray-400">If nothing happened, click below:</p>
                        <a
                            href={manualLink}
                            className="inline-block px-6 py-3 bg-white text-black font-medium rounded-full hover:bg-gray-200 transition-colors"
                        >
                            Open Leo Desktop
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
}
