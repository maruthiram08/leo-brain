'use client';

import { useState } from 'react';
import { Item } from '@/lib/db/schema';
import { formatTimestamp, isUrl, getRelativeTime } from '@/lib/utils';

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
    let domain = '';
    try {
        if (isLink) domain = new URL(item.content).hostname.replace(/^www\./, '');
    } catch {
        // ignore
    }

    // Minimal mode = ambient, no cards
    // Classic mode = inbox with visible actions
    if (minimal) {
        return (
            <div className="group py-2 transition-colors">
                {isLink ? (
                    <div>
                        <a
                            href={item.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => logInteraction('view')}
                            className="text-slate-300 hover:text-slate-100 text-sm transition-colors"
                        >
                            {item.enrichedTitle || domain}
                        </a>
                        {item.enrichedDescription && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                {item.enrichedDescription}
                            </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-600">{domain}</span>
                            <span className="text-xs text-slate-700">·</span>
                            <span className="text-xs text-slate-600">{getRelativeTime(item.createdAt)}</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap break-words line-clamp-3">
                            {item.content}
                        </p>
                        <span className="text-xs text-slate-600 mt-1 block">
                            {getRelativeTime(item.createdAt)}
                        </span>
                    </div>
                )}

                {/* Hover-only copy action */}
                <button
                    onClick={handleCopy}
                    className="absolute right-0 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-slate-300 transition-all text-xs"
                    title="Copy"
                >
                    {copied ? '✓' : '⎘'}
                </button>
            </div>
        );
    }

    // Classic card mode for inbox
    return (
        <div className="group bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 transition-all">
            <div className="mb-2">
                {isLink ? (
                    <div>
                        <a
                            href={item.content}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => logInteraction('view')}
                            className="text-amber-400 hover:text-amber-300 hover:underline transition-colors"
                        >
                            {item.enrichedTitle || item.content}
                        </a>
                        {item.enrichedDescription && (
                            <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                                {item.enrichedDescription}
                            </p>
                        )}
                        {domain && (
                            <span className="inline-block text-xs text-slate-500 mt-1">
                                {domain}
                            </span>
                        )}
                    </div>
                ) : (
                    <p className="whitespace-pre-wrap break-words text-slate-200">
                        {item.content}
                    </p>
                )}
            </div>

            <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">
                    {formatTimestamp(item.createdAt)}
                </span>

                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
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

                    {onUnarchive && (
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

                    {onArchive && (
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
        </div>
    );
}

