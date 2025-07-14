/**
 * AI Settings Manager
 * Handles AI settings loading, model management, and API calls
 */
class AISettingsManager {
    constructor() {
        this.currentSettings = null;
        this.defaultModel = 'qwen2.5:3b';
        this.settingsLoadPromise = null;
    }

    /**
     * Load AI settings from database via background script
     * @param {string} userId - User ID to load settings for
     * @returns {Promise<Object>} - AI settings object
     */
    async loadAISettings(userId) {
        try {
            console.log('AISettingsManager: Loading AI settings for user:', userId);
            console.log('AISettingsManager: User ID type:', typeof userId);
            console.log('AISettingsManager: User ID length:', userId ? userId.length : 'null');
            
            // Validate userId is a proper UUID
            if (!userId || typeof userId !== 'string' || userId.length !== 36) {
                console.error('AISettingsManager: Invalid user ID provided:', userId);
                return this.getDefaultSettings();
            }
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/ai-settings/default`
            });

            if (response && response.success) {
                this.currentSettings = response.ai_settings;
                console.log('AISettingsManager: Successfully loaded AI settings:', this.currentSettings);
                return this.currentSettings;
            } else {
                console.warn('AISettingsManager: No AI settings found, using default');
                return this.getDefaultSettings();
            }
        } catch (error) {
            console.error('AISettingsManager: Error loading AI settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default AI settings
     * @returns {Object} - Default settings object
     */
    getDefaultSettings() {
        return {
            provider: 'ollama',
            model: this.defaultModel,
            apiKey: null,
            baseUrl: 'http://localhost:11434',
            is_default: true
        };
    }

    /**
     * Get current AI settings
     * @returns {Object} - Current settings or default
     */
    getCurrentSettings() {
        return this.currentSettings || this.getDefaultSettings();
    }

    /**
     * Set AI settings
     * @param {Object} settings - AI settings object
     */
    setSettings(settings) {
        this.currentSettings = settings;
        console.log('AISettingsManager: Settings updated:', settings);
    }

    /**
     * Get the current model name
     * @returns {string} - Model name
     */
    getModel() {
        const settings = this.getCurrentSettings();
        return settings.model || this.defaultModel;
    }

    /**
     * Get the current provider
     * @returns {string} - Provider name
     */
    getProvider() {
        const settings = this.getCurrentSettings();
        return settings.provider || 'ollama';
    }

    /**
     * Test AI connection
     * @returns {Promise<Object>} - Test result
     */
    async testConnection() {
        try {
            const provider = this.getProvider();
            
            if (provider === 'ollama') {
                const response = await chrome.runtime.sendMessage({
                    action: 'testOllama'
                });
                return response;
            } else if (provider === 'openai') {
                const response = await chrome.runtime.sendMessage({
                    action: 'testOpenAI'
                });
                return response;
            } else {
                // For other providers, just validate settings
                const settings = this.getCurrentSettings();
                if (!settings.apiKey) {
                    return { success: false, error: `API key required for ${provider}` };
                }
                return { success: true, message: `${provider} settings validated` };
            }
        } catch (error) {
            console.error('AISettingsManager: Error testing connection:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Call AI API with the current settings
     * @param {Object} requestData - Request data
     * @returns {Promise<Object>} - API response
     */
    async callAI(requestData) {
        try {
            const provider = this.getProvider();
            
            if (provider === 'ollama') {
                // Use the model from current settings
                const model = this.getModel();
                const requestBody = {
                    ...requestData,
                    model: model
                };

                const response = await chrome.runtime.sendMessage({
                    action: 'callOllama',
                    endpoint: 'generate',
                    data: requestBody
                });

                if (response.success === false) {
                    throw new Error(response.error || 'Unknown error from Ollama API');
                }
                
                return response.data;
            } else if (provider === 'openai') {
                // OpenAI implementation
                const model = this.getModel();
                const settings = this.getCurrentSettings();
                
                if (!settings.apiKey) {
                    throw new Error('OpenAI API key is required');
                }

                const response = await chrome.runtime.sendMessage({
                    action: 'callOpenAI',
                    data: {
                        ...requestData,
                        model: model,
                        apiKey: settings.apiKey
                    }
                });

                if (response.success === false) {
                    throw new Error(response.error || 'Unknown error from OpenAI API');
                }
                
                return response.data;
            } else {
                // For other providers, implement here
                throw new Error(`Provider ${provider} not yet implemented`);
            }
        } catch (error) {
            console.error('AISettingsManager: Error calling AI API:', error);
            throw error;
        }
    }

    /**
     * Call AI API with stop checking
     * @param {Object} requestData - Request data
     * @param {Function} shouldStop - Function to check if should stop
     * @returns {Promise<Object>} - API response or stop status
     */
    async callAIWithStop(requestData, shouldStop = null) {
        try {
            const provider = this.getProvider();
            
            if (provider === 'ollama') {
                // Use the model from current settings
                const model = this.getModel();
                const requestBody = {
                    ...requestData,
                    model: model
                };

                return new Promise((resolve, reject) => {
                    // Set up periodic stop checking during the API call
                    let stopCheckInterval = null;
                    
                    if (shouldStop) {
                        stopCheckInterval = setInterval(async () => {
                            try {
                                let stopRequested = false;
                                if (typeof shouldStop === 'function') {
                                    stopRequested = await shouldStop();
                                } else if (shouldStop && shouldStop.value !== undefined) {
                                    stopRequested = shouldStop.value;
                                } else {
                                    stopRequested = !!shouldStop;
                                }
                                
                                if (stopRequested) {
                                    console.log("Stop requested during AI API call");
                                    if (stopCheckInterval) {
                                        clearInterval(stopCheckInterval);
                                    }
                                    resolve({ stopped: true });
                                }
                            } catch (error) {
                                console.error('Error in stop check:', error);
                            }
                        }, 500); // Check every 500ms
                    }
                    
                    chrome.runtime.sendMessage(
                        {
                            action: 'callOllama',
                            endpoint: 'generate',
                            data: requestBody
                        },
                        response => {
                            // Clear the stop check interval
                            if (stopCheckInterval) {
                                clearInterval(stopCheckInterval);
                            }
                            
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else if (response.success === false) {
                                reject(new Error(response.error || 'Unknown error from Ollama API'));
                            } else {
                                resolve(response.data);
                            }
                        }
                    );
                });
            } else if (provider === 'openai') {
                // OpenAI implementation with stop checking
                const model = this.getModel();
                const settings = this.getCurrentSettings();
                
                if (!settings.apiKey) {
                    throw new Error('OpenAI API key is required');
                }

                return new Promise((resolve, reject) => {
                    // Set up periodic stop checking during the API call
                    let stopCheckInterval = null;
                    
                    if (shouldStop) {
                        stopCheckInterval = setInterval(async () => {
                            try {
                                let stopRequested = false;
                                if (typeof shouldStop === 'function') {
                                    stopRequested = await shouldStop();
                                } else if (shouldStop && shouldStop.value !== undefined) {
                                    stopRequested = shouldStop.value;
                                } else {
                                    stopRequested = !!shouldStop;
                                }
                                
                                if (stopRequested) {
                                    console.log("Stop requested during OpenAI API call");
                                    if (stopCheckInterval) {
                                        clearInterval(stopCheckInterval);
                                    }
                                    resolve({ stopped: true });
                                }
                            } catch (error) {
                                console.error('Error in stop check:', error);
                            }
                        }, 500); // Check every 500ms
                    }
                    
                    chrome.runtime.sendMessage(
                        {
                            action: 'callOpenAI',
                            data: {
                                ...requestData,
                                model: model,
                                apiKey: settings.apiKey
                            }
                        },
                        response => {
                            // Clear the stop check interval
                            if (stopCheckInterval) {
                                clearInterval(stopCheckInterval);
                            }
                            
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else if (response.success === false) {
                                reject(new Error(response.error || 'Unknown error from OpenAI API'));
                            } else {
                                resolve(response.data);
                            }
                        }
                    );
                });
            } else {
                // For other providers, implement here
                throw new Error(`Provider ${provider} not yet implemented`);
            }
        } catch (error) {
            console.error('AISettingsManager: Error calling AI API with stop:', error);
            throw error;
        }
    }

    /**
     * Load available models for the current provider
     * @returns {Promise<Array>} - List of available models
     */
    async loadAvailableModels() {
        try {
            const provider = this.getProvider();
            
            if (provider === 'ollama') {
                const response = await chrome.runtime.sendMessage({
                    action: 'ollamaRequest',
                    method: 'GET',
                    url: '/api/tags'
                });

                if (response && response.success) {
                    return response.models.map(model => model.name);
                } else {
                    throw new Error(response?.error || 'Failed to load Ollama models');
                }
            } else {
                // For other providers, implement here
                throw new Error(`Provider ${provider} not yet implemented`);
            }
        } catch (error) {
            console.error('AISettingsManager: Error loading models:', error);
            throw error;
        }
    }

    /**
     * Clear current settings
     */
    clear() {
        this.currentSettings = null;
        this.settingsLoadPromise = null;
    }
}

export default AISettingsManager; 