// Simple in-memory rate limiter
// Limits: 10 messages per second per user

interface RateLimitEntry {
    timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

const MAX_MESSAGES_PER_SECOND = 10;
const WINDOW_MS = 1000;

export function isRateLimited(userId: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(userId);

    if (!entry) {
        rateLimitMap.set(userId, { timestamps: [now] });
        return false;
    }

    // Remove timestamps older than the window
    entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);

    if (entry.timestamps.length >= MAX_MESSAGES_PER_SECOND) {
        return true;
    }

    entry.timestamps.push(now);
    return false;
}

// Cleanup old entries periodically (called internally)
setInterval(() => {
    const now = Date.now();
    for (const [userId, entry] of rateLimitMap.entries()) {
        entry.timestamps = entry.timestamps.filter(ts => now - ts < WINDOW_MS);
        if (entry.timestamps.length === 0) {
            rateLimitMap.delete(userId);
        }
    }
}, 60000); // Clean up every minute
