If we need ai for this let me, i want to use my gemini api for this


# Feature Spec: Deferred URL Enrichment (Background Understanding)

## Purpose

Reduce future recognition friction for saved URLs **without adding any friction at capture time**.

This feature exists to help users recognize *what a saved link was* when it resurfaces — not to help them decide *whether* to save it.

---

## Core Principle

> Capture stays stupid.  
> Understanding happens later, silently, in the background.

The system must never ask the user to explain or label a URL.

---

## Scope

This feature applies **only** to events of type:
- `link`

It runs:
- Asynchronously
- After capture
- Without user awareness

---

## What This Feature Does

For a saved URL, the system:
- Fetches lightweight metadata
- Stores minimal descriptive context
- Uses this context **only for recall & display**

This feature does NOT:
- Summarize aggressively
- Classify deeply
- Ask user questions
- Surface insights proactively

---

## Data Model Additions

### Event (extended fields)

Optional, populated asynchronously:

- enriched_title (string)
- enriched_description (string, ≤ 240 chars)
- content_type (enum: article | video | tweet | doc | unknown)
- source_domain (string)
- favicon_url (string)
- enrichment_status (pending | success | failed)
- enrichment_attempted_at (timestamp)

These fields are:
- System-generated
- Invisible to user editing
- Optional (failure is acceptable)

---

## Enrichment Pipeline

### Trigger

- Automatically triggered after a `link` event is created

---

### Step 1: Metadata Fetch

System attempts to fetch:
- HTML `<title>`
- `<meta name="description">`
- OpenGraph tags (og:title, og:description)
- Favicon
- HTTP content-type

Constraints:
- Timeout ≤ 3 seconds
- Max redirects ≤ 3
- Respect robots.txt
- No JS execution required

---

### Step 2: Content-Type Detection (Lightweight)

Infer content_type using:
- Domain heuristics (youtube.com → video)
- Meta tags
- URL patterns

No deep parsing.
No embeddings.
No crawling beyond initial page.

---

### Step 3: Minimal Gist (Optional, V1+)

If metadata is insufficient:
- Generate a **single-sentence gist** from visible text
- Hard limit: 1 sentence, ≤ 200 chars

Rules:
- No opinionated language
- No interpretation
- No “why it matters”
- No abstraction

Example:
> “An article discussing why traditional note-taking tools increase cognitive overhead.”

---

## Failure Handling

If enrichment fails:
- Mark `enrichment_status = failed`
- Do NOT retry aggressively
- Do NOT notify user
- Fall back to raw URL during recall

Failure is acceptable and silent.

---

## Where Enrichment Is Used

### Allowed Surfaces

1. Append-only stream
   - Show enriched_title instead of raw URL when available

2. Recall surfaces
   - Display enriched_title + enriched_description
   - Never show raw URL alone if enrichment exists

---

### Disallowed Uses

- No enrichment-based ranking
- No insight feeds
- No proactive surfacing
- No “you saved this because…” explanations

Enrichment improves *recognition*, not *intelligence*.

---

## What the User Sees (When It Matters)

Instead of:
```

[https://substack.com/p/attention-economy-failure](https://substack.com/p/attention-economy-failure)

```

They see:
> **Why the Attention Economy Is Breaking Knowledge Work**  
> Substack · saved 12 days ago

Optional second line:
> “An essay on how content overload erodes thinking quality.”

---

## What the User Never Sees

- Enrichment loading states
- Errors
- Status indicators
- Prompts to improve enrichment

---

## Explicit Non-Goals

This feature must NOT:
- Ask users to title links
- Ask users to confirm meaning
- Ask users “why did you save this?”
- Turn into a summarization product
- Create a reading queue

---

## Privacy Constraints (Non-Negotiable)

- No reading authenticated/private pages
- No storing cookies or session data
- No executing scripts
- No enrichment of pages behind logins unless user explicitly captured content

---

## Acceptance Criteria

- URL capture remains 1-step, no UI changes
- Enrichment never blocks capture
- Enriched metadata improves recall recognition
- Users never feel “asked” to explain a saved link
- Failure cases do not degrade core experience

---

## Success Metrics (Internal Only)

Track:
- % of links successfully enriched
- Recall click-through rate on enriched vs raw URLs
- Reduction in immediate dismissals during recall

Do NOT track:
- Time-to-read
- Reading completion
- Engagement with enrichment itself

---

## Kill Conditions

Remove or redesign if:
- Users report capture feeling slower
- Users feel nudged to “process” links
- Enrichment output becomes noisy or opinionated
- Team proposes exposing enrichment controls to users

---

## Final Guardrail

> If enrichment ever makes capture feel heavier,  
> this feature has failed and must be rolled back.

---

END OF SPEC
```

---

### How to deploy this safely

- Ship **behind a silent flag**
    
- Do not announce it
    
- Observe recall recognition improvement
    
- Keep enrichment conservative
    

This feature should feel like:

> “Oh yeah, _that_ link.”

Not:

> “Wow, it analyzed my content.”

---
