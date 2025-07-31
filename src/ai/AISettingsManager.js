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
            
            // Validate userId is a proper UUID
            if (!userId || typeof userId !== 'string' || userId.length !== 36) {
                console.error('AISettingsManager: Invalid user ID provided:', userId);
                console.log('AISettingsManager: Returning default settings (ollama)');
                return this.getDefaultSettings();
            }
            
            console.log('AISettingsManager: Making API request to load settings...');
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/ai-settings/default`
            });

            if (response && response.success) {
                this.currentSettings = response.ai_settings;
                console.log('AISettingsManager: Successfully loaded AI settings');
                return this.currentSettings;
            } else {
                console.warn('AISettingsManager: No AI settings found, using default');
                console.log('AISettingsManager: Response was:', response);
                return this.getDefaultSettings();
            }
        } catch (error) {
            console.error('AISettingsManager: Error loading AI settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Get default AI settings - user must explicitly configure AI
     * @returns {null} - No automatic defaults, forces explicit setup
     */
    getDefaultSettings() {
        // Return null to force users to explicitly configure AI
        // This prevents automatic connection attempts to any provider
        console.log('AISettingsManager: No AI settings configured - user must set up AI first');
        return null;
    }

    /**
     * Get current AI settings
     * @returns {Object|null} - Current settings or null if not configured
     */
    getCurrentSettings() {
        return this.currentSettings;  // Don't fallback to defaults, return null if not configured
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
     * @returns {string|null} - Model name or null if no AI configured
     */
    getModel() {
        const settings = this.getCurrentSettings();
        if (!settings) return null;
        // Handle both ai_model (from database) and model (from settings)
        return settings.ai_model || settings.model || null;
    }

    /**
     * Get the current provider
     * @returns {string|null} - Provider name or null if no AI configured
     */
    getProvider() {
        const settings = this.getCurrentSettings();
        if (!settings) return null;
        // Handle both ai_provider (from database) and provider (from settings)
        return settings.ai_provider || settings.provider || null;
    }

    /**
     * Get the decrypted API key for the current settings
     * @returns {Promise<string|null>} - Decrypted API key or null if no AI configured
     */
    async getDecryptedApiKey() {
        const settings = this.getCurrentSettings();
        
        // Return null if no AI settings configured
        if (!settings) {
            return null;
        }
        
        // If we already have a decrypted API key, return it
        if (settings.apiKey && settings.apiKey !== 'encrypted') {
            return settings.apiKey;
        }
        
        // If we have an encrypted key flag, fetch and decrypt it
        if (settings.api_key_encrypted && settings.id) {
            try {
                // Fetch the encrypted key from the backend
                const response = await chrome.runtime.sendMessage({
                    action: 'apiRequest',
                    method: 'GET',
                    url: `/ai-settings/${settings.id}/encrypted-key`
                });

                if (response && response.success && response.api_key_encrypted) {
                    // Decrypt the API key
                    const decryptResponse = await chrome.runtime.sendMessage({
                        action: 'apiRequest',
                        method: 'POST',
                        url: '/ai-settings/decrypt-api-key',
                        data: { encryptedApiKey: response.api_key_encrypted }
                    });

                    if (decryptResponse && decryptResponse.success) {
                        // Store the decrypted key in the settings for future use
                        settings.apiKey = decryptResponse.decryptedApiKey;
                        return decryptResponse.decryptedApiKey;
                    }
                }
            } catch (error) {
                console.error('AISettingsManager: Error fetching/decrypting API key:', error);
                throw new Error('Failed to retrieve API key');
            }
        }
        
        return null;
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
            const model = this.getModel();
            
            // Calculate approximate input tokens for monitoring
            let inputTokens = 0;
            if (requestData.prompt) {
                inputTokens = this.estimateTokens(requestData.prompt);
            } else if (requestData.messages) {
                inputTokens = this.estimateTokensFromMessages(requestData.messages);
            }
            
            if (provider === 'ollama') {
                // Use the model from current settings
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
                const apiKey = await this.getDecryptedApiKey();
                
                if (!apiKey) {
                    throw new Error('OpenAI API key is required');
                }

                const requestBody = {
                    ...requestData,
                    model: model,
                    apiKey: apiKey
                };

                console.log('Sending OpenAI request:', {
                    ...requestBody,
                    apiKey: '[REDACTED]'
                });

                const response = await chrome.runtime.sendMessage({
                    action: 'callOpenAI',
                    data: requestBody
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
                const apiKey = await this.getDecryptedApiKey();
                
                if (!apiKey) {
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
                                apiKey: apiKey
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
     * Estimate tokens for a text string (approximate calculation)
     * @param {string} text - Text to estimate tokens for
     * @returns {number} - Estimated token count
     */
    estimateTokens(text) {
        if (!text) return 0;
        
        // Rough estimation: 1 token ≈ 4 characters for English text
        // This is a simplified approximation - actual tokenization varies by model
        const charCount = text.length;
        const estimatedTokens = Math.ceil(charCount / 4);
        
        return estimatedTokens;
    }

    /**
     * Estimate tokens for messages array
     * @param {Array} messages - Array of message objects
     * @returns {number} - Estimated total token count
     */
    estimateTokensFromMessages(messages) {
        if (!messages || !Array.isArray(messages)) return 0;
        
        let totalTokens = 0;
        
        for (const message of messages) {
            if (message.content) {
                totalTokens += this.estimateTokens(message.content);
            }
            
            // Add overhead for role and formatting (rough estimate)
            totalTokens += 4; // ~4 tokens for role and formatting
        }
        
        return totalTokens;
    }

    /**
     * Get detailed token analysis for a prompt
     * @param {Object} requestData - Request data
     * @returns {Object} - Token analysis
     */
    getTokenAnalysis(requestData) {
        const analysis = {
            inputTokens: 0,
            estimatedOutputTokens: 0,
            maxTokens: requestData.max_tokens || 1000,
            provider: this.getProvider(),
            model: this.getModel()
        };

        if (requestData.prompt) {
            analysis.inputTokens = this.estimateTokens(requestData.prompt);
        } else if (requestData.messages) {
            analysis.inputTokens = this.estimateTokensFromMessages(requestData.messages);
        }

        // Estimate output tokens (will be updated with actual response)
        analysis.estimatedOutputTokens = Math.min(analysis.maxTokens, 100);

        return analysis;
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