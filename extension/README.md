# Leo Chrome Extension (v2.1)

**Ambient Memory for the Web** - Capture and recall from your second brain.

## Installation

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked** → select this `extension` directory
4. (Optional) Set keyboard shortcuts at `chrome://extensions/shortcuts`

## Features

### 📥 Capture (Cmd+Shift+E)
Save content to Leo with one keystroke:
- **Selected text** → Saves text with source URL
- **No selection** → Saves current page URL + title
- Shows "Saved ✅" toast on success

### 🔮 Recall (Cmd+Shift+Y or Click Icon)
Instantly surface relevant memories:
- **Semantic matching** → Finds related content across your memory
- **Context-aware** → Uses current URL + selected text as query
- **Keyboard navigation** → ↑↓ to navigate, Enter to open, Esc to close
- **Actions** → Open, Copy, Copy URL, Never Show

### UI Features
- **Floating overlay** → Appears near selection or top-right corner
- **Confidence indicators** → Strong match (green) vs Possible match (yellow)
- **Auto-dismiss** → Closes after 15 seconds of inactivity
- **Dark theme** → Matches Leo's ambient design

## Keyboard Shortcuts

| Action | macOS | Windows |
|--------|-------|---------|
| Capture | Cmd+Shift+E | Ctrl+Shift+E |
| Recall | Cmd+Shift+Y | Ctrl+Shift+Y |

## Configuration

The extension connects to:
- **API:** `https://leo-brain.vercel.app`
- **Auth:** Hardcoded token in `background.js` (MVP)

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (MV3) |
| `background.js` | Service worker: capture, recall, overlay injection |
| `content.js` | Content extraction for capture |
| `toast.js` | Success notification |
| `icons/` | Extension icons (16, 48, 128px) |

## Troubleshooting

**Recall not working?**
- Check you're not on a restricted page (`chrome://`, `file://`)
- Reload extension after updates

**No results appearing?**
- Ensure you have saved items in Leo
- Try selecting text for more context

## Version History

| Version | Changes |
|---------|---------|
| 1.0 | Basic capture |
| 1.1 | Toast notifications |
| 2.0 | Recall overlay, keyboard navigation |
| 2.1 | Click-to-recall, Source URL display, Diversity logic |
