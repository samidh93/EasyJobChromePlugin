const { AISettings } = require('./models/index.cjs');

class AISettingsService {
    /**
     * Create new AI settings
     * @param {Object} settingsData - AI settings data
     * @param {string} settingsData.user_id - User ID
     * @param {string} settingsData.ai_provider - AI provider (e.g., 'openai', 'anthropic')
     * @param {string} settingsData.ai_model - AI model (e.g., 'gpt-4', 'claude-3')
     * @param {string} settingsData.api_key_encrypted - Encrypted API key
     * @param {boolean} settingsData.is_default - Whether this is the default setting
     * @returns {Promise<Object>} Created AI settings object
     */
    static async createAISettings(settingsData) {
        try {
            // Validate settings data
            const validation = this.validateAISettingsData(settingsData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            const settings = await AISettings.create(settingsData);
            return settings.toJSON ? settings.toJSON() : settings;
        } catch (error) {
            console.error('Error creating AI settings:', error);
            throw error;
        }
    }

    /**
     * Get AI settings by ID
     * @param {string} settingsId - AI settings ID
     * @returns {Promise<Object|null>} AI settings object or null
     */
    static async getAISettingsById(settingsId) {
        try {
            const settings = await AISettings.findById(settingsId);
            return settings ? (settings.toJSON ? settings.toJSON() : settings) : null;
        } catch (error) {
            console.error('Error getting AI settings by ID:', error);
            throw error;
        }
    }

    /**
     * Get all AI settings for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of AI settings objects
     */
    static async getAISettingsByUserId(userId) {
        try {
            const settings = await AISettings.findByUserId(userId);
            return settings.map(setting => setting.toJSON ? setting.toJSON() : setting);
        } catch (error) {
            console.error('Error getting AI settings by user ID:', error);
            throw error;
        }
    }

    /**
     * Get default AI settings for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Default AI settings or null
     */
    static async getDefaultAISettingsByUserId(userId) {
        try {
            const settings = await AISettings.findDefaultByUserId(userId);
            return settings ? (settings.toJSON ? settings.toJSON() : settings) : null;
        } catch (error) {
            console.error('Error getting default AI settings by user ID:', error);
            throw error;
        }
    }

    /**
     * Get AI settings by provider
     * @param {string} provider - AI provider name
     * @param {string} userId - Optional user ID to filter
     * @returns {Promise<Array>} Array of AI settings objects
     */
    static async getAISettingsByProvider(provider, userId = null) {
        try {
            const settings = await AISettings.findByProvider(provider, userId);
            return settings.map(setting => setting.toJSON ? setting.toJSON() : setting);
        } catch (error) {
            console.error('Error getting AI settings by provider:', error);
            throw error;
        }
    }

    /**
     * Update AI settings
     * @param {string} settingsId - AI settings ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Object>} Updated AI settings object
     */
    static async updateAISettings(settingsId, updateData) {
        try {
            const settings = await AISettings.findById(settingsId);
            if (!settings) {
                throw new Error('AI settings not found');
            }

            // Remove sensitive fields from update data
            const { id, user_id, created_at, ...safeUpdateData } = updateData;

            const updatedSettings = await settings.update(safeUpdateData);
            return updatedSettings.toJSON ? updatedSettings.toJSON() : updatedSettings;
        } catch (error) {
            console.error('Error updating AI settings:', error);
            throw error;
        }
    }

    /**
     * Set AI settings as default (unsets other defaults for the user)
     * @param {string} settingsId - AI settings ID
     * @returns {Promise<Object>} Updated AI settings object
     */
    static async setAISettingsAsDefault(settingsId) {
        try {
            const settings = await AISettings.findById(settingsId);
            if (!settings) {
                throw new Error('AI settings not found');
            }

            const updatedSettings = await settings.setAsDefault();
            return updatedSettings.toJSON ? updatedSettings.toJSON() : updatedSettings;
        } catch (error) {
            console.error('Error setting AI settings as default:', error);
            throw error;
        }
    }

    /**
     * Unset all other AI settings as default for a user
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async unsetOtherAISettingsAsDefault(userId) {
        try {
            const { pool } = require('./connection.cjs');
            await pool.query(
                'UPDATE ai_settings SET is_default = false WHERE user_id = $1',
                [userId]
            );
            return true;
        } catch (error) {
            console.error('Error unsetting other AI settings as default:', error);
            throw error;
        }
    }

    /**
     * Delete AI settings
     * @param {string} settingsId - AI settings ID
     * @returns {Promise<boolean>} Success status
     */
    static async deleteAISettings(settingsId) {
        try {
            const settings = await AISettings.findById(settingsId);
            if (!settings) {
                throw new Error('AI settings not found');
            }

            const result = await settings.delete();
            return result;
        } catch (error) {
            console.error('Error deleting AI settings:', error);
            throw error;
        }
    }

    /**
     * Check if AI settings can be deleted (not used in applications)
     * @param {string} settingsId - AI settings ID
     * @returns {Promise<boolean>} True if can be deleted
     */
    static async canDeleteAISettings(settingsId) {
        try {
            const settings = await AISettings.findById(settingsId);
            if (!settings) {
                throw new Error('AI settings not found');
            }

            return await settings.canDelete();
        } catch (error) {
            console.error('Error checking if AI settings can be deleted:', error);
            throw error;
        }
    }

    /**
     * Get applications that used specific AI settings
     * @param {string} settingsId - AI settings ID
     * @returns {Promise<Array>} Array of application objects
     */
    static async getAISettingsApplications(settingsId) {
        try {
            const settings = await AISettings.findById(settingsId);
            if (!settings) {
                throw new Error('AI settings not found');
            }

            return await settings.getApplications();
        } catch (error) {
            console.error('Error getting AI settings applications:', error);
            throw error;
        }
    }

    /**
     * Get AI settings statistics
     * @param {string} userId - Optional user ID to filter stats
     * @returns {Promise<Object>} AI settings statistics
     */
    static async getAISettingsStats(userId = null) {
        try {
            const stats = await AISettings.getStats(userId);
            
            // Convert string numbers to integers
            return {
                total_settings: parseInt(stats.total_settings) || 0,
                default_settings: parseInt(stats.default_settings) || 0,
                unique_providers: parseInt(stats.unique_providers) || 0,
                unique_models: parseInt(stats.unique_models) || 0
            };
        } catch (error) {
            console.error('Error getting AI settings stats:', error);
            throw error;
        }
    }

    /**
     * Get global AI settings statistics (for admin purposes)
     * @returns {Promise<Object>} Global AI settings statistics
     */
    static async getGlobalAISettingsStats() {
        try {
            const { pool } = require('./connection.cjs');
            const query = `
                SELECT 
                    COUNT(*) as total_settings,
                    COUNT(DISTINCT user_id) as total_users_with_settings,
                    COUNT(DISTINCT ai_provider) as unique_providers,
                    COUNT(DISTINCT ai_model) as unique_models,
                    array_agg(DISTINCT ai_provider) as providers,
                    array_agg(DISTINCT ai_model) as models
                FROM ai_settings
            `;
            
            const result = await pool.query(query);
            const stats = result.rows[0];
            
            return {
                total_settings: parseInt(stats.total_settings) || 0,
                total_users_with_settings: parseInt(stats.total_users_with_settings) || 0,
                unique_providers: parseInt(stats.unique_providers) || 0,
                unique_models: parseInt(stats.unique_models) || 0,
                providers: stats.providers || [],
                models: stats.models || []
            };
        } catch (error) {
            console.error('Error getting global AI settings stats:', error);
            throw error;
        }
    }

    /**
     * Get all available AI providers
     * @param {string} userId - Optional user ID to filter
     * @returns {Promise<Array>} Array of provider names
     */
    static async getAIProviders(userId = null) {
        try {
            return await AISettings.getProviders(userId);
        } catch (error) {
            console.error('Error getting AI providers:', error);
            throw error;
        }
    }

    /**
     * Get all available AI models for a provider
     * @param {string} provider - AI provider name
     * @param {string} userId - Optional user ID to filter
     * @returns {Promise<Array>} Array of model names
     */
    static async getAIModelsByProvider(provider, userId = null) {
        try {
            return await AISettings.getModelsByProvider(provider, userId);
        } catch (error) {
            console.error('Error getting AI models by provider:', error);
            throw error;
        }
    }

    /**
     * Validate AI settings data
     * @param {Object} settingsData - AI settings data to validate
     * @returns {Object} Validation result
     */
    static validateAISettingsData(settingsData) {
        const errors = [];

        if (!settingsData.user_id) {
            errors.push('User ID is required');
        }

        if (!settingsData.ai_provider || settingsData.ai_provider.trim().length < 1) {
            errors.push('AI provider is required');
        }

        if (!settingsData.ai_model || settingsData.ai_model.trim().length < 1) {
            errors.push('AI model is required');
        }

        if (!settingsData.api_key_encrypted || settingsData.api_key_encrypted.trim().length < 1) {
            errors.push('API key is required');
        }

        // Validate provider names
        const validProviders = ['openai', 'anthropic', 'google', 'cohere', 'huggingface', 'local'];
        if (settingsData.ai_provider && !validProviders.includes(settingsData.ai_provider.toLowerCase())) {
            errors.push(`Invalid AI provider. Allowed: ${validProviders.join(', ')}`);
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Check if user exists (helper method)
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} True if user exists
     */
    static async userExists(userId) {
        try {
            const { User } = require('./models/index.cjs');
            const user = await User.findById(userId);
            return !!user;
        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }

    /**
     * Encrypt API key (placeholder - implement proper encryption)
     * @param {string} apiKey - Plain text API key
     * @returns {Promise<string>} Encrypted API key
     */
    static async encryptAPIKey(apiKey) {
        // TODO: Implement proper encryption
        // For now, return a simple base64 encoding (NOT secure for production!)
        return Buffer.from(apiKey).toString('base64');
    }

    /**
     * Decrypt API key (placeholder - implement proper decryption)
     * @param {string} encryptedApiKey - Encrypted API key
     * @returns {Promise<string>} Decrypted API key
     */
    static async decryptAPIKey(encryptedApiKey) {
        // TODO: Implement proper decryption
        // For now, return base64 decoding (NOT secure for production!)
        try {
            return Buffer.from(encryptedApiKey, 'base64').toString();
        } catch (error) {
            throw new Error('Failed to decrypt API key');
        }
    }
}

module.exports = AISettingsService; 