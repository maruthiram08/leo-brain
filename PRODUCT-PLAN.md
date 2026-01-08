# Leo Product Suite - Zero Config Plan

## Product Vision
**"One App, Total Recall."**
The user installs **Leo Desktop** (and optionally the Chrome Extension). That's it.
- **No** manual AppleScript setup.
- **No** complex config files.
- **Works everywhere**: PDF, Word, Slack, Images.

## Architecture: The "Invisible" Layer

### 1. Leo Desktop (Electron + Node Native Modules)
The central nervous system.
- **Installer**: Standard `.dmg`. Drag and drop to install.
- **Permissions**: Asks for "Accessibility" and "Screen Recording" permissions *once* on first launch (standard macOS flow).

### 2. Universal Capture Engine (Inside Desktop App)
When user hits `Cmd+Shift+C`:

#### Strategy A: Accessibility API (Text)
Attempts to read the "selected text" attribute from the active window using native macOS accessibility APIs (via `node-mac-permissions` or `driver-less` accessibility libs).
- *Works for*: Word, Pages, Notes, Slack, Most PDF readers.

#### Strategy B: Clipboard Fallback (Text/Files)
If Strategy A fails (or returns empty), the app proactively:
1. Simulates `Cmd+C` keystroke.
2. Reads clipboard content.
3. Restores previous clipboard (optional, for cleanliness).
- *Works for*: Almost everything else.

#### Strategy C: Visual Capture (Screenshots/Images)
If user hits Screenshot Hotkey (`Cmd+Shift+S`):
1. App triggers a cross-hair selection overlay.
2. Captures screen area.
3. **OCR**: Runs local OCR (e.g., Tesseract.js or Apple's Vision framework via native binding) OR uploads image to Leo Backend for "Vision Enrichment".
- *Works for*: Non-selectable text, images, slides.

### 3. Chrome Extension (Helper)
- Connects to Leo Desktop if installed? Or just works independently.
- **Zero Config Sync**: If Leo Desktop is logged in, can it share auth token with Chrome Ext? (Advanced, maybe V2). For now, simple login in both is acceptable.

## Implementation Priorities

1.  **Scaffold Electron App**: Clean, menu-bar only (hidden dock icon option).
2.  **Native Integration Module**: Write/use a module to handle the `Cmd+C` simulation and Clipboard reading cleanly.
3.  **Global Shortcut**: Register standard `globalShortcut` in Electron.
4.  **Backend Connection**: Zero-config "Connect" flow.

## Revised Roadmap
- [ ] **Init**: Create `desktop-app` with Electron Forge or Builder.
- [ ] **Core**: Implement "Simulate Copy & Capture" workflow (most robust "universal" method).
- [ ] **OCR**: Add basic screenshot-to-text capability for "un-selectable" content.
