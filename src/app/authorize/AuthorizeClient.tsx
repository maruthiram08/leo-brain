'use client';

import { useEffect, useState } from 'react';

export default function AuthorizeClient({ token }: { token: string }) {
    const [status, setStatus] = useState('Checking authentication...');
    const [manualLink, setManualLink] = useState<string | null>(null);

    useEffect(() => {
        const performAuth = async () => {
            const deepLink = `leo://auth?token=${token}`;

            setManualLink(deepLink);
            setStatus('Redirecting to Leo Desktop...');

            // Attempt redirect
            window.location.href = deepLink;

            setTimeout(() => {
                setStatus('You can close this tab if Leo Desktop is connected.');
            }, 3000);
        };

        performAuth();
    }, [token]);

    return (
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

            <div className="pt-8 border-t border-gray-800">
                <p className="text-sm text-gray-400 mb-2">Using the Chrome Extension?</p>
                <div className="flex items-center gap-2 bg-gray-900 p-2 rounded border border-gray-800">
                    <code className="text-xs text-green-400 font-mono flex-1 text-left truncate">{token}</code>
                    <button
                        onClick={() => navigator.clipboard.writeText(token).then(() => alert('Copied!'))}
                        className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded"
                    >
                        Copy
                    </button>
                </div>
            </div>
        </div>
    );
}
