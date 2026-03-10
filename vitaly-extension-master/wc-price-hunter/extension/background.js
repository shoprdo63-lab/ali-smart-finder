/**
 * Background Service Worker
 * Handles extension lifecycle and background tasks
 */

console.log('🚀 WC Price Hunter - Background Service Worker initialized');

// Extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('✓ Extension installed');
  } else if (details.reason === 'update') {
    console.log('✓ Extension updated to version', chrome.runtime.getManifest().version);
  }
});

// Keep service worker alive
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  sendResponse({ received: true });
  return true;
});
