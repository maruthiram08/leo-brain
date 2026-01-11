const { neon } = require('@neondatabase/serverless');

// User provided connection string
const DATABASE_URL = 'postgresql://neondb_owner:npg_eiJdw86hOaQz@ep-wild-resonance-a4afgf31-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const sql = neon(DATABASE_URL);

async function run() {
    try {
        console.log('Connecting to provided DB...');

        // 1. List Tables
        const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
        console.log('\n--- TABLES ---');
        console.table(tables);

        // 2. Count Items
        try {
            const count = await sql`SELECT COUNT(*) FROM items`;
            console.log('\n--- ITEMS COUNT ---');
            console.log(count[0].count);
        } catch (e) {
            console.log('\n(items table missing)');
        }

        // 3. Latest Item
        try {
            const latest = await sql`
        SELECT id, content, ai_summary, ai_topics, created_at 
        FROM items 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
            if (latest.length > 0) {
                console.log('\n--- LATEST ITEM ---');
                console.log(JSON.stringify(latest[0], null, 2));
            } else {
                console.log('\n(no items found)');
            }
        } catch (e) {
            console.log('\n(items table missing)');
        }

    } catch (err) {
        console.error('Connection failed:', err);
    }
}

run();
