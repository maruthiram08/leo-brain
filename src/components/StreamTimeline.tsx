'use client';

import { Item } from '@/lib/db/schema';
import { groupItemsByDate } from '@/lib/utils';
import { ItemCard } from '@/components/ItemCard'; // We'll customize this via CSS or props later if needed but base is okay

interface StreamTimelineProps {
    items: Item[];
}

export function StreamTimeline({ items }: StreamTimelineProps) {
    if (items.length === 0) return null;

    const groupedItems = groupItemsByDate(items);

    return (
        <div className="space-y-12 relative">
            {/* Ambient Line */}
            <div className="absolute left-4 top-4 bottom-4 w-px bg-gradient-to-b from-slate-800 via-slate-800 to-transparent hidden sm:block"></div>

            {groupedItems.map((group) => (
                <section key={group.label} className="relative">
                    <div className="sticky top-20 z-0 mb-6 pl-0 sm:pl-10">
                        <span className="text-xs font-semibold text-slate-600 uppercase tracking-widest bg-slate-900/90 backdrop-blur px-2 py-1 rounded">
                            {group.label}
                        </span>
                    </div>

                    <div className="space-y-6 pl-0 sm:pl-10">
                        {group.items.map((item) => (
                            <div key={item.id} className="relative group">
                                {/* Dot on the timeline */}
                                <div className="absolute -left-[29px] top-6 w-1.5 h-1.5 rounded-full bg-slate-700 group-hover:bg-slate-500 transition-colors hidden sm:block"></div>

                                <ItemCard
                                    item={item}
                                    minimal={true} // We'll add this prop to ItemCard
                                />
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}
