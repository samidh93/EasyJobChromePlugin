/**
 * Auto Apply Manager
 * Handles multi-platform auto-apply functionality (LinkedIn, Indeed, StepStone)
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
            
            // AI settings are required for auto-apply functionality
            if (!request.aiSettings || !request.aiSettings.provider || !request.aiSettings.model) {
                throw new Error('AI settings are required for auto-apply. Please configure AI settings first.');
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
            console.log('AI connection verified - auto-apply ready');
            
            // Get active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                throw new Error('No active tab found');
            }
            
            const tab = tabs[0];
            const tabId = tab.id;
            
            // Check if we're on a supported platform using platform detection
            const detectPlatform = (url) => {
                const normalizedUrl = url.toLowerCase();
                if (/linkedin\.com/i.test(normalizedUrl) || /linkedin\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'linkedin';
                } else if (/indeed\.com/i.test(normalizedUrl) || /indeed\.[a-z]{2,3}/i.test(normalizedUrl) || /indeed\.[a-z]{2,3}\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'indeed';
                } else if (/stepstone\.de/i.test(normalizedUrl) || /stepstone\.com/i.test(normalizedUrl) || /stepstone\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'stepstone';
                }
                return 'unknown';
            };

            const isJobSearchPage = (url, platform) => {
                const normalizedUrl = url.toLowerCase();
                switch (platform) {
                    case 'linkedin':
                        return normalizedUrl.includes('/jobs/') || normalizedUrl.includes('/job/');
                    case 'indeed':
                        return normalizedUrl.includes('/jobs') || 
                               normalizedUrl.includes('/viewjob') ||
                               normalizedUrl.includes('q=') ||
                               normalizedUrl.includes('/job/');
                    case 'stepstone':
                        return normalizedUrl.includes('/jobs') || 
                               normalizedUrl.includes('/job/') ||
                               normalizedUrl.includes('/stellenangebote') ||
                               normalizedUrl.includes('/stellenanzeige');
                    default:
                        return false;
                }
            };

            const platform = detectPlatform(tab.url);
            const supportedPlatforms = ['linkedin', 'indeed', 'stepstone'];
            const isSupported = supportedPlatforms.includes(platform);
            const isJobPage = isJobSearchPage(tab.url, platform);

            if (!isSupported) {
                throw new Error('Please navigate to a supported job platform (LinkedIn, Indeed, or StepStone)');
            }

            if (!isJobPage) {
                const platformNames = {
                    linkedin: 'LinkedIn',
                    indeed: 'Indeed',
                    stepstone: 'StepStone'
                };
                throw new Error(`Please navigate to a ${platformNames[platform]} job search page to start auto-apply`);
            }
            
            const platformNames = {
                linkedin: 'LinkedIn',
                indeed: 'Indeed',
                stepstone: 'StepStone'
            };
            console.log('Target tab:', { 
                id: tabId, 
                url: tab.url, 
                platform: platformNames[platform] || platform,
                isJobSearchPage: isJobPage 
            });
            
            // Content script is already auto-injected via manifest.json
            // No need for manual injection - it would reset the isAutoApplyRunning variable
            console.log('Using auto-injected content script from manifest');
            
            // Wait a moment for any pending page operations to complete
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Try to send the message with retry mechanism
            let response = null;
            let lastError = null;
            
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`Attempt ${attempt} to send message to content script...`);
                    
                    response = await new Promise((resolve, reject) => {
                        chrome.tabs.sendMessage(tabId, {
                            action: 'startAutoApply',
                            userData: request.loginData,
                            aiSettings: request.aiSettings
                        }, (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        });
                    });
                    
                    // If we get here, the message was sent successfully
                    console.log(`Message sent successfully on attempt ${attempt}`);
                    break;
                    
                } catch (error) {
                    lastError = error;
                    console.warn(`Attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < 3) {
                        // Wait before retrying
                        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                    }
                }
            }
            
            if (!response) {
                throw new Error(`Failed to communicate with content script after 3 attempts. Last error: ${lastError?.message || 'Unknown error'}. Please refresh the page and try again.`);
            }
            
            console.log('Content script response:', response);
            sendResponse({ success: true, message: 'Auto apply started successfully' });
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