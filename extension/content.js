(function extractContext() {
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
    return {
        type: 'page',
        content: null,
        url: pageUrl,
        title: pageTitle
    };
})();
