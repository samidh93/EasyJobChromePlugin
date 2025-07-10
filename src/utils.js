// Debug flag
export const DEBUG = true;  // Toggle debugging

// Debug logger
export function debugLog(message, data = null) {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString().split('T')[1];
    const logMessage = `[EasyJob Debug ${timestamp}] ${message}`;
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

// Function to send status updates to popup
export function sendStatusUpdate(text, status = 'info') {
    debugLog(`Status Update: ${status} - ${text}`);
    chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        text,
        status
    });
}

// Function to check if the process should stop
export async function shouldStop(isAutoApplyRunning) {
    // First check the local variable
    if (!isAutoApplyRunning) {
        debugLog('Auto-apply process stopped by user (local check)');
        sendStatusUpdate('Auto-apply process stopped', 'info');
        chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
        return true;
    }
    
    // Also check with background script for real-time state
    try {
        const response = await chrome.runtime.sendMessage({
            action: 'getAutoApplyState'
        });
        
        if (response && response.success && !response.isRunning) {
            debugLog('Auto-apply process stopped by user (background check)');
            sendStatusUpdate('Auto-apply process stopped', 'info');
            chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
            return true;
        }
    } catch (error) {
        // If we can't communicate with background, fall back to local check
        debugLog('Failed to check background state, using local state', error);
    }
    
    return false;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'START_AUTO_APPLY') {
        // Start the auto-apply process
        startAutoApplyProcess().then(() => {
            sendResponse({ success: true });
        }).catch((error) => {
            console.error('Error in auto-apply process:', error);
            sendResponse({ success: false, error: error.message });
        });
        return true; // Indicate that you will send a response asynchronously
    }
});
