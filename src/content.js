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
  debugLog('Starting multi-tab auto-apply workflow for ' + platform.getPlatformName());
  
  try {
    // Import TabManager dynamically
    const TabManager = (await import('./utils/TabManager.js')).default;
    
    // Get current tab (this is the main search results tab)
    const mainTab = await TabManager.getCurrentTab();
    const mainTabId = mainTab.id;
    debugLog(`Main search tab ID: ${mainTabId}`);
    
    // Store main tab ID globally for later reference
    window.mainSearchTabId = mainTabId;
    
    // Start the multi-tab auto-apply process
    await platform.startAutoApply();
    
  } catch (error) {
    console.error('[Content Script] Error in multi-tab workflow:', error);
    sendStatusUpdate(`Multi-tab workflow error: ${error.message}`, 'error');
    throw error;
  }
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
    // Only initialize in the top frame (not in iframes)
    // This prevents issues with message handlers in iframes
    if (window !== window.top) {
        console.log('[Content Script] Running in iframe, skipping initialization');
    } else if (isInitialized) {
        console.log('[Content Script] Already initialized, skipping duplicate setup');
    } else {
        isInitialized = true;
        console.log('[Content Script] Initializing on:', window.location.href);
        console.log('[Content Script] Running in TOP FRAME (not iframe)');
        
        // Listen for messages from background script
        console.log('[Content Script] Message listener set up, ready to receive messages');
        
        // Auto-start StepStone application process if we're on an application page
        if (window.location.href.includes('stepstone.de') && window.location.href.includes('/application/')) {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔄 [Content Script] Detected StepStone application page');
            console.log('   Auto-starting application process...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Try to get user data from chrome storage if not available in window
            if (!window.currentUserData) {
                // Wrap in async function to avoid top-level await
                (async () => {
                    try {
                        const result = await chrome.storage.local.get(['currentUser', 'currentAiSettings']);
                        if (result.currentUser) {
                            window.currentUserData = result.currentUser;
                            console.log('✅ Retrieved user data from storage');
                        }
                        if (result.currentAiSettings) {
                            window.currentAiSettings = result.currentAiSettings;
                            console.log('✅ Retrieved AI settings from storage');
                        }
                    } catch (storageError) {
                        console.log('⚠️  Could not retrieve user data from storage:', storageError);
                    }
                })();
            }
            
            // Wait a bit for the page to fully load, then start the process
            setTimeout(async () => {
                try {
                    const { default: StepstoneForm } = await import('./stepstone/StepstoneForm.js');
                    await StepstoneForm.autoStartApplicationProcess();
                } catch (error) {
                    console.error('❌ [Content Script] Error auto-starting StepStone form:', error);
                }
            }, 3000);
        }
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
          
          // Also store in chrome storage so job tabs can access it
          chrome.storage.local.set({
            'currentUser': message.userData,
            'currentAiSettings': message.aiSettings
          }).then(() => {
            console.log('[Content Script] User data stored in chrome storage');
          }).catch((storageError) => {
            console.error('[Content Script] Error storing user data:', storageError);
          });
          
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
                    } else if (message.action === 'processJobInTab') {
                        // Handle job processing in the job detail tab
                        console.log('[Content Script] ========================================');
                        console.log('[Content Script] RECEIVED processJobInTab MESSAGE');
                        console.log('[Content Script] Processing job in tab:', message.jobInfo?.title);
                        console.log('[Content Script] Current URL:', window.location.href);
                        console.log('[Content Script] User data present:', !!message.userData);
                        console.log('[Content Script] AI settings present:', !!message.aiSettings);
                        console.log('[Content Script] ========================================');
                        
                        // Store user data in window and chrome storage for this tab
                        if (message.userData) {
                            window.currentUserData = message.userData;
                        }
                        if (message.aiSettings) {
                            window.currentAiSettings = message.aiSettings;
                        }
                        
                        // Store in chrome storage for persistence (including job info)
                        chrome.storage.local.set({
                            'currentUser': message.userData,
                            'currentAiSettings': message.aiSettings,
                            'currentJobInfo': message.jobInfo
                        }).then(() => {
                            console.log('[Content Script] User data and job info stored in chrome storage for job tab');
                        }).catch((storageError) => {
                            console.error('[Content Script] Error storing data in job tab:', storageError);
                        });
                        
                        // IMPORTANT: We must call the async function and handle it properly
                        // to ensure sendResponse is called before the channel closes
                        const processJob = async () => {
                            try {
                                console.log('[Content Script] Importing StepstoneJobPage...');
                                const module = await import('./stepstone/StepstoneJobPage.js');
                                console.log('[Content Script] StepstoneJobPage imported successfully');
                                const StepstoneJobPage = module.default;
                                
                                console.log('[Content Script] Calling processJobInTab method...');
                                
                                // Process the job
                                const result = await StepstoneJobPage.processJobInTab(
                                    message.jobInfo,
                                    message.userData,
                                    message.aiSettings
                                );
                                
                                console.log('[Content Script] ========================================');
                                console.log('[Content Script] Job processing completed');
                                console.log('[Content Script] Result:', result);
                                console.log('[Content Script] ========================================');
                                
                                return result;
                                
                            } catch (error) {
                                console.error('[Content Script] !!!!! Error in processJobInTab:', error);
                                console.error('[Content Script] Error stack:', error.stack);
                                return { result: 'error', reason: error.message || 'Unknown error' };
                            }
                        };
                        
                        // Execute and send response
                        processJob().then(result => {
                            console.log('[Content Script] Sending response back to main tab:', result);
                            sendResponse(result);
                        }).catch(error => {
                            console.error('[Content Script] Fatal error:', error);
                            sendResponse({ result: 'error', reason: 'Fatal error: ' + error.message });
                        });
                        
                        return true; // Keep channel open for async response
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
