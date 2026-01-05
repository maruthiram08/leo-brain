# 📄 Product Spec —  Leo (MVP)

## One-line Summary
A zero-friction system to capture text and links via Telegram and reliably retrieve them later through a simple, searchable web inbox.

---

## 1. Product Goal

Build a **trustworthy capture-and-retrieval loop** where:
- Telegram is the write-only input
- The web app is the read-only inbox
- The user never hesitates before saving something

---

## 2. Non-Goals (Explicitly Out of Scope)

- Audio, images, video, OCR
- AI summaries, embeddings, semantic search
- Tags, folders, collections
- Editing content
- Multi-user support
- Group bots
- Browser extensions

If a feature does not directly improve **capture speed** or **retrieval reliability**, it is out of scope.

---

## 3. Target User

Primary user: **Single power user (self)**  
Context:
- Working
- Browsing
- Thinking
- On mobile or desktop

The product must work even when the user is distracted or low on attention.

---

## 4. Supported Inputs (MVP)

- Plain text (any length supported by Telegram)
- URLs (`http://` or `https://`)

No parsing, fetching, previewing, or enrichment.

---

# 🧩 MILESTONE 1 — Capture (Telegram → Saved)

## Goal
Enable instant, effortless capture of text or URLs via Telegram.

---

## Workflow
1. User pastes text or a URL into a private Telegram bot chat
2. User presses send
3. Bot replies with:  
   `Saved ✅`
4. Content is persisted with timestamp and user identifier

---

## Functional Requirements
- Accept any text message
- Accept URLs as plain text
- Associate each message with the Telegram user
- Store exact content as received
- Respond within 3 seconds

---

## Non-Functional Requirements
- No formatting required
- No decisions required from the user
- No background processing
- No silent failures

---

## Test Cases — Milestone 1

### TC-1.1: Save Plain Text
**Given** a user sends a text message  
**When** the message is sent to the bot  
**Then** the bot replies “Saved ✅”  
**And** the text is persisted exactly as sent

---

### TC-1.2: Save URL
**Given** a user sends a valid URL  
**When** the message is sent  
**Then** the bot replies “Saved ✅”  
**And** the URL is stored as-is

---

### TC-1.3: Rapid Consecutive Messages
**Given** a user sends multiple messages quickly  
**When** messages are sent back-to-back  
**Then** all messages are saved  
**And** confirmations are returned for each

---

### TC-1.4: Failure Handling
**Given** storage fails  
**When** a message is sent  
**Then** the bot responds with a generic failure message  
**And** no false confirmation is shown

---

# 🧩 MILESTONE 2 — Retrieval (Saved → Visible)

## Goal
Allow the user to view everything they’ve saved in one place.

---

## Workflow
1. User opens the web inbox
2. A chronological list of saved items is shown
3. Newest items appear first

---

## Page Purpose
Answer one question only:  
**“What have I saved?”**

---

## Display Rules
- URLs are rendered as clickable links
- Text is rendered as readable blocks
- No editing
- No reordering
- No filtering yet

---

## Test Cases — Milestone 2

### TC-2.1: Inbox Loads
**Given** saved items exist  
**When** the inbox page is opened  
**Then** a list of items is displayed  
**And** the page loads successfully

---

### TC-2.2: Chronological Order
**Given** multiple saved items  
**When** the inbox is viewed  
**Then** items are ordered newest → oldest

---

### TC-2.3: URL Rendering
**Given** a saved URL  
**When** the inbox is rendered  
**Then** the URL is clickable  
**And** opens in a new tab

---

### TC-2.4: Text Rendering
**Given** a saved text note  
**When** the inbox is rendered  
**Then** the text is readable and unaltered

---

# 🧩 MILESTONE 3 — Trust Loop (Reliability)

## Goal
Ensure the user fully trusts the system.

This milestone introduces no new UI—only quality guarantees.

---

## Trust Expectations
- Every saved item appears in the inbox
- Items appear shortly after capture
- No missing or duplicate entries

---

## User Signals of Success
- User stops double-checking Telegram history
- User never resends messages “just in case”

---

## Test Cases — Milestone 3

### TC-3.1: End-to-End Consistency
**Given** an item is saved via Telegram  
**When** the inbox is refreshed  
**Then** the item is visible every time

---

### TC-3.2: No Phantom Items
**Given** no message was sent  
**When** the inbox is viewed  
**Then** no unexpected items appear

---

### TC-3.3: Persistence Over Time
**Given** items saved yesterday  
**When** the inbox is opened today  
**Then** all items are still present

---

# 🧩 MILESTONE 4 — Findability (Search)

## Goal
Enable the user to find previously saved items via keyword search.

---

## Workflow
1. User types a keyword into a search box
2. The inbox list filters to matching items

---

## Search Scope
- Matches against:
  - Text content
  - URL strings

---

## Explicit Non-Goals
- No ranking
- No relevance scoring
- No fuzzy matching
- No semantic understanding

---

## Test Cases — Milestone 4

### TC-4.1: Search Text Content
**Given** saved text contains a keyword  
**When** the keyword is searched  
**Then** the item appears in results

---

### TC-4.2: Search URLs
**Given** a saved URL contains a keyword  
**When** the keyword is searched  
**Then** the URL appears in results

---

### TC-4.3: No False Positives
**Given** a keyword does not exist in any item  
**When** the keyword is searched  
**Then** no items are shown

---

### TC-4.4: Case Insensitivity
**Given** mixed-case text  
**When** a keyword is searched in any case  
**Then** matching items are returned

---

# ✅ Definition of MVP Completion

The MVP is considered complete when:

- The user has used it daily for at least 7 days
- 50–100 items have been saved
- The user feels discomfort at the idea of losing the system
- Capture feels automatic and effortless

Only after this point should new features be considered.

---

## Final Principle

> Optimize for **habit, trust, and speed** — not intelligence or completeness.
