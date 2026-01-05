(function showToast() {
    const toastId = 'leo-extension-toast';

    // Remove existing toast if any
    const existing = document.getElementById(toastId);
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = toastId;
    toast.textContent = 'Saved ✅';

    Object.assign(toast.style, {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: '#0f172a', // Slate 900
        color: 'white',
        padding: '12px 24px',
        borderRadius: '12px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: '2147483647', // Max z-index
        opacity: '0',
        transition: 'opacity 0.2s ease-in-out',
        pointerEvents: 'none'
    });

    document.body.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
    });

    // Animate out and remove
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 200);
    }, 1500);
})();
