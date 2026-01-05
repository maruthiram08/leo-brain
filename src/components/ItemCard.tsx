'use client';

import { useState } from 'react';
import { Item } from '@/lib/db/schema';
import { formatTimestamp, isUrl } from '@/lib/utils';

interface ItemCardProps {
    item: Item;
    onArchive?: () => void;
    onUnarchive?: () => void;
}

export function ItemCard({ item, onArchive, onUnarchive, minimal = false }: ItemCardProps & { minimal?: boolean }) {
    const [copied, setCopied] = useState(false);
    const [updating, setUpdating] = useState(false);

    const logInteraction = async (signal: 'view' | 'copy') => {
        try {
            await fetch(`/api/items/${item.id}/interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal }),
            });
        } catch (e) {
            console.error('Failed to log interaction', e);
        }
    };

    const handleCopy = async () => {
        await navigator.clipboard.writeText(item.content);
        setCopied(true);
        logInteraction('copy');
        setTimeout(() => setCopied(false), 2000);
    };

    const handleArchive = async () => {
        if (!onArchive) return;
        setUpdating(true);
        try {
            const response = await fetch(`/api/items/${item.id}/archive`, {
                method: 'POST',
            });
            if (response.ok) {
                onArchive();
            }
        } catch (error) {
            console.error('Failed to archive:', error);
        } finally {
            setUpdating(false);
        }
    };

    const handleUnarchive = async () => {
        if (!onUnarchive) return;
        setUpdating(true);
        try {
            const response = await fetch(`/api/items/${item.id}/unarchive`, {
                method: 'POST',
            });
            if (response.ok) {
                onUnarchive();
            }
        } catch (error) {
            console.error('Failed to unarchive:', error);
        } finally {
            setUpdating(false);
        }
    };

    const isLink = isUrl(item.content);

    // Minimal mode (Stream) vs Classic mode (Inbox)
    const containerClasses = minimal
        ? "group relative pl-4 transition-all" // No border, no background default
        : "group bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 transition-all";

    return (
        <div className={containerClasses}>
            {/* Content */}
            <div className="mb-2">
                {isLink ? (
                    <a
                        href={item.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => logInteraction('view')}
                        className={`break-all transition-colors ${minimal ? 'text-slate-300 hover:text-amber-400 font-medium' : 'text-amber-400 hover:text-amber-300 hover:underline'}`}
                    >
                        {item.content}
                    </a>
                ) : (
                    <p className={`whitespace-pre-wrap break-words ${minimal ? 'text-slate-300' : 'text-slate-200'}`}>
                        {item.content}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className={`flex items-center justify-between ${minimal ? 'opacity-0 group-hover:opacity-100 transition-opacity' : ''}`}>
                <span className="text-xs text-slate-500">
                    {formatTimestamp(item.createdAt)}
                </span>

                <div className={`flex items-center gap-2 ${minimal ? '' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}>
                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                        title="Copy"
                    >
                        {copied ? (
                            <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    {/* Unarchive Button */}
                    {onUnarchive && !minimal && (
                        <button
                            onClick={handleUnarchive}
                            disabled={updating}
                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                            title="Unarchive"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                            </svg>
                        </button>
                    )}

                    {/* Archive Button - Hidden in minimal mode */}
                    {onArchive && !minimal && (
                        <button
                            onClick={handleArchive}
                            disabled={updating}
                            className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                            title="Archive"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Toast */}
            {copied && (
                <div className="fixed bottom-4 right-4 bg-slate-800 border border-slate-700 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in z-50">
                    Copied!
                </div>
            )}
        </div>
    );
}
