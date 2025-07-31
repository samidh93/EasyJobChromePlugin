import React, { useState, useEffect } from 'react';
import { User, Settings, History, Eye, EyeOff, Play, Square, Key, Server, Brain, Upload, FileText, CheckCircle, Clock } from 'lucide-react';
import './App.css';
import ResumeManagerComponent from './managers/ResumeManagerComponent.js';
import AiManagerComponent from './managers/AiManagerComponent.js';
import { authManager, applicationsManager, aiManager, resumeManager } from './managers/index.js';
import { formatLocalTime, formatBerlinTime, getUserTimezone } from './utils/timezone.js';

const App = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [currentUser, setCurrentUser] = useState(null);
  
  // Resume upload state
  const [resumeData, setResumeData] = useState(null);
  const [isResumeLoaded, setIsResumeLoaded] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [librariesLoaded, setLibrariesLoaded] = useState(false);
  
  // AI Settings state
  const [hasAiSettings, setHasAiSettings] = useState(false);
  const [isLoadingAiSettings, setIsLoadingAiSettings] = useState(false);
  
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
    loadCurrentUser(); // Load current user from database
    loadApplicationHistory();
    loadResumeData();
    
    // Start periodic state sync
    const stateCheckInterval = setInterval(checkAutoApplyState, 2000);
    
    return () => {
      clearInterval(stateCheckInterval);
    };
  }, []);

  // Load resume data, AI settings, and application history when currentUser changes
  useEffect(() => {
    if (currentUser) {
      console.log('App: Current user changed, loading resume data, AI settings, and application history');
      loadResumeData();
      loadAiSettingsStatus();
      loadApplicationHistory();
    } else {
      // Reset states when user logs out
      setIsResumeLoaded(false);
      setHasAiSettings(false);
      setApplicationHistory([]);
    }
  }, [currentUser]);

  // Listen to auth manager state changes
  useEffect(() => {
    const unsubscribe = authManager.addListener((authState) => {
      setCurrentUser(authState.currentUser);
      setIsLoggedIn(authState.isLoggedIn);
    });

    return unsubscribe;
  }, []);

  // Listen to applications manager state changes
  useEffect(() => {
    const unsubscribe = applicationsManager.addListener((appsState) => {
      setApplicationHistory(appsState.applications);
      setSelectedApplication(appsState.selectedApplication);
    });

    return unsubscribe;
  }, []);

  // Listen to AI manager state changes
  useEffect(() => {
    const unsubscribe = aiManager.addListener((aiState) => {
      setHasAiSettings(aiState.aiSettings.length > 0);
    });

    return unsubscribe;
  }, []);

  // Listen to resume manager state changes
  useEffect(() => {
    const unsubscribe = resumeManager.addListener((resumeState) => {
      setIsResumeLoaded(resumeState.resumes.length > 0);
    });

    return unsubscribe;
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
      const result = await authManager.loadUserData();
      if (result.success && result.isLoggedIn) {
        setIsLoggedIn(true);
        setLoginData(result.loginData || { username: '', password: '' });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const result = await authManager.loadCurrentUser();
      if (result.success) {
        setCurrentUser(result.user);
        setIsLoggedIn(result.isLoggedIn);
        if (result.user) {
          console.log('App: Current user loaded:', result.user.username, result.user.id);
        } else {
          console.log('App: No current user found');
        }
      }
    } catch (error) {
      console.error('App: Error loading current user:', error);
      setCurrentUser(null);
      setIsLoggedIn(false);
    }
  };

  const loadResumeData = async () => {
    try {
      // Check if we have a current user and can load resumes from database
      if (currentUser) {
        const result = await resumeManager.loadResumes(currentUser.id);
        if (result.success) {
          setIsResumeLoaded(result.resumes.length > 0);
          console.log('App: Resume status updated - resumes count:', result.resumes.length);
        } else {
          setIsResumeLoaded(false);
          console.log('App: No resumes found in database');
        }
      } else {
        // Fallback to check local storage for backward compatibility
        const result = await chrome.storage.local.get(['userResumeData', 'userResumeText', 'userResumeType']);
        if (result && (result.userResumeData || result.userResumeText)) {
          // Use formatted text for display
          setResumeData(result.userResumeText);
          setIsResumeLoaded(true);
          console.log('App: Resume loaded from local storage');
        } else {
          setIsResumeLoaded(false);
          console.log('App: No resume data found');
        }
      }
    } catch (error) {
      console.error('Error loading resume data:', error);
      setIsResumeLoaded(false);
    }
  };

  const loadApplicationHistory = async () => {
    if (!currentUser) {
      console.log('App: No current user, skipping application history load');
      setApplicationHistory([]);
      return;
    }

    try {
      console.log('App: Loading application history for user:', currentUser.id);
      
      const result = await applicationsManager.loadApplications(currentUser.id);
      
      if (result.success) {
        console.log('App: Successfully loaded applications:', result.applications);
        setApplicationHistory(result.applications);
      } else {
        console.error('App: Failed to load applications:', result.error);
        setApplicationHistory([]);
      }
    } catch (error) {
      console.error('App: Error loading application history:', error);
      setApplicationHistory([]);
    }
  };

  const loadAiSettingsStatus = async () => {
    if (!currentUser) {
      setHasAiSettings(false);
      return;
    }
    
    setIsLoadingAiSettings(true);
    try {
      const result = await aiManager.loadAiSettings(currentUser.id);
      if (result.success) {
        setHasAiSettings(result.aiSettings.length > 0);
        console.log('App: AI settings status updated - settings count:', result.aiSettings.length);
      } else {
        setHasAiSettings(false);
        console.log('App: No AI settings found in database');
      }
    } catch (error) {
      console.error('Error loading AI settings status:', error);
      setHasAiSettings(false);
    } finally {
      setIsLoadingAiSettings(false);
    }
  };

  const handleStartApply = async () => {
    if (!isResumeLoaded) {
      setStatusMessage('Please upload a resume first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    if (!hasAiSettings) {
      setStatusMessage('Please configure AI settings first. AI is required for auto-apply and resume parsing.');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsApplying(true);
    setStatusMessage('Starting auto apply...');
    
    try {
      // Get current AI settings from database
      let aiSettings = null;
      if (currentUser) {
        const response = await chrome.runtime.sendMessage({
          action: 'apiRequest',
          method: 'GET',
          url: `/users/${currentUser.id}/ai-settings/default`
        });

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
              console.error('Error decrypting API key for auto apply:', decryptError);
            }
          }

          aiSettings = {
            provider: response.ai_settings.ai_provider,
            model: response.ai_settings.ai_model,
            apiKey: decryptedApiKey
          };
          
          console.log('App: AI settings from database:', {
            provider: response.ai_settings.ai_provider,
            model: response.ai_settings.ai_model,
            hasApiKey: !!decryptedApiKey
          });
        }
      }

      // Fallback to local storage if no database settings
      if (!aiSettings) {
        const result = await chrome.storage.local.get(['aiProvider', 'aiModel', 'apiKey']);
        if (result.aiProvider && result.aiModel) {
          // Only use local storage if user has explicitly configured AI
          aiSettings = {
            provider: result.aiProvider,
            model: result.aiModel,
            apiKey: result.apiKey || null
          };
        }
        // If no AI configured anywhere, aiSettings remains null - user must configure AI first
      }

      // Use current user data instead of form login data
      const userData = currentUser ? {
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email
      } : null;

      const response = await chrome.runtime.sendMessage({
        action: 'startAutoApply',
        loginData: userData,
        aiSettings: aiSettings
      });

      if (response.success) {
        setStatusMessage('Auto apply started successfully!');
      } else {
        setIsApplying(false);
        setStatusMessage(response.error || 'Failed to start auto apply');
      }
    } catch (error) {
      setIsApplying(false);
      setStatusMessage('Error starting auto apply: ' + error.message);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleStopApply = async () => {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'stopAutoApply'
      });

      if (response.success) {
        setIsApplying(false);
        setStatusMessage('Auto apply stopped');
      } else {
        setStatusMessage('Failed to stop auto apply');
      }
    } catch (error) {
      setStatusMessage('Error stopping auto apply: ' + error.message);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleLogout = async () => {
    try {
      const result = await authManager.logout();
      
      if (result.success) {
        setIsLoggedIn(false);
        setCurrentUser(null);
        setLoginData({ username: '', password: '' });
        setStatusMessage('Logged out successfully');
        setTimeout(() => setStatusMessage(''), 3000);
      } else {
        console.error('Logout failed:', result.error);
      }
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleDatabaseLogin = async () => {
    if (!loginData.username || !loginData.password) {
      setStatusMessage('Please enter email and password');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    try {
      setStatusMessage('Logging in...');
      
      const result = await authManager.login(loginData.username, loginData.password);

      if (result.success) {
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        setStatusMessage('Login successful!');
        
        // Also store in local storage for backward compatibility
        await chrome.storage.local.set({
          isLoggedIn: true,
          loginData: { username: result.user.email, password: '' } // Don't store password
        });
        
        console.log('Database login successful:', result.user.username);
        
        // Load user data after successful login
        await loadResumeData();
        await loadAiSettingsStatus();
        await loadApplicationHistory();
      } else {
        setStatusMessage(result.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      setStatusMessage('Login failed: ' + error.message);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleDatabaseRegister = async () => {
    if (!loginData.username || !loginData.password) {
      setStatusMessage('Please enter email and password');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    // Extract username from email for registration
    const email = loginData.username;
    const username = email.split('@')[0] || email;

    try {
      setStatusMessage('Registering...');
      
      const result = await authManager.register({
        username: username,
        email: email,
        password: loginData.password
      });

      if (result.success) {
        setCurrentUser(result.user);
        setIsLoggedIn(true);
        setStatusMessage('Registration successful!');
        
        // Also store in local storage for backward compatibility
        await chrome.storage.local.set({
          isLoggedIn: true,
          loginData: { username: result.user.email, password: '' } // Don't store password
        });
        
        console.log('Database registration successful:', result.user.username);
        
        // Load user data after successful registration
        await loadResumeData();
        await loadAiSettingsStatus();
        await loadApplicationHistory();
      } else {
        setStatusMessage(result.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setStatusMessage('Registration failed: ' + error.message);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleResumeUpdate = () => {
    // Refresh resume data when resumes are updated
    console.log('App: Resume update triggered, refreshing resume status');
    loadResumeData();
    
    // Also refresh user data if needed
    if (currentUser) {
      loadCurrentUser();
    }
  };

  const handleAiSettingsUpdate = () => {
    // Callback for when AI settings are updated
    console.log('App: AI settings updated');
    // Reload AI settings status after update
    loadAiSettingsStatus();
  };

  const getUniqueCompanies = () => {
    return applicationsManager.getUniqueCompanies();
  };

  const getJobsForCompany = (company) => {
    return applicationsManager.getJobsForCompany(company);
  };

  const getApplicationsForJob = (company, jobTitle) => {
    return applicationsManager.getApplicationsForJob(company, jobTitle);
  };

  const handleApplicationSelect = async (applicationId) => {
    const result = await applicationsManager.selectApplication(applicationId);
    
    if (result.success) {
      setSelectedApplication(result.application);
    } else {
      console.error('App: Failed to select application:', result.error);
    }
  };

  const renderLoginTab = () => (
    <div className="tab-content">
      <div className="login-section">
        <h2>User Authentication</h2>
        
        {!isLoggedIn ? (
          <div className="login-form">
            <div className="auth-mode-selector">
              <button 
                className={`mode-btn ${authMode === 'login' ? 'active' : ''}`}
                onClick={() => setAuthMode('login')}
              >
                Login
              </button>
              <button 
                className={`mode-btn ${authMode === 'register' ? 'active' : ''}`}
                onClick={() => setAuthMode('register')}
              >
                Register
              </button>
            </div>

            <div className="form-group">
              <label htmlFor="username">Email</label>
              <input
                id="username"
                type="email"
                value={loginData.username}
                onChange={(e) => setLoginData({...loginData, username: e.target.value})}
                placeholder="Enter your email address"
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
            
            <button 
              onClick={authMode === 'login' ? handleDatabaseLogin : handleDatabaseRegister}
              className="primary-button"
            >
              {authMode === 'login' ? 'Login' : 'Register'}
            </button>
          </div>
        ) : (
          <div className="user-info">
            <div className="user-status">
              <User size={24} />
              <span>Welcome, {currentUser?.username || loginData.username}!</span>
            </div>
            
            <div className="auto-apply-section">
              <h3>Auto Apply</h3>
              <p>Start applying to jobs automatically using your uploaded resume and AI settings.</p>
              
              <div className="apply-status">
                {isLoadingAiSettings ? (
                  <div className="loading-message">
                    <span>⏳ Loading AI settings...</span>
                  </div>
                ) : !isResumeLoaded ? (
                  <div className="warning-message">
                    <span>⚠️ Please upload a resume in the "Resumes" tab to start applying</span>
                  </div>
                ) : !hasAiSettings ? (
                  <div className="warning-message">
                    <span>⚠️ AI configuration required. Please set up AI in the "AI Settings" tab to enable auto-apply and resume parsing.</span>
                  </div>
                ) : (
                  <div className="success-message">
                    <span>✅ Resume and AI settings configured - ready for auto-apply</span>
                  </div>
                )}
              </div>
              
              <div className="action-buttons">
                <button 
                  onClick={handleStartApply} 
                  className="primary-button" 
                  disabled={isApplying || !isResumeLoaded || !hasAiSettings || !librariesLoaded || isLoadingAiSettings}
                  title={
                    !isResumeLoaded ? "Please upload a resume first" : 
                    !hasAiSettings ? "Please configure AI settings first" : 
                    "Start automatic job applications"
                  }
                >
                  <Play size={16} />
                  Start Auto Apply
                </button>
                <button 
                  onClick={handleStopApply} 
                  className="secondary-button" 
                  disabled={!isApplying}
                  title="Stop automatic job applications"
                >
                  <Square size={16} />
                  Stop
                </button>
              </div>
            </div>
            
            <button onClick={handleLogout} className="utility-button">
              Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const renderApplicationHistoryTab = () => {
    if (!currentUser) {
      return (
        <div className="tab-content">
          <div className="no-user">
            <History size={48} />
            <p>Please log in to view your application history</p>
            <p>Application history is saved per user account</p>
          </div>
        </div>
      );
    }

    return (
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

          <div className="applications-list">
            {applicationHistory.length === 0 ? (
              <div className="empty-state">
                <History size={48} />
                <p>No applications found</p>
                <p>Your application history will appear here after you start applying to jobs</p>
              </div>
            ) : (
              getApplicationsForJob(selectedCompany, selectedJob).map(app => (
                <div key={app.id} className="application-item" onClick={() => handleApplicationSelect(app.id)}>
                  <div className="application-header">
                    <h4>{app.jobTitle}</h4>
                    <span className={`status ${app.status}`}>{app.status}</span>
                  </div>
                  <div className="application-details">
                    <p><strong>Company:</strong> {app.company}</p>
                    <p><strong>Applied:</strong> {formatLocalTime(app.appliedAt, 'date')}</p>
                  </div>
                </div>
              ))
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
                  <strong>Applied:</strong> {formatLocalTime(selectedApplication.appliedAt, 'datetime')}
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
  };

  const renderResumeTab = () => (
    <ResumeManagerComponent 
      currentUser={currentUser} 
      onResumeUpdate={handleResumeUpdate}
    />
  );

  const renderAiSettingsTab = () => (
    <AiManagerComponent 
      currentUser={currentUser} 
      onAiSettingsUpdate={handleAiSettingsUpdate}
    />
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
          className={`tab-button ${activeTab === 'resumes' ? 'active' : ''}`}
          onClick={() => setActiveTab('resumes')}
        >
          <FileText size={16} />
          Resumes
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
      {activeTab === 'resumes' && renderResumeTab()}
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