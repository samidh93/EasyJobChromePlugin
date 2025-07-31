import React, { useState, useEffect } from 'react';
import { Settings, Key, Server, Brain, Check, X, AlertCircle, Plus, Trash2, Star, StarOff, Eye, EyeOff } from 'lucide-react';
import { aiManager } from './index.js';

const AiManagerComponent = ({ currentUser, onAiSettingsUpdate }) => {
    const [aiSettings, setAiSettings] = useState([]);
    const [defaultSettings, setDefaultSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    
    // Connection testing state
    const [isTestingConnection, setIsTestingConnection] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState(null);
    const [showResponse, setShowResponse] = useState(false);
    
    // Form state for adding/editing AI settings
    const [settingsForm, setSettingsForm] = useState({
        ai_provider: 'openai',
        ai_model: 'gpt-4o-mini',
        api_key: '',
        is_default: false
    });

    // Available AI providers
    const AI_PROVIDERS = {
        ollama: {
            name: 'Ollama (Local)',
            requiresApiKey: false,
            description: 'Local AI models running on your machine',
            icon: Server
        },
        openai: {
            name: 'OpenAI',
            requiresApiKey: true,
            description: 'GPT models from OpenAI',
            icon: Brain,
            models: ['gpt-4', 'gpt-4-turbo', 'gpt-4o-mini', 'gpt-4o']
        },
        anthropic: {
            name: 'Claude (Anthropic)',
            requiresApiKey: true,
            description: 'Claude models from Anthropic',
            icon: Brain,
            models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
        },
        google: {
            name: 'Gemini (Google)',
            requiresApiKey: true,
            description: 'Gemini models from Google',
            icon: Brain,
            models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro', 'gemini-pro-vision']
        }
    };

    // Listen to AI manager state changes
    useEffect(() => {
        const unsubscribe = aiManager.addListener((state) => {
            setAiSettings(state.aiSettings);
            setDefaultSettings(state.defaultSettings);
            setLoading(state.loading);
        });

        return unsubscribe;
    }, []);

    // Load AI settings when component mounts or user changes
    useEffect(() => {
        if (currentUser) {
            aiManager.loadAiSettings(currentUser.id);
        }
    }, [currentUser]);

    // Set default values when provider changes
    useEffect(() => {
        if (settingsForm.ai_provider === 'ollama') {
            setSettingsForm(prev => ({ ...prev, ai_model: 'qwen2.5:3b' }));
            // Only load Ollama models when user explicitly selects Ollama in the form
            // Don't auto-load on component initialization
        } else {
            const provider = AI_PROVIDERS[settingsForm.ai_provider];
            if (provider && provider.models) {
                setAvailableModels(provider.models);
                setSettingsForm(prev => ({ ...prev, ai_model: provider.models[0] }));
            }
        }
    }, [settingsForm.ai_provider]);

    const loadOllamaModels = async () => {
        setIsLoadingModels(true);
        try {
            const result = await aiManager.loadOllamaModels();
            if (result.success) {
                setAvailableModels(result.models);
                
                // Set qwen2.5:3b as default if available, otherwise use first model
                const defaultModel = result.models.includes('qwen2.5:3b') ? 'qwen2.5:3b' : result.models[0];
                if (defaultModel) {
                    setSettingsForm(prev => ({ ...prev, ai_model: defaultModel }));
                }
            } else {
                setStatusMessage(result.error);
                setTimeout(() => setStatusMessage(''), 3000);
            }
        } catch (error) {
            console.error('AiManager: Failed to load Ollama models:', error);
            // Don't show error message unless user is actively trying to use Ollama
            if (settingsForm.ai_provider === 'ollama') {
                setStatusMessage('Error connecting to Ollama. Make sure it\'s running on localhost:11434.');
                setTimeout(() => setStatusMessage(''), 5000);
            }
        } finally {
            setIsLoadingModels(false);
        }
    };

    const handleProviderChange = (provider) => {
        setSettingsForm(prev => ({
            ...prev,
            ai_provider: provider,
            api_key: '', // Clear API key when changing provider
            ai_model: '' // Will be set by useEffect
        }));
        
        // If user explicitly selects Ollama in the form, load models
        if (provider === 'ollama' && showAddForm) {
            loadOllamaModels();
        }
    };

    const handleSaveSettings = async () => {
        if (!currentUser) return;

        // Validation
        if (!settingsForm.ai_provider || !settingsForm.ai_model) {
            setStatusMessage('Please select AI provider and model');
            setTimeout(() => setStatusMessage(''), 3000);
            return;
        }

        const provider = AI_PROVIDERS[settingsForm.ai_provider];
        if (provider.requiresApiKey && !settingsForm.api_key) {
            setStatusMessage('API key is required for this provider');
            setTimeout(() => setStatusMessage(''), 3000);
            return;
        }

        try {
            const result = await aiManager.saveAiSettings(currentUser.id, {
                ai_provider: settingsForm.ai_provider,
                ai_model: settingsForm.ai_model,
                api_key: settingsForm.api_key,
                is_default: settingsForm.is_default
            });

            if (result.success) {
                setStatusMessage('AI settings saved successfully!');
                setShowAddForm(false);
                setSettingsForm({
                    ai_provider: 'openai',
                    ai_model: 'gpt-4o-mini',
                    api_key: '',
                    is_default: false
                });
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(result.error || 'Failed to save AI settings');
            }
        } catch (error) {
            console.error('Error saving AI settings:', error);
            setStatusMessage('Error saving AI settings');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleSetDefault = async (settingsId) => {
        try {
            const result = await aiManager.setDefaultAiSettings(settingsId);
            if (result.success) {
                setStatusMessage('Default AI settings updated!');
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(result.error || 'Failed to update default settings');
            }
        } catch (error) {
            console.error('Error setting default AI settings:', error);
            setStatusMessage('Error updating default settings');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleDeleteSettings = async (settingsId) => {
        if (!confirm('Are you sure you want to delete these AI settings?')) return;

        try {
            const result = await aiManager.deleteAiSettings(settingsId);
            if (result.success) {
                setStatusMessage('AI settings deleted successfully!');
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(result.error || 'Failed to delete AI settings');
            }
        } catch (error) {
            console.error('Error deleting AI settings:', error);
            setStatusMessage('Error deleting AI settings');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleTestConnection = async () => {
        if (!currentUser) {
            setStatusMessage('Please log in to test connection');
            setTimeout(() => setStatusMessage(''), 3000);
            return;
        }

        setIsTestingConnection(true);
        setConnectionStatus(null);
        setStatusMessage('Testing connection...');

        try {
            // Get current AI settings from database
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${currentUser.id}/ai-settings/default`
            });

            let aiSettings = null;
            if (response && response.success) {
                // Get the encrypted API key and decrypt it
                let decryptedApiKey = null;
                if (response.ai_settings.api_key_encrypted) {
                    try {
                        // Get the actual encrypted key from the database
                        const keyResponse = await chrome.runtime.sendMessage({
                            action: 'apiRequest',
                            method: 'GET',
                            url: `/ai-settings/${response.ai_settings.id}/encrypted-key`
                        });
                        
                        if (keyResponse && keyResponse.success && keyResponse.api_key_encrypted) {
                            const decryptResponse = await chrome.runtime.sendMessage({
                                action: 'apiRequest',
                                method: 'POST',
                                url: `/ai-settings/decrypt-api-key`,
                                data: { encryptedApiKey: keyResponse.api_key_encrypted }
                            });
                            
                            if (decryptResponse && decryptResponse.success) {
                                decryptedApiKey = decryptResponse.decryptedApiKey;
                            }
                        }
                    } catch (decryptError) {
                        console.error('Error decrypting API key:', decryptError);
                    }
                }

                aiSettings = {
                    provider: response.ai_settings.ai_provider,
                    model: response.ai_settings.ai_model,
                    apiKey: decryptedApiKey
                };
            }

            // If no database settings, use form settings
            if (!aiSettings) {
                aiSettings = {
                    provider: settingsForm.ai_provider,
                    model: settingsForm.ai_model,
                    apiKey: settingsForm.api_key
                };
            }

            // Test connection based on provider
            let testResult;
            if (aiSettings.provider === 'ollama') {
                testResult = await chrome.runtime.sendMessage({
                    action: 'testOllama'
                });
            } else if (aiSettings.provider === 'openai') {
                testResult = await chrome.runtime.sendMessage({
                    action: 'testOpenAI',
                    apiKey: aiSettings.apiKey
                });
            } else {
                testResult = { success: false, error: `Provider ${aiSettings.provider} not yet implemented` };
            }

            if (testResult.success) {
                setConnectionStatus({
                    success: true,
                    message: `Connection successful! Using ${aiSettings.provider} with model ${aiSettings.model}`,
                    details: testResult.data
                });
                setStatusMessage('Connection test successful!');
            } else {
                setConnectionStatus({
                    success: false,
                    message: testResult.error || 'Connection failed',
                    details: testResult.troubleshooting || 'Please check your settings and try again.'
                });
                setStatusMessage('Connection test failed');
            }
        } catch (error) {
            console.error('Error testing connection:', error);
            setConnectionStatus({
                success: false,
                message: 'Connection test failed',
                details: error.message || 'An unexpected error occurred.'
            });
            setStatusMessage('Error testing connection');
        } finally {
            setIsTestingConnection(false);
            setTimeout(() => setStatusMessage(''), 5000);
        }
    };

    const getProviderIcon = (provider) => {
        const providerConfig = AI_PROVIDERS[provider];
        const IconComponent = providerConfig?.icon || Brain;
        return <IconComponent size={16} />;
    };

    const getProviderName = (provider) => {
        return AI_PROVIDERS[provider]?.name || provider;
    };

    if (!currentUser) {
        return (
            <div className="tab-content">
                <div className="no-user">
                    <AlertCircle size={24} />
                    <p>Please log in to manage AI settings</p>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <div className="ai-settings-section">
                <div className="section-header">
                    <h2>AI Settings</h2>
                    <div className="header-actions">
                        <button 
                            className="secondary-button"
                            onClick={handleTestConnection}
                            disabled={loading || isTestingConnection}
                        >
                            {isTestingConnection ? (
                                <>
                                    <div className="spinner"></div>
                                    Testing...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Test Connection
                                </>
                            )}
                        </button>
                        <button 
                            className="primary-button"
                            onClick={() => {
                                setShowAddForm(true);
                                // If form defaults to Ollama, load models when form opens
                                if (settingsForm.ai_provider === 'ollama') {
                                    loadOllamaModels();
                                }
                            }}
                            disabled={loading}
                        >
                            <Plus size={16} />
                            Add Settings
                        </button>
                    </div>
                </div>

            {statusMessage && (
                <div className={`status-message ${statusMessage.includes('Error') ? 'error' : 'success'}`}>
                    {statusMessage}
                </div>
            )}

            {connectionStatus && (
                <div className={`connection-status ${connectionStatus.success ? 'success' : 'error'}`}>
                    <div className="connection-header">
                        {connectionStatus.success ? (
                            <Check size={20} className="status-icon success" />
                        ) : (
                            <X size={20} className="status-icon error" />
                        )}
                        <span className="connection-message">{connectionStatus.message}</span>
                    </div>
                    {connectionStatus.details && (
                        <div className="connection-details">
                            {typeof connectionStatus.details === 'object' ? (
                                <div className="details-object">
                                    <div className="detail-row">
                                        <span className="detail-label">Provider:</span>
                                        <span className="detail-value">{connectionStatus.details.provider || 'N/A'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span className="detail-label">Model:</span>
                                        <span className="detail-value">{connectionStatus.details.version || 'N/A'}</span>
                                    </div>
                                    {connectionStatus.details.response && (
                                        <div className="detail-row">
                                            <span className="detail-label">Response:</span>
                                            <div className="response-container">
                                                <button 
                                                    className="response-toggle"
                                                    onClick={() => setShowResponse(!showResponse)}
                                                    title={showResponse ? 'Hide response' : 'Show response'}
                                                >
                                                    {showResponse ? <EyeOff size={14} /> : <Eye size={14} />}
                                                </button>
                                                <span className="detail-value">
                                                    {showResponse ? connectionStatus.details.response : 'Click to view'}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <p className="details-text">{connectionStatus.details}</p>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showAddForm && (
                <div className="add-settings-form">
                    <h3>Add AI Settings</h3>
                    
                    <div className="form-group">
                        <label>AI Provider</label>
                        <select 
                            value={settingsForm.ai_provider}
                            onChange={(e) => handleProviderChange(e.target.value)}
                            disabled={loading}
                        >
                            {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                                <option key={key} value={key}>
                                    {provider.name}
                                </option>
                            ))}
                        </select>
                        <small>{AI_PROVIDERS[settingsForm.ai_provider]?.description}</small>
                    </div>

                    <div className="form-group">
                        <label>AI Model</label>
                        <select 
                            value={settingsForm.ai_model}
                            onChange={(e) => setSettingsForm(prev => ({ ...prev, ai_model: e.target.value }))}
                            disabled={loading || isLoadingModels}
                        >
                            {isLoadingModels ? (
                                <option>Loading models...</option>
                            ) : (
                                availableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                ))
                            )}
                        </select>
                    </div>

                    {AI_PROVIDERS[settingsForm.ai_provider]?.requiresApiKey && (
                        <div className="form-group">
                            <label>API Key</label>
                            <input
                                type="password"
                                value={settingsForm.api_key}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, api_key: e.target.value }))}
                                placeholder="Enter your API key"
                                disabled={loading}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={settingsForm.is_default}
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                disabled={loading}
                            />
                            Set as default
                        </label>
                    </div>

                    <div className="form-actions">
                        <button 
                            className="primary-button"
                            onClick={handleSaveSettings}
                            disabled={loading}
                        >
                            {loading ? 'Saving...' : 'Save Settings'}
                        </button>
                        <button 
                            className="secondary-button"
                            onClick={() => setShowAddForm(false)}
                            disabled={loading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="settings-grid">
                {loading ? (
                    <div className="loading-state">Loading AI settings...</div>
                ) : aiSettings.length === 0 ? (
                    <div className="empty-state">
                        <Settings size={48} />
                        <p>No AI settings configured</p>
                        <p>Add your first AI settings to get started</p>
                    </div>
                ) : (
                    aiSettings.map(setting => (
                        <div key={setting.id} className={`settings-card ${setting.is_default ? 'default' : ''}`}>
                            <div className="settings-header">
                                <div className="provider-info">
                                    {getProviderIcon(setting.ai_provider)}
                                    <span className="provider-name">{getProviderName(setting.ai_provider)}</span>
                                    {setting.is_default && <Star size={16} className="default-badge" />}
                                </div>
                                <div className="settings-actions">
                                    {!setting.is_default && (
                                        <button 
                                            className="action-button"
                                            onClick={() => handleSetDefault(setting.id)}
                                            disabled={loading}
                                            title="Set as default"
                                        >
                                            <StarOff size={16} />
                                        </button>
                                    )}
                                    <button 
                                        className="action-button danger"
                                        onClick={() => handleDeleteSettings(setting.id)}
                                        disabled={loading}
                                        title="Delete settings"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className="settings-details">
                                <div className="detail-item">
                                    <span className="detail-label">Model:</span>
                                    <span className="detail-value">{setting.ai_model}</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-label">API Key:</span>
                                    <span className="detail-value">
                                        {setting.api_key_encrypted ? 'Configured' : 'Not set'}
                                        {process.env.NODE_ENV === 'development' && (
                                            <small style={{display: 'block', color: '#666', fontSize: '10px'}}>
                                                Debug: {typeof setting.api_key_encrypted} - {setting.api_key_encrypted ? 'true' : 'false'}
                                            </small>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
            </div>
        </div>
    );
};

export default AiManagerComponent; 