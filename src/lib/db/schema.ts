import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

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

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Type inference
export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
