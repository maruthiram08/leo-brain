
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { pgTable, text, boolean, integer, timestamp, uuid, jsonb } from 'drizzle-orm/pg-core';
import { ilike, eq, and, desc } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load env vars
dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

// Re-define schema locally to avoid import alias issues in standalone script
const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    telegramUserId: text('telegram_user_id').notNull(),
    content: text('content').notNull(),
    isArchived: boolean('is_archived').notNull().default(false),
    importanceScore: integer('importance_score').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

async function check() {
    console.log('--- Debugging "insta" Search ---');

    // 1. Search for anything with "insta" regardless of archive status
    const allMatches = await db.select().from(items).where(ilike(items.content, '%insta%'));

    console.log(`\nTotal matches for "%insta%": ${allMatches.length}`);

    allMatches.forEach(item => {
        console.log(`\nID: ${item.id}`);
        console.log(`Content: ${item.content}`);
        console.log(`Is Archived: ${item.isArchived}`);
        console.log(`Importance: ${item.importanceScore}`);
    });

    if (allMatches.length === 0) {
        console.log('\nNo matches found. Listing last 5 items to verify DB connection/content...');
        const recent = await db.select().from(items).orderBy(desc(items.createdAt)).limit(5);
        recent.forEach(i => console.log(`- ${i.content.substring(0, 50)}...`));
    }
}

check();
