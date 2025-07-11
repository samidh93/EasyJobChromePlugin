import React, { useState, useEffect } from 'react';
import { Settings, Key, Server, Brain, Check, X, AlertCircle, Plus, Trash2, Star, StarOff } from 'lucide-react';

const AiManager = ({ currentUser, onAiSettingsUpdate }) => {
    const [aiSettings, setAiSettings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [isLoadingModels, setIsLoadingModels] = useState(false);
    const [availableModels, setAvailableModels] = useState([]);
    
    // Form state for adding/editing AI settings
    const [settingsForm, setSettingsForm] = useState({
        ai_provider: 'ollama',
        ai_model: 'qwen2.5:3b',
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
            models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini']
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

    // Load AI settings when component mounts or user changes
    useEffect(() => {
        if (currentUser) {
            loadAiSettings();
        }
    }, [currentUser]);

    // Set default values when provider changes
    useEffect(() => {
        if (settingsForm.ai_provider === 'ollama') {
            setSettingsForm(prev => ({ ...prev, ai_model: 'qwen2.5:3b' }));
            loadOllamaModels();
        } else {
            const provider = AI_PROVIDERS[settingsForm.ai_provider];
            if (provider && provider.models) {
                setAvailableModels(provider.models);
                setSettingsForm(prev => ({ ...prev, ai_model: provider.models[0] }));
            }
        }
    }, [settingsForm.ai_provider]);

    const loadAiSettings = async () => {
        if (!currentUser) return;
        
        setLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${currentUser.id}/ai-settings`
            });

            if (response && response.success) {
                setAiSettings(response.ai_settings || []);
                console.log('AI settings loaded:', response.ai_settings);
            } else {
                console.error('Failed to load AI settings:', response?.error);
                setAiSettings([]);
            }
        } catch (error) {
            console.error('Error loading AI settings:', error);
            setStatusMessage('Error loading AI settings');
            setTimeout(() => setStatusMessage(''), 3000);
        } finally {
            setLoading(false);
        }
    };

    const loadOllamaModels = async () => {
        setIsLoadingModels(true);
        try {
            const response = await fetch('http://localhost:11434/api/tags');
            if (response.ok) {
                const data = await response.json();
                const models = data.models.map(model => model.name);
                setAvailableModels(models);
                
                // Set qwen2.5:3b as default if available, otherwise use first model
                const defaultModel = models.includes('qwen2.5:3b') ? 'qwen2.5:3b' : models[0];
                if (defaultModel) {
                    setSettingsForm(prev => ({ ...prev, ai_model: defaultModel }));
                }
            } else {
                setStatusMessage('Failed to load Ollama models. Make sure Ollama is running.');
                setTimeout(() => setStatusMessage(''), 3000);
            }
        } catch (error) {
            console.error('Error loading Ollama models:', error);
            setStatusMessage('Error connecting to Ollama. Make sure it\'s running on localhost:11434.');
            setTimeout(() => setStatusMessage(''), 3000);
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

        setLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                url: `/users/${currentUser.id}/ai-settings`,
                data: {
                    ai_provider: settingsForm.ai_provider,
                    ai_model: settingsForm.ai_model,
                    api_key: settingsForm.api_key,
                    is_default: settingsForm.is_default
                }
            });

            if (response && response.success) {
                setStatusMessage('AI settings saved successfully!');
                setShowAddForm(false);
                setSettingsForm({
                    ai_provider: 'ollama',
                    ai_model: 'qwen2.5:3b',
                    api_key: '',
                    is_default: false
                });
                await loadAiSettings();
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(response?.error || 'Failed to save AI settings');
            }
        } catch (error) {
            console.error('Error saving AI settings:', error);
            setStatusMessage('Error saving AI settings');
        } finally {
            setLoading(false);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    const handleSetDefault = async (settingsId) => {
        setLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'PUT',
                url: `/ai-settings/${settingsId}/default`
            });

            if (response && response.success) {
                setStatusMessage('Default AI settings updated!');
                await loadAiSettings();
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(response?.error || 'Failed to update default settings');
            }
        } catch (error) {
            console.error('Error setting default AI settings:', error);
            setStatusMessage('Error updating default settings');
        } finally {
            setLoading(false);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    const handleDeleteSettings = async (settingsId) => {
        if (!confirm('Are you sure you want to delete these AI settings?')) return;

        setLoading(true);
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'DELETE',
                url: `/ai-settings/${settingsId}`
            });

            if (response && response.success) {
                setStatusMessage('AI settings deleted successfully!');
                await loadAiSettings();
                if (onAiSettingsUpdate) onAiSettingsUpdate();
            } else {
                setStatusMessage(response?.error || 'Failed to delete AI settings');
            }
        } catch (error) {
            console.error('Error deleting AI settings:', error);
            setStatusMessage('Error deleting AI settings');
        } finally {
            setLoading(false);
            setTimeout(() => setStatusMessage(''), 3000);
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
                <div className="ai-settings-section">
                    <div className="no-user">
                        <Settings size={48} />
                        <p>Please log in to configure AI settings</p>
                        <p>AI settings are saved per user account</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <div className="ai-settings-section">
                <div className="section-header">
                    <h2>AI Configuration</h2>
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="primary-button"
                        disabled={loading}
                    >
                        <Plus size={16} />
                        Add AI Settings
                    </button>
                </div>

                {statusMessage && (
                    <div className="status-message">
                        {statusMessage}
                    </div>
                )}

                {showAddForm && (
                    <div className="add-settings-form">
                        <h3>Add New AI Settings</h3>
                        
                        <div className="form-group">
                            <label htmlFor="ai-provider">AI Provider</label>
                            <select 
                                id="ai-provider"
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
                            <p className="form-help">
                                {AI_PROVIDERS[settingsForm.ai_provider]?.description}
                            </p>
                        </div>

                        {AI_PROVIDERS[settingsForm.ai_provider]?.requiresApiKey && (
                            <div className="form-group">
                                <label htmlFor="api-key">API Key</label>
                                <div className="api-key-container">
                                    <input
                                        id="api-key"
                                        type="password"
                                        value={settingsForm.api_key}
                                        onChange={(e) => setSettingsForm(prev => ({ ...prev, api_key: e.target.value }))}
                                        placeholder={`Enter your ${getProviderName(settingsForm.ai_provider)} API key`}
                                        disabled={loading}
                                    />
                                    <Key size={16} className="api-key-icon" />
                                </div>
                                <p className="form-help">
                                    Your API key will be encrypted and stored securely
                                </p>
                            </div>
                        )}

                        <div className="form-group">
                            <label htmlFor="ai-model">AI Model</label>
                            <select 
                                id="ai-model"
                                value={settingsForm.ai_model} 
                                onChange={(e) => setSettingsForm(prev => ({ ...prev, ai_model: e.target.value }))}
                                disabled={loading || isLoadingModels}
                            >
                                {isLoadingModels ? (
                                    <option value="">Loading models...</option>
                                ) : (
                                    availableModels.map(model => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))
                                )}
                            </select>
                            {settingsForm.ai_provider === 'ollama' && (
                                <p className="form-help">
                                    qwen2.5:3b is recommended as default. Make sure the model is installed in Ollama.
                                </p>
                            )}
                        </div>

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    checked={settingsForm.is_default}
                                    onChange={(e) => setSettingsForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                    disabled={loading}
                                />
                                <span className="checkbox-text">Set as default AI settings</span>
                            </label>
                            <p className="form-help">
                                Default settings will be used for new job applications
                            </p>
                        </div>

                        <div className="form-actions">
                            <button 
                                onClick={handleSaveSettings}
                                className="primary-button"
                                disabled={loading || isLoadingModels}
                            >
                                <Check size={16} />
                                Save Settings
                            </button>
                            <button 
                                onClick={() => setShowAddForm(false)}
                                className="secondary-button"
                                disabled={loading}
                            >
                                <X size={16} />
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                <div className="ai-settings-list">
                    <h3>Your AI Settings</h3>
                    
                    {loading && aiSettings.length === 0 ? (
                        <div className="loading-state">
                            <Settings size={24} />
                            <p>Loading AI settings...</p>
                        </div>
                    ) : aiSettings.length === 0 ? (
                        <div className="empty-state">
                            <Brain size={48} />
                            <p>No AI settings configured</p>
                            <p>Add your first AI configuration to start using the auto-apply feature</p>
                        </div>
                    ) : (
                        <div className="settings-grid">
                            {aiSettings.map((settings) => (
                                <div key={settings.id} className={`settings-card ${settings.is_default ? 'default' : ''}`}>
                                    <div className="settings-header">
                                        <div className="provider-info">
                                            {getProviderIcon(settings.ai_provider)}
                                            <span className="provider-name">
                                                {getProviderName(settings.ai_provider)}
                                            </span>
                                        </div>
                                        <div className="settings-actions">
                                            {settings.is_default ? (
                                                <span className="default-badge">
                                                    <Star size={14} />
                                                    Default
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSetDefault(settings.id)}
                                                    className="icon-button"
                                                    title="Set as default"
                                                    disabled={loading}
                                                >
                                                    <StarOff size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDeleteSettings(settings.id)}
                                                className="icon-button delete-button"
                                                title="Delete settings"
                                                disabled={loading}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div className="settings-details">
                                        <div className="detail-item">
                                            <span className="detail-label">Model:</span>
                                            <span className="detail-value">{settings.ai_model}</span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">API Key:</span>
                                            <span className="detail-value">
                                                {settings.api_key_encrypted ? '••••••••' : 'Not required'}
                                            </span>
                                        </div>
                                        <div className="detail-item">
                                            <span className="detail-label">Created:</span>
                                            <span className="detail-value">
                                                {new Date(settings.created_at).toLocaleDateString()}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AiManager; 