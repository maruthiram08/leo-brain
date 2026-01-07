---
iteration: 3
status: complete
started_at: 2026-01-06T09:39:00+05:30
completed_at: 2026-01-06T10:17:00+05:30
max_iterations: 25
---

# Leo V3: Ambient Memory Layer

## Task
Implement the Ambient Memory Layer as specified in `/v3-spec`. This is a philosophical shift from "inbox" to "ambient recall" - the system captures, remembers, and resurfaces without user effort.

## Completion Criteria

### Phase 1: Data Model & Signals ✅
- [x] Add `decay_score` column to schema
- [x] Add `dismiss_count` column to schema
- [x] Add `source_url`, `source_page_title` columns
- [x] Run schema migration on Vercel

### Phase 2: Earned Recall (Hotkey Trigger) ✅
- [x] Chrome Extension: Add Cmd+Shift+Y hotkey listener
- [x] Extension: Capture context (selected text → URL → clipboard)
- [x] API: Create `/api/recall` endpoint
- [x] API: Rank by context similarity + recency + importance
- [x] API: Return MAX 2 events
- [x] Extension: Show floating overlay with results
- [x] Track dismissals (reduce future resurfacing)

### Phase 3: Behavioral Signals ✅
- [x] Implement exponential decay calculation
- [x] Track "recall_select" signal (+5 importance)
- [x] Dismiss tracking in recall overlay

### Phase 4: Verification ✅
- [x] Test recall API (returned relevant result for "github obsidian")
- [x] Privacy: Recall only triggers on explicit hotkey (Cmd+Shift+Y)

## Progress Log

### Iteration 1 (Planning)
- Analyzed V3 spec deeply
- Key insight: NOT an inbox, NOT a notes app - ambient memory layer

### Iteration 2 (Implementation)
- Schema: Added decayScore, dismissCount, sourceUrl, sourcePageTitle, lastRecallShownAt
- API: Created `/api/recall` with semantic matching
- Extension: Cmd+Shift+Y hotkey, floating overlay UI
- Deployed to production

### Iteration 3 (Verification)
- Tested recall API: Latency 3071ms (cold start), 1 relevant result
- Query "github obsidian" → "GitHub - ieshreya/obsidian-cheat-sheet"
- Privacy verified: No automatic triggers

## Success
✅ V3 Ambient Memory Layer complete!
🚀 https://leo-brain.vercel.app
<promise>COMPLETE</promise>
