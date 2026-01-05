'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Item } from '@/lib/db/schema';
import { groupItemsByDate } from '@/lib/utils';
import { ItemCard } from '@/components/ItemCard';
import Link from 'next/link';

export default function ArchivePage() {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    const fetchItems = async () => {
        try {
            const response = await fetch('/api/items?archived=true');
            if (!response.ok) throw new Error('Failed to fetch');
            const data = await response.json();
            setItems(data.items);
        } catch {
            setError('Failed to load items');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    const handleUnarchive = (unarchivedId: string) => {
        setItems(items.filter(item => item.id !== unarchivedId));
    };

    const groupedItems = groupItemsByDate(items);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-10 bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50">
                <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/inbox" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                                <span className="text-xl">📦</span>
                            </div>
                            <h1 className="text-xl font-bold text-white">Archive</h1>
                        </Link>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        Logout
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-3xl mx-auto px-4 py-8 pb-24">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-400">{error}</p>
                        <button
                            onClick={fetchItems}
                            className="mt-4 text-amber-400 hover:underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="text-6xl mb-4">📭</div>
                        <p className="text-slate-400 text-lg">Archive is empty</p>
                        <Link href="/inbox" className="text-amber-400 hover:underline mt-2 inline-block">
                            ← Back to Inbox
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {groupedItems.map((group) => (
                            <section key={group.label}>
                                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">
                                    {group.label}
                                </h2>
                                <div className="space-y-3">
                                    {group.items.map((item) => (
                                        <ItemCard
                                            key={item.id}
                                            item={item}
                                            onUnarchive={() => handleUnarchive(item.id)}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/80 backdrop-blur-xl border-t border-slate-700/50">
                <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{items.length} archived items</span>
                    <Link href="/inbox" className="text-slate-400 hover:text-amber-400 transition-colors">
                        ← Back to Inbox
                    </Link>
                </div>
            </footer>
        </div>
    );
}
