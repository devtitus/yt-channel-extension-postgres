// This runs in the page context and can access YouTube's window variables
window.addEventListener('yt-page-data-updated', function () {
    if (window.ytInitialData) {
        // Extract channel ID based on page type
        let channelId = null;

        // For channel pages
        channelId = window.ytInitialData?.metadata?.channelMetadataRenderer?.externalId ||
            window.ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId;

        // For video pages
        if (!channelId && window.location.pathname === '/watch') {
            try {
                // Try different paths in the YouTube data structure where channel ID might be
                const videoData = window.ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

                for (const content of videoData) {
                    // Look in videoSecondaryInfoRenderer (typical location)
                    if (content?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                        channelId = content.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                        if (channelId && channelId.startsWith('UC')) break;
                    }

                    // Alternative location
                    if (content?.videoPrimaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                        channelId = content.videoPrimaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                        if (channelId && channelId.startsWith('UC')) break;
                    }
                }

                // If still not found, search in renderer data
                if (!channelId) {
                    const dataStr = JSON.stringify(window.ytInitialData);
                    const match = dataStr.match(/"videoOwnerChannelId":"(UC[a-zA-Z0-9_-]{22})"/);
                    if (match && match[1]) {
                        channelId = match[1];
                    }
                }
            } catch (e) {
                // Silent error handling in production
            }
        }

        // Dispatch event with the found channel ID
        if (channelId) {
            document.dispatchEvent(new CustomEvent('yt-channel-data-ready', {
                detail: JSON.stringify({ channelId })
            }));
        }
    }
}, true);

// Also check on initial page load
if (window.ytInitialData) {
    // Extract channel ID based on page type
    let channelId = null;

    // For channel pages
    channelId = window.ytInitialData?.metadata?.channelMetadataRenderer?.externalId ||
        window.ytInitialData?.header?.c4TabbedHeaderRenderer?.channelId;

    // For video pages
    if (!channelId && window.location.pathname === '/watch') {
        try {
            // Try different paths in the YouTube data structure where channel ID might be
            const videoData = window.ytInitialData?.contents?.twoColumnWatchNextResults?.results?.results?.contents || [];

            for (const content of videoData) {
                // Look in videoSecondaryInfoRenderer (typical location)
                if (content?.videoSecondaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                    channelId = content.videoSecondaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                    if (channelId && channelId.startsWith('UC')) break;
                }

                // Alternative location
                if (content?.videoPrimaryInfoRenderer?.owner?.videoOwnerRenderer?.navigationEndpoint?.browseEndpoint?.browseId) {
                    channelId = content.videoPrimaryInfoRenderer.owner.videoOwnerRenderer.navigationEndpoint.browseEndpoint.browseId;
                    if (channelId && channelId.startsWith('UC')) break;
                }
            }

            // If still not found, search in renderer data
            if (!channelId) {
                const dataStr = JSON.stringify(window.ytInitialData);
                const match = dataStr.match(/"videoOwnerChannelId":"(UC[a-zA-Z0-9_-]{22})"/);
                if (match && match[1]) {
                    channelId = match[1];
                }
            }
        } catch (e) {
            // Silent error handling in production
        }
    }

    // Dispatch event with the found channel ID
    if (channelId) {
        document.dispatchEvent(new CustomEvent('yt-channel-data-ready', {
            detail: JSON.stringify({ channelId })
        }));
    }
}