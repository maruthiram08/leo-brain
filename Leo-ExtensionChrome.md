This is written so you can **build directly from it** without interpretation.

---

```md
# Chrome Extension – Zero-Friction Capture (MVP Spec)

## 1. Purpose

Enable instant saving of any on-screen content on desktop using a single keyboard shortcut, with:
- Zero UI
- Zero decisions
- Zero disruption

This extension is a **capture primitive**, not an app.

---

## 2. Core Principle (Non-Negotiable)

> Capture must be **faster than forgetting**.

If the user has to:
- Think
- Choose
- Click a popup
- Confirm anything

The product has failed.

---

## 3. Platform Scope

- Browser: **Chrome only**
- Extension Type: **Manifest V3**
- UI: **None**
- Auth: **None (static token for MVP)**

---

## 4. Primary User Flow

### User Action
```

Cmd + Shift + E (macOS)  
Ctrl + Shift + E (Windows)

```

### System Flow
```

Shortcut pressed  
→ Extension activates  
→ Reads page context  
→ Sends payload to backend  
→ Shows brief “Saved ✓” toast  
→ Terminates

```

No branching. No dialogs.

---

## 5. What Gets Captured (Priority Order)

The extension must auto-detect context in the following order:

1. **Selected text**
2. **Focused image (if applicable)**
3. **Current page URL + title**
4. **Clipboard contents (fallback)**

The user never chooses.

---

## 6. Extension Architecture

```

/extension  
├── manifest.json  
├── background.js # shortcut listener + orchestrator  
├── content.js # page context extraction  
└── toast.js # ephemeral visual feedback

````

No other files are allowed in v0.

---

## 7. Manifest Specification

### Permissions (minimum required)
- activeTab
- scripting
- commands

### Commands
- Command ID: `save_capture`
- Default shortcut:
  - macOS: Cmd + Shift + E
  - Windows: Ctrl + Shift + E

### Explicit Omissions
- No popup
- No options page
- No browser action UI

---

## 8. Background Script Responsibilities (`background.js`)

Acts as the **single orchestrator**.

### Responsibilities
- Listen for keyboard shortcut
- Identify active tab
- Inject `content.js`
- Receive capture payload
- POST payload to backend
- Inject `toast.js`

### Explicit Constraints
- No local storage
- No retry logic (v0)
- No error UI
- Always behave as success

---

## 9. Content Extraction Logic (`content.js`)

### Detection Rules
- If `window.getSelection()` is non-empty → capture selection
- Else if image is focused → capture image URL
- Else → capture page URL + title
- If all fail → fallback to clipboard

### Returned Payload (to background)
```json
{
  "type": "selection | image | page | clipboard",
  "content": "string or null",
  "url": "string",
  "title": "string"
}
````

### Rules

- Never throw errors
    
- Empty content is acceptable
    
- Always return a payload
    

---

## 10. Backend API Contract

### Endpoint

```
POST /capture
```

### Headers

```
Authorization: Bearer <STATIC_TOKEN>
Content-Type: application/json
```

### Payload Schema

```json
{
  "type": "selection | image | page | clipboard",
  "content": "string",
  "url": "string",
  "title": "string",
  "timestamp": 1736080000,
  "source": "chrome_extension",
  "device": "desktop"
}
```

### Backend Guarantees

- Always respond with `200 OK`
    
- No synchronous AI processing
    
- Deduplication handled server-side
    
- Capture must never block
    

---

## 11. Toast Feedback (`toast.js`)

### Behavior

- Appears bottom-right
    
- Text: `Saved ✓`
    
- Auto-dismiss in ~1 second
    
- Non-interactive
    
- No animation complexity
    

### Failure Handling

- Same toast
    
- No error messaging
    
- No retries shown to user
    

---

## 12. Explicitly Out of Scope (MVP)

The following are **intentionally excluded**:

- Popup UI
    
- Login / auth flows
    
- Folder selection
    
- Tagging
    
- Settings page
    
- Previewing saved content
    
- Notifications
    
- Analytics
    
- Offline queueing
    
- Retry logic
    

Adding any of these violates MVP constraints.

---

## 13. Edge Case Handling (Minimum)

|Case|Expected Behavior|
|---|---|
|PDF|Save URL + selected text|
|Gmail / Notion|Selection fallback|
|Incognito|Capture allowed|
|iframe|Best-effort selection|
|Duplicate saves|Backend dedupes|

---

## 14. Testing Checklist (Must Pass All)

- Save without touching mouse
    
- Save repeatedly in quick succession
    
- Save from:
    
    - Reddit
        
    - Twitter/X
        
    - PDFs
        
    - Gmail
        
    - Notion
        
- No UI interruption
    
- No blocking
    
- No prompts
    
- No errors shown
    

---

## 15. Definition of Success

The product is successful when:

> The user instinctively presses the shortcut instead of bookmarking or copying links.

That is the only metric that matters.

---

## 16. Next Logical Extensions (Post-MVP)

(Not part of v0, listed for clarity)

- Offline queue + retry
    
- Screenshot capture
    
- Firefox / Safari ports
    
- Mobile parity
    
- AI auto-summaries
    
- Searchable inbox UI
    

None of these require changes to capture logic.

---

## 17. Final Rule

> Capture is sacred.  
> Organization is optional.  
> Speed beats correctness.

End of spec. 

[[Leo]]
