import React, { useState, useEffect } from 'react';
import { User, Settings, History, Eye, EyeOff, Play, Square, Key, Server, Brain, Upload, FileText, CheckCircle } from 'lucide-react';
import './App.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Resume upload state
  const [resumeData, setResumeData] = useState(null);
  const [isResumeLoaded, setIsResumeLoaded] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  
  // AI Settings State
  const [aiProvider, setAiProvider] = useState('ollama');
  const [aiModel, setAiModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [availableModels, setAvailableModels] = useState([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  
  // Application History State
  const [applicationHistory, setApplicationHistory] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedApplication, setSelectedApplication] = useState(null);

  // Load data on component mount
  useEffect(() => {
    // Check if libraries are already loaded
    if (window.librariesReady || (window.ResumeParser && typeof window.ResumeParser === 'function')) {
      console.log('Libraries already loaded, setting state immediately');
      setLibrariesLoaded(true);
    } else {
      console.log('Libraries not ready, starting check process');
      checkLibrariesLoaded();
    }
    
    loadUserData();
    loadAiSettings();
    loadApplicationHistory();
    loadResumeData();
    
    // Start periodic state sync
    const stateCheckInterval = setInterval(checkAutoApplyState, 2000);
    
    return () => {
      clearInterval(stateCheckInterval);
    };
  }, []);

  // Check if libraries are loaded
  const checkLibrariesLoaded = () => {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds (100ms * 100 attempts)
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Check if libraries are loaded either by individual check or global flag
      const librariesReady = window.librariesReady || 
        (window.ResumeParser && typeof window.ResumeParser === 'function');
      
      if (librariesReady) {
        console.log('Libraries loaded successfully:', {
          jsyaml: !!window.jsyaml,
          pdfjsLib: !!window.pdfjsLib,
          ResumeParser: !!window.ResumeParser,
          librariesReady: window.librariesReady
        });
        setLibrariesLoaded(true);
        clearInterval(checkInterval);
        return;
      }
      
      // Log progress every 2 seconds
      if (attempts % 20 === 0) {
        console.log(`Still waiting for libraries to load... (${attempts * 100}ms elapsed)`);
        console.log('Current state:', {
          jsyaml: !!window.jsyaml,
          pdfjsLib: !!window.pdfjsLib,
          ResumeParser: !!window.ResumeParser,
          ResumeParserType: typeof window.ResumeParser
        });
      }
      
      // Timeout after 10 seconds
      if (attempts >= maxAttempts) {
        console.error('Libraries failed to load within 10 seconds');
        console.error('Final state:', {
          jsyaml: !!window.jsyaml,
          pdfjsLib: !!window.pdfjsLib,
          ResumeParser: !!window.ResumeParser,
          ResumeParserType: typeof window.ResumeParser
        });
        clearInterval(checkInterval);
        // Don't set librariesLoaded to true, leave it as false
      }
    }, 100);
  };

  // Check auto apply state periodically to keep UI in sync
  const checkAutoApplyState = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getAutoApplyState'
      });
      
      if (response && typeof response.isRunning === 'boolean') {
        // Only update state if it's different from current state
        if (response.isRunning !== isApplying) {
          console.log('Auto apply state sync:', { 
            currentUI: isApplying, 
            actualState: response.isRunning 
          });
          setIsApplying(response.isRunning);
        }
      }
    } catch (error) {
      // Silently ignore errors in state checking to avoid spam
      console.debug('Error checking auto apply state:', error);
    }
  };

  const loadUserData = async () => {
    try {
      const result = await chrome.storage.local.get(['isLoggedIn', 'loginData']);
      if (result.isLoggedIn) {
        setIsLoggedIn(true);
        setLoginData(result.loginData || { username: '', password: '' });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadResumeData = async () => {
    try {
      const result = await chrome.storage.local.get(['userResumeText']);
      if (result.userResumeText) {
        setResumeData(result.userResumeText);
        setIsResumeLoaded(true);
      }
    } catch (error) {
      console.error('Error loading resume data:', error);
    }
  };

  const loadAiSettings = async () => {
    try {
      const result = await chrome.storage.local.get(['aiProvider', 'aiModel', 'apiKey']);
      setAiProvider(result.aiProvider || 'ollama');
      setAiModel(result.aiModel || '');
      setApiKey(result.apiKey || '');
    } catch (error) {
      console.error('Error loading AI settings:', error);
    }
  };

  const loadApplicationHistory = async () => {
    try {
      const result = await chrome.storage.local.get(['applicationHistory']);
      setApplicationHistory(result.applicationHistory || []);
    } catch (error) {
      console.error('Error loading application history:', error);
    }
  };

  const handleLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setStatusMessage('Please enter username and password');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    // For now, just check if fields are filled - later implement real authentication
    try {
      await chrome.storage.local.set({
        isLoggedIn: true,
        loginData: loginData
      });
      setIsLoggedIn(true);
      setStatusMessage('Login successful!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage('Login failed');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleLogout = async () => {
    try {
      await chrome.storage.local.set({
        isLoggedIn: false,
        loginData: { username: '', password: '' }
      });
      setIsLoggedIn(false);
      setLoginData({ username: '', password: '' });
      setStatusMessage('Logged out successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleResumeUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploadingResume(true);
    setStatusMessage('Uploading and parsing resume...');

    try {
      // Check if ResumeParser is available
      if (!window.ResumeParser) {
        throw new Error('ResumeParser not loaded. Please refresh the page and try again.');
      }
      
      if (typeof window.ResumeParser !== 'function') {
        throw new Error('ResumeParser is not a constructor. Please refresh the page and try again.');
      }
      
      // Debug: Log available libraries
      console.log('Libraries check:', {
        jsyaml: !!window.jsyaml,
        pdfjsLib: !!window.pdfjsLib,
        ResumeParser: !!window.ResumeParser,
        ResumeParserType: typeof window.ResumeParser
      });
      
      // Initialize ResumeParser
      const parser = new window.ResumeParser();
      
      // Parse the resume
      const parsedText = await parser.parseResume(file);
      
      // Store the parsed resume text
      await chrome.storage.local.set({
        userResumeText: parsedText
      });
      
      setResumeData(parsedText);
      setIsResumeLoaded(true);
      setStatusMessage('Resume uploaded and parsed successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      console.error('Error processing resume:', error);
      setStatusMessage(`Error processing resume: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsUploadingResume(false);
      // Reset the file input
      event.target.value = '';
    }
  };

  const handleAiProviderChange = async (provider) => {
    setAiProvider(provider);
    setAiModel('');
    setAvailableModels([]);
    
    try {
      await chrome.storage.local.set({ aiProvider: provider });
      
      if (provider === 'ollama') {
        await loadOllamaModels();
      }
    } catch (error) {
      console.error('Error saving AI provider:', error);
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
        if (models.length > 0 && !aiModel) {
          setAiModel(models[0]);
          await chrome.storage.local.set({ aiModel: models[0] });
        }
      } else {
        setStatusMessage('Failed to load Ollama models');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    } catch (error) {
      setStatusMessage('Error connecting to Ollama');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleApiKeySubmit = async () => {
    if (!apiKey) {
      setStatusMessage('Please enter API key');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsLoadingModels(true);
    try {
      await chrome.storage.local.set({ apiKey });
      
      // Load models based on provider
      let models = [];
      if (aiProvider === 'openai') {
        models = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'];
      } else if (aiProvider === 'claude') {
        models = ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'];
      } else if (aiProvider === 'gemini') {
        models = ['gemini-pro', 'gemini-pro-vision'];
      }
      
      setAvailableModels(models);
      if (models.length > 0) {
        setAiModel(models[0]);
        await chrome.storage.local.set({ aiModel: models[0] });
      }
      
      setStatusMessage('API key saved successfully');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error) {
      setStatusMessage('Error saving API key');
      setTimeout(() => setStatusMessage(''), 3000);
    } finally {
      setIsLoadingModels(false);
    }
  };

  const handleModelChange = async (model) => {
    setAiModel(model);
    try {
      await chrome.storage.local.set({ aiModel: model });
    } catch (error) {
      console.error('Error saving AI model:', error);
    }
  };

  const handleStartApply = async () => {
    if (!isLoggedIn) {
      setStatusMessage('Please login first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    if (!isResumeLoaded) {
      setStatusMessage('Please upload your resume first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setStatusMessage('Starting auto apply...');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'startAutoApply',
        loginData: loginData,
        aiSettings: { provider: aiProvider, model: aiModel, apiKey: apiKey }
      });
      
      if (response && response.success) {
        setIsApplying(true);
        setStatusMessage('Auto apply started successfully!');
        console.log('Auto apply started:', response.message);
      } else {
        setStatusMessage(response?.error || 'Failed to start auto apply');
        console.error('Start failed:', response?.error || 'Unknown error');
      }
    } catch (error) {
      setStatusMessage('Error starting auto apply');
      console.error('Error:', error);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleStopApply = async () => {
    setStatusMessage('Stopping auto apply...');
    
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopAutoApply'
      });
      
      if (response && response.success) {
        setIsApplying(false);
        setStatusMessage('Auto apply stopped successfully');
        console.log('Auto apply stopped:', response.message);
      } else {
        setStatusMessage('Failed to stop auto apply');
        console.error('Stop failed:', response?.error || 'Unknown error');
      }
    } catch (error) {
      setStatusMessage('Error stopping auto apply');
      console.error('Error:', error);
      // Don't change isApplying state if there was an error
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const getUniqueCompanies = () => {
    return [...new Set(applicationHistory.map(app => app.company))].filter(Boolean);
  };

  const getJobsForCompany = (company) => {
    return [...new Set(applicationHistory.filter(app => app.company === company).map(app => app.jobTitle))].filter(Boolean);
  };

  const getApplicationsForJob = (company, jobTitle) => {
    return applicationHistory.filter(app => app.company === company && app.jobTitle === jobTitle);
  };

  const handleApplicationSelect = (applicationId) => {
    const application = applicationHistory.find(app => app.id === applicationId);
    setSelectedApplication(application);
  };

  const renderLoginTab = () => (
    <div className="tab-content">
      <div className="login-section">
        <h2>User Authentication</h2>
        
        {!isLoggedIn ? (
          <div className="login-form">
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                placeholder="Enter your username"
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={loginData.password}
                  onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            
            <button onClick={handleLogin} className="primary-button">
              <User size={16} />
              Login
            </button>
          </div>
        ) : (
          <div className="user-info">
            <div className="user-status">
              <User size={20} />
              <span>Welcome, {loginData.username}!</span>
            </div>
            
            {/* Resume Upload Section */}
            <div className="resume-section">
              <h3>Resume Management</h3>
              
              {!librariesLoaded ? (
                <div className="resume-upload">
                  <p>Loading resume parser...</p>
                  <div className="loading-indicator">
                    <span>⏳ Please wait while libraries load</span>
                  </div>
                </div>
              ) : !isResumeLoaded ? (
                <div className="resume-upload">
                  <p>Upload your resume to start applying</p>
                  <input
                    type="file"
                    accept=".pdf,.yaml,.yml,.json,.txt"
                    onChange={handleResumeUpload}
                    disabled={isUploadingResume}
                    className="file-input"
                    id="resume-upload"
                  />
                  <label htmlFor="resume-upload" className="secondary-button">
                    <Upload size={16} />
                    {isUploadingResume ? 'Processing...' : 'Upload Resume'}
                  </label>
                  <p className="file-info">
                    Supported formats: PDF, YAML, JSON, TXT
                  </p>
                </div>
              ) : (
                <div className="resume-loaded">
                  <div className="resume-status">
                    <CheckCircle size={20} className="success-icon" />
                    <span>Resume loaded successfully</span>
                  </div>
                  
                  <div className="resume-preview">
                    <h4>Resume Preview</h4>
                    <div className="resume-text">
                      {resumeData.substring(0, 200)}...
                    </div>
                  </div>
                  
                  <div className="resume-actions">
                    <input
                      type="file"
                      accept=".pdf,.yaml,.yml,.json,.txt"
                      onChange={handleResumeUpload}
                      disabled={isUploadingResume}
                      className="file-input"
                      id="resume-replace"
                    />
                    <label htmlFor="resume-replace" className="utility-button">
                      <FileText size={16} />
                      Replace Resume
                    </label>
                  </div>
                </div>
              )}
            </div>
            
            <div className="action-buttons">
              <button 
                onClick={handleStartApply} 
                className="primary-button" 
                disabled={isApplying || !isResumeLoaded || !librariesLoaded}
              >
                <Play size={16} />
                Start Auto Apply
              </button>
              <button onClick={handleStopApply} className="secondary-button" disabled={!isApplying}>
                <Square size={16} />
                Stop
              </button>
            </div>
            
            <button onClick={handleLogout} className="utility-button">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderAiSettingsTab = () => (
    <div className="tab-content">
      <div className="ai-settings-section">
        <h2>AI Configuration</h2>
        
        <div className="form-group">
          <label htmlFor="ai-provider">AI Provider</label>
          <select 
            id="ai-provider"
            value={aiProvider} 
            onChange={(e) => handleAiProviderChange(e.target.value)}
          >
            <option value="ollama">Ollama (Local)</option>
            <option value="openai">OpenAI</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="gemini">Gemini (Google)</option>
          </select>
        </div>

        {aiProvider !== 'ollama' && (
          <div className="form-group">
            <label htmlFor="api-key">API Key</label>
            <div className="api-key-container">
              <input
                id="api-key"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${aiProvider} API key`}
              />
              <button onClick={handleApiKeySubmit} className="utility-button">
                <Key size={16} />
                Save
              </button>
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="ai-model">AI Model</label>
          <select 
            id="ai-model"
            value={aiModel} 
            onChange={(e) => handleModelChange(e.target.value)}
            disabled={availableModels.length === 0}
          >
            <option value="">
              {isLoadingModels ? 'Loading models...' : 'Select a model'}
            </option>
            {availableModels.map(model => (
              <option key={model} value={model}>{model}</option>
            ))}
          </select>
        </div>

        {aiProvider === 'ollama' && (
          <button onClick={loadOllamaModels} className="utility-button" disabled={isLoadingModels}>
            <Server size={16} />
            {isLoadingModels ? 'Loading...' : 'Refresh Models'}
          </button>
        )}

        <div className="ai-status">
          <div className="status-item">
            <span>Provider: </span>
            <strong>{aiProvider}</strong>
          </div>
          <div className="status-item">
            <span>Model: </span>
            <strong>{aiModel || 'Not selected'}</strong>
          </div>
          {aiProvider !== 'ollama' && (
            <div className="status-item">
              <span>API Key: </span>
              <strong>{apiKey ? '••••••••' : 'Not set'}</strong>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderApplicationHistoryTab = () => (
    <div className="tab-content">
      <div className="application-history-section">
        <h2>Application History</h2>
        
        <div className="history-filters">
          <select 
            value={selectedCompany} 
            onChange={(e) => {
              setSelectedCompany(e.target.value);
              setSelectedJob('');
              setSelectedApplication(null);
            }}
          >
            <option value="">All Companies</option>
            {getUniqueCompanies().map(company => (
              <option key={company} value={company}>{company}</option>
            ))}
          </select>
          
          {selectedCompany && (
            <select 
              value={selectedJob} 
              onChange={(e) => {
                setSelectedJob(e.target.value);
                setSelectedApplication(null);
              }}
            >
              <option value="">All Jobs</option>
              {getJobsForCompany(selectedCompany).map(job => (
                <option key={job} value={job}>{job}</option>
              ))}
            </select>
          )}
        </div>

        <div className="application-list">
          {applicationHistory.length === 0 ? (
            <div className="empty-state">
              <History size={48} />
              <p>No applications yet</p>
              <p>Start applying to jobs to see your history here</p>
            </div>
          ) : (
            <div className="applications-grid">
              {getApplicationsForJob(selectedCompany, selectedJob).map(application => (
                <div 
                  key={application.id}
                  className={`application-item ${selectedApplication?.id === application.id ? 'selected' : ''}`}
                  onClick={() => handleApplicationSelect(application.id)}
                >
                  <div className="application-header">
                    <h4>{application.jobTitle}</h4>
                    <span className="company">{application.company}</span>
                  </div>
                  <div className="application-meta">
                    <span className="date">{new Date(application.appliedAt).toLocaleDateString()}</span>
                    <span className={`status ${application.status}`}>{application.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedApplication && (
          <div className="application-details">
            <h3>Application Details</h3>
            <div className="details-content">
              <div className="detail-item">
                <strong>Job Title:</strong> {selectedApplication.jobTitle}
              </div>
              <div className="detail-item">
                <strong>Company:</strong> {selectedApplication.company}
              </div>
              <div className="detail-item">
                <strong>Applied:</strong> {new Date(selectedApplication.appliedAt).toLocaleString()}
              </div>
              <div className="detail-item">
                <strong>Status:</strong> {selectedApplication.status}
              </div>
              
              {selectedApplication.questionsAnswers && selectedApplication.questionsAnswers.length > 0 && (
                <div className="questions-section">
                  <h4>Questions & Answers</h4>
                  {selectedApplication.questionsAnswers.map((qa, index) => (
                    <div key={index} className="qa-item">
                      <div className="question">
                        <strong>Q:</strong> {qa.question}
                      </div>
                      <div className="answer">
                        <strong>A:</strong> {qa.answer}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="app">
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          <User size={16} />
          Login
        </button>
        <button 
          className={`tab-button ${activeTab === 'ai-settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-settings')}
        >
          <Settings size={16} />
          AI Settings
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          Applications
        </button>
      </div>

      {activeTab === 'login' && renderLoginTab()}
      {activeTab === 'ai-settings' && renderAiSettingsTab()}
      {activeTab === 'history' && renderApplicationHistoryTab()}

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default App; 