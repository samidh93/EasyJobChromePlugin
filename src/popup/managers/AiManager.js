class AiManager {
    constructor() {
        this.aiSettings = [];
        this.defaultSettings = null;
        this.listeners = [];
        this.loading = false;
    }

    // Add listener for AI settings state changes
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of AI settings state changes
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    aiSettings: this.aiSettings,
                    defaultSettings: this.defaultSettings,
                    loading: this.loading
                });
            } catch (error) {
                console.error('Error in AI settings listener:', error);
            }
        });
    }

    // Get current AI settings state
    getAiSettingsState() {
        return {
            aiSettings: this.aiSettings,
            defaultSettings: this.defaultSettings,
            loading: this.loading
        };
    }

    // Load AI settings for a user
    async loadAiSettings(userId) {
        if (!userId) {
            console.log('AiManager: No user ID provided, skipping AI settings load');
            this.aiSettings = [];
            this.defaultSettings = null;
            this.notifyListeners();
            return { success: false, error: 'No user ID provided' };
        }

        this.loading = true;
        this.notifyListeners();

        try {
            console.log('AiManager: Loading AI settings for user:', userId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/ai-settings`
            });

            if (response && response.success) {
                console.log('AiManager: Successfully loaded AI settings:', response.ai_settings);
                
                this.aiSettings = response.ai_settings || [];
                this.defaultSettings = this.aiSettings.find(setting => setting.is_default) || null;
                
                this.loading = false;
                this.notifyListeners();
                return { success: true, aiSettings: this.aiSettings, defaultSettings: this.defaultSettings };
            } else {
                console.error('AiManager: Failed to load AI settings:', response);
                this.aiSettings = [];
                this.defaultSettings = null;
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to load AI settings' };
            }
        } catch (error) {
            console.error('AiManager: Error loading AI settings:', error);
            this.aiSettings = [];
            this.defaultSettings = null;
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Save new AI settings
    async saveAiSettings(userId, settingsData) {
        if (!userId) {
            return { success: false, error: 'No user ID provided' };
        }

        this.loading = true;
        this.notifyListeners();

        try {
            console.log('AiManager: Saving AI settings for user:', userId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                url: `/users/${userId}/ai-settings`,
                data: settingsData
            });

            if (response && response.success) {
                console.log('AiManager: Successfully saved AI settings');
                
                // Reload settings to get the updated list
                await this.loadAiSettings(userId);
                return { success: true };
            } else {
                console.error('AiManager: Failed to save AI settings:', response);
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to save AI settings' };
            }
        } catch (error) {
            console.error('AiManager: Error saving AI settings:', error);
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Set default AI settings
    async setDefaultAiSettings(settingsId) {
        this.loading = true;
        this.notifyListeners();

        try {
            console.log('AiManager: Setting default AI settings:', settingsId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'PUT',
                url: `/ai-settings/${settingsId}/default`
            });

            if (response && response.success) {
                console.log('AiManager: Successfully set default AI settings');
                
                // Update the default settings in the current list
                this.aiSettings = this.aiSettings.map(setting => ({
                    ...setting,
                    is_default: setting.id === settingsId
                }));
                this.defaultSettings = this.aiSettings.find(setting => setting.id === settingsId);
                
                this.loading = false;
                this.notifyListeners();
                return { success: true };
            } else {
                console.error('AiManager: Failed to set default AI settings:', response);
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to set default AI settings' };
            }
        } catch (error) {
            console.error('AiManager: Error setting default AI settings:', error);
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Delete AI settings
    async deleteAiSettings(settingsId) {
        this.loading = true;
        this.notifyListeners();

        try {
            console.log('AiManager: Deleting AI settings:', settingsId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'DELETE',
                url: `/ai-settings/${settingsId}`
            });

            if (response && response.success) {
                console.log('AiManager: Successfully deleted AI settings');
                
                // Remove the deleted settings from the list
                this.aiSettings = this.aiSettings.filter(setting => setting.id !== settingsId);
                
                // Update default settings if the deleted one was default
                if (this.defaultSettings && this.defaultSettings.id === settingsId) {
                    this.defaultSettings = this.aiSettings.find(setting => setting.is_default) || null;
                }
                
                this.loading = false;
                this.notifyListeners();
                return { success: true };
            } else {
                console.error('AiManager: Failed to delete AI settings:', response);
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to delete AI settings' };
            }
        } catch (error) {
            console.error('AiManager: Error deleting AI settings:', error);
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Load Ollama models
    async loadOllamaModels() {
        try {
            console.log('AiManager: Loading Ollama models');
            
            const response = await chrome.runtime.sendMessage({
                action: 'ollamaRequest',
                method: 'GET',
                url: '/api/tags'
            });

            if (response && response.success) {
                const models = response.models.map(model => model.name);
                console.log('AiManager: Successfully loaded Ollama models:', models);
                return { success: true, models: models };
            } else {
                console.error('AiManager: Failed to load Ollama models:', response);
                return { success: false, error: response?.error || 'Failed to load Ollama models. Make sure Ollama is running.' };
            }
        } catch (error) {
            console.error('AiManager: Error loading Ollama models:', error);
            return { success: false, error: 'Error connecting to Ollama. Make sure it\'s running on localhost:11434.' };
        }
    }

    // Get default AI settings for a user
    async getDefaultAiSettings(userId) {
        if (!userId) {
            return { success: false, error: 'No user ID provided' };
        }

        try {
            console.log('AiManager: Getting default AI settings for user:', userId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/ai-settings/default`
            });

            if (response && response.success) {
                console.log('AiManager: Successfully got default AI settings:', response.ai_settings);
                return { success: true, aiSettings: response.ai_settings };
            } else {
                console.error('AiManager: Failed to get default AI settings:', response);
                return { success: false, error: response?.error || 'Failed to get default AI settings' };
            }
        } catch (error) {
            console.error('AiManager: Error getting default AI settings:', error);
            return { success: false, error: error.message };
        }
    }

    // Check if user has AI settings
    hasAiSettings() {
        return this.aiSettings.length > 0;
    }

    // Get AI settings by ID
    getAiSettingsById(settingsId) {
        return this.aiSettings.find(setting => setting.id === settingsId);
    }

    // Clear all data
    clear() {
        this.aiSettings = [];
        this.defaultSettings = null;
        this.loading = false;
        this.notifyListeners();
    }
}

// Create singleton instance
const aiManager = new AiManager();

export default aiManager; 