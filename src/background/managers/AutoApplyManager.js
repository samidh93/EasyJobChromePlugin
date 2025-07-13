/**
 * Auto Apply Manager
 * Handles LinkedIn auto-apply functionality
 */
class AutoApplyManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
    }

    /**
     * Handle auto-apply related messages
     */
    async handleMessage(request, sendResponse) {
        const { action } = request;
        
        switch (action) {
            case 'startAutoApply':
                await this.handleStartAutoApply(request, sendResponse);
                break;
            case 'stopAutoApply':
                await this.handleStopAutoApply(request, sendResponse);
                break;
            case 'getAutoApplyState':
                await this.handleGetAutoApplyState(request, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown auto-apply action' });
        }
    }

    /**
     * Handle start auto apply
     */
    async handleStartAutoApply(request, sendResponse) {
        try {
            console.log('Starting auto apply with data:', request);
            
            // Validate required data
            if (!request.loginData || !request.loginData.username) {
                throw new Error('Login data required');
            }
            
            if (!request.aiSettings || !request.aiSettings.provider || !request.aiSettings.model) {
                throw new Error('AI settings required');
            }
            
            // Store the current session data
            this.backgroundManager.setAutoApplyState({
                isRunning: true,
                userData: request.loginData,
                aiSettings: request.aiSettings
            });
            
            // Test AI connection first
            const aiManager = this.backgroundManager.getManager('ai');
            await aiManager.testAiConnection(request.aiSettings);
            
            // Send message to content script to start auto apply
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                
                // Check if we're on LinkedIn
                if (!tabs[0].url.includes('linkedin.com')) {
                    throw new Error('Please navigate to LinkedIn jobs page first');
                }
                
                // Send message to content script
                chrome.tabs.sendMessage(tabId, {
                    action: 'startAutoApply',
                    userData: request.loginData,
                    aiSettings: request.aiSettings
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending message to content script:', chrome.runtime.lastError);
                        sendResponse({ 
                            success: false, 
                            error: 'Failed to communicate with LinkedIn page. Please refresh the page and try again.' 
                        });
                    } else {
                        console.log('Content script response:', response);
                        sendResponse({ success: true, message: 'Auto apply started successfully' });
                    }
                });
            } else {
                throw new Error('No active tab found');
            }
        } catch (error) {
            console.error('Error starting auto apply:', error);
            this.backgroundManager.setAutoApplyState({ isRunning: false });
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle stop auto apply
     */
    async handleStopAutoApply(request, sendResponse) {
        try {
            console.log('Stopping auto apply');
            
            // Send message to content script to stop auto apply
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length > 0) {
                const tabId = tabs[0].id;
                
                chrome.tabs.sendMessage(tabId, {
                    action: 'stopAutoApply'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error sending stop message to content script:', chrome.runtime.lastError);
                        // Still update state even if there's an error communicating with content script
                        this.backgroundManager.setAutoApplyState({ isRunning: false });
                        sendResponse({ success: true, message: 'Auto apply stopped (content script communication error)' });
                    } else if (response && response.success) {
                        console.log('Auto apply stopped successfully');
                        this.backgroundManager.setAutoApplyState({ isRunning: false });
                        sendResponse({ success: true, message: 'Auto apply stopped' });
                    } else {
                        console.error('Content script failed to stop auto apply:', response?.error);
                        // Still update state if content script reports an error
                        this.backgroundManager.setAutoApplyState({ isRunning: false });
                        sendResponse({ success: true, message: 'Auto apply stopped (with content script error)' });
                    }
                });
            } else {
                // No active tab, but still update state
                this.backgroundManager.setAutoApplyState({ isRunning: false });
                sendResponse({ success: true, message: 'Auto apply stopped (no active tab)' });
            }
        } catch (error) {
            console.error('Error stopping auto apply:', error);
            // Update state even if there's an error
            this.backgroundManager.setAutoApplyState({ isRunning: false });
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle get auto apply state
     */
    async handleGetAutoApplyState(request, sendResponse) {
        const state = this.backgroundManager.getAutoApplyState();
        sendResponse({ 
            success: true, 
            isRunning: state.isRunning 
        });
    }
}

export default AutoApplyManager; 