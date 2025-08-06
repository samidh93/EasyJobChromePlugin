import PlatformFactory from './platform/PlatformFactory.js';
import { debugLog, sendStatusUpdate, shouldStop } from './utils.js';

// Global state to prevent multiple instances
let isAutoApplyRunning = false;
let stopRequested = false; // Immediate stop flag for emergencies like daily limit
let isInitialized = false; // Prevent multiple initializations

// Make stop function and flag globally accessible
window.requestAutoApplyStop = function(reason = 'manual') {
  debugLog(`Immediate stop requested: ${reason}`);
  stopRequested = true;
  isAutoApplyRunning = false;
};

window.isStopRequested = function() {
  return stopRequested;
};

// Test function to verify content script is working
window.testContentScript = function() {
  console.log('[Content Script Test] Content script is working!');
  console.log('[Content Script Test] Current URL:', window.location.href);
  console.log('[Content Script Test] Platform detection:', PlatformFactory.isSupportedPage());
  console.log('[Content Script Test] Auto-apply running:', isAutoApplyRunning);
  
  // Test platform creation and multi-tab support
  return PlatformFactory.createPlatform().then(platform => {
    const result = {
      url: window.location.href,
      isSupported: PlatformFactory.isSupportedPage(),
      isAutoApplyRunning: isAutoApplyRunning,
      isInitialized: isInitialized,
      platformName: platform.getPlatformName(),
      supportsMultiTab: platform.supportsMultiTabWorkflow()
    };
    console.log('[Content Script Test] Platform info:', result);
    return result;
  });
};


// Handle multi-tab auto-apply workflow
async function handleMultiTabAutoApply(platform) {
  debugLog('Starting multi-tab auto-apply workflow');
  
  // For now, fall back to standard auto-apply
  // TODO: Implement full multi-tab coordination
  debugLog('Multi-tab workflow not yet implemented, falling back to standard workflow');
  await platform.startAutoApply();
}

// Main auto-apply function
async function startAutoApply() {
  let platform = null;
  
  try {
    if (await shouldStop(isAutoApplyRunning)) return;

    // Check if we're on a supported platform
    if (!PlatformFactory.isSupportedPage()) {
      // Don't show error for special URLs like about:blank
      const currentUrl = window.location.href;
      if (currentUrl === 'about:blank' || currentUrl.startsWith('chrome://')) {
        debugLog(`Skipping auto-apply on special URL: ${currentUrl}`);
        return;
      }
      
      sendStatusUpdate('This page is not supported. Please navigate to a job search page on LinkedIn, Indeed, or StepStone.', 'error');
      return;
    }

    // Create platform instance based on current URL
    try {
      platform = await PlatformFactory.createPlatform();
      debugLog(`Platform detected: ${platform.getPlatformName()}`);
      sendStatusUpdate(`Starting auto-apply on ${platform.getPlatformName()}`, 'info');
    } catch (error) {
      debugLog(`Failed to create platform: ${error.message}`);
      sendStatusUpdate(`Unsupported platform or failed to initialize: ${error.message}`, 'error');
      return;
    }

    // Check if platform supports multi-tab workflow
    const supportsMultiTab = platform.supportsMultiTabWorkflow();
    debugLog(`Platform ${platform.getPlatformName()} multi-tab support: ${supportsMultiTab}`);
    
    if (supportsMultiTab) {
      debugLog('Platform supports multi-tab workflow - using enhanced auto-apply');
      await handleMultiTabAutoApply(platform);
    } else {
      debugLog('Platform uses single-tab workflow - using standard auto-apply');
      await platform.startAutoApply();
    }
    
    if (!await shouldStop(isAutoApplyRunning)) {
      sendStatusUpdate('Auto-apply process completed!', 'success');
      if (chrome && chrome.runtime) {
        chrome.runtime.sendMessage({ action: 'PROCESS_COMPLETE' });
      }
    }
  } catch (error) {
    console.error('Error in auto-apply process:', error);
    sendStatusUpdate(`Error in auto-apply process: ${error.message}`, 'error');
    
    // Try platform-specific error handling if platform is available
    if (platform && typeof platform.handleError === 'function') {
      try {
        await platform.handleError(error, 'main_auto_apply');
      } catch (handleError) {
        debugLog(`Platform error handling failed: ${handleError.message}`);
      }
    }
    
    // Keep forms open as requested by user
  }
}


// Check if Chrome extension APIs are available
if (typeof chrome === 'undefined' || !chrome.runtime) {
    console.log('Chrome extension APIs not available - script may be running in wrong context');
} else {
    // Prevent multiple initializations
    if (isInitialized) {
        console.log('[Content Script] Already initialized, skipping duplicate setup');
    } else {
        isInitialized = true;
        console.log('[Content Script] Initializing on:', window.location.href);
        
        // Listen for messages from background script
        console.log('[Content Script] Message listener set up, ready to receive messages');
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('[Content Script] Received message:', message.action, 'from:', sender);
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
          debugLog('Auto apply already running, ignoring duplicate start request');
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
    }
} // End of Chrome API availability check
