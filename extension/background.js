const API_URL = 'https://leo-brain.vercel.app/api/capture';
const AUTH_TOKEN = 'LeoExt2026SecureToken'; // Matches .env.local

chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'save_capture') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab?.id) return;

        try {
            // 1. Inject content script to extract data
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            const payload = result.result;

            if (!payload) return;

            // 2. Prepare full payload
            const finalPayload = {
                ...payload,
                timestamp: Date.now(),
                source: 'chrome_extension',
                device: 'desktop'
            };

            // 3. Send to backend
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_TOKEN}`
                },
                body: JSON.stringify(finalPayload)
            });

            if (response.ok) {
                // 4. Show success toast
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['toast.js']
                });
            } else {
                console.error('Capture failed:', response.status);
            }
        } catch (err) {
            console.error('Extension error:', err);
        }
    }
});
