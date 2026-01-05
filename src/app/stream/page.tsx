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
    const [recallItems, setRecallItems] = useState<Item[]>([]); // New recall state
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
                // Fallback for legacy format if any
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

            // Search temporarily replaces stream view
            // V3 might treat search results differently (recall vs stream filters)
            const results = data.items || data.results || [];
            const recall = data.recall || [];

            setStreamItems(results);
            setWorkingSet([]); // Hide working set during search filtering
            setRecallItems(recall); // Set recall items
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
        <div className="min-h-screen bg-slate-900 text-slate-200">
            {/* Header */}
            <header className="sticky top-0 z-20 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800/50">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 opacity-80">
                            <span className="text-xl">🦁</span>
                        </div>
                        <h1 className="text-xl font-bold text-white hidden sm:block">Leo</h1>
                        <div className="ml-4">
                            <ViewToggle />
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-8">
                <div className="mb-12">
                    <SearchBar
                        onSearch={handleSearch}
                        isSearching={searching}
                        placeholder="What are you thinking about?"
                    />
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20 opacity-50">
                        <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-rose-400">{error}</p>
                        <button
                            onClick={fetchItems}
                            className="mt-4 text-slate-400 hover:text-slate-200"
                        >
                            Reconnect
                        </button>
                    </div>
                ) : (streamItems.length === 0 && workingSet.length === 0 && recallItems.length === 0) ? (
                    <div className="text-center py-32 opacity-60">
                        <p className="text-lg font-medium text-slate-400">Leo remembers quietly.</p>
                        <p className="text-slate-500 mt-2">There’s nothing here yet.</p>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        {/* Working Set (Only when NOT searching) */}
                        {!searching && workingSet.length > 0 && (
                            <WorkingSet items={workingSet} />
                        )}

                        {/* Recall Section (Only when searching + items exist) */}
                        {recallItems.length > 0 && (
                            <section className="mb-12 mx-2 sm:mx-0 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
                                <h2 className="flex items-center gap-2 text-xs font-semibold text-amber-500 uppercase tracking-widest mb-4">
                                    <span className="text-lg">✨</span> You’ve seen this before
                                </h2>
                                <WorkingSet items={recallItems} />
                            </section>
                        )}

                        {/* Stream / Search Results */}
                        <div className="relative">
                            {searching && streamItems.length > 0 && <h2 className="text-xs font-semibold text-slate-600 uppercase tracking-widest mb-6 pl-2">Timeline Matches</h2>}
                            <StreamTimeline items={streamItems} />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
