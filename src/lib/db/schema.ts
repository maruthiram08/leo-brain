import { pgTable, uuid, text, boolean, timestamp, jsonb, integer, vector, index, doublePrecision } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),

    // Telegram user identifier
    telegramUserId: text('telegram_user_id').notNull(),

    // Content type for future extensibility
    contentType: text('content_type').notNull().default('text'), // 'text' | 'url' | 'file'

    // The actual content
    content: text('content').notNull(),

    // Future: file storage
    fileUrl: text('file_url'),
    fileMetadata: jsonb('file_metadata').$type<{
        filename?: string;
        size?: number;
        mimeType?: string;
    }>(),


    // State
    isArchived: boolean('is_archived').notNull().default(false),

    // V2: Meaning Signals
    importanceScore: integer('importance_score').notNull().default(0),
    viewCount: integer('view_count').notNull().default(0),
    copyCount: integer('copy_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    lastRecallAt: timestamp('last_recall_at', { withTimezone: true }),

    // V3: Semantic Search
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small

    // V4: URL Enrichment (Background Understanding)
    enrichedTitle: text('enriched_title'),
    enrichedDescription: text('enriched_description'), // max 240 chars
    enrichmentContentType: text('enrichment_content_type'), // article | video | tweet | doc | unknown
    sourceDomain: text('source_domain'),
    faviconUrl: text('favicon_url'),
    enrichmentStatus: text('enrichment_status').default('pending'), // pending | success | failed
    enrichmentAttemptedAt: timestamp('enrichment_attempted_at', { withTimezone: true }),

    // V4.1: AI-generated summary and semantic tags for recall matching
    aiSummary: text('ai_summary'), // Short summary from Kimi/Gemini (max 200 chars)
    aiTags: text('ai_tags'), // Legacy: comma-separated tags (kept for backwards compat)
    aiTopics: text('ai_topics'), // Comma-separated topic tags (e.g. "nextjs,react,routing")
    aiIntent: text('ai_intent'), // Intent tags (e.g. "tutorial,learn")
    aiDomain: text('ai_domain'), // Broad domain (e.g. "tech", "finance", "design")

    // V5: Ambient Memory Layer (Earned Recall)
    decayScore: integer('decay_score').notNull().default(0), // Exponential decay based on time since last access
    dismissCount: integer('dismiss_count').notNull().default(0), // Times dismissed during recall
    sourceUrl: text('source_url'), // Where the event was captured from
    sourcePageTitle: text('source_page_title'), // Page title at capture time
    lastRecallShownAt: timestamp('last_recall_shown_at', { withTimezone: true }), // When shown in recall overlay

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
    // Vector index for similarity search (HNSW)
    embeddingIndex: index('embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),

    // Trigram index for fuzzy match (GIN)
    contentTrigramIndex: index('content_trgm_idx').using('gin', sql`${table.content} gin_trgm_ops`),
}));

// Type inference
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferSelect;

export const timeline_chapters = pgTable('timeline_chapters', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    summary: text('summary'),
    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),
    topics: jsonb('topics').$type<string[]>(), // Array of relevant topics
    score: doublePrecision('score').default(0.0), // Confidence score 0.0-1.0

    // Metadata
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TimelineChapter = typeof timeline_chapters.$inferSelect;
export type NewTimelineChapter = typeof timeline_chapters.$inferInsert;
