import AutoApplyManager from './AutoApplyManager.js';
import UserManager from './UserManager.js';
import AIManager from './AIManager.js';
import ResumeManager from './ResumeManager.js';
import APIManager from './APIManager.js';

/**
 * Base Background Manager
 * Handles core background script functionality and message routing
 */
class BackgroundManager {
    constructor() {
        this.isAutoApplyRunning = false;
        this.currentUserData = null;
        this.currentAiSettings = null;
        this.currentUser = null;
        this.managers = new Map();
        
        this.initializeManagers();
        this.setupMessageListener();
    }

    /**
     * Initialize all background managers
     */
    initializeManagers() {
        // Initialize managers
        this.managers.set('autoApply', new AutoApplyManager(this));
        this.managers.set('user', new UserManager(this));
        this.managers.set('ai', new AIManager(this));
        this.managers.set('resume', new ResumeManager(this));
        this.managers.set('api', new APIManager(this));
    }

    /**
     * Setup Chrome runtime message listener
     */
    setupMessageListener() {
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            console.log('Background received message:', request);
            console.log('Message sender:', sender);
            
            // Validate request structure
            if (!request || typeof request !== 'object') {
                console.error('Invalid message received - not an object:', request);
                sendResponse({ success: false, error: 'Invalid message: not an object' });
                return true;
            }
            
            this.handleMessage(request, sender, sendResponse);
            return true; // Keep the message channel open for async response
        });
    }

    /**
     * Route messages to appropriate managers
     */
    async handleMessage(request, sender, sendResponse) {
        try {
            const { action } = request;
            
            // Validate that action exists
            if (!action || typeof action !== 'string') {
                console.error('Invalid message received - missing or invalid action:', request);
                sendResponse({ success: false, error: 'Invalid message: missing or invalid action' });
                return;
            }
            
            // Route to appropriate manager based on action
            if (action.startsWith('startAutoApply') || action.startsWith('stopAutoApply') || action === 'getAutoApplyState') {
                await this.managers.get('autoApply').handleMessage(request, sendResponse);
            } else if (action.startsWith('registerUser') || action.startsWith('loginUser') || action.startsWith('logoutUser') || 
                       action.startsWith('getUserProfile') || action.startsWith('updateUserProfile') || action === 'getCurrentUser') {
                await this.managers.get('user').handleMessage(request, sendResponse);
            } else if (action.startsWith('callOllama') || action.startsWith('testOllama') || action === 'ollamaRequest' || 
                       action.startsWith('callOpenAI') || action.startsWith('testOpenAI')) {
                await this.managers.get('ai').handleMessage(request, sendResponse);
            } else if (action.startsWith('uploadResume') || action.startsWith('downloadResume')) {
                await this.managers.get('resume').handleMessage(request, sendResponse);
            } else if (action === 'apiRequest') {
                await this.managers.get('api').handleMessage(request, sendResponse);
            } else if (action === 'getPlatformInfo') {
                await this.handleGetPlatformInfo(request, sendResponse);
            } else if (action === 'STATUS_UPDATE' || action === 'PROCESS_COMPLETE') {
                // Handle status updates and process completion
                console.log('Received status update:', request);
                sendResponse({ success: true, message: 'Status update received' });
            } else {
                console.warn('Unknown action received:', action);
                sendResponse({ success: false, error: `Unknown action: ${action}` });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Get a specific manager
     */
    getManager(name) {
        return this.managers.get(name);
    }

    /**
     * Get current auto apply state
     */
    getAutoApplyState() {
        return {
            isRunning: this.isAutoApplyRunning,
            userData: this.currentUserData,
            aiSettings: this.currentAiSettings,
            user: this.currentUser
        };
    }

    /**
     * Set auto apply state
     */
    setAutoApplyState(state) {
        // Only update properties that are explicitly provided to preserve existing state
        if (state.hasOwnProperty('isRunning')) {
            this.isAutoApplyRunning = state.isRunning;
        }
        if (state.hasOwnProperty('userData')) {
            this.currentUserData = state.userData;
        }
        if (state.hasOwnProperty('aiSettings')) {
            this.currentAiSettings = state.aiSettings;
        }
        if (state.hasOwnProperty('user')) {
            this.currentUser = state.user;
        }
    }

    /**
     * Handle get platform info from current tab
     */
    async handleGetPlatformInfo(request, sendResponse) {
        try {
            // Get the active tab
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tabs.length === 0) {
                sendResponse({ success: false, error: 'No active tab found' });
                return;
            }

            const tab = tabs[0];
            const url = tab.url;
            const title = tab.title;

            // Platform detection logic (matching our PlatformDetector)
            const detectPlatform = (url) => {
                const normalizedUrl = url.toLowerCase();
                
                if (/linkedin\.com/i.test(normalizedUrl) || /linkedin\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'linkedin';
                }
                if (/indeed\.com/i.test(normalizedUrl) || /indeed\.[a-z]{2,3}/i.test(normalizedUrl) || /indeed\.[a-z]{2,3}\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'indeed';
                }
                if (/stepstone\.de/i.test(normalizedUrl) || /stepstone\.com/i.test(normalizedUrl) || /stepstone\.[a-z]{2,3}/i.test(normalizedUrl)) {
                    return 'stepstone';
                }
                return 'unknown';
            };

            // Job search page detection
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

            const platform = detectPlatform(url);
            const isJobPage = isJobSearchPage(url, platform);
            const isSupported = ['linkedin', 'indeed', 'stepstone'].includes(platform);

            // Get platform display name
            const getDisplayName = (platform) => {
                const displayNames = {
                    linkedin: 'LinkedIn',
                    indeed: 'Indeed', 
                    stepstone: 'StepStone'
                };
                return displayNames[platform] || 'Unknown Platform';
            };

            const platformInfo = {
                platform: platform,
                displayName: getDisplayName(platform),
                isSupported: isSupported,
                isJobSearchPage: isJobPage,
                url: url,
                title: title,
                tabId: tab.id
            };

            console.log('Platform info:', platformInfo);
            sendResponse({ success: true, platformInfo: platformInfo });

        } catch (error) {
            console.error('Error getting platform info:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

}

export default BackgroundManager; 