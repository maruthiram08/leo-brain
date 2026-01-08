import { app, BrowserWindow, Tray, Menu, nativeImage, globalShortcut, clipboard, dialog, Notification, shell, ipcMain } from 'electron';
import path from 'path';
import { exec } from 'child_process';
import Store from 'electron-store';

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

// Import icon (Vite will handle this path)
import iconPath from './assets/appicon.png';

const API_URL = 'https://leo-brain.vercel.app'; // Production

const performCapture = async () => {
  // 1. Preserve current clipboard
  const previousText = clipboard.readText();

  // 2. Clear clipboard to detect change?
  clipboard.clear();

  // 3. Simulate Cmd+C to copy selected text
  exec(`osascript -e 'tell application "System Events" to keystroke "c" using {command down}'`, (error) => {
    if (error) {
      console.error("Failed to execute copy command:", error);
      return;
    }

    // 4. Wait briefly for copy
    setTimeout(async () => {
      const capturedText = clipboard.readText();

      if (capturedText) {
        console.log("LEO CAPTURED:", capturedText);

        // Get Token
        const token = store.get('authToken');

        if (!token) {
          new Notification({
            title: 'Leo Capture Failed',
            body: 'Please log in via the menu bar icon first.'
          }).show();
          return;
        }

        // Send to API
        try {
          const response = await fetch(`${API_URL}/api/capture`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              type: 'selection',
              content: capturedText,
              source: 'desktop-app',
              title: 'Quick Capture',
              timestamp: Date.now()
            })
          });

          if (response.ok) {
            new Notification({
              title: 'Leo Saved',
              body: capturedText.substring(0, 40) + '...'
            }).show();
          } else {
            console.error('API Error', response.status, response.statusText);
            new Notification({
              title: 'Leo Save Failed',
              body: response.status === 401 ? 'Please log in again.' : 'Server error.'
            }).show();
          }

        } catch (err) {
          console.error('API Save Failed', err);
          new Notification({
            title: 'Leo Save Failed',
            body: 'Could not connect to server.'
          }).show();
        }

      } else {
        console.log("LEO: No text captured");
        if (previousText) clipboard.writeText(previousText);
      }
    }, 300);
  });
};

const login = () => {
  // Open the browser to initiate auth flow. 
  // The web app should capture this, ask user to approve, then redirect to leo://auth?token=...
  shell.openExternal(`${API_URL}/authorize?source=desktop`);
};

const logout = () => {
  store.delete('authToken');
  updateTrayMenu();
  new Notification({ title: 'Leo', body: 'Logged out.' }).show();
};

let recallWindow: BrowserWindow | null = null;

const performRecall = async () => {
  const token = store.get('authToken');
  if (!token) {
    new Notification({ title: 'Leo Recall', body: 'Please log in first.' }).show();
    return;
  }

  // Get clipboard content as context
  const context = clipboard.readText() || '';

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
    console.error('Recall failed', err);
    new Notification({ title: 'Leo Recall', body: 'Could not connect.' }).show();
  }
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
  const icon = nativeImage.createFromPath(iconPath);
  const trayIcon = icon.resize({ width: 16, height: 16 });

  tray = new Tray(trayIcon);
  tray.setToolTip('Leo - Ambient Memory');

  updateTrayMenu();
};

const updateTrayMenu = () => {
  const isLoggedIn = !!store.get('authToken');
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Capture Selection', accelerator: 'Command+Shift+E', click: performCapture },
    { label: 'Recall Memories', accelerator: 'Command+Shift+Y', click: performRecall },
    { type: 'separator' },
    { label: isLoggedIn ? '✓ Connected' : 'Connect Account', click: login, enabled: !isLoggedIn },
    { label: isLoggedIn ? 'Log Out' : '', click: logout, visible: isLoggedIn },
    { type: 'separator' },
    { label: 'Show Leo', click: () => mainWindow?.show() },
    { label: 'Quit', click: () => app.quit() }
  ]);
  tray?.setContextMenu(contextMenu);
};

const createWindow = () => {
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
app.on('open-url', (event, url) => {
  event.preventDefault();
  console.log("Deep link received:", url);
  // leo://auth?token=XYZ
  if (url.startsWith('leo://auth')) {
    const urlObj = new URL(url);
    const token = urlObj.searchParams.get('token');
    if (token) {
      store.set('authToken', token);
      new Notification({ title: 'Leo Connected', body: 'You can now capture memories.' }).show();
      updateTrayMenu();
    }
  }
});

app.on('ready', () => {
  createWindow();
  createTray();

  // Capture shortcut
  const retCapture = globalShortcut.register('Command+Shift+E', () => {
    console.log('Capture Shortcut Triggered');
    performCapture();
  });
  if (!retCapture) console.log('Capture shortcut registration failed');

  // Recall shortcut
  const retRecall = globalShortcut.register('Command+Shift+Y', () => {
    console.log('Recall Shortcut Triggered');
    performRecall();
  });
  if (!retRecall) console.log('Recall shortcut registration failed');

  // IPC handlers for UI buttons
  ipcMain.on('leo:capture', () => performCapture());
  ipcMain.on('leo:recall', () => performRecall());
  ipcMain.on('leo:logout', () => {
    logout();
    mainWindow?.webContents.send('leo:connection-status', false);
  });
  ipcMain.on('leo:login', () => login());
  ipcMain.on('leo:hide', () => mainWindow?.hide());
});

app.on('will-quit', () => {
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
