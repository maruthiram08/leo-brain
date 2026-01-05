'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export function ViewToggle() {
    const router = useRouter();
    const pathname = usePathname();
    const isStream = pathname === '/stream';

    const handleToggle = (mode: 'stream' | 'inbox') => {
        if (mode === 'stream') {
            document.cookie = 'leo_view_mode=stream; path=/; max-age=31536000'; // 1 year
            router.push('/stream');
        } else {
            document.cookie = 'leo_view_mode=inbox; path=/; max-age=31536000';
            router.push('/inbox');
        }
    };

    return (
        <div className="flex bg-slate-800/50 p-1 rounded-full border border-slate-700/50">
            <button
                onClick={() => handleToggle('stream')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${isStream
                        ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
            >
                Stream
            </button>
            <button
                onClick={() => handleToggle('inbox')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${!isStream
                        ? 'bg-amber-500/10 text-amber-400 shadow-sm'
                        : 'text-slate-500 hover:text-slate-300'
                    }`}
            >
                Inbox
            </button>
        </div>
    );
}
