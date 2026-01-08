# System-Wide Capture Guide

You can build a "capture surface" for PDF readers (or any app) without using Raycast by using macOS **Automator Quick Actions**.

## Prerequisite
Ensure you have your `EXTENSION_TOKEN` from your environment variables (`.env`).

## Step 1: Create the Script
We have created a script at `scripts/macos-capture.sh`.
1. Open detailed file: `scripts/macos-capture.sh`
2. Update `LEO_API_URL` if you are running locally (e.g., `http://localhost:3000`).
3. **IMPORTANT**: Update `AUTH_TOKEN` with your actual `EXTENSION_TOKEN`.

## Step 2: Create a macOS Quick Action
1. Open **Automator** (Cmd+Space, type "Automator").
2. Choose **New Document** -> **Quick Action**.
3. Configure the workflow at the top:
   - **Workflow receives current**: `text`
   - **in**: `any application` (or specifically Preview/PDF Expert)
4. Add a **Run Shell Script** action (search for it in the sidebar).
5. In the script action:
   - **Shell**: `/bin/bash`
   - **Pass input**: `to stdin`
   - Paste the following (adjusting the path to where your repo is, or just paste the full content of `macos-capture.sh`):

   ```bash
   # Paste content of scripts/macos-capture.sh here
   # OR
   /Users/maruthi/Desktop/MainDirectory/Leo/scripts/macos-capture.sh
   # Note: Ensure the script is executable (chmod +x)
   ```

6. Save the Quick Action as **"Capture to Leo"**.

## Step 3: Assign a Keyboard Shortcut
1. Open **System Settings** -> **Keyboard** -> **Keyboard Shortcuts...**
2. Select **Services** (or "Services Menu").
3. Find **General** -> **Capture to Leo** (expand the list).
4. Click "none" and assign a shortcut, e.g., `Cmd+Shift+E` (same as Chrome) or `Cmd+Shift+C`.

## Usage
1. Open a PDF in Preview.
2. Select some text.
3. Press your shortcut (or Right Click -> Services -> Capture to Leo).
4. You should see a notification "Leo Captured".

## Advanced: macOS Shortcuts App
Alternatively, you can build this in the **Shortcuts** app:
1. Create new Shortcut "Capture to Leo".
2. Action: "Get Selected Text".
3. Action: "Get Contents of URL" (POST method).
   - URL: `https://leo-brain.vercel.app/api/capture`
   - Method: POST
   - Headers: 
     - `Content-Type`: `application/json`
     - `Authorization`: `Bearer <YOUR_TOKEN>`
   - Request Body: JSON
     - `type`: `selection`
     - `content`: (Variable: Selected Text)
     - `source`: `macos-shortcut`
4. Enable "Pin in Menu Bar" or assign a hotkey.
