# Leo Desktop - Sprint 2: The Capture Mechanism

## Task
Implement the core "Magic" capture mechanism. This sprint builds upon the foundation to add the global hotkey listener and clipboard manipulation logic.

## Completion Criteria
- [ ] Register global shortcut `Command+Shift+E` (or `L`) in the main process.
- [ ] Implement `robotjs` or `nut.js` (or native module) to simulate keyboard events (`Cmd+C`).
- [ ] Implement logic to read from `clipboard` after the simulated copy.
- [ ] Log the captured text to the console (proof of concept).
- [ ] Handle permission errors gracefully (e.g., if Accessibility is denied).
- [ ] Restore previous clipboard content (optional, but good for MVP).

## Max Iterations
15
