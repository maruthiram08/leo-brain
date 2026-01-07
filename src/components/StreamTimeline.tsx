import { Item, TimelineChapter } from '@/lib/db/schema';
import { groupItemsByDate } from '@/lib/utils';
import { ItemCard } from '@/components/ItemCard';

interface StreamTimelineProps {
    items: Item[];
    chapters?: TimelineChapter[]; // Optional chapters
}

export function StreamTimeline({ items, chapters = [] }: StreamTimelineProps) {
    if (items.length === 0) return null;

    const groupedItems = groupItemsByDate(items, chapters);

    return (
        <div className="space-y-16">
            {groupedItems.map((group) => (
                <section key={group.label} className="relative">
                    {/* Time Anchor / Chapter Header */}
                    <div className="mb-8">
                        {group.isChapter ? (
                            <div className="border-l-2 border-emerald-500/30 pl-4 py-1">
                                <span className="block text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-1">
                                    Chapter
                                </span>
                                <h3 className="text-xl font-serif text-slate-200 tracking-tight leading-snug">
                                    {group.label}
                                </h3>
                                {group.description && (
                                    <p className="text-sm text-slate-500 mt-2 font-light italic">
                                        {group.description}
                                    </p>
                                )}
                            </div>
                        ) : (
                            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider pl-1">
                                {group.label}
                            </span>
                        )}
                    </div>

                    {/* Items */}
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

