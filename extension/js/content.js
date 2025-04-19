// Create a script tag to inject code that runs in the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('js/inject.js');
(document.head || document.documentElement).appendChild(script);

// Add a style tag to apply our button styles
const style = document.createElement('link');
style.rel = "stylesheet";
style.href = chrome.runtime.getURL('css/styles.css');
document.head.appendChild(style);

// Load our data extraction script
const dataExtractor = document.createElement('script');
dataExtractor.src = chrome.runtime.getURL('js/data-extractor.js');
(document.head || document.documentElement).appendChild(dataExtractor);

// Listen for channel data from page context
document.addEventListener('yt-channel-data-ready', function (e) {
  try {
    const data = JSON.parse(e.detail);
    if (data.channelId) {
      // Store the channel ID where our inject.js can find it
      localStorage.setItem('yt-extension-channel-id', data.channelId);
    }
  } catch (err) {
    // Silent error handling in production
  }
}, false);
