
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as dotenv from 'dotenv';
import { sql } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is missing');
    process.exit(1);
}

const client = neon(process.env.DATABASE_URL);
const db = drizzle(client);

async function main() {
    console.log('Enabling pg_trgm extension...');
    try {
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
        console.log('✅ pg_trgm extension enabled.');

        // Also enabling unaccent for better search (handling accents)
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS unaccent;`);
        console.log('✅ unaccent extension enabled.');

        // Enable vector extension for customized semantic search
        await db.execute(sql`CREATE EXTENSION IF NOT EXISTS vector;`);
        console.log('✅ vector extension enabled.');

    } catch (e) {
        console.error('Failed to enable extensions:', e);
        process.exit(1);
    }
}

main();
