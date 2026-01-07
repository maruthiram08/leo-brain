'use client';

import { Item } from '@/lib/db/schema';
import { groupItemsByDate } from '@/lib/utils';
import { ItemCard } from '@/components/ItemCard';

interface StreamTimelineProps {
    items: Item[];
}

export function StreamTimeline({ items }: StreamTimelineProps) {
    if (items.length === 0) return null;

    const groupedItems = groupItemsByDate(items);

    return (
        <div className="space-y-12">
            {groupedItems.map((group) => (
                <section key={group.label}>
                    {/* Time Anchor - soft, not commanding */}
                    <div className="mb-6">
                        <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">
                            {group.label}
                        </span>
                    </div>

                    {/* Items - no rails, no dots, just flow */}
                    <div className="space-y-4">
                        {group.items.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                minimal={true}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
}

