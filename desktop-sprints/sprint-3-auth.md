# Leo Desktop - Sprint 3: Authentication & Connect

## Task
Connect the desktop app to the Leo backend using a seamless browser-based authentication flow.

## Completion Criteria
- [ ] Register a custom protocol `leo://` in `package.json` and main process.
- [ ] Create a "Login" button in the Electron window that opens the web browser.
- [ ] Handle the `leo://auth?token=...` callback in the main process.
- [ ] Store the JWT securely (e.g., `electron-store`).
- [ ] Use the stored token to send a real POST request to `/api/capture` with capturing data.
- [ ] Show a native notification upon successful API save.

## Max Iterations
15
