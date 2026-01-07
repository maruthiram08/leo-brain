# Leo — Ambient Memory Layer

> **Your second brain for the web.** A personal knowledge capture system that saves, enriches, and intelligently resurfaces content with zero friction.

---

## Overview

Leo is an AI-powered browser companion that transforms how you save and retrieve web content. Instead of endless bookmark folders you never revisit, Leo creates a living memory layer that understands context and surfaces relevant information exactly when you need it.

---

## The Problem

We consume hundreds of articles, threads, and resources every week, but most disappear into browser history never to be seen again. Traditional bookmarking fails because:
- Manual organization creates friction
- Flat lists don't capture semantic meaning  
- There's no way to surface past content when it becomes relevant again

---

## The Solution

Leo acts as an ambient memory layer that works in the background:

### 🦁 **Capture** (Cmd+Shift+E)
One hotkey saves anything from any webpage—selected text, full URLs, or twitter threads—automatically enriched with AI-generated titles and summaries.

### 🔮 **Recall** (Cmd+Shift+Y)
Context-aware retrieval that analyzes what you're currently reading and surfaces semantically relevant content from your memory. It uses vector similarity search with cross-domain diversity to ensure you see connections you wouldn't otherwise make.

### 📊 **Stream View**
A calm, dark-themed interface for browsing your memory. Content is time-grouped ("Today", "Yesterday") with hover-only actions to reduce visual clutter.

---

## Technical Architecture

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15 (App Router), React 19, Tailwind CSS |
| **Database** | Neon PostgreSQL with pgvector for semantic search |
| **ORM** | Drizzle |
| **AI** | OpenAI embeddings, Gemini/Kimi for URL enrichment |
| **Extensions** | Chrome (Manifest V3), Raycast |
| **Deployment** | Vercel |

### Key Technical Decisions

- **Vector Search**: Uses pgvector for sub-100ms semantic similarity queries across thousands of saved items
- **Decay Scoring**: Implements time-based relevance decay so recent content surfaces appropriately
- **Cross-Domain Matching**: Custom algorithm ensures recall results span different domains, not just the most similar from one source
- **Manifest V3**: Chrome extension built on latest extension platform for better performance and security

---

## API Design

```
POST /api/capture     — Save content from extension or Telegram
POST /api/recall      — Semantic search for relevant memories  
PUT  /api/recall      — Track dismiss/never-show signals
GET  /api/items       — List items with filtering
POST /api/admin/enrich — AI enrichment pipeline for URLs
```

---

## Multi-Platform Access

- **Chrome Extension**: Hotkey-triggered capture and recall overlay
- **Raycast Extension**: macOS native integration  
- **Telegram Bot**: Save content directly from chats
- **Web Dashboard**: Full Stream view for browsing and search

---

## Key Learnings

- Building semantic search that feels instant requires careful index optimization and query planning
- Ambient UX (floating overlays, minimal modals) creates less friction than dedicated apps
- AI enrichment quality varies significantly by content type—implementing fallback chains (Gemini → Kimi) improved reliability

---

## Status

**Active Development** — Currently at v3.2 with focus on recall diversity and refined UI polish.

---

*Built with Next.js, PostgreSQL, OpenAI, and Gemini*
