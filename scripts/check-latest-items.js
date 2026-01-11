const { neon } = require('@neondatabase/serverless');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function run() {
    if (!process.env.DATABASE_URL) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    const sql = neon(process.env.DATABASE_URL);

    try {
        console.log('Connecting to DB...');
        // Get the latest item
        const result = await sql`
            SELECT id, title, content_type, ai_summary, ai_topics, created_at 
            FROM items 
            ORDER BY created_at DESC 
            LIMIT 1
        `;

        if (result.length === 0) {
            console.log('No items found.');
        } else {
            console.log('\n--- LATEST ITEM ---');
            const item = result[0];
            console.log('ID:', item.id);
            console.log('Type:', item.content_type);
            console.log('Created:', new Date(item.created_at).toLocaleString());
            console.log('Title:', item.title || '(No title)');
            console.log('\n--- AI SUMMARY ---');
            console.log(item.ai_summary || '(NULL - No summary yet)');
            console.log('\n--- AI TOPICS ---');
            console.log(item.ai_topics || '(NULL)');
        }

    } catch (e) {
        console.error('Error fetching items:', e);
    }
}

run();
