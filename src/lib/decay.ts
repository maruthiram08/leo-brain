/**
 * Leo V3: Decay Score Algorithm
 * 
 * Implements exponential decay based on time since last access.
 * Matches cognitive forgetting curve - recent items decay slowly, old items decay faster.
 * 
 * Formula: decayScore = 100 * (1 - e^(-days/30))
 * - At 0 days: score = 0 (fresh)
 * - At 7 days: score = ~21
 * - At 30 days: score = ~63
 * - At 90 days: score = ~95
 */

/**
 * Calculate decay score based on time since last access
 * @param lastAccessedAt - When the item was last viewed/used
 * @returns Decay score from 0 (fresh) to 100 (very old)
 */
export function calculateDecayScore(lastAccessedAt: Date | null, createdAt: Date): number {
    const referenceDate = lastAccessedAt || createdAt;
    const now = new Date();
    const daysSinceAccess = (now.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24);

    // Exponential decay with 30-day half-life
    const decayScore = Math.round(100 * (1 - Math.exp(-daysSinceAccess / 30)));

    return Math.min(100, Math.max(0, decayScore));
}

/**
 * Calculate combined relevance score for recall ranking
 * Higher = more relevant
 * 
 * Components:
 * - Semantic similarity (0-1): How well content matches query
 * - Recency boost (0-1): Recent items score higher
 * - Importance (0-10): User interaction signals
 * - Decay penalty (0-100): Time since last access
 * - Dismiss penalty (0-N): How often dismissed in recall
 */
export function calculateRelevanceScore(
    similarity: number,
    daysSinceCreation: number,
    importanceScore: number,
    decayScore: number,
    dismissCount: number
): number {
    // Weights (sum to 1.0)
    const SIMILARITY_WEIGHT = 0.40;
    const RECENCY_WEIGHT = 0.25;
    const IMPORTANCE_WEIGHT = 0.20;
    const DECAY_PENALTY_WEIGHT = 0.10;
    const DISMISS_PENALTY_WEIGHT = 0.05;

    // Recency: exponential decay over 14 days
    const recencyScore = Math.exp(-daysSinceCreation / 14);

    // Normalize importance (0-10 → 0-1)
    const normalizedImportance = Math.min(importanceScore / 10, 1);

    // Invert decay (high decay = low score)
    const decayPenalty = decayScore / 100;

    // Dismiss penalty (caps at 1.0 after 10 dismissals)
    const dismissPenalty = Math.min(dismissCount / 10, 1);

    const score =
        (similarity * SIMILARITY_WEIGHT) +
        (recencyScore * RECENCY_WEIGHT) +
        (normalizedImportance * IMPORTANCE_WEIGHT) -
        (decayPenalty * DECAY_PENALTY_WEIGHT) -
        (dismissPenalty * DISMISS_PENALTY_WEIGHT);

    return Math.max(0, score);
}

/**
 * Boost importance when user selects an item after recall
 * This is a strong positive signal
 */
export function boostImportanceForRecallSelect(currentImportance: number): number {
    // Add 2 points, cap at 10
    return Math.min(currentImportance + 2, 10);
}

/**
 * Reduce importance when user dismisses an item during recall
 * This is a weak negative signal (we don't want to punish too harshly)
 */
export function reduceImportanceForDismiss(currentImportance: number): number {
    // Reduce by 0.5, floor at 0
    return Math.max(currentImportance - 0.5, 0);
}
