
import { Item } from '@/lib/db/schema';
import { generateGeminiContent } from '@/lib/gemini';

export interface ChapterCandidate {
    title: string;
    summary: string;
    startDate: Date;
    endDate: Date;
    topics: string[];
    score: number;
}

/**
 * Groups items into weekly buckets and analyzes semantic coherence
 * to propose "Chapters" of user attention.
 */
export async function generateChaptersFromItems(items: Item[]): Promise<ChapterCandidate[]> {
    const chapters: ChapterCandidate[] = [];
    if (items.length === 0) return chapters;

    // 1. Bucket by Week
    const buckets: Record<string, Item[]> = {};
    items.forEach(item => {
        const d = new Date(item.createdAt!);
        // Get start of week (Sunday)
        const day = d.getDay();
        const diff = d.getDate() - day; // adjust when day is sunday
        const startOfWeek = new Date(d.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        const key = startOfWeek.toISOString();
        if (!buckets[key]) buckets[key] = [];
        buckets[key].push(item);
    });

    // 2. Analyze each bucket
    for (const [weekStr, bucketItems] of Object.entries(buckets)) {
        if (bucketItems.length < 5) continue; // Ignore sparse weeks

        // Mock Analysis / Heuristic Check
        // In reality, check if >40% of items share a topic
        const topicCounts: Record<string, number> = {};
        bucketItems.forEach(i => {
            const tags = (i.aiTopics || '').split(',');
            tags.forEach(t => {
                const clean = t.trim().toLowerCase();
                if (clean) topicCounts[clean] = (topicCounts[clean] || 0) + 1;
            });
        });

        // Find dominant topic
        let dominantTopic = '';
        let maxCount = 0;
        Object.entries(topicCounts).forEach(([topic, count]) => {
            if (count > maxCount) {
                maxCount = count;
                dominantTopic = topic;
            }
        });

        // If strong cohesion (>3 items or >30%), consider it a chapter
        if (maxCount >= 3) {
            const startDate = new Date(weekStr);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);

            // 3. Generate Name (Mock or LLM)
            // Ideally: call LLM here. For MVP/Verification, heuristic is fine or simple LLM call.
            // Let's try a simple prompt if we have the key, otherwise fallback.

            const prompt = `
                Analyze these items from a user's reading list:
                ${bucketItems.slice(0, 10).map(i => `- ${i.enrichedTitle || i.content}`).join('\n')}
                
                Name this "Life Phase" or "Interest Phase" in 3-5 words. 
                Examples: "The React Learning Phase", "House Hunting", "Deep Dive into Crypto".
                Return ONLY the name.
            `;

            let title = `The ${dominantTopic.charAt(0).toUpperCase() + dominantTopic.slice(1)} Phase`; // Fallback

            try {
                const aiTitle = await generateGeminiContent(prompt);
                if (aiTitle) title = aiTitle.trim().replace(/^"|"$/g, '');
            } catch (e) {
                console.warn('AI Naming failed, using heuristic');
            }

            chapters.push({
                title: title,
                summary: `Focused on ${dominantTopic} and related topics.`,
                startDate,
                endDate,
                topics: [dominantTopic],
                score: Math.min(maxCount / bucketItems.length, 1.0)
            });
        }
    }

    return chapters;
}
