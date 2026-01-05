'use client';

import { Item } from '@/lib/db/schema';

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
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4 px-2">
                Recently Relevant
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map((item) => (
                    <a
                        key={item.id}
                        href={item.contentType === 'url' ? item.content : '#'}
                        target={item.contentType === 'url' ? '_blank' : undefined}
                        onClick={() => handleInteraction(item.id, 'view')}
                        className="group block p-4 rounded-2xl bg-slate-800/30 hover:bg-slate-800/60 border border-slate-800/50 hover:border-slate-700 transition-all duration-300 backdrop-blur-sm"
                    >
                        <div className="flex items-start gap-3">
                            <div className="mt-1 w-2 h-2 rounded-full bg-amber-500/50 group-hover:bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.3)] transition-all"></div>
                            <div className="flex-1 min-w-0">
                                <p className="text-slate-300 group-hover:text-slate-100 text-sm leading-relaxed line-clamp-3 font-medium font-sans">
                                    {item.content}
                                </p>
                                <div className="mt-2 text-xs text-slate-500 group-hover:text-slate-400 truncate">
                                    {item.contentType === 'url' ? new URL(item.content).hostname : 'Note'} • {new Date(item.createdAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            </div>
                        </div>
                    </a>
                ))}
            </div>
        </section>
    );
}
