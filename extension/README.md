# Leo Chrome Extension (v1.1)

Zero-friction capture for your second brain.

## Installation

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in top right)
3. Click **Load unpacked** (top left)
4. Select this `extension` directory
5. The extension "Leo - Zero Friction Capture" should appear

## Configuration

The extension comes pre-configured to talk to the Leo API at `https://leo-brain.vercel.app/api/capture`.
Auth token is hardcoded for MVP in `background.js`.

## Usage

**Keyboard Shortcut:**
- **macOS:** `Cmd + Shift + E`
- **Windows:** `Ctrl + Shift + E`

**Behavior:**
1. Press shortcut
2. Extension captures:
   - Selected text (if any)
   - OR Focused image
   - OR Current page URL + Title
3. Shows "Saved ✅" toast in bottom right
4. Item appears in your Leo Inbox
