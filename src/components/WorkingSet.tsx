'use client';

import { Item } from '@/lib/db/schema';
import { getRelativeTime } from '@/lib/utils';

interface WorkingSetProps {
    items: Item[];
}

export function WorkingSet({ items }: WorkingSetProps) {
    if (items.length === 0) return null;

    const handleInteraction = async (id: string, signal: 'view' | 'copy') => {
        try {
            await fetch(`/api/items/${id}/interaction`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal }),
            });
        } catch (e) {
            console.error('Failed to log interaction', e);
        }
    };

    return (
        <section className="mb-12">
            <div className="mb-4 px-2">
                <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                    Recently Relevant
                </h2>
                <p className="text-[10px] text-slate-600 font-medium mt-1 pl-0.5">Things that seem to matter recently.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => {
                    let isUrl = item.contentType === 'url';
                    let domain = '';
                    try {
                        if (isUrl) domain = new URL(item.content).hostname.replace(/^www\./, '');
                    } catch (e) { isUrl = false; }

                    return (
                        <a
                            key={item.id}
                            href={isUrl ? item.content : '#'}
                            target={isUrl ? '_blank' : undefined}
                            onClick={() => handleInteraction(item.id, 'view')}
                            className="group block p-3 rounded-lg hover:bg-slate-800/30 transition-all duration-300"
                        >
                            <div className="flex flex-col gap-2">
                                {/* Primary Content */}
                                <div className="min-w-0">
                                    {isUrl ? (
                                        <>
                                            <p className="text-slate-300 group-hover:text-slate-100 text-sm font-medium leading-relaxed truncate">
                                                {item.enrichedTitle || domain}
                                            </p>
                                            {item.enrichedDescription && (
                                                <p className="text-slate-400 text-xs line-clamp-2 mt-1">
                                                    {item.enrichedDescription}
                                                </p>
                                            )}
                                        </>
                                    ) : (
                                        <p className="text-slate-300 group-hover:text-slate-100 text-sm leading-relaxed line-clamp-3 font-medium font-sans">
                                            {item.content}
                                        </p>
                                    )}
                                </div>

                                {/* Metadata */}
                                <div className="text-[10px] text-slate-600 transition-colors">
                                    {getRelativeTime(new Date(item.createdAt!))}
                                </div>
                            </div>
                        </a>
                    );
                })}
            </div>
        </section>
    );
}


