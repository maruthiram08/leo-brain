
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { pgTable, text, boolean, timestamp, vector, uuid, integer, index } from 'drizzle-orm/pg-core';
import { desc, eq, ilike, and } from 'drizzle-orm';
import { config } from 'dotenv';

config({ path: '.env.local' });

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Minimal schema for testing
const items = pgTable('items', {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    contentType: text('content_type').notNull().default('text'),
    isArchived: boolean('is_archived').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    embedding: vector('embedding', { dimensions: 1536 }),
});

async function main() {
    console.log('--- Reproduction Script Start ---');
    const testContent = "https://www.instagram.com/reel/DC0jXnaT7-v/?igsh=MTV2ZWx2ZnRyY3IyNA==";

    // 1. Clean up old test data
    await db.delete(items).where(eq(items.content, testContent));

    // 2. Insert Test Item
    console.log('Inserting test item...');
    await db.insert(items).values({
        content: testContent,
        contentType: 'url',
        isArchived: false,
    });

    // 3. Search for "insta"
    const query = "insta";
    console.log(`Searching for "${query}"...`);

    const results = await db.select().from(items).where(
        and(
            eq(items.isArchived, false),
            ilike(items.content, `%${query}%`)
        )
    ).orderBy(desc(items.createdAt)).limit(5);

    console.log(`Found ${results.length} matches.`);
    results.forEach(r => console.log(`- ${r.content}`));

    if (results.length > 0 && results[0].content === testContent) {
        console.log('✅ SUCCESS: Search works for newly inserted item.');
    } else {
        console.log('❌ FAILURE: Could not find inserted item.');
    }
    console.log('--- Reproduction Script End ---');
}

main().catch(console.error);
