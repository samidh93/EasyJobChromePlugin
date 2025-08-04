import { LinkedInJobSearch,LinkedInForm, LinkedInJobPage } from './linkedin/index.js';
import { debugLog, sendStatusUpdate, shouldStop } from './utils.js';

let isAutoApplyRunning = false;
let stopRequested = false; // Immediate stop flag for emergencies like daily limit

// Make stop function and flag globally accessible
window.requestAutoApplyStop = function(reason = 'manual') {
  debugLog(`Immediate stop requested: ${reason}`);
  stopRequested = true;
  isAutoApplyRunning = false;
};

window.isStopRequested = function() {
  return stopRequested;
};


// Main auto-apply function
async function startAutoApply() {
  try {
    if (await shouldStop(isAutoApplyRunning)) return;

    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");

    if (!searchElement) {
      sendStatusUpdate('Could not find jobs list. Please make sure you are on LinkedIn jobs page.', 'error');
      return;
    }

    // Get total jobs count
    const totalJobs = await LinkedInJobSearch.getTotalJobsSearchCount(searchElement);
    sendStatusUpdate(`Found ${totalJobs} jobs to process`, 'info');

    // Get available pages
    const totalPages = await LinkedInJobSearch.getAvailablePages(searchElement, totalJobs);

    // Process each page
    for (let page = 1; page <= totalPages; page++) {
      if (await shouldStop(isAutoApplyRunning)) return;
      const pageProcessed = await LinkedInJobPage.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
      
      // If page processing failed (e.g., couldn't navigate to next page or stop was requested), stop the process
      if (pageProcessed === false) {
        debugLog('Page processing returned false - stopping auto-apply');
        break;
      }
      
      // Additional stop check after each page
      if (await shouldStop(isAutoApplyRunning)) {
        debugLog('Stop requested after page processing - exiting main loop');
        return;
      }
    }
    if (!await shouldStop(isAutoApplyRunning)) {
      sendStatusUpdate('Auto-apply process completed!', 'success');
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'PROCESS_COMPLETE' });
      }
    }
  } catch (error) {
    console.error('Error in auto-apply process:', error);
    sendStatusUpdate('Error in auto-apply process', 'error');
    // Keep forms open as requested by user
  }
}


// Check if Chrome extension APIs are available
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('Chrome extension APIs not available - script may be running in wrong context');
} else {
    // Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle the message asynchronously
  (async () => {
    try {
      if (message.action === 'startAutoApply') {
        if (!isAutoApplyRunning) {
          isAutoApplyRunning = true;
          stopRequested = false; // Clear any previous stop requests
          
          // Store user data and AI settings for use in auto-apply process
          window.currentUserData = message.userData;
          window.currentAiSettings = message.aiSettings;
          
          // Start the auto-apply process
          startAutoApply();
          sendResponse({ success: true, message: 'Auto apply started' });
        } else {
          sendResponse({ success: false, message: 'Auto apply already running' });
        }
      } else if (message.action === 'stopAutoApply') {
        window.requestAutoApplyStop('background_request');
        sendResponse({ success: true, message: 'Auto apply stopped' });
      } else if (message.action === 'GET_STATE') {
        sendResponse({ isRunning: isAutoApplyRunning });
      } else {
        // Handle legacy message format for backward compatibility
        if (message.action === 'START_AUTO_APPLY') {
          if (!isAutoApplyRunning) {
            isAutoApplyRunning = true;
            startAutoApply();
            sendResponse({ success: true, message: 'Auto apply started' });
          } else {
            sendResponse({ success: false, message: 'Auto apply already running' });
          }
        } else if (message.action === 'STOP_AUTO_APPLY') {
          isAutoApplyRunning = false;
          sendResponse({ success: true, message: 'Auto apply stopped' });
        } else {
          sendResponse({ success: false, message: 'Unknown action' });
        }
      }
    } catch (error) {
      console.error('Error handling message in content script:', error);
      sendResponse({ success: false, error: error.message });
    }
  })();
  
  // Return true to indicate we will send a response asynchronously
  return true;
});

} // End of Chrome API availability check
