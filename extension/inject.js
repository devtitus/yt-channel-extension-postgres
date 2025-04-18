function getChannelIdFromMeta() {
    // Method 0: Check if our content script has stored the ID in localStorage
    const storedId = localStorage.getItem('yt-extension-channel-id');
    if (storedId && storedId.startsWith('UC')) return storedId;

    // Method 1: Try to find channel ID from meta tag (old method)
    const meta = document.querySelector('meta[itemprop="channelId"]');
    if (meta && meta.content) return meta.content;

    // Method 2: Try to extract from the URL
    const canonicalUrl = document.querySelector('link[rel="canonical"]')?.href;
    if (canonicalUrl) {
        const urlMatch = canonicalUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
        if (urlMatch && urlMatch[1]) return urlMatch[1];
    }

    // Method 3: Try to find from the URL directly
    const currentUrl = window.location.href;
    const urlIdMatch = currentUrl.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/);
    if (urlIdMatch && urlIdMatch[1]) return urlIdMatch[1];

    // Method 4: Try to extract from page content
    const scripts = document.querySelectorAll('script');
    for (let script of scripts) {
        if (script.textContent.includes('"channelId":"UC')) {
            const channelMatch = script.textContent.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
            if (channelMatch && channelMatch[1]) return channelMatch[1];
        }
    }

    // Method 5: Look for channel ID in ytInitialData
    if (window.ytInitialData) {
        const dataStr = JSON.stringify(window.ytInitialData);
        const dataMatch = dataStr.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
        if (dataMatch && dataMatch[1]) return dataMatch[1];
    }

    // Method 6: Try to find from custom username URLs (handle /@username URLs)
    if (window.location.pathname.startsWith('/@')) {
        // Get username from the URL
        const customUsername = window.location.pathname.substring(2).split('/')[0];

        // Method 6a: Check DOM for clues about this username's channel ID
        const allScripts = document.querySelectorAll('script');
        for (let script of allScripts) {
            if (script.textContent.includes(customUsername) && script.textContent.includes('externalId')) {
                const regex = new RegExp(`"${customUsername}"[^}]*?"externalId":"(UC[a-zA-Z0-9_-]{22})"`);
                const match = script.textContent.match(regex);
                if (match && match[1]) return match[1];
            }
        }

        // Method 6b: Try to find in page data (deeper search)
        try {
            const elements = document.querySelectorAll('*');
            for (let el of elements) {
                if (el.__dataHost || el.__data) {
                    const dataStr = JSON.stringify(el.__dataHost || el.__data);
                    if (dataStr.includes('UC')) {
                        const match = dataStr.match(/"(UC[a-zA-Z0-9_-]{22})"/);
                        if (match && match[1]) return match[1];
                    }
                }
            }
        } catch (e) {
            console.error('Error searching DOM data:', e);
        }
    }

    return null;
}

// Add a function to directly get channel info from page data
function extractIdFromPageData() {
    try {
        // Try to get from window objects that YouTube sets
        if (window.ytInitialData) {
            const browserId = window.ytInitialData?.metadata?.channelMetadataRenderer?.externalId;
            if (browserId && browserId.startsWith('UC')) return browserId;

            // Try header channel renderer
            const headerChannelId = window.ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId;
            if (headerChannelId && headerChannelId.startsWith('UC')) return headerChannelId;
        }

        // Try to get from other potential YouTube data objects
        if (window.ytPageData && window.ytPageData.data) {
            const pageData = window.ytPageData.data;
            if (pageData.channelId && pageData.channelId.startsWith('UC')) {
                return pageData.channelId;
            }
        }
    } catch (e) {
        console.error('Error extracting channel ID:', e);
    }
    return null;
}

// Special function to extract channel ID for custom URLs
function getChannelIdForCustomUrl() {
    // This only applies to /@username URLs
    if (!window.location.pathname.startsWith('/@')) return null;

    try {
        // Try to extract from JSON in script tags
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('"browseId":"UC')) {
                const match = script.textContent.match(/"browseId":"(UC[a-zA-Z0-9_-]{22})"/);
                if (match && match[1]) return match[1];
            }
        }

        // Try to find in the rendered page
        const canonicalLink = document.querySelector('link[rel="canonical"]');
        if (canonicalLink && canonicalLink.href.includes('/channel/')) {
            const match = canonicalLink.href.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (match && match[1]) return match[1];
        }
    } catch (e) {
        console.error('Error finding channel ID for custom URL:', e);
    }
    return null;
}

// Create toast notification function
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.yt-ext-toast');
    existingToasts.forEach(toast => toast.remove());

    // Create new toast
    const toast = document.createElement('div');
    toast.className = `yt-ext-toast yt-ext-toast-${type}`;
    toast.textContent = message;

    // Add to document
    document.body.appendChild(toast);

    // Remove toast after animation completes
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);

    return toast;
}

function insertButtons() {
    // Find the parent container with YouTube action buttons
    // Try multiple selectors for different YouTube layouts
    const buttonContainer = document.querySelector('yt-flexible-actions-view-model') ||
        document.querySelector('ytd-c4-tabbed-header-renderer #buttons') ||
        document.querySelector('.page-header .buttons-container');

    if (!buttonContainer || document.getElementById('yt-ext-find')) return;

    // Create Find ID button
    const findBtn = document.createElement('button');
    findBtn.innerText = 'Find ID';
    findBtn.id = 'yt-ext-find';
    findBtn.className = 'yt-extension-btn';

    // Create Add to DB button
    const addBtn = document.createElement('button');
    addBtn.innerText = 'Add to DB';
    addBtn.id = 'yt-ext-add';
    addBtn.className = 'yt-extension-btn';

    let currentChannelId = null;

    findBtn.onclick = () => {
        // Try all available methods to find the channel ID
        currentChannelId = localStorage.getItem('yt-extension-channel-id') ||
            getChannelIdForCustomUrl() ||
            extractIdFromPageData() ||
            getChannelIdFromMeta();

        if (currentChannelId) {
            showToast(`Channel ID: ${currentChannelId}`, 'info');
        } else {
            showToast('Channel ID not found.', 'error');
        }
    };

    addBtn.onclick = () => {
        if (!currentChannelId) {
            // Try to get the ID if not already set
            currentChannelId = localStorage.getItem('yt-extension-channel-id') ||
                getChannelIdForCustomUrl() ||
                extractIdFromPageData() ||
                getChannelIdFromMeta();

            if (!currentChannelId) {
                showToast('Channel ID not found. Please click "Find ID" first!', 'error');
                return;
            }
        }

        fetch('http://localhost:3000/api/add-channel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ channelId: currentChannelId })
        })
            .then(res => res.json())
            .then(data => showToast(data.message, data.message === 'Inserted' ? 'success' : 'info'))
            .catch(() => showToast('Error inserting to DB.', 'error'));
    };

    // Create a container for our buttons to match YouTube's styling
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'yt-flexible-actions-view-model-wiz__action';
    buttonsWrapper.style.display = 'flex';

    // Inject the buttons
    buttonsWrapper.appendChild(findBtn);
    buttonsWrapper.appendChild(addBtn);
    buttonContainer.appendChild(buttonsWrapper);
}

// Watch for dynamic DOM changes
new MutationObserver(insertButtons).observe(document.body, {
    childList: true,
    subtree: true
});
