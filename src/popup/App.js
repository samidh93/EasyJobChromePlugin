import React, { useState, useEffect } from 'react';
import { User, Settings, History, Eye, EyeOff, Play, Square, Key, Server, Brain, Upload, FileText, CheckCircle, Clock, RefreshCw, Download, Filter } from 'lucide-react';
import { jsPDF } from 'jspdf';
import './App.css';
import ResumeManagerComponent from './managers/ResumeManagerComponent.js';
import AiManagerComponent from './managers/AiManagerComponent.js';
import FiltersComponent from './managers/FiltersComponent.js';
import { authManager, applicationsManager, aiManager, resumeManager, filtersManager } from './managers/index.js';
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
  const [isRefreshingHistory, setIsRefreshingHistory] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [dailyLimitInfo, setDailyLimitInfo] = useState(null);
  
  // Platform detection state
  const [platformInfo, setPlatformInfo] = useState(null);
  const [isLoadingPlatform, setIsLoadingPlatform] = useState(false);

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
    
    // Load essential data first, then check if auto-apply is running before loading other data
    const initializePopup = async () => {
      // Load critical user data first
      await loadUserData();
      await loadCurrentUser();
      
      // Check auto-apply state before loading heavy data
      const autoApplyResponse = await checkAutoApplyState();
      
      // If auto-apply is running, defer heavy data loading to avoid interference
      if (autoApplyResponse && autoApplyResponse.isRunning) {
        console.log('Auto-apply is running, deferring heavy data loading');
        // Load data with delay to avoid interference
        setTimeout(() => {
          loadApplicationHistory();
          loadResumeData();
          loadDailyLimitInfo();
        }, 1000);
      } else {
        // Auto-apply not running, safe to load all data immediately
        loadApplicationHistory();
        loadResumeData();
        loadDailyLimitInfo();
      }
    };
    
    initializePopup();
    
    // Start periodic state sync with more frequent checks
    const stateCheckInterval = setInterval(async () => {
      await checkAutoApplyState();
      // Also check for daily limit updates during auto-apply
      await loadDailyLimitInfo();
      // Check platform info periodically in case user navigates
      await loadPlatformInfo();
    }, 3000); // Check every 3 seconds for more responsive UI
    
    // Add real-time storage listener for daily limit changes
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && 
          (changes.dailyLimitReached || changes.dailyLimitMessage || changes.dailyLimitTime)) {
        console.log('Daily limit storage changed, refreshing UI');
        loadDailyLimitInfo();
        
        // If daily limit was reached, auto-apply should have stopped - update UI state
        if (changes.dailyLimitReached && changes.dailyLimitReached.newValue === true) {
          console.log('Daily limit reached, updating isApplying state to false');
          setIsApplying(false);
          // Also do an immediate state check to confirm
          setTimeout(() => checkAutoApplyState(), 100);
        }
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
    return () => {
      clearInterval(stateCheckInterval);
      chrome.storage.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Load resume data, AI settings, and application history when currentUser changes
  useEffect(() => {
    if (currentUser) {
      console.log('App: Current user changed, checking if safe to load data');
      
      // Check if auto-apply is running before loading data to avoid interference
      const loadUserSpecificData = async () => {
        try {
          const autoApplyResponse = await chrome.runtime.sendMessage({
            action: 'getAutoApplyState'
          });
          
          if (autoApplyResponse && autoApplyResponse.isRunning) {
            console.log('Auto-apply is running, deferring user-specific data loading');
            // Defer loading to avoid interference with auto-apply
            setTimeout(() => {
              loadResumeData();
              loadAiSettingsStatus();
              loadApplicationHistory();
              loadDailyLimitInfo();
            }, 2000);
          } else {
                      // Safe to load immediately
          loadResumeData();
          loadAiSettingsStatus();
          loadApplicationHistory();
          loadDailyLimitInfo();
          loadPlatformInfo();
          }
        } catch (error) {
          console.error('Error checking auto-apply state, loading data anyway:', error);
          // If we can't check state, load with a small delay to be safe
          setTimeout(() => {
            loadResumeData();
            loadAiSettingsStatus();
            loadApplicationHistory();
            loadDailyLimitInfo();
            loadPlatformInfo();
          }, 500);
        }
      };
      
      loadUserSpecificData();
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

  // Redirect from resumes tab if AI settings are not available
  useEffect(() => {
    if (activeTab === 'resumes' && !hasAiSettings && currentUser) {
      console.log('Redirecting from resumes tab - AI settings not configured');
      setActiveTab('ai-settings');
      setStatusMessage('Please configure AI settings first to access resumes');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  }, [activeTab, hasAiSettings, currentUser]);

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
          console.log('Auto apply state sync - updating UI:', { 
            currentUI: isApplying, 
            actualState: response.isRunning 
          });
          setIsApplying(response.isRunning);
          
          // If auto-apply just stopped, refresh daily limit info in case it was due to daily limit
          if (!response.isRunning && isApplying) {
            console.log('Auto-apply stopped, checking for daily limit updates');
            setTimeout(() => loadDailyLimitInfo(), 500); // Small delay to let storage settle
          }
        } else {
          console.log('Auto apply state already in sync:', { 
            currentUI: isApplying, 
            actualState: response.isRunning 
          });
        }
      }
      
      return response; // Return response for use in initialization
    } catch (error) {
      // Silently ignore errors in state checking to avoid spam
      console.debug('Error checking auto apply state:', error);
      return null;
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

  const loadDailyLimitInfo = async () => {
    try {
      const result = await chrome.storage.local.get(['dailyLimitReached', 'dailyLimitMessage', 'dailyLimitTime']);
      console.log('App: Loading daily limit info:', result);
      
      if (result.dailyLimitReached) {
        const limitTime = new Date(result.dailyLimitTime);
        const now = new Date();
        
        // Check if the limit was set today (reset daily limits at midnight)
        const isToday = limitTime.toDateString() === now.toDateString();
        
        if (isToday) {
          console.log('App: Setting daily limit info in UI');
          setDailyLimitInfo({
            reached: true,
            message: result.dailyLimitMessage,
            time: limitTime
          });
        } else {
          // Limit was from a previous day, clear it
          console.log('App: Clearing old daily limit info');
          await chrome.storage.local.remove(['dailyLimitReached', 'dailyLimitMessage', 'dailyLimitTime']);
          setDailyLimitInfo(null);
        }
      } else {
        console.log('App: No daily limit info found, clearing UI');
        setDailyLimitInfo(null);
      }
    } catch (error) {
      console.error('App: Error loading daily limit info:', error);
      setDailyLimitInfo(null);
    }
  };

  const loadPlatformInfo = async () => {
    try {
      setIsLoadingPlatform(true);
      console.log('App: Loading platform info...');
      
      const response = await chrome.runtime.sendMessage({
        action: 'getPlatformInfo'
      });
      
      if (response && response.success) {
        console.log('App: Platform info loaded:', response.platformInfo);
        setPlatformInfo(response.platformInfo);
      } else {
        console.error('App: Failed to load platform info:', response?.error);
        setPlatformInfo(null);
      }
    } catch (error) {
      console.error('App: Error loading platform info:', error);
      setPlatformInfo(null);
    } finally {
      setIsLoadingPlatform(false);
    }
  };

  const handleRefreshApplicationHistory = async () => {
    if (!currentUser || isRefreshingHistory) {
      return;
    }

    setIsRefreshingHistory(true);
    console.log('App: Refreshing application history...');
    
    try {
      await loadApplicationHistory();
      // Reset selections to show refreshed data
      setSelectedCompany('');
      setSelectedJob('');
      setSelectedApplication(null);
      console.log('App: Application history refreshed successfully');
    } catch (error) {
      console.error('App: Error refreshing application history:', error);
    } finally {
      setIsRefreshingHistory(false);
    }
  };

  const handleDownloadApplicationHistoryPdf = async () => {
    if (!currentUser || isDownloadingPdf || applicationHistory.length === 0) {
      return;
    }

    setIsDownloadingPdf(true);
    
    try {
      
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const margin = 20;
      
      // Helper function to extract name from username
      const extractNameFromUsername = (username) => {
        if (!username) return 'Unknown User';
        
        // Split by dots and filter out common suffixes
        const parts = username.split('.')
          .filter(part => part && part.toLowerCase() !== 'x')
          .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
        
        return parts.length > 0 ? parts.join(' ') : username;
      };
      
      // Title
      doc.setFontSize(18);
      doc.setFont(undefined, 'bold');
      doc.text('Application History Report', margin, yPosition);
      yPosition += 15;
      
      // User info
      doc.setFontSize(12);
      doc.setFont(undefined, 'normal');
      const displayName = extractNameFromUsername(currentUser.username) || currentUser.email;
      doc.text(`Generated for: ${displayName}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Generated on: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, margin, yPosition);
      yPosition += 8;
      doc.text(`Total Applications: ${applicationHistory.length}`, margin, yPosition);
      yPosition += 15;
      
      // Applications
      for (let i = 0; i < applicationHistory.length; i++) {
        const app = applicationHistory[i];
        
        // Check if we need a new page
        if (yPosition > pageHeight - 60) {
          doc.addPage();
          yPosition = margin;
        }
        
        // Application header
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text(`${i + 1}. ${app.job_title} at ${app.company_name}`, margin, yPosition);
        yPosition += 10;
        
        // Application details
        doc.setFontSize(10);
        doc.setFont(undefined, 'normal');
        doc.text(`Location: ${app.job_location || 'Not specified'}`, margin + 5, yPosition);
        yPosition += 6;
        doc.text(`Applied: ${formatLocalTime(app.created_at)}`, margin + 5, yPosition);
        yPosition += 6;
        doc.text(`Status: ${app.status}`, margin + 5, yPosition);
        yPosition += 6;
        if (app.notes) {
          doc.text(`Notes: ${app.notes}`, margin + 5, yPosition);
          yPosition += 6;
        }
        
        // Questions and Answers
        if (app.questions_answers && app.questions_answers.length > 0) {
          yPosition += 3;
          doc.setFont(undefined, 'bold');
          doc.text(`Questions & Answers (${app.questions_answers.length}):`, margin + 5, yPosition);
          yPosition += 8;
          
          app.questions_answers.forEach((qa, qaIndex) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 40) {
              doc.addPage();
              yPosition = margin;
            }
            
            doc.setFont(undefined, 'normal');
            // Question
            const questionText = `Q${qaIndex + 1}: ${qa.question}`;
            const questionLines = doc.splitTextToSize(questionText, 170);
            doc.text(questionLines, margin + 10, yPosition);
            yPosition += questionLines.length * 5;
            
            // Answer
            const answerText = `A: ${qa.answer}`;
            const answerLines = doc.splitTextToSize(answerText, 170);
            doc.text(answerLines, margin + 10, yPosition);
            yPosition += answerLines.length * 5;
            
            // Question metadata
            if (qa.question_type || qa.ai_model_used) {
              doc.setFontSize(8);
              doc.setTextColor(100, 100, 100);
              const metadata = `Type: ${qa.question_type || 'general'} | AI Model: ${qa.ai_model_used || 'unknown'}`;
              doc.text(metadata, margin + 10, yPosition);
              yPosition += 4;
              doc.setFontSize(10);
              doc.setTextColor(0, 0, 0);
            }
            
            yPosition += 3;
          });
        }
        
        yPosition += 10;
      }
      
      // Summary page
      if (applicationHistory.length > 0) {
        doc.addPage();
        yPosition = margin;
        
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text('Summary Statistics', margin, yPosition);
        yPosition += 15;
        
        // Calculate statistics
        const totalApps = applicationHistory.length;
        const appliedApps = applicationHistory.filter(app => app.status === 'applied').length;
        const companies = [...new Set(applicationHistory.map(app => app.company_name))];
        const totalQuestions = applicationHistory.reduce((sum, app) => 
          sum + (app.questions_answers ? app.questions_answers.length : 0), 0);
        
        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(`Total Applications: ${totalApps}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Successfully Applied: ${appliedApps}`, margin, yPosition);
        yPosition += 8;
        doc.text(`Unique Companies: ${companies.length}`, margin, yPosition);
        yPosition += 15;
        
        // Company breakdown
        if (companies.length > 0) {
          doc.setFont(undefined, 'bold');
          doc.text('Companies Applied To:', margin, yPosition);
          yPosition += 10;
          
          doc.setFont(undefined, 'normal');
          companies.forEach(company => {
            const companyApps = applicationHistory.filter(app => app.company_name === company).length;
            doc.text(`• ${company} (${companyApps} application${companyApps > 1 ? 's' : ''})`, margin + 5, yPosition);
            yPosition += 6;
          });
        }
      }
      
      // Save the PDF
      const fileName = `Applications_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      console.log('App: PDF generated and downloaded successfully');
    } catch (error) {
      console.error('App: Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
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

    if (dailyLimitInfo && dailyLimitInfo.reached) {
      setStatusMessage('Easy Apply limit reached - try again tomorrow');
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
        // Refresh daily limit info after starting auto-apply
        setTimeout(() => loadDailyLimitInfo(), 1000);
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
        // Force an immediate state check to ensure UI is in sync
        setTimeout(() => checkAutoApplyState(), 100);
      } else {
        setStatusMessage('Failed to stop auto apply');
      }
    } catch (error) {
      setStatusMessage('Error stopping auto apply: ' + error.message);
      // Even on error, ensure UI state is updated
      setIsApplying(false);
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
              
              {dailyLimitInfo && dailyLimitInfo.reached && (
                <div className="apply-status">
                  <div className="info-message" style={{ position: 'relative' }}>
                    <span>ℹ️ You have reached your Easy Apply limit on LinkedIn. Try again tomorrow.</span>
                    <button 
                      onClick={async () => {
                        const confirmed = window.confirm(
                          'Are you sure you want to override the daily limit warning?\n\n' +
                          'LinkedIn has blocked Easy Apply for today. Continuing may:\n' +
                          '• Waste time trying to apply to jobs\n' +
                          '• Not result in successful applications\n' +
                          '• Potentially impact your LinkedIn account\n\n' +
                          'Click OK to override (not recommended) or Cancel to keep protection.'
                        );
                        
                        if (confirmed) {
                          await chrome.storage.local.remove(['dailyLimitReached', 'dailyLimitMessage', 'dailyLimitTime']);
                          setDailyLimitInfo(null);
                          console.log('Daily limit override: Cleared storage and UI state');
                        }
                      }}
                      className="icon-button"
                      style={{ 
                        position: 'absolute', 
                        top: '4px', 
                        right: '4px', 
                        padding: '2px',
                        minWidth: 'auto',
                        width: '20px',
                        height: '20px',
                        color: '#dc2626'
                      }}
                      title="Override daily limit warning (not recommended)"
                    >
                      ⚠
                    </button>
                  </div>
                </div>
              )}
              
              <div className="action-buttons">
                <button 
                  onClick={handleStartApply} 
                  className="primary-button" 
                  disabled={isApplying || !isResumeLoaded || !hasAiSettings || !librariesLoaded || isLoadingAiSettings || (dailyLimitInfo && dailyLimitInfo.reached)}
                  title={
                    (dailyLimitInfo && dailyLimitInfo.reached) ? "Easy Apply limit reached - try again tomorrow" :
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
          <div className="history-header">
            <h2>Application History</h2>
            <div className="history-actions">
              <button 
                className={`download-pdf-button ${isDownloadingPdf ? 'downloading' : ''}`}
                onClick={handleDownloadApplicationHistoryPdf}
                disabled={isDownloadingPdf || !currentUser || applicationHistory.length === 0}
                title="Download application history as PDF"
              >
                <Download size={16} className={isDownloadingPdf ? 'spinning' : ''} />
                {isDownloadingPdf ? 'Generating...' : 'Download PDF'}
              </button>
              <button 
                className={`refresh-button ${isRefreshingHistory ? 'refreshing' : ''}`}
                onClick={handleRefreshApplicationHistory}
                disabled={isRefreshingHistory || !currentUser}
                title="Refresh application history"
              >
                <RefreshCw size={16} className={isRefreshingHistory ? 'spinning' : ''} />
                {isRefreshingHistory ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
          
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

  const renderFiltersTab = () => (
    <FiltersComponent 
      currentUser={currentUser} 
      onFiltersUpdate={() => {
        // Handle filters update if needed
        console.log('Filters updated');
      }}
    />
  );

  return (
    <div className="app">
      {/* Platform Indicator */}
      {platformInfo && (
        <div className={`platform-indicator ${platformInfo.isSupported ? 'supported' : 'unsupported'}`}>
          <div className="platform-info">
            <div className="platform-name">
              {isLoadingPlatform ? (
                <RefreshCw size={14} className="loading-icon" />
              ) : (
                <div className={`platform-dot ${platformInfo.platform}`}></div>
              )}
              <span>{platformInfo.displayName}</span>
            </div>
            <div className="platform-status">
              {platformInfo.isJobSearchPage ? (
                <span className="status-ready">✓ Job search page</span>
              ) : (
                <span className="status-warning">! Navigate to job search</span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'login' ? 'active' : ''}`}
          onClick={() => setActiveTab('login')}
        >
          <User size={16} />
          Login
        </button>
        <button 
          className={`tab-button ${activeTab === 'resumes' ? 'active' : ''} ${!hasAiSettings ? 'disabled' : ''}`}
          onClick={() => {
            if (hasAiSettings) {
              setActiveTab('resumes');
            } else {
              setActiveTab('ai-settings');
              setStatusMessage('Please configure AI settings first to access resumes');
              setTimeout(() => setStatusMessage(''), 3000);
            }
          }}
          title={!hasAiSettings ? 'Configure AI settings first to access resumes' : 'Manage your resumes'}
          disabled={!hasAiSettings}
        >
          <FileText size={16} />
          Resumes
          {!hasAiSettings && <span className="lock-indicator">🔒</span>}
        </button>
        <button 
          className={`tab-button ${activeTab === 'ai-settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('ai-settings')}
        >
          <Settings size={16} />
          AI Settings
        </button>
        <button 
          className={`tab-button ${activeTab === 'filters' ? 'active' : ''}`}
          onClick={() => setActiveTab('filters')}
        >
          <Filter size={16} />
          Filters
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
      {activeTab === 'resumes' && hasAiSettings && renderResumeTab()}
      {activeTab === 'resumes' && !hasAiSettings && (
        <div className="tab-content-placeholder">
          <div className="placeholder-message">
            <Settings size={48} className="placeholder-icon" />
            <h3>AI Settings Required</h3>
            <p>Please configure your AI settings first to access the resumes tab.</p>
            <button 
              className="primary-button"
              onClick={() => setActiveTab('ai-settings')}
            >
              Go to AI Settings
            </button>
          </div>
        </div>
      )}
      {activeTab === 'ai-settings' && renderAiSettingsTab()}
      {activeTab === 'filters' && renderFiltersTab()}
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