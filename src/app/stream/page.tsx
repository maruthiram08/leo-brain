'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Item } from '@/lib/db/schema';
import { WorkingSet } from '@/components/WorkingSet';
import { StreamTimeline } from '@/components/StreamTimeline';
import { ViewToggle } from '@/components/ViewToggle';
import { SearchBar } from '@/components/SearchBar';

export default function StreamPage() {
    const [streamItems, setStreamItems] = useState<Item[]>([]);
    const [workingSet, setWorkingSet] = useState<Item[]>([]);
    const [recallItems, setRecallItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searching, setSearching] = useState(false);
    const router = useRouter();

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/items');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();

            if (data.stream && data.workingSet) {
                setStreamItems(data.stream);
                setWorkingSet(data.workingSet);
                setRecallItems([]);
            } else if (data.items) {
                setStreamItems(data.items);
                setWorkingSet([]);
            }
        } catch {
            setError('Failed to load memory stream');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSearch = useCallback(async (query: string) => {
        if (!query.trim()) {
            fetchItems();
            return;
        }

        setSearching(true);
        try {
            const response = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Search failed');
            const data = await response.json();

            const results = data.items || data.results || [];
            const recall = data.recall || [];

            setStreamItems(results);
            setWorkingSet([]);
            setRecallItems(recall);
        } catch (err) {
            console.error(err);
            setError('Search failed');
        } finally {
            setSearching(false);
        }
    }, [fetchItems]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <div className="min-h-screen bg-[#0f172a] text-slate-300">
            {/* Minimal Header */}
            <header className="sticky top-0 z-20 bg-[#0f172a]/95 backdrop-blur-sm border-b border-slate-800/30">
                <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-8 h-8 opacity-80">
                            <img src="/leo-light.png" alt="Leo Logo" className="w-full h-full object-contain" />
                        </div>
                        <ViewToggle />
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-xs text-slate-600 hover:text-slate-400 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-2xl mx-auto px-6 py-10">
                {/* Recall Prompt - subtle, optional feel */}
                <div className="mb-16">
                    <SearchBar
                        onSearch={handleSearch}
                        isSearching={searching}
                        placeholder="Recall something…"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-24 opacity-30">
                        <div className="w-6 h-6 border border-slate-600 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-24">
                        <p className="text-slate-500 text-sm">{error}</p>
                        <button
                            onClick={fetchItems}
                            className="mt-4 text-slate-600 hover:text-slate-400 text-xs"
                        >
                            Reconnect
                        </button>
                    </div>
                ) : (streamItems.length === 0 && workingSet.length === 0 && recallItems.length === 0) ? (
                    <div className="text-center py-32">
                        <p className="text-slate-500 text-sm">Nothing here yet.</p>
                        <p className="text-slate-600 text-xs mt-2">Leo remembers quietly.</p>
                    </div>
                ) : (
                    <div>
                        {/* Recently Resurfaced (Working Set) */}
                        {!searching && workingSet.length > 0 && (
                            <section className="mb-16">
                                <h2 className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-6">
                                    Recently resurfaced
                                </h2>
                                <WorkingSet items={workingSet} />
                            </section>
                        )}

                        {/* Recall Results */}
                        {recallItems.length > 0 && (
                            <section className="mb-16 py-4 border-l-2 border-amber-500/20 pl-4">
                                <h2 className="text-xs font-medium text-amber-500/70 uppercase tracking-wider mb-4">
                                    ✨ You've seen this before
                                </h2>
                                <WorkingSet items={recallItems} />
                            </section>
                        )}

                        {/* Memory Stream */}
                        <section>
                            {searching && streamItems.length > 0 && (
                                <h2 className="text-xs font-medium text-slate-600 uppercase tracking-wider mb-6">
                                    Timeline
                                </h2>
                            )}
                            <StreamTimeline items={streamItems} />
                        </section>
                    </div>
                )}
            </main>
        </div>
    );
}

