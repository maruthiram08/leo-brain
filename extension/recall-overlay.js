// Leo Recall Overlay - Floating UI for recall results
(function showRecallOverlay(results) {
    // Remove existing overlay if any
    const existing = document.getElementById('leo-recall-overlay');
    if (existing) existing.remove();

    if (!results || results.length === 0) {
        showNothing();
        return;
    }

    // Create overlay container
    const overlay = document.createElement('div');
    overlay.id = 'leo-recall-overlay';
    overlay.innerHTML = `
        <style>
            #leo-recall-overlay {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                max-width: 400px;
                animation: leoSlideIn 0.2s ease-out;
            }
            @keyframes leoSlideIn {
                from { transform: translateX(20px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            .leo-recall-card {
                background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                padding: 16px;
                margin-bottom: 8px;
                box-shadow: 0 8px 32px rgba(0,0,0,0.4);
                cursor: pointer;
                transition: all 0.2s;
            }
            .leo-recall-card:hover {
                border-color: rgba(251,191,36,0.4);
                transform: translateY(-2px);
            }
            .leo-recall-header {
                display: flex;
                align-items: center;
                gap: 8px;
                margin-bottom: 8px;
            }
            .leo-recall-emoji {
                font-size: 16px;
            }
            .leo-recall-label {
                color: #fbbf24;
                font-size: 10px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .leo-recall-title {
                color: #e2e8f0;
                font-size: 14px;
                font-weight: 500;
                line-height: 1.4;
                margin-bottom: 4px;
                overflow: hidden;
                text-overflow: ellipsis;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
            }
            .leo-recall-meta {
                color: #64748b;
                font-size: 11px;
            }
            .leo-recall-dismiss {
                position: absolute;
                top: 8px;
                right: 8px;
                background: none;
                border: none;
                color: #64748b;
                cursor: pointer;
                padding: 4px;
                font-size: 16px;
                opacity: 0;
                transition: opacity 0.2s;
            }
            .leo-recall-card:hover .leo-recall-dismiss {
                opacity: 1;
            }
            .leo-recall-dismiss:hover {
                color: #ef4444;
            }
        </style>
        <div class="leo-recall-header" style="padding: 0 4px 8px;">
            <span class="leo-recall-emoji">✨</span>
            <span class="leo-recall-label">You've seen this before</span>
        </div>
    `;

    // Add result cards
    results.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'leo-recall-card';
        card.style.position = 'relative';

        const title = item.enrichedTitle || item.content.substring(0, 100);
        const meta = item.sourceDomain || new Date(item.createdAt).toLocaleDateString();

        card.innerHTML = `
            <button class="leo-recall-dismiss" data-id="${item.id}" title="Not helpful">×</button>
            <div class="leo-recall-title">${escapeHtml(title)}</div>
            <div class="leo-recall-meta">${escapeHtml(meta)}</div>
        `;

        // Click to open/copy
        card.addEventListener('click', (e) => {
            if (e.target.classList.contains('leo-recall-dismiss')) return;

            if (item.contentType === 'url') {
                window.open(item.content, '_blank');
            } else {
                navigator.clipboard.writeText(item.content);
                card.querySelector('.leo-recall-meta').textContent = '✓ Copied!';
            }

            // Track selection
            fetch('https://leo-brain.vercel.app/api/items/' + item.id + '/interaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ signal: 'recall_select' })
            });
        });

        // Dismiss button
        card.querySelector('.leo-recall-dismiss').addEventListener('click', (e) => {
            e.stopPropagation();
            fetch('https://leo-brain.vercel.app/api/recall', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ itemId: item.id })
            });
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 200);
        });

        overlay.appendChild(card);
    });

    document.body.appendChild(overlay);

    // Close on Escape
    const handleEscape = (e) => {
        if (e.key === 'Escape') {
            overlay.remove();
            document.removeEventListener('keydown', handleEscape);
        }
    };
    document.addEventListener('keydown', handleEscape);

    // Auto-close after 10 seconds
    setTimeout(() => {
        if (document.body.contains(overlay)) {
            overlay.style.animation = 'leoSlideIn 0.2s ease-out reverse';
            setTimeout(() => overlay.remove(), 200);
        }
    }, 10000);

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function showNothing() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 2147483647;
            background: #1e293b;
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 12px 16px;
            color: #94a3b8;
            font-family: -apple-system, sans-serif;
            font-size: 13px;
            animation: leoSlideIn 0.2s ease-out;
        `;
        toast.textContent = 'Nothing relevant found';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    }
})();
