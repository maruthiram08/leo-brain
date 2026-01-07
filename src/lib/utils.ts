import { Item, TimelineChapter } from '@/lib/db/schema';

interface ItemGroup {
    label: string;
    items: Item[];
    isChapter?: boolean;
    description?: string;
}

export function groupItemsByDate(items: Item[], chapters: TimelineChapter[] = []): ItemGroup[] {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const thisWeekStart = new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(today.getTime() - 13 * 24 * 60 * 60 * 1000);
    const thisMonthStart = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    const groups: Record<string, Item[]> = {
        'Today': [],
        'Yesterday': [],
        'This Week': [],
        'Last Week': [],
        'This Month': [],
        'Older': [],
    };

    // Calculate time ranges for matching
    const ranges = {
        'Today': { start: today, end: new Date(today.getTime() + 86400000) },
        'Yesterday': { start: yesterday, end: today },
        'This Week': { start: thisWeekStart, end: yesterday },
        'Last Week': { start: lastWeekStart, end: thisWeekStart },
        'This Month': { start: thisMonthStart, end: lastWeekStart },
        'Older': { start: new Date(0), end: thisMonthStart }
    };

    for (const item of items) {
        const itemDate = new Date(item.createdAt!);

        if (itemDate >= today) groups['Today'].push(item);
        else if (itemDate >= yesterday) groups['Yesterday'].push(item);
        else if (itemDate >= thisWeekStart) groups['This Week'].push(item);
        else if (itemDate >= lastWeekStart) groups['Last Week'].push(item);
        else if (itemDate >= thisMonthStart) groups['This Month'].push(item);
        else groups['Older'].push(item);
    }

    const orderedLabels = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Older'];

    return orderedLabels
        .filter(label => groups[label].length > 0)
        .map(label => {
            const groupRange = ranges[label as keyof typeof ranges];
            let displayLabel = label;
            let isChapter = false;
            let description = undefined;

            // Check if ANY chapter fully overlaps or dominates this time range
            // For simplicity: If a chapter starts within this range, use it.
            if (chapters.length > 0 && groupRange) {
                const bestChapter = chapters.find(c => {
                    const cStart = new Date(c.startDate);
                    return cStart >= groupRange.start && cStart < groupRange.end;
                });

                if (bestChapter) {
                    displayLabel = bestChapter.title;
                    isChapter = true;
                    description = bestChapter.summary || undefined;
                }
            }

            return {
                label: displayLabel,
                items: groups[label],
                isChapter,
                description
            };
        });
}

export function formatTimestamp(date: Date | string): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
}

export function isUrl(text: string): boolean {
    return /^https?:\/\/\S+$/i.test(text.trim());
}

export function getRelativeTime(date: Date | string) {
    const d = new Date(date);
    const diff = Date.now() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return 'Earlier this week';
    if (days < 14) return 'Last week';
    if (days < 30) return 'Earlier this month';
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
