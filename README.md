# Leo - Ambient Memory Layer

**Your second brain for the web.** Leo captures, enriches, and resurfaces content with zero friction.

## Features

### 🦁 Capture (Cmd+Shift+E)
Save anything from any webpage:
- Selected text
- Current page URL
- Automatically enriched with AI-generated titles and summaries

### 🔮 Recall (Cmd+Shift+Y)
Instant context-aware memory retrieval:
- Semantic search across your saved items
- Domain-aware prioritization with cross-domain diversity
- Floating overlay with keyboard navigation
- Works everywhere: articles, docs, social media

### 📊 Stream View ("Timeline Chapters")
Ambient memory surface that tells a story:
- Dark, minimal UI designed for calm browsing
- **Narrative Chapters**: Automatically groups history into named phases (e.g., "The React Learning Phase")
- Time-grouped content ("Today", "Yesterday")
- Hover-only actions to reduce visual clutter

### 🔍 Robust Search
High-recall retrieval system:
- **Fuzzy Matching**: Finds "inflation" even if you type "infltion"
- **Intent Detection**: Understands time (e.g., "last week") and type (e.g., "pdf") filters
- **Instant**: Sub-100ms response time

## Tech Stack

- **Framework:** Next.js 15+ (App Router)
- **Database:** Neon PostgreSQL with pgvector
- **ORM:** Drizzle
- **AI:** OpenAI embeddings, Gemini/Kimi for enrichment
- **Hosting:** Vercel
- **Extensions:** Chrome (MV3), Raycast

## Project Structure

```
Leo/
├── src/
│   ├── app/           # Next.js App Router pages & API routes
│   ├── components/    # React components
│   └── lib/           # Utilities, DB, AI clients
├── extension/         # Chrome Extension (MV3)
├── raycast-extension/ # Raycast Extension
└── public/            # Static assets
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/capture` | POST | Save content from extension/Telegram |
| `/api/recall` | POST | Semantic search for relevant memories |
| `/api/recall` | PUT | Track dismiss/never-show signals |
| `/api/items` | GET | List items with filtering |
| `/api/items/search` | GET | Full-text search |
| `/api/admin/enrich` | POST | AI enrichment for URLs |

## Environment Variables

```env
DATABASE_URL=           # Neon PostgreSQL connection string
OPENAI_API_KEY=         # For embeddings
GOOGLE_AI_API_KEY=      # For Gemini enrichment (optional)
MOONSHOT_API_KEY=       # For Kimi enrichment (optional)
TELEGRAM_BOT_TOKEN=     # For Telegram capture (optional)
EXT_AUTH_TOKEN=         # Extension authentication token
```

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Chrome Extension Setup

1. Navigate to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `extension/` directory
4. Configure shortcuts in `chrome://extensions/shortcuts`

## Version History

| Version | Features |
|---------|----------|
| V1 | Basic capture, inbox view |
| V2 | URL enrichment, importance scoring |
| V3 | Ambient Memory Layer: Recall hotkey, decay scoring, Stream UI |
| V3.2 | Result diversity, cross-domain matching, refined UI |
| V4 | **Robust Search**: Fuzzy match, intent detection, instant latency |
| V5 | **Timeline Chapters**: Narrative clustering, AI phase naming, automated daily generation |

## License

Private - All rights reserved.
