import { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog, Notification, shell, ipcMain, systemPreferences } from 'electron';
import path from 'path';
import { exec, spawn } from 'child_process';
import Store from 'electron-store';
import fs from 'fs';

// --- DEBUG LOGGER ---
const logPath = path.join(app.getPath('userData'), 'leo-debug.log');
const log = (message: string) => {
  const timestamp = new Date().toISOString();
  const logMsg = `[${timestamp}] ${message}\n`;
  try {
    fs.appendFileSync(logPath, logMsg);
  } catch (e) {
    console.error("Logging failed", e);
  }
};

// Clear log on startup
try { fs.writeFileSync(logPath, ''); } catch (e) { }
log(`App starting... PID: ${process.pid}`);
log(`UserData Path: ${app.getPath('userData')}`);
log(`Platform: ${process.platform}`);
log(`App Name: ${app.name}`);
log(`App Path: ${process.execPath}`);

// Persist tokens
const store = new Store();

// Register protocol scheme as privileged
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('leo', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('leo');
}

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;
let recallWindow: BrowserWindow | null = null;

// Import icon (Vite will handle this path)
import iconPath from './assets/appicon.png';

const API_URL = 'https://leo-brain.vercel.app'; // Production
const EXTENSION_TOKEN = 'LeoExt2026SecureToken'; // Same as Chrome extension

// Get metadata about the source application
interface SourceMetadata {
  appName: string;
  windowTitle: string;
  url?: string;
}

const getSourceMetadata = (): Promise<SourceMetadata> => {
  return new Promise((resolve) => {
    // AppleScript to get frontmost app info and browser URL if applicable
    const script = `
      set appName to ""
      set windowTitle to ""
      set pageUrl to ""
      
      tell application "System Events"
        set frontApp to first application process whose frontmost is true
        set appName to name of frontApp
        try
          set windowTitle to name of front window of frontApp
        end try
      end tell
      
      -- Get URL if it's a browser
      if appName is "Google Chrome" then
        tell application "Google Chrome"
          set pageUrl to URL of active tab of front window
        end tell
      else if appName is "Safari" then
        tell application "Safari"
          set pageUrl to URL of front document
        end tell
      else if appName is "Arc" then
        tell application "Arc"
          set pageUrl to URL of active tab of front window
        end tell
      end if
      
      return appName & "|||" & windowTitle & "|||" & pageUrl
    `;

    const child = spawn('osascript', ['-e', script]);
    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.on('close', () => {
      const parts = output.trim().split('|||');
      resolve({
        appName: parts[0] || 'Unknown',
        windowTitle: parts[1] || '',
        url: parts[2] || undefined
      });
    });

    // Timeout fallback
    setTimeout(() => {
      resolve({ appName: 'Unknown', windowTitle: '' });
    }, 2000);
  });
};

// Helper to separate API logic
const sendToApi = async (payload: any) => {
  try {
    log('Sending to API');
    const response = await fetch(`${API_URL}/api/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${store.get('authToken') || EXTENSION_TOKEN}`
      },
      body: JSON.stringify(payload)
    });

    log(`API response status: ${response.status}`);

    if (response.ok) {
      log('Showing success notification');
      new Notification({
        title: 'Leo Saved',
        body: payload.content ? payload.content.substring(0, 40) + '...' : payload.title
      }).show();
    } else {
      log(`API failed with status: ${response.status}`);
      new Notification({
        title: 'Leo Save Failed',
        body: response.status === 401 ? 'Please log in again.' : 'Server error.'
      }).show();
    }
  } catch (err) {
    log(`API Exception: ${err}`);
    new Notification({
      title: 'Leo Save Failed',
      body: 'Could not connect to server.'
    }).show();
  }
};

const performCapture = async () => {
  log('performCapture called');

  // 1. Preserve current clipboard
  const previousText = clipboard.readText();

  // 2. Clear clipboard to detect change
  clipboard.clear();

  // 3. Spawn osascript directly (Fixes TCC Attribution)
  log('Triggering Cmd+C (spawn osascript)');

  const script = 'tell application "System Events" to keystroke "c" using {command down}';
  const child = spawn('osascript', ['-e', script]);

  let stderrData = '';

  child.stderr.on('data', (data) => {
    stderrData += data.toString();
  });

  child.on('error', (err) => {
    log(`Spawn error: ${err.message}`);
    new Notification({ title: 'Capture Error', body: 'Failed to launch capture process.' }).show();
  });

  child.on('close', (code) => {
    log(`osascript process exited with code ${code}`);

    if (code !== 0) {
      log(`osascript stderr: ${stderrData}`);

      // Error 1002: "osascript is not allowed to send keystrokes" = ACCESSIBILITY permission
      if (stderrData.includes('(1002)') || stderrData.includes('not allowed to send keystrokes')) {
        new Notification({
          title: 'Accessibility Required',
          body: 'Please enable Leo in Privacy & Security > Accessibility.'
        }).show();
        setTimeout(() => {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
        }, 1000);
        return;
      }

      // Error -1743: Automation permission (Apple Events)
      if (stderrData.includes('-1743')) {
        new Notification({
          title: 'Automation Required',
          body: 'Please enable Leo for System Events in Privacy & Security > Automation.'
        }).show();
        setTimeout(() => {
          shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Automation');
        }, 1000);
        return;
      }

      new Notification({ title: 'Capture Error', body: 'Copy command failed.' }).show();
      return;
    }

    // Success path
    log('AppleScript success');

    // 4. Wait for copy (increased to 800ms)
    setTimeout(async () => {
      const capturedText = clipboard.readText();
      log(`Clipboard context length: ${capturedText.length}`);

      if (capturedText && capturedText !== previousText) {
        log("LEO CAPTURED text");

        // Get source application metadata
        const metadata = await getSourceMetadata();
        log(`Source: ${metadata.appName} | ${metadata.windowTitle} | ${metadata.url || 'no url'}`);

        await sendToApi({
          type: 'selection',
          content: capturedText,
          source: 'desktop-app',
          title: metadata.windowTitle || 'Quick Capture',
          url: metadata.url || '',
          sourceUrl: metadata.url,
          sourcePageTitle: metadata.windowTitle,
          device: 'desktop',
          appName: metadata.appName,
          timestamp: Date.now()
        });

      } else {
        log("No text captured - attempting URL fallback");

        // Retrieve metadata to see if we have a URL (Browser active)
        const metadata = await getSourceMetadata();

        if (metadata.url && metadata.url.startsWith('http')) {
          log(`Fallback Success: Captured URL ${metadata.url}`);

          await sendToApi({
            type: 'page', // Treated as full page capture by backend
            content: '',  // Empty content triggers backend enrichment
            source: 'desktop-app',
            title: metadata.windowTitle || 'Page Capture',
            url: metadata.url,
            sourceUrl: metadata.url,
            sourcePageTitle: metadata.windowTitle,
            device: 'desktop',
            appName: metadata.appName,
            timestamp: Date.now()
          });

        } else {
          log("No text and no valid URL found");
          if (previousText) clipboard.writeText(previousText);
          new Notification({
            title: 'Nothing Captured',
            body: 'Select text or open a webpage.'
          }).show();
        }
      }
    }, 800);
  });
};

const buildRecallHTML = (results: any[]) => {
  const cards = results.map((item: any, index: number) => {
    const title = item.enrichedTitle || item.content?.substring(0, 80) || 'Memory';
    const meta = item.sourceDomain || new Date(item.createdAt).toLocaleDateString();
    const url = item.contentType === 'url' ? item.content : '';
    const contentEscaped = (item.content || '').replace(/`/g, "'").replace(/\\/g, '\\\\').replace(/"/g, '\\"');

    return `
      <div class="card" data-index="${index}" data-url="${url}" data-content="${contentEscaped}" data-id="${item.id}">
        <div class="title">${escapeHTML(title)}</div>
        <div class="meta">${escapeHTML(meta)}</div>
        <div class="actions">
          ${url ? `<button class="btn btn-primary" onclick="openUrl('${url}')">↗ Open</button>` : ''}
          <button class="btn" onclick="copyContent(this, \`${contentEscaped}\`)">📋 Copy</button>
          <button class="btn btn-danger" onclick="dismiss('${item.id}', this)">⊘ Never show</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          background: transparent;
          padding: 12px;
        }
        .container {
          background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 16px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.4);
        }
        .header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #fbbf24;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
          transition: all 0.2s;
        }
        .card:hover, .card.selected {
          border-color: rgba(251,191,36,0.4);
          background: rgba(255,255,255,0.08);
        }
        .title {
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 500;
          line-height: 1.4;
          margin-bottom: 4px;
        }
        .meta {
          color: #64748b;
          font-size: 11px;
          margin-bottom: 8px;
        }
        .actions {
          display: flex;
          gap: 6px;
        }
        .btn {
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 6px;
          color: #94a3b8;
          font-size: 11px;
          padding: 4px 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn:hover {
          background: rgba(255,255,255,0.15);
          color: #e2e8f0;
        }
        .btn-primary {
          background: rgba(59, 130, 246, 0.3);
          border-color: rgba(59, 130, 246, 0.5);
          color: #93c5fd;
        }
        .btn-primary:hover {
          background: rgba(59, 130, 246, 0.5);
        }
        .btn-danger:hover {
          background: rgba(239, 68, 68, 0.3);
          border-color: rgba(239, 68, 68, 0.5);
          color: #fca5a5;
        }
        .footer {
          margin-top: 12px;
          padding-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.1);
          color: #64748b;
          font-size: 10px;
          text-align: center;
        }
        .footer kbd {
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          padding: 1px 4px;
          margin: 0 2px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">✨ You've seen this before</div>
        ${cards}
        <div class="footer">
          <kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
        </div>
      </div>
      <script>
        const { shell, clipboard } = require('electron');

        function openUrl(url) {
          shell.openExternal(url);
          window.close();
        }

        function copyContent(btn, content) {
          clipboard.writeText(content);
          btn.textContent = '✓ Copied!';
          setTimeout(() => window.close(), 500);
        }

        function dismiss(itemId, btn) {
          btn.closest('.card').style.opacity = '0.3';
          fetch('https://leo-brain.vercel.app/api/recall', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId })
          });
          setTimeout(() => btn.closest('.card').remove(), 300);
        }

        // Keyboard navigation
        let selected = -1;
        const cards = document.querySelectorAll('.card');

        document.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') window.close();
          if (e.key === 'ArrowDown') {
            selected = Math.min(selected + 1, cards.length - 1);
            updateSelection();
          }
          if (e.key === 'ArrowUp') {
            selected = Math.max(selected - 1, 0);
            updateSelection();
          }
          if (e.key === 'Enter' && selected >= 0) {
            const card = cards[selected];
            const url = card.dataset.url;
            if (url) openUrl(url);
            else copyContent(card.querySelector('.btn:nth-child(1)'), card.dataset.content);
          }
        });

        function updateSelection() {
          cards.forEach((c, i) => c.classList.toggle('selected', i === selected));
          if (selected >= 0) cards[selected].scrollIntoView({ block: 'nearest' });
        }
      </script>
    </body>
    </html>
  `;
};

const escapeHTML = (str: string) => str.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] || c));

const createTray = () => {
  log('Creating tray');
  const icon = nativeImage.createFromPath(iconPath);
  const trayIcon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Leo - Ambient Memory');

  updateTrayMenu();
};

const updateTrayMenu = () => {
  const isLoggedIn = !!store.get('authToken');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Capture Selection', accelerator: 'Command+Option+C', click: performCapture },
    { label: 'Recall Memories', accelerator: 'Command+Option+R', click: performRecall },
    { type: 'separator' },
    { label: isLoggedIn ? '✓ Connected' : 'Connect Account', click: login, enabled: !isLoggedIn },
    { label: isLoggedIn ? 'Log Out' : '', click: logout, visible: isLoggedIn },
    { type: 'separator' },
    { label: 'Show Leo', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray?.setContextMenu(contextMenu);
};

const login = () => {
  log('Login initiated');
  // Open the browser to initiate auth flow.
  // The web app should capture this, ask user to approve, then redirect to leo://auth?token=...
  shell.openExternal(`${API_URL}/authorize?source=desktop`);
};

const logout = () => {
  log('Logout initiated');
  store.delete('authToken');
  updateTrayMenu();
  new Notification({ title: 'Leo', body: 'Logged out.' }).show();
};

const performRecall = async () => {
  log('performRecall called');
  const token = store.get('authToken');
  if (!token) {
    log('Recall failed: No token');
    new Notification({ title: 'Leo Recall', body: 'Please log in first.' }).show();
    return;
  }

  // 1. Preserve current clipboard
  const previousText = clipboard.readText();

  // 2. Clear clipboard to detect change
  clipboard.clear();

  // 3. Trigger Copy (Cmd+C) via osascript
  log('Triggering Cmd+C (spawn osascript) for Recall');
  const script = 'tell application "System Events" to keystroke "c" using {command down}';
  const child = spawn('osascript', ['-e', script]);

  child.on('close', (code) => {
    if (code !== 0) {
      log(`Recall Copy failed with code ${code}`);
      // Fallback: Try reading clipboard anyway in case they DID copy manually
      if (previousText) clipboard.writeText(previousText);
    }

    // 4. Wait for copy to complete
    setTimeout(async () => {
      // Use captured text, OR fallback to previous text (if they manually copied before hitting shortcut)
      let context = clipboard.readText();

      if (!context || context.length === 0) {
        // If auto-copy failed (e.g. nothing selected), fallback to what was previously in clipboard
        // This allows "Copy -> Move mouse -> Recall" workflow to still work too.
        log('Auto-copy empty, using previous clipboard');
        if (previousText) {
          context = previousText;
          clipboard.writeText(previousText); // Restore it
        }
      } else {
        log(`Recall captured ${context.length} chars`);
      }

      if (!context) {
        new Notification({ title: 'Recall', body: 'Select text to recall memories.' }).show();
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/recall`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ context, limit: 5 })
        });

        if (!response.ok) {
          log(`Recall API failed: ${response.status}`);
          new Notification({ title: 'Leo Recall', body: 'Failed to fetch memories.' }).show();
          return;
        }

        const data = await response.json();
        const results = data.results || [];

        if (results.length === 0) {
          new Notification({ title: 'Leo Recall', body: 'Nothing relevant found.' }).show();
          return;
        }

        // Store results for the recall window to retrieve
        store.set('recallResults', results);

        // Create recall popup window - position at top-right
        if (recallWindow) recallWindow.close();

        // Get screen dimensions for positioning
        const { screen } = require('electron');
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width: screenWidth } = primaryDisplay.workAreaSize;

        recallWindow = new BrowserWindow({
          width: 420,
          height: 500,
          x: screenWidth - 440, // 20px from right edge
          y: 20, // 20px from top
          frame: false,
          transparent: true,
          alwaysOnTop: true,
          skipTaskbar: true,
          visibleOnAllWorkspaces: true, // Appear on current Space without switching
          webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
          }
        });

        // Use base64 encoding to preserve UTF-8 characters
        const htmlContent = buildRecallHTML(results);
        const base64Html = Buffer.from(htmlContent, 'utf-8').toString('base64');
        recallWindow.loadURL(`data:text/html;charset=utf-8;base64,${base64Html}`);
        recallWindow.on('closed', () => { recallWindow = null; });
        recallWindow.on('blur', () => { recallWindow?.close(); });

      } catch (err) {
        log(`Recall exception: ${err}`);
        console.error('Recall failed', err);
        new Notification({ title: 'Leo Recall', body: 'Could not connect.' }).show();
      }
    }, 600); // 600ms wait for copy
  });
};

const createWindow = () => {
  log('Creating main window');
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: true, // Show by default to fix "missing icon" confusion
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
};

// Handle Deep Link
app.on('open-url', async (event, url) => {
  event.preventDefault();
  log(`Deep link received: ${url}`);
  console.log("Deep link received:", url);

  const handleDeepLink = () => {
    // leo://auth?token=XYZ
    if (url.startsWith('leo://auth')) {
      const urlObj = new URL(url);
      const token = urlObj.searchParams.get('token');
      if (token) {
        log('Token extracted successfully');
        store.set('authToken', token);
        new Notification({ title: 'Leo Connected', body: 'You can now capture memories.' }).show();
        updateTrayMenu();

        // Notify renderer
        mainWindow?.webContents.send('leo:connection-status', true);
      } else {
        log('No token found in deep link');
      }
    } else {
      log('Deep link does not start with leo://auth');
    }
  };

  if (app.isReady()) {
    handleDeepLink();
  } else {
    await app.whenReady();
    handleDeepLink();
  }
});

const performScreenshot = async () => {
  log('performScreenshot called');

  // Check TCC permissions for Screen Recording by attempting a silent capture check first
  // Note: 'screencapture' usually prompts system UI if needed.

  // Interactive capture to clipboard: -i (interactive), -c (clipboard), -x (no sound)
  const child = spawn('screencapture', ['-i', '-c', '-x']);

  child.on('close', (code) => {
    log(`screencapture exited with code ${code}`);
    if (code === 0) {
      // Check clipboard for image
      const image = clipboard.readImage();
      if (!image || image.isEmpty()) {
        log('Screenshot taken but clipboard likely empty (user cancelled?)');
        return;
      }

      const base64Image = image.toDataURL(); // Returns 'data:image/png;base64,...'
      log(`Screenshot captured. Size: ${base64Image.length}`);

      // Send to API
      sendToApi({
        type: 'image',
        content: base64Image, // Full base64 string
        url: '', // No URL for screenshot
        source: 'desktop-app-vision',
        title: 'Visual Capture',
        device: 'desktop',
        appName: 'Screen',
        timestamp: Date.now()
      });

      // Inform user
      new Notification({
        title: 'Analyzing Visual...',
        body: 'Leo is reading text from your screenshot.'
      }).show();
    }
  });
};

app.on('ready', () => {
  log('App Ready');
  createWindow();
  createTray();

  // TCC Registration
  const child = spawn('osascript', ['-e', 'tell application "System Events" to get name']);
  child.on('error', (err) => log(`TCC Reg error: ${err.message}`));

  // Capture shortcut
  globalShortcut.register('Command+Option+C', performCapture);

  // Recall shortcut
  globalShortcut.register('Command+Option+R', performRecall);

  // Visual Capture shortcut
  globalShortcut.register('Command+Option+S', performScreenshot);

  // IPC handlers
  ipcMain.on('leo:capture', performCapture);
  ipcMain.on('leo:recall', performRecall);
  ipcMain.on('leo:logout', () => {
    logout();
    mainWindow?.webContents.send('leo:connection-status', false);
  });
  ipcMain.on('leo:login', login);
  ipcMain.on('leo:hide', () => mainWindow?.hide());
  ipcMain.on('leo:quit', () => app.quit());

  // === WIZARD IPC ===
  ipcMain.handle('leo:check-permissions', () => {
    // Check Accessibility (Trusted Client)
    const isAccessibilityGranted = systemPreferences.isTrustedAccessibilityClient(false);
    return { accessibility: isAccessibilityGranted };
  });

  ipcMain.handle('leo:check-auth', () => {
    return !!store.get('authToken');
  });

  ipcMain.handle('leo:open-settings', (event, type) => {
    if (type === 'accessibility') {
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility');
    }
  });
});

app.on('will-quit', () => {
  log('App quitting');
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
