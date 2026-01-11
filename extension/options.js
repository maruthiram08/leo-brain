// Save options
document.getElementById('save').addEventListener('click', () => {
    const token = document.getElementById('token').value.trim();

    chrome.storage.sync.set({ authToken: token }, () => {
        const status = document.getElementById('status');
        status.style.display = 'block';
        setTimeout(() => {
            status.style.display = 'none';
        }, 2000);
    });
});

// Restore options
document.addEventListener('DOMContentLoaded', () => {
    chrome.storage.sync.get(['authToken'], (items) => {
        if (items.authToken) {
            document.getElementById('token').value = items.authToken;
        }
    });
});
