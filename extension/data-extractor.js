// This runs in the page context and can access YouTube's window variables
window.addEventListener('yt-page-data-updated', function () {
    if (window.ytInitialData) {
        document.dispatchEvent(new CustomEvent('yt-channel-data-ready', {
            detail: JSON.stringify({
                channelId: window.ytInitialData?.metadata?.channelMetadataRenderer?.externalId ||
                    window.ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId
            })
        }));
    }
}, true);

// Also check on initial page load
if (window.ytInitialData) {
    document.dispatchEvent(new CustomEvent('yt-channel-data-ready', {
        detail: JSON.stringify({
            channelId: window.ytInitialData?.metadata?.channelMetadataRenderer?.externalId ||
                window.ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId
        })
    }));
}