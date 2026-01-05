import { Item } from '@/lib/db/schema';

interface ItemGroup {
    label: string;
    items: Item[];
}

export function groupItemsByDate(items: Item[]): ItemGroup[] {
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

    for (const item of items) {
        const itemDate = new Date(item.createdAt);

        if (itemDate >= today) {
            groups['Today'].push(item);
        } else if (itemDate >= yesterday) {
            groups['Yesterday'].push(item);
        } else if (itemDate >= thisWeekStart) {
            groups['This Week'].push(item);
        } else if (itemDate >= lastWeekStart) {
            groups['Last Week'].push(item);
        } else if (itemDate >= thisMonthStart) {
            groups['This Month'].push(item);
        } else {
            groups['Older'].push(item);
        }
    }

    // Return only non-empty groups in order
    const orderedLabels = ['Today', 'Yesterday', 'This Week', 'Last Week', 'This Month', 'Older'];
    return orderedLabels
        .filter(label => groups[label].length > 0)
        .map(label => ({ label, items: groups[label] }));
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
