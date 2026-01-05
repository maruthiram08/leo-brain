
# Leo V1 — Ambient Recall Upgrade (No AI)

## V1 Goal (Very Important)

> **Prove that saved information can resurface _without the user remembering to look for it_.**

If this works, Leo becomes a category.  
If not, it remains a very good tool.

---

# What Changes From MVP → V1

You are adding **exactly 3 things**:

1. A **Working Set**
    
2. A **Recall Moment**
    
3. A **Meaning Signal**
    

Nothing else.

---

# 1. Working Set (Top-of-Stream Layer)

### Purpose

Answer:

> “What is my brain likely thinking about _right now_?”

Without asking the user.

---

## UI Placement

At the **top of the Stream** (not a new page):

```
──────────────
RECENTLY RELEVANT
• Item A
• Item B
• Item C
──────────────
↓ Stream continues
```

- Max **7 items**
    
- Visually softer than the main stream
    
- No pinning, no controls, no settings
    

---

## How Items Enter the Working Set (Rules Only)

An item is eligible if **any** of the following happened recently:

- Captured in last 7 days
    
- Clicked / opened from the stream
    
- Appeared in a search result
    
- Copied text from it
    

Each event adds **weight**.

---

## How Items Leave the Working Set

- Time decay
    
- No interaction
    
- Pushed out by more relevant items
    

No manual removal.  
No “clear”.

---

## Why This Is Category-Defining

- Prevents archive overwhelm
    
- Makes Leo feel opinionated
    
- Reduces need for search
    
- Mimics human working memory
    

This is the **single most important addition**.

---

# 2. Recall Trigger (Search-Based, Minimal)

You will implement **one recall moment only**.

---

## Existing Behavior (MVP)

Search = filter the list.

This is still **active recall**.

---

## V1 Behavior (Upgrade)

When the user types a search query:

Instead of only filtering, show:

> “You’ve seen things like this before”

And surface **2–3 items**, even if:

- They don’t exactly match keywords
    
- They were saved long ago
    

---

## How Matching Works (No AI)

Pure heuristics:

- Keyword overlap
    
- URL domain overlap
    
- Prior searches
    
- Recent context
    

No embeddings.  
No LLMs.  
No semantic models.

---

## UX Rules

- Non-blocking
    
- Dismissible
    
- Never more than 3 items
    
- Never shown without user action
    

This keeps it:

- Ambient
    
- Respectful
    
- Non-intrusive
    

---

## Why This Matters

This is the first moment Leo says:

> “You forgot this — but I didn’t.”

That’s the emotional unlock.

---

# 3. Meaning Signal (Inferred Importance)

You will introduce **one invisible score** per item.

Users never see it.

---

## Signals That Increase Importance

- Opened
    
- Copied
    
- Appears in search results
    
- Appears in recall and clicked
    
- Saved multiple times (dedupe reinforcement)
    

---

## Signals That Decrease Importance

- Time
    
- Never interacted
    
- Never searched
    
- Never reused
    

---

## What This Enables

- Working Set ranking
    
- Recall prioritization
    
- Natural decay
    
- No clutter buildup
    

Meaning emerges from **behavior**, not user effort.

---

# What V1 Still REFUSES to Add

This is critical — V1 discipline matters more than features.

❌ No tags  
❌ No folders  
❌ No editing  
❌ No “projects”  
❌ No daily digests  
❌ No notifications  
❌ No summaries  
❌ No AI chat

If you add any of these, Leo collapses back into the old category.

---

# Updated User Journey (V1)

### Before

Save → forget → maybe search later

### After

Save → forget → **resurface naturally**

Key shift:

> The user does not _remember_ Leo.  
> Leo remembers _for_ the user.

---

# Updated Success Criteria (V1)

You ship V1 if users say:

- “I forgot I saved that — but it showed up”
    
- “I search less than before”
    
- “This feels calm”
    
- “I don’t manage this at all”
    

You **do not care** if they say:

- “Powerful”
    
- “Smart”
    
- “Advanced”
    

Those are red flags.

---

# V1 Kill Signals (Stop Immediately If You See These)

- Users ask for folders
    
- Users ask “how should I organize?”
    
- Users feel backlog guilt
    
- Users spend time inside Leo just browsing
    

That means the system stopped being ambient.

---

# Final Category Line (Post-V1)

> **Leo is not where you store things.  
> It’s where forgotten things quietly come back.**

That line only works **after** this V1.

---

## Next Possible Moves (Only After V1 Works)

[[LeoV2]] 
[[Leo]]

