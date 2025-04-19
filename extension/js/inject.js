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

    // Method 7: For video watch pages, extract from videoOwnerRenderer
    if (window.location.pathname === '/watch') {
        try {
            if (window.ytInitialData && window.ytInitialData.contents) {
                const videoData = JSON.stringify(window.ytInitialData.contents);
                const ownerMatch = videoData.match(/"videoOwnerChannelId":"(UC[a-zA-Z0-9_-]{22})"/);
                if (ownerMatch && ownerMatch[1]) return ownerMatch[1];
            }
        } catch (e) {
            console.error('Error extracting video owner channel ID:', e);
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

            // For watch pages, try to get the video owner's channel ID
            if (window.location.pathname === '/watch') {
                const videoData = window.ytInitialData.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];
                for (const content of videoData) {
                    if (content?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                        const channelId = content.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                        if (channelId.startsWith('UC')) return channelId;
                    }
                }
            }
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

// Special function to extract video owner channel ID
function getVideoOwnerChannelId() {
    // Only relevant for watch pages
    if (window.location.pathname !== '/watch') return null;

    try {
        // Method 0: Check the About link directly (NEW METHOD)
        const aboutLink = document.querySelector('a[href*="/channel/"][href*="/about"], a.yt-spec-button-shape-next[href*="/channel/"]');
        if (aboutLink) {
            const href = aboutLink.getAttribute('href');
            const channelMatch = href.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (channelMatch && channelMatch[1]) {
                // Store this ID for future use
                const newChannelId = channelMatch[1];

                // Compare with previously stored ID
                const storedId = localStorage.getItem('yt-extension-channel-id');
                if (storedId !== newChannelId) {
                    localStorage.setItem('yt-extension-channel-id', newChannelId);
                }

                return newChannelId;
            }
        }

        // Method 1: Direct from localStorage (set by our data-extractor.js)
        const storedId = localStorage.getItem('yt-extension-channel-id');
        if (storedId && storedId.startsWith('UC')) return storedId;

        // Method 2: From ytInitialData
        if (window.ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents) {
            const contents = window.ytInitialData.contents.twoColumnWatchNextResults.results.results.contents;

            // Check each content block
            for (const content of contents) {
                // Most common location
                if (content?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                    const id = content.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                    if (id.startsWith('UC')) return id;
                }

                // Alternative location
                if (content?.videoPrimaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                    const id = content.videoPrimaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                    if (id.startsWith('UC')) return id;
                }
            }
        }

        // Method 3: Parse from channel link in the DOM
        const ownerLink = document.querySelector('#owner a[href*="channel/"], #owner a[href*="/@"]');
        if (ownerLink) {
            const href = ownerLink.getAttribute('href');
            // Direct channel link
            const channelMatch = href.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
            if (channelMatch && channelMatch[1]) return channelMatch[1];

            // If it's a handle link, we need to click and extract, but this is complicated
            // This part might not work consistently
        }

        // Method 4: Search in scripts
        const scripts = document.querySelectorAll('script');
        for (const script of scripts) {
            if (script.textContent.includes('"videoOwnerChannelId"')) {
                const match = script.textContent.match(/"videoOwnerChannelId":"(UC[a-zA-Z0-9_-]{22})"/);
                if (match && match[1]) return match[1];
            }
        }

        // Method 5: Check microdata
        const microdata = document.querySelector('[itemprop="channelId"]');
        if (microdata && microdata.content && microdata.content.startsWith('UC')) {
            return microdata.content;
        }
    } catch (e) {
        console.error('Error extracting video owner channel ID:', e);
    }

    return null;
}

// Simple custom toast notification function that works with YouTube's CSP
function showToast(message, type = 'info', channelId = null) {
    // Remove any existing toasts
    const existingToasts = document.querySelectorAll('.yt-ext-toast-container');
    existingToasts.forEach(toast => {
        if (toast && toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    });

    // Create toast container
    const toast = document.createElement('div');
    toast.className = 'yt-ext-toast-container';

    // Set styles based on type
    let backgroundColor;
    switch (type) {
        case 'success':
            backgroundColor = 'rgba(46, 125, 50, 0.9)';
            break;
        case 'error':
            backgroundColor = 'rgba(198, 40, 40, 0.9)';
            break;
        default: // info
            backgroundColor = 'rgba(33, 33, 33, 0.9)';
    }

    // Apply styles
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        backgroundColor: backgroundColor,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '4px',
        fontFamily: '"Roboto", "Arial", sans-serif',
        fontSize: '14px',
        maxWidth: '400px',
        boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
    });

    // Create content
    const contentDiv = document.createElement('div');
    contentDiv.style.display = 'flex';
    contentDiv.style.alignItems = 'center';
    contentDiv.style.gap = '8px';
    contentDiv.style.flexGrow = '1';

    // Create text span
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    contentDiv.appendChild(textSpan);

    // Add copy button if channel ID is provided
    if (channelId) {
        const copyBtn = document.createElement('button');
        copyBtn.textContent = 'Copy';
        Object.assign(copyBtn.style, {
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: '#ffffff',
            color: '#000000',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            marginLeft: '8px'
        });

        copyBtn.onclick = (e) => {
            e.stopPropagation();

            // Copy channel ID to clipboard
            navigator.clipboard.writeText(channelId)
                .then(() => {
                    copyBtn.textContent = '✓ Copied';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                })
                .catch(err => {
                    copyBtn.textContent = 'Failed';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                });
        };

        contentDiv.appendChild(copyBtn);
    }

    toast.appendChild(contentDiv);

    // Create close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    Object.assign(closeBtn.style, {
        backgroundColor: 'transparent',
        border: 'none',
        color: 'white',
        cursor: 'pointer',
        fontSize: '20px',
        fontWeight: 'bold',
        marginLeft: '8px',
        padding: '0 5px',
        lineHeight: '1'
    });

    closeBtn.onclick = () => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    };

    toast.appendChild(closeBtn);

    // Add to body
    document.body.appendChild(toast);

    // Auto-hide after 5 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            // Fade out
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s ease';

            // Remove after animation
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 500);
        }
    }, 5000);

    return toast;
}

// Store the current location to detect navigation
let currentLocation = window.location.href;

// Function to clean up existing buttons before re-adding them
function cleanUpButtons() {
    // Remove any existing buttons to prevent duplicates
    const existingButtons = document.querySelectorAll('#yt-ext-find, #yt-ext-add');
    existingButtons.forEach(button => {
        if (button && button.parentNode) {
            // If the button is inside our wrapper, remove the whole wrapper
            const wrapper = button.closest('.yt-watch-buttons-container, .yt-flexible-actions-view-model-wiz__action');
            if (wrapper && wrapper.parentNode) {
                wrapper.parentNode.removeChild(wrapper);
            } else if (button.parentNode) {
                // Otherwise just remove the button
                button.parentNode.removeChild(button);
            }
        }
    });
}

function insertButtons() {
    // Clean up existing buttons first
    cleanUpButtons();

    // Only inject buttons on watch pages
    if (window.location.pathname !== '/watch') return;

    let buttonContainer = null;

    // Try to find the owner container in watch page
    buttonContainer = document.querySelector('#owner #upload-info') ||
        document.querySelector('#owner.ytd-watch-metadata') ||
        document.querySelector('#owner');

    if (!buttonContainer) return;

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
        // For video pages, use specialized function
        currentChannelId = getVideoOwnerChannelId();

        if (currentChannelId) {
            showToast(`Channel ID: ${currentChannelId}`, 'info', currentChannelId);
        } else {
            showToast('Channel ID not found.', 'error');
        }
    };

    addBtn.onclick = () => {
        if (!currentChannelId) {
            // Try to get the ID if not already set
            currentChannelId = getVideoOwnerChannelId();

            if (!currentChannelId) {
                showToast('Channel ID not found. Please click "Find ID" first!', 'error');
                return;
            }
        }

        // Show a loading toast
        const loadingToast = showToast(`Sending channel ID ${currentChannelId} to database...`, 'info');

        // Create the request data
        const requestData = {
            channelId: currentChannelId
        };

        // API url
        const apiUrl = 'http://localhost:3000/api/add-channel';

        fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(requestData)
        })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(errorData => {
                        throw new Error(errorData.message || `Server error: ${res.status}`);
                    }).catch(err => {
                        // If JSON parsing fails, throw the original error
                        throw new Error(`Server error: ${res.status}`);
                    });
                }
                return res.json();
            })
            .then(data => {
                // Remove loading toast if exists
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }
                showToast(data.message, data.message === 'Inserted' ? 'success' : 'info', currentChannelId);
            })
            .catch(error => {
                // Remove loading toast if exists
                if (loadingToast && loadingToast.parentNode) {
                    loadingToast.parentNode.removeChild(loadingToast);
                }
                // Show a friendlier error message
                showToast(`Database error: ${error.message}. Please check if your backend server is running.`, 'error');
            });
    };


    // Create a container for our buttons
    const buttonsWrapper = document.createElement('div');
    buttonsWrapper.className = 'yt-watch-buttons-container';

    // Inject the buttons
    buttonsWrapper.appendChild(findBtn);
    buttonsWrapper.appendChild(addBtn);
    buttonContainer.appendChild(buttonsWrapper);
}

// Watch for URL changes
function checkForUrlChanges() {
    if (currentLocation !== window.location.href) {
        // URL has changed
        currentLocation = window.location.href;

        // Wait a bit for the DOM to update with new page content
        setTimeout(() => {
            // Re-initialize buttons on the new page
            insertButtons();
        }, 1000); // 1 second delay
    }

    // Continue checking periodically
    setTimeout(checkForUrlChanges, 500);
}

// Start checking for URL changes
checkForUrlChanges();

// Watch for page data updates from YouTube's own events
document.addEventListener('yt-page-data-updated', function () {
    setTimeout(insertButtons, 500);
}, true);

// Watch for dynamic DOM changes
new MutationObserver(mutations => {
    // Look specifically for changes that might contain the owner info on watch pages
    const hasOwnerInfo = mutations.some(mutation => {
        return Array.from(mutation.addedNodes).some(node => {
            return node.id === 'owner' ||
                (node.querySelector && node.querySelector('#owner')) ||
                (window.location.pathname === '/watch' &&
                    (node.id === 'meta' || (node.querySelector && node.querySelector('#meta'))));
        });
    });

    if (hasOwnerInfo || mutations.length > 5) {
        insertButtons();
    }
}).observe(document.body, {
    childList: true,
    subtree: true
});

// Also try to insert buttons on initial page load
window.addEventListener('load', insertButtons);
// And try immediately in case the page is already loaded
setTimeout(insertButtons, 500);
