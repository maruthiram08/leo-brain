const OpenAI = require('openai');
const dotenv = require('dotenv');

// Load env
dotenv.config({ path: '.env.local' });

async function run() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        console.error('OPENAI_API_KEY environment variable is not set');
        process.exit(1);
    }

    console.log('Using OpenAI Key:', apiKey.slice(0, 10) + '...');

    const client = new OpenAI({
        apiKey: apiKey,
        // No baseURL override needed for OpenAI standard
    });

    const sampleContent = `
    Introduction to Next.js 14
    Next.js is a React framework for building full-stack web applications. You use React components to build user interfaces, and Next.js for additional features and optimizations.
    
    Under the hood, Next.js also abstracts and automatically configures tooling needed for React, like bundling, compiling, and more. This allows you to focus on building your application instead of spending time setting up configuration.
    
    Main Features
    Routing: A file-system based router built on top of Server Components that supports layouts, nested routing, loading states, error handling, and more.
    Rendering: Client-side and Server-side Rendering with Client and Server Components. Further optimized with Static and Dynamic Rendering on the server with Next.js.
    Data Fetching: Simplified data fetching with async/await in Server Components, and an extended fetch API for request memoization, data caching and revalidation.
  `;

    const sourceUrl = 'https://nextjs.org/docs';

    const prompt = `Analyze this webpage content from ${sourceUrl} and extract metadata AND semantic tags:

CONTENT START:
${sampleContent}
CONTENT END

Return ONLY a JSON object with:
{
  "title": "Descriptive title based on content (max 100 chars)",
  "description": "One-sentence summary of the main points (max 200 chars)",
  "contentType": "article" | "video" | "tweet" | "doc" | "unknown",
  "topics": ["3-5 core concepts/technologies - be GENERIC"],
  "intent": ["1-2 from: tutorial, reference, news, discussion, tool, opinion, learn, build"],
  "domain": "ONE of: tech, finance, design, science, lifestyle, business, entertainment"
}

Respond with ONLY the JSON.`;

    console.log('\n--- SENDING PROMPT TO OPENAI (gpt-4o-mini) ---');

    try {
        const completion = await client.chat.completions.create({
            model: 'gpt-4o-mini',
            temperature: 0.3,
            messages: [
                {
                    role: 'system',
                    content: 'You are a semantic content analyzer. Extract metadata and generate tags. Always respond with valid JSON only.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            max_tokens: 800
        });

        const text = completion.choices[0]?.message?.content || '';
        console.log('\n--- RAW RESPONSE ---');
        console.log(text);

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            console.log('\n--- PARSED JSON ---');
            console.log(JSON.stringify(JSON.parse(jsonMatch[0]), null, 2));
        } else {
            console.log('\n(No JSON found in response)');
        }

    } catch (error) {
        console.error('OpenAI Request Failed:', error);
    }
}

run();
