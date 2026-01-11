const API_URL = 'https://leo-brain.vercel.app';
const DEFAULT_TOKEN = 'LeoExt2026SecureToken';

const getAuthToken = () => new Promise(resolve => {
    try {
        chrome.storage.sync.get('authToken', items => {
            resolve(items && items.authToken ? items.authToken : DEFAULT_TOKEN);
        });
    } catch (e) {
        resolve(DEFAULT_TOKEN);
    }
});

// Keyboard shortcuts
chrome.commands.onCommand.addListener(async (command) => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;

    if (command === 'save_capture') {
        await handleCapture(tab);
    } else if (command === 'trigger_recall') {
        await handleRecall(tab);
    } else if (command === 'capture_visual') {
        await handleVisualCapture(tab);
    }
});

// Icon click = Trigger Recall
chrome.action.onClicked.addListener(async (tab) => {
    if (!tab?.id) return;
    await handleVisualCapture(tab); // Make Icon click trigger Visual Capture for now? Or Recall? Leave Recall.
    await handleRecall(tab);
});

// ========== VISUAL CAPTURE (Cmd+Shift+S) ==========
async function handleVisualCapture(tab) {
    if (!tab?.windowId) return;

    // Show "Analyzing..." feedback immediately
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: showProcessingToast
    }).catch(() => { });

    // Capture visible tab as JPEG
    chrome.tabs.captureVisibleTab(tab.windowId, { format: 'jpeg', quality: 80 }, async (dataUrl) => {
        if (chrome.runtime.lastError || !dataUrl) {
            console.error('Screenshot failed:', chrome.runtime.lastError);
            return;
        }

        try {
            const payload = {
                type: 'image',
                content: dataUrl,
                url: tab.url,
                title: tab.title,
                timestamp: Date.now(),
                source: 'chrome_extension',
                device: 'desktop',
                sourceUrl: tab.url,
                sourcePageTitle: tab.title
            };

            const response = await fetch(`${API_URL}/api/capture`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${await getAuthToken()}`
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: showToast
                });
            } else {
                chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: showErrorToast
                });
            }
        } catch (err) {
            console.error('Visual capture error:', err);
        }
    });
}

function showProcessingToast() {
    const toastId = 'leo-extension-toast';
    const existing = document.getElementById(toastId);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.innerHTML = '👁️ <b>Analyzing Visual...</b>';

    Object.assign(toast.style, {
        position: 'fixed', bottom: '24px', right: '24px',
        backgroundColor: '#0f172a', color: '#fbbf24',
        padding: '12px 24px', borderRadius: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px', fontWeight: '500',
        zIndex: '2147483647', pointerEvents: 'none',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
    });
    document.body.appendChild(toast);
}

// ========== CAPTURE (Cmd+Shift+E) ==========
async function handleCapture(tab) {
    try {
        // Guard against restricted pages
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            console.log('Capture not supported on restricted page:', tab.url);
            return;
        }

        // 1. Inject content script to extract data (using func for proper return)
        const [result] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: extractContext
        });

        const payload = result?.result;
        if (!payload) {
            console.log('No payload returned from content extraction');
            return;
        }

        // 2. Prepare full payload with source context
        const finalPayload = {
            ...payload,
            timestamp: Date.now(),
            source: 'chrome_extension',
            device: 'desktop',
            sourceUrl: tab.url,
            sourcePageTitle: tab.title
        };

        // 3. Send to backend
        const response = await fetch(`${API_URL}/api/capture`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify(finalPayload)
        });

        if (response.ok) {
            // 4. Show success toast
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: showToast
            });
        } else {
            console.error('Capture failed:', response.status);
            // Show error toast
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: showErrorToast
            });
        }
    } catch (err) {
        console.error('Capture error:', err);
    }
}

// Injected function to extract context
function extractContext() {
    const selection = window.getSelection()?.toString().trim();
    const activeElement = document.activeElement;
    const pageUrl = window.location.href;
    const pageTitle = document.title;

    // 1. Text Selection
    if (selection && selection.length > 0) {
        return {
            type: 'selection',
            content: selection,
            url: pageUrl,
            title: pageTitle
        };
    }

    // 2. Focused Image
    if (activeElement && activeElement.tagName === 'IMG') {
        return {
            type: 'image',
            content: null,
            url: activeElement.src,
            title: pageTitle
        };
    }

    // 3. Page Context (Default)
    // Extract full page content for AI summarization
    let pageContent = '';
    try {
        const article = document.querySelector('article')
            || document.querySelector('[role="main"]')
            || document.querySelector('main')
            || document.querySelector('.content')
            || document.querySelector('#content')
            || document.body;

        if (article) {
            pageContent = article.innerText
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, 15000);
        }
    } catch (e) {
        console.error('Failed to extract page content:', e);
    }

    return {
        type: 'page',
        content: pageContent,
        url: pageUrl,
        title: pageTitle
    };
}

// Injected function to show success toast
function showToast() {

    const toastId = 'leo-extension-toast';
    const existing = document.getElementById(toastId);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.innerHTML = '✅ <b>Saved to Leo</b>';

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#0f172a',
        color: '#4ade80',
        padding: '12px 24px',
        borderRadius: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '2147483647',
        opacity: '0',
        transition: 'all 0.2s ease-in-out',
        pointerEvents: 'none'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 2000);
}

// Injected function to show error toast
function showErrorToast() {
    const toastId = 'leo-extension-toast';
    const existing = document.getElementById(toastId);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.textContent = '❌ Failed to save';

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#1e1e1e',
        color: '#ef4444',
        padding: '12px 24px',
        borderRadius: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: '2147483647',
        opacity: '0',
        transition: 'all 0.2s ease-in-out',
        pointerEvents: 'none'
    });

    document.body.appendChild(toast);
    requestAnimationFrame(() => { toast.style.opacity = '1'; });
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 2000);
}

// ========== RECALL (Cmd+Shift+Y) ==========
async function handleRecall(tab) {
    try {
        // Guard against restricted pages
        if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:') || tab.url.startsWith('file://')) {
            console.log('Recall not supported on restricted page:', tab.url);
            return;
        }

        // 1. Get context: selected text + current URL combined
        const [contextResult] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getRecallContext
        });

        const context = contextResult.result;
        if (!context || !context.combinedContext) {
            console.log('No context for recall');
            return;
        }

        // 2. Call recall API with combined context
        const response = await fetch(`${API_URL}/api/recall`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${await getAuthToken()}`
            },
            body: JSON.stringify({
                context: context.combinedContext,
                contextType: context.type,
                sourceUrl: context.url,
                selectedText: context.text
            })
        });

        if (!response.ok) {
            console.error('Recall API failed:', response.status);
            return;
        }

        const data = await response.json();

        // 3. Inject overlay with results
        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: injectRecallOverlay,
            args: [data.results]
        });

    } catch (err) {
        console.error('Recall error:', err);
    }
}

// Injected function to get context - returns BOTH text and URL when available
function getRecallContext() {
    const result = {
        text: null,
        url: null,
        type: 'url'  // Default type
    };

    // Get selected text if available
    const selection = window.getSelection()?.toString().trim();
    if (selection && selection.length > 0) {
        result.text = selection;
        result.type = 'text';
    }

    // Always include URL (unless chrome:// page)
    const url = window.location.href;
    if (url && !url.startsWith('chrome://')) {
        result.url = url;
    }

    // Combine text + URL for richer context
    if (result.text && result.url) {
        // Weighted context: text is more important, URL adds domain relevance
        result.combinedContext = `${result.text}\n\nSource: ${url}`;
        result.type = 'combined';
    } else if (result.text) {
        result.combinedContext = result.text;
    } else if (result.url) {
        result.combinedContext = result.url;
    }

    if (!result.combinedContext) {
        return null;
    }

    return result;
}

// Injected function to show overlay with enhanced UX
function injectRecallOverlay(results, cursorPosition) {
    // Remove existing overlay
    const existing = document.getElementById('leo-recall-overlay');
    if (existing) existing.remove();

    if (!results || results.length === 0) {
        showNothing();
        return;
    }

    // Fixed position: top-right of viewport
    const positionStyle = 'top: 20px; right: 20px;';

    // Create styles
    const style = document.createElement('style');
    style.id = 'leo-recall-styles';
    style.textContent = `
        #leo-recall-overlay {
            position: fixed;
            ${positionStyle}
            z-index: 2147483647;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 400px;
            animation: leoSlideIn 0.2s ease-out;
        }
        @keyframes leoSlideIn {
            from { transform: translateY(-10px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .leo-recall-card {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 14px 16px;
            margin-bottom: 8px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
            cursor: pointer;
            transition: all 0.15s;
            position: relative;
        }
        .leo-recall-card:hover, .leo-recall-card.leo-selected {
            border-color: rgba(251,191,36,0.5);
            transform: translateY(-2px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.5);
        }
        .leo-recall-card.leo-selected {
            background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
        }
        .leo-recall-label {
            color: #fbbf24;
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .leo-recall-title {
            color: #e2e8f0;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.4;
            margin-bottom: 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }
        .leo-recall-title mark {
            background: rgba(251,191,36,0.3);
            color: #fbbf24;
            padding: 0 2px;
            border-radius: 2px;
        }
        .leo-recall-source {
            color: #60a5fa;
            font-size: 11px;
            margin-bottom: 6px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            cursor: pointer;
        }
        .leo-recall-source:hover {
            text-decoration: underline;
        }
        .leo-recall-meta {
            color: #64748b;
            font-size: 11px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .leo-recall-confidence {
            display: inline-flex;
            align-items: center;
            gap: 3px;
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 4px;
            background: rgba(34,197,94,0.2);
            color: #22c55e;
        }
        .leo-recall-confidence.weak {
            background: rgba(251,191,36,0.2);
            color: #fbbf24;
        }
        .leo-recall-actions {
            display: flex;
            gap: 6px;
            margin-top: 10px;
            opacity: 0;
            transition: opacity 0.15s;
        }
        .leo-recall-card:hover .leo-recall-actions,
        .leo-recall-card.leo-selected .leo-recall-actions {
            opacity: 1;
        }
        .leo-recall-btn {
            background: rgba(255,255,255,0.1);
            border: none;
            color: #94a3b8;
            padding: 5px 10px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.15s;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        .leo-recall-btn:hover {
            background: rgba(251,191,36,0.2);
            color: #fbbf24;
        }
        .leo-recall-btn.primary {
            background: rgba(251,191,36,0.2);
            color: #fbbf24;
        }
        .leo-recall-dismiss {
            position: absolute;
            top: 8px;
            right: 8px;
            background: none;
            border: none;
            color: #475569;
            cursor: pointer;
            padding: 4px 8px;
            font-size: 14px;
            opacity: 0;
            transition: all 0.15s;
        }
        .leo-recall-card:hover .leo-recall-dismiss {
            opacity: 1;
        }
        .leo-recall-dismiss:hover {
            color: #ef4444;
        }
        .leo-recall-hint {
            color: #475569;
            font-size: 10px;
            margin-top: 8px;
            text-align: center;
        }
        .leo-recall-hint kbd {
            background: rgba(255,255,255,0.1);
            padding: 2px 5px;
            border-radius: 3px;
            font-family: monospace;
        }
    `;
    document.head.appendChild(style);

    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'leo-recall-overlay';

    // Header
    const header = document.createElement('div');
    header.className = 'leo-recall-label';
    header.innerHTML = '✨ You\'ve seen this before';
    overlay.appendChild(header);

    // Track selected index for keyboard nav
    let selectedIndex = 0;
    const cards = [];

    // Cards
    results.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'leo-recall-card' + (index === 0 ? ' leo-selected' : '');
        card.dataset.index = index;
        cards.push(card);

        // Get title and highlight matches
        let title = item.enrichedTitle || item.content.substring(0, 100);

        // Highlight matched words (if we have context)
        if (item.matchedTerms && item.matchedTerms.length > 0) {
            item.matchedTerms.forEach(term => {
                const regex = new RegExp(`(${term})`, 'gi');
                title = title.replace(regex, '<mark>$1</mark>');
            });
        }

        const meta = item.sourceDomain || new Date(item.createdAt).toLocaleDateString();
        const isUrl = item.contentType === 'url';

        // Confidence indicator
        const confidence = item.similarity >= 0.6 ? 'strong' : 'weak';
        const confidenceLabel = item.similarity >= 0.6 ? '● Strong match' : '○ Possible match';

        // Get source URL for display (with error handling)
        const sourceUrl = item.sourceUrl || (item.contentType === 'url' ? item.content : null);
        let displayUrl = null;
        try {
            if (sourceUrl) displayUrl = new URL(sourceUrl).hostname;
        } catch (e) {
            displayUrl = sourceUrl ? sourceUrl.substring(0, 30) + '...' : null;
        }

        card.innerHTML = `
            <button class="leo-recall-dismiss" title="Not helpful">×</button>
            <div class="leo-recall-title">${title}</div>
            ${displayUrl ? `<div class="leo-recall-source" title="${escapeHtml(sourceUrl)}">🔗 ${escapeHtml(displayUrl)}</div>` : ''}
            <div class="leo-recall-meta">
                <span>${escapeHtml(meta)}</span>
                <span class="leo-recall-confidence ${confidence}">${confidenceLabel}</span>
            </div>
            <div class="leo-recall-actions">
                <button class="leo-recall-btn primary" data-action="open">${isUrl ? '↗ Open' : '📋 Copy'}</button>
                ${sourceUrl ? `<button class="leo-recall-btn" data-action="copyUrl">🔗 Copy URL</button>` : ''}
                <button class="leo-recall-btn" data-action="never">🚫 Never show</button>
            </div>
        `;

        // Button actions
        card.querySelectorAll('.leo-recall-btn').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                handleAction(btn.dataset.action, item, card);
            });
        });

        // Dismiss button
        card.querySelector('.leo-recall-dismiss').addEventListener('click', e => {
            e.stopPropagation();
            dismissItem(item, card);
        });

        // Card click = primary action
        card.addEventListener('click', () => {
            handleAction('open', item, card);
        });

        overlay.appendChild(card);
    });

    // Keyboard hints
    const hint = document.createElement('div');
    hint.className = 'leo-recall-hint';
    hint.innerHTML = '<kbd>↑↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close';
    overlay.appendChild(hint);

    document.body.appendChild(overlay);

    // Keyboard navigation
    function handleKeyboard(e) {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleKeyboard);
            return;
        }

        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            cards[selectedIndex].classList.remove('leo-selected');
            if (e.key === 'ArrowDown') {
                selectedIndex = (selectedIndex + 1) % cards.length;
            } else {
                selectedIndex = (selectedIndex - 1 + cards.length) % cards.length;
            }
            cards[selectedIndex].classList.add('leo-selected');
            cards[selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            const item = results[selectedIndex];
            handleAction('open', item, cards[selectedIndex]);
        }

        if (e.key === 'c' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            const item = results[selectedIndex];
            handleAction('copy', item, cards[selectedIndex]);
        }
    }
    document.addEventListener('keydown', handleKeyboard);

    // Auto-close after 15s
    const autoClose = setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            setTimeout(() => overlay.remove(), 200);
        }
    }, 15000);

    function handleAction(action, item, card) {
        const sourceUrl = item.sourceUrl || (item.contentType === 'url' ? item.content : null);

        if (action === 'open') {
            if (item.contentType === 'url') {
                window.open(item.content, '_blank');
            } else {
                navigator.clipboard.writeText(item.content);
                showFeedback(card, '✓ Copied!');
            }
            trackInteraction(item.id, 'recall_select');
        } else if (action === 'copy') {
            navigator.clipboard.writeText(item.content);
            showFeedback(card, '✓ Copied!');
            trackInteraction(item.id, 'copy');
        } else if (action === 'copyUrl') {
            if (sourceUrl) {
                navigator.clipboard.writeText(sourceUrl);
                showFeedback(card, '✓ URL Copied!');
            }
        } else if (action === 'never') {
            dismissItem(item, card, true);
        }
    }

    function dismissItem(item, card, permanent = false) {
        fetch('https://leo-brain.vercel.app/api/recall', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: item.id, permanent })
        });
        card.style.opacity = '0';
        card.style.transform = 'translateX(20px)';
        setTimeout(() => {
            card.remove();
            if (!overlay.querySelector('.leo-recall-card')) {
                overlay.remove();
            }
        }, 200);
    }

    function showFeedback(card, message) {
        const meta = card.querySelector('.leo-recall-meta');
        const original = meta.innerHTML;
        meta.innerHTML = `<span style="color:#22c55e">${message}</span>`;
        setTimeout(() => meta.innerHTML = original, 1500);
    }

    function trackInteraction(itemId, signal) {
        fetch(`https://leo-brain.vercel.app/api/items/${itemId}/interaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ signal })
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNothing() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 2147483647;
            background: #1e293b; border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px; padding: 12px 16px; color: #94a3b8;
            font-family: -apple-system, sans-serif; font-size: 13px;
        `;
        toast.textContent = 'Nothing relevant found';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
}
