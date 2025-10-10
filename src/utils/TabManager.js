/**
 * TabManager - Handles multi-tab operations for platforms like StepStone
 * Communicates with background script to manage Chrome tabs API
 */
class TabManager {
    /**
     * Open a URL in a new tab
     * @param {string} url - URL to open
     * @param {boolean} active - Whether to make the new tab active (default: true)
     * @returns {Promise<Object>} - Tab object with id and windowId
     */
    static async openNewTab(url, active = true) {
        try {
            console.log(`[TabManager] Opening new tab: ${url}`);
            
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'openNewTab',
                    url: url,
                    active: active
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[TabManager] Error opening tab:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        console.log(`[TabManager] Tab opened successfully:`, response.tab);
                        resolve(response.tab);
                    } else {
                        reject(new Error(response?.error || 'Failed to open tab'));
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in openNewTab:', error);
            throw error;
        }
    }

    /**
     * Close a specific tab
     * @param {number} tabId - ID of the tab to close
     * @returns {Promise<boolean>} - Success status
     */
    static async closeTab(tabId) {
        try {
            console.log(`[TabManager] Closing tab: ${tabId}`);
            
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'closeTab',
                    tabId: tabId
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[TabManager] Error closing tab:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        console.log(`[TabManager] Tab closed successfully`);
                        resolve(true);
                    } else {
                        reject(new Error(response?.error || 'Failed to close tab'));
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in closeTab:', error);
            throw error;
        }
    }

    /**
     * Switch to a specific tab
     * @param {number} tabId - ID of the tab to switch to
     * @returns {Promise<boolean>} - Success status
     */
    static async switchToTab(tabId) {
        try {
            console.log(`[TabManager] Switching to tab: ${tabId}`);
            
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'switchToTab',
                    tabId: tabId
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[TabManager] Error switching tab:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        console.log(`[TabManager] Switched to tab successfully`);
                        resolve(true);
                    } else {
                        reject(new Error(response?.error || 'Failed to switch tab'));
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in switchToTab:', error);
            throw error;
        }
    }

    /**
     * Get current tab information
     * @returns {Promise<Object>} - Current tab object
     */
    static async getCurrentTab() {
        try {
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'getCurrentTab'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        resolve(response.tab);
                    } else {
                        reject(new Error(response?.error || 'Failed to get current tab'));
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in getCurrentTab:', error);
            throw error;
        }
    }

    /**
     * Wait for a tab to finish loading
     * @param {number} tabId - ID of the tab to wait for
     * @param {number} timeout - Maximum time to wait in milliseconds (default: 30000)
     * @returns {Promise<boolean>} - Success status
     */
    static async waitForTabLoad(tabId, timeout = 30000) {
        try {
            console.log(`[TabManager] Waiting for tab ${tabId} to load...`);
            
            const startTime = Date.now();
            
            return new Promise((resolve, reject) => {
                const checkInterval = setInterval(() => {
                    chrome.runtime.sendMessage({
                        action: 'getTabStatus',
                        tabId: tabId
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            clearInterval(checkInterval);
                            reject(new Error(chrome.runtime.lastError.message));
                            return;
                        }
                        
                        if (response && response.success) {
                            if (response.status === 'complete') {
                                clearInterval(checkInterval);
                                console.log(`[TabManager] Tab ${tabId} loaded successfully`);
                                resolve(true);
                            } else if (Date.now() - startTime > timeout) {
                                clearInterval(checkInterval);
                                reject(new Error('Tab load timeout'));
                            }
                        } else {
                            clearInterval(checkInterval);
                            reject(new Error(response?.error || 'Failed to get tab status'));
                        }
                    });
                }, 500); // Check every 500ms
            });
        } catch (error) {
            console.error('[TabManager] Error in waitForTabLoad:', error);
            throw error;
        }
    }

    /**
     * Execute a script in a specific tab
     * @param {number} tabId - ID of the tab
     * @param {Function} func - Function to execute
     * @returns {Promise<any>} - Result of the function execution
     */
    static async executeScriptInTab(tabId, func) {
        try {
            console.log(`[TabManager] Executing script in tab: ${tabId}`);
            
            return new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    action: 'executeScriptInTab',
                    tabId: tabId,
                    func: func.toString()
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else if (response && response.success) {
                        resolve(response.result);
                    } else {
                        reject(new Error(response?.error || 'Failed to execute script'));
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in executeScriptInTab:', error);
            throw error;
        }
    }

    /**
     * Send a message to a specific tab
     * @param {number} tabId - ID of the tab
     * @param {Object} message - Message to send
     * @returns {Promise<any>} - Response from the tab
     */
    static async sendMessageToTab(tabId, message) {
        try {
            console.log(`[TabManager] Sending message to tab ${tabId}:`, message);
            
            return new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabId, message, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('[TabManager] Error sending message:', chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });
        } catch (error) {
            console.error('[TabManager] Error in sendMessageToTab:', error);
            throw error;
        }
    }

    /**
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default TabManager;

