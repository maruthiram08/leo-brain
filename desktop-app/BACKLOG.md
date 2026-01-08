# Leo Desktop App - Backlog

## High Priority

### 1. Browser URL Fallback Capture
**Status:** Planned  
**Description:** When no text is selected, detect the frontmost browser (Chrome/Safari) and capture the current page URL instead of doing nothing.  
**Approach:** Use AppleScript to query Chrome/Safari for the active tab URL.  
**Benefit:** Parity with Chrome extension behavior.

### 2. Source Metadata Capture
**Status:** Code Ready (Needs Build)  
**Description:** Capture metadata about the source application when capturing text - app name, window title, and URL (for browsers).  
**Approach:** Use AppleScript to get frontmost app info. For Chrome/Safari/Arc, also get active tab URL.  
**Benefit:** Rich context for captures, matching Chrome extension behavior.

---

## Medium Priority

### 2. Shortcut Conflict with Chrome Extension
**Status:** Noted  
**Description:** Desktop app and Chrome extension both use `Cmd+Shift+E` / `Cmd+Shift+Y`. Desktop global shortcuts take priority, making extension shortcuts non-functional when desktop app is running.  
**Options:**
- Use different shortcuts for each
- Smart detection to skip handling when Chrome is focused
- Document as expected behavior (use one or the other)

---

## Low Priority

### 3. Fix TypeScript Lint Errors
**Status:** Deferred  
**Files:** `src/main.ts`, `forge.config.ts`  
**Errors:**
- `ElectronStore` type definitions
- `visibleOnAllWorkspaces` property
- `MAIN_WINDOW_VITE_*` variable declarations
- `entitlements` property in `OsxSignOptions`

---

## Completed

- [x] Quiet Status Card UI redesign
- [x] TCC permission fix (Accessibility + Automation)
- [x] Error 1002 detection → Accessibility settings
- [x] EXTENSION_TOKEN for capture API
- [x] Login/Logout in footer
- [x] Chrome extension toast fix
