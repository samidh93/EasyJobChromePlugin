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
    if (!isAutoApplyRunning) {
        debugLog('Auto-apply process stopped by user');
        sendStatusUpdate('Auto-apply process stopped', 'info');
        chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
        return true;
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

async function startAutoApplyProcess() {
    // Your async logic here
} 