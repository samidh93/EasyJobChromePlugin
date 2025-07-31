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
        this.isAutoApplyRunning = state.isRunning || false;
        this.currentUserData = state.userData || null;
        this.currentAiSettings = state.aiSettings || null;
        this.currentUser = state.user || null;
    }




}

export default BackgroundManager; 