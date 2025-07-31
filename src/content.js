import { LinkedInJobSearch,LinkedInForm, LinkedInJobPage } from './linkedin/index.js';
import { debugLog, sendStatusUpdate, shouldStop } from './utils.js';

let isAutoApplyRunning = false;


// Main auto-apply function
async function startAutoApply() {
  try {
    debugLog('Starting auto-apply process');
    debugLog('Current URL:', window.location.href);

    if (await shouldStop(isAutoApplyRunning)) return;

    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");
    debugLog('Search element found:', !!searchElement);

    if (!searchElement) {
      debugLog('Available elements on page:', {
        body: document.body.innerHTML.substring(0, 500) + '...',
        possibleSelectors: {
          scaffold: document.querySelector(".scaffold-layout"),
          jobsSearch: document.querySelector(".jobs-search-two-pane__layout"),
          anyJobsRelated: document.querySelectorAll('[class*="jobs-"]')
        }
      });
      sendStatusUpdate('Could not find jobs list. Please make sure you are on LinkedIn jobs page.', 'error');
      return;
    }

    // Get total jobs count
    debugLog('Getting total jobs count');
    const totalJobs = await LinkedInJobSearch.getTotalJobsSearchCount(searchElement);
    debugLog('Total jobs found:', totalJobs);
    sendStatusUpdate(`Found ${totalJobs} jobs to process`, 'info');

    // Get available pages
    debugLog('Getting available pages');
    const totalPages = await LinkedInJobSearch.getAvailablePages(searchElement, totalJobs);
    debugLog('Total pages found:', totalPages);

    // Process each page
    for (let page = 1; page <= totalPages; page++) {
      if (await shouldStop(isAutoApplyRunning)) return;
      const pageProcessed = await LinkedInJobPage.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
      
      // If page processing failed (e.g., couldn't navigate to next page), stop the process
      if (pageProcessed === false) {
        debugLog(`Page processing failed or reached end, stopping at page ${page}`);
        break;
      }
    }
    if (!await shouldStop(isAutoApplyRunning)) {
      debugLog('Auto-apply process completed');
      sendStatusUpdate('Auto-apply process completed!', 'success');
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'PROCESS_COMPLETE' });
      }
    }
  } catch (error) {
    console.error('Error in auto-apply process:', error);
    debugLog('Fatal error in auto-apply process:', { error: error.message, stack: error.stack });
    sendStatusUpdate('Error in auto-apply process', 'error');
    // Keep forms open as requested by user
  }
}

// === CONTENT SCRIPT CONTEXT ANALYSIS ===
console.log('=== CONTENT SCRIPT LOADED ===');
console.log('URL:', window.location.href);
console.log('Is iframe:', window !== window.top);
console.log('Chrome APIs:', typeof chrome !== 'undefined' && !!chrome.runtime);
console.log('Document ready state:', document.readyState);
console.log('=== END CONTENT SCRIPT ANALYSIS ===');

// Check if Chrome extension APIs are available
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('Chrome extension APIs not available - script may be running in wrong context');
} else {
    // Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message in content script:', message);
  debugLog('Message sender:', sender);
  
  // Handle the message asynchronously
  (async () => {
    try {
      if (message.action === 'startAutoApply') {
        if (!isAutoApplyRunning) {
          isAutoApplyRunning = true;
          debugLog('Starting auto-apply process with user data:', message.userData);
          debugLog('AI settings:', message.aiSettings);
          
          // Store user data and AI settings for use in auto-apply process
          window.currentUserData = message.userData;
          window.currentAiSettings = message.aiSettings;
          
          debugLog('Content script: Received AI settings:', {
            provider: message.aiSettings.provider,
            model: message.aiSettings.model,
            hasApiKey: !!message.aiSettings.apiKey
          });
          
          // Start the auto-apply process
          startAutoApply();
          sendResponse({ success: true, message: 'Auto apply started' });
        } else {
          sendResponse({ success: false, message: 'Auto apply already running' });
        }
      } else if (message.action === 'stopAutoApply') {
        debugLog('Stopping auto-apply process');
        isAutoApplyRunning = false;
        sendResponse({ success: true, message: 'Auto apply stopped' });
      } else if (message.action === 'GET_STATE') {
        debugLog('Getting current state');
        sendResponse({ isRunning: isAutoApplyRunning });
      } else {
        // Handle legacy message format for backward compatibility
        if (message.action === 'START_AUTO_APPLY') {
          if (!isAutoApplyRunning) {
            isAutoApplyRunning = true;
            debugLog('Starting auto-apply process (legacy format)');
            startAutoApply();
            sendResponse({ success: true, message: 'Auto apply started' });
          } else {
            sendResponse({ success: false, message: 'Auto apply already running' });
          }
        } else if (message.action === 'STOP_AUTO_APPLY') {
          debugLog('Stopping auto-apply process (legacy format)');
          isAutoApplyRunning = false;
          sendResponse({ success: true, message: 'Auto apply stopped' });
        } else {
          debugLog('Unknown action received:', message.action);
          sendResponse({ success: false, message: 'Unknown action' });
        }
      }
    } catch (error) {
      debugLog('Error handling message in content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

} // End of Chrome API availability check
