# Leo MVP — Ralph Loop Tasks

Pre-defined iterative tasks for each milestone. Copy and use with `/ralph-loop`.

---

## 🔗 Pre-requisites Loop

Run this first to set up external dependencies.

```markdown
## Task
Set up external dependencies for Leo MVP

## Completion Criteria
- [ ] Neon PostgreSQL database created at neon.tech
- [ ] DATABASE_URL connection string obtained and saved
- [ ] Telegram bot created via @BotFather
- [ ] TELEGRAM_BOT_TOKEN obtained and saved
- [ ] Generated secure ADMIN_PASSWORD (min 16 chars)
- [ ] Generated secure SESSION_SECRET (32 chars)
- [ ] All credentials documented in .env.example (without values)

## Max Iterations
10
```

---

## 🧩 Milestone 1: Capture (Telegram → Saved)

```markdown
## Task
Build Leo Milestone 1: Telegram Capture — instant saving of text/URLs via Telegram bot

## Completion Criteria
- [ ] Next.js 14 project initialized with TypeScript, Tailwind, App Router
- [ ] Drizzle ORM installed and configured
- [ ] Database schema created (items table with all fields from plan)
- [ ] `npx drizzle-kit push` succeeds — tables created in Neon
- [ ] Telegram webhook endpoint at /api/telegram/webhook
- [ ] Rate limiter implemented (10 msg/sec per user)
- [ ] URL detection working (content_type set correctly)
- [ ] Bot responds "Saved ✅" on successful database insert
- [ ] Bot responds "❌ Failed to save" on database error
- [ ] `npm run build` passes with no errors
- [ ] Deployed to Vercel successfully
- [ ] Telegram webhook registered with Vercel URL
- [ ] End-to-end: Send text to bot → "Saved ✅" → Row in database

## Max Iterations
30
```

---

## 🧩 Milestone 2: Retrieval (Web Inbox)

```markdown
## Task
Build Leo Milestone 2: Web Inbox — view saved items with auth, grouping, and actions

## Completion Criteria
- [ ] /login page with password form
- [ ] Auth API: POST /api/auth/login sets HTTP-only cookie
- [ ] Auth API: POST /api/auth/logout clears cookie
- [ ] Middleware protects /inbox and /archive routes
- [ ] Wrong password shows error, doesn't redirect
- [ ] Correct password redirects to /inbox
- [ ] /inbox displays all non-archived items
- [ ] Items grouped by: Today, Yesterday, This Week, Last Week, This Month, Older
- [ ] Each item shows absolute timestamp (e.g., "Jan 5, 2:30 PM")
- [ ] URLs render as clickable links (target="_blank")
- [ ] Copy button copies content to clipboard
- [ ] Toast notification shows "Copied!" on copy
- [ ] Archive button moves item to archived state
- [ ] /archive page shows archived items
- [ ] Footer link to /archive from inbox
- [ ] `npm run build` passes
- [ ] All pages work on Vercel deployment

## Max Iterations
35
```

---

## 🧩 Milestone 3: Trust Loop (Reliability)

```markdown
## Task
Build Leo Milestone 3: Trust Loop — ensure reliability and data integrity

## Completion Criteria
- [ ] Structured error logging with JSON format
- [ ] Database errors logged with context (userId, content snippet)
- [ ] Retry logic: 1 retry on transient DB failures
- [ ] No false "Saved ✅" if insert actually failed
- [ ] Test: Save 10 items rapidly → all 10 appear in inbox
- [ ] Test: Refresh inbox 5 times → same items every time
- [ ] Test: Items from yesterday still visible today
- [ ] Test: Simulate DB error → error message shown, no phantom save
- [ ] Vercel logs show structured error entries
- [ ] No duplicate items in inbox after rapid saves

## Max Iterations
20
```

---

## 🧩 Milestone 4: Findability (Search)

```markdown
## Task
Build Leo Milestone 4: Search — find saved items by keyword

## Completion Criteria
- [ ] Search input added to inbox page
- [ ] GET /api/items/search?q=keyword endpoint working
- [ ] Search matches text content (case-insensitive)
- [ ] Search matches URL strings (case-insensitive)
- [ ] Debounced search (300ms delay)
- [ ] Results update as user types
- [ ] "No results" state shown when no matches
- [ ] Clear button resets to full list
- [ ] Empty search shows all items
- [ ] Test: Search "http" → only URLs shown
- [ ] Test: Search "xyznonexistent" → "No results"
- [ ] Test: Search "Hello" matches "hello world"
- [ ] `npm run build` passes
- [ ] Search works on Vercel deployment

## Max Iterations
20
```

---

## 🎯 Full MVP Validation Loop

Run this after all milestones are complete.

```markdown
## Task
Validate complete Leo MVP end-to-end

## Completion Criteria
- [ ] Fresh browser: /inbox redirects to /login
- [ ] Login with correct password → inbox loads
- [ ] Send text via Telegram → "Saved ✅"
- [ ] Refresh inbox → new item visible at top
- [ ] Send URL via Telegram → "Saved ✅"  
- [ ] Refresh inbox → URL is clickable link
- [ ] Click copy → "Copied!" toast, content in clipboard
- [ ] Click archive → item disappears from inbox
- [ ] Visit /archive → archived item visible
- [ ] Search for keyword → matching items shown
- [ ] Search for nonsense → "No results"
- [ ] Clear search → all items return
- [ ] Send 5 messages rapidly → all 5 saved (rate limit not hit)
- [ ] Send 15 messages in 1 second → rate limit warning appears
- [ ] Logout → redirects to login
- [ ] Try /inbox without auth → redirects to login

## Max Iterations
15
```

---

## Usage

1. Copy the relevant loop task above
2. Invoke `/ralph-loop`
3. Paste the task
4. Let it iterate until complete

**Recommended order:**
1. Pre-requisites Loop (manual setup)
2. Milestone 1: Capture
3. Milestone 2: Retrieval  
4. Milestone 3: Trust Loop
5. Milestone 4: Findability
6. Full MVP Validation
