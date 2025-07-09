import React, { useState, useEffect } from 'react';
import { Upload, Download, Play, Square, TestTube, MessageCircle, User, Settings } from 'lucide-react';
import './App.css';

const App = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null);
  const [yamlContent, setYamlContent] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedJob, setSelectedJob] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [currentConversation, setCurrentConversation] = useState(null);

  // Load data on component mount
  useEffect(() => {
    loadProfileData();
    loadConversations();
  }, []);

  const loadProfileData = async () => {
    try {
      const result = await chrome.storage.local.get(['profileData', 'yamlContent']);
      if (result.profileData) {
        setProfileData(result.profileData);
      }
      if (result.yamlContent) {
        setYamlContent(result.yamlContent);
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const result = await chrome.storage.local.get(['conversations']);
      if (result.conversations) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const content = e.target.result;
        setYamlContent(content);
        
        try {
          // Parse YAML content (you might want to add js-yaml library)
          const parsedData = parseYAML(content);
          setProfileData(parsedData);
          
          // Save to storage
          await chrome.storage.local.set({
            profileData: parsedData,
            yamlContent: content
          });
          
          setStatusMessage('Profile loaded successfully!');
          setTimeout(() => setStatusMessage(''), 3000);
        } catch (error) {
          setStatusMessage('Error parsing YAML file');
          setTimeout(() => setStatusMessage(''), 3000);
        }
      };
      reader.readAsText(file);
    }
  };

  const parseYAML = (content) => {
    // Simple YAML parser - you might want to use js-yaml library
    const lines = content.split('\n');
    const data = {};
    
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split(':');
        if (key && valueParts.length > 0) {
          data[key.trim()] = valueParts.join(':').trim();
        }
      }
    });
    
    return data;
  };

  const downloadExampleProfile = () => {
    const exampleContent = `# Example Profile
name: John Doe
email: john.doe@example.com
phone: +1-555-0123
location: San Francisco, CA
summary: Experienced software developer with 5+ years in full-stack development
skills: JavaScript, React, Node.js, Python, AWS
experience: |
  Software Engineer at TechCorp (2019-2024)
  - Developed web applications using React and Node.js
  - Collaborated with cross-functional teams
  - Implemented CI/CD pipelines
education: Bachelor's in Computer Science, University of California`;

    const blob = new Blob([exampleContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'example_profile.yaml';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleStartApply = async () => {
    if (!profileData) {
      setStatusMessage('Please load a profile first');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    setIsApplying(true);
    setStatusMessage('Starting auto apply...');
    
    try {
      // Send message to background script
      await chrome.runtime.sendMessage({
        action: 'startAutoApply',
        profileData: profileData
      });
      
      setStatusMessage('Auto apply started successfully!');
    } catch (error) {
      setStatusMessage('Error starting auto apply');
      console.error('Error:', error);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const handleStopApply = async () => {
    setIsApplying(false);
    setStatusMessage('Stopping auto apply...');
    
    try {
      await chrome.runtime.sendMessage({
        action: 'stopAutoApply'
      });
      
      setStatusMessage('Auto apply stopped');
    } catch (error) {
      setStatusMessage('Error stopping auto apply');
      console.error('Error:', error);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const testOllamaConnection = async () => {
    setStatusMessage('Testing Ollama connection...');
    
    try {
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama2',
          prompt: 'Test connection',
          stream: false
        })
      });
      
      if (response.ok) {
        setStatusMessage('Ollama connection successful!');
      } else {
        setStatusMessage('Ollama connection failed');
      }
    } catch (error) {
      setStatusMessage('Error connecting to Ollama');
      console.error('Error:', error);
    }
    
    setTimeout(() => setStatusMessage(''), 3000);
  };

  const getUniqueCompanies = () => {
    return [...new Set(conversations.map(conv => conv.company))].filter(Boolean);
  };

  const getJobsForCompany = (company) => {
    return [...new Set(conversations.filter(conv => conv.company === company).map(conv => conv.jobTitle))].filter(Boolean);
  };

  const getQuestionsForJob = (company, jobTitle) => {
    return conversations.filter(conv => conv.company === company && conv.jobTitle === jobTitle);
  };

  const handleConversationSelect = (questionId) => {
    const conversation = conversations.find(conv => conv.id === questionId);
    setCurrentConversation(conversation);
  };

  return (
    <div className="app">
      <div className="tabs">
        <button 
          className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <User size={16} />
          Profile
        </button>
        <button 
          className={`tab-button ${activeTab === 'conversations' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversations')}
        >
          <MessageCircle size={16} />
          AI Conversations
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="tab-content">
          <div className="file-input-section">
            <div className="file-input-row">
              <input 
                type="file" 
                accept=".yaml,.yml" 
                onChange={handleFileUpload}
                className="file-input"
              />
              <button onClick={() => document.querySelector('.file-input').click()} className="secondary-button">
                <Upload size={16} />
                Load Profile
              </button>
            </div>
            <div className="file-input-actions">
              <button onClick={downloadExampleProfile} className="utility-button">
                <Download size={16} />
                Download Example Profile
              </button>
            </div>
            
            {profileData && (
              <div className="profile-info-container">
                <h3>Profile Information</h3>
                <div className="profile-info">
                  {Object.entries(profileData).map(([key, value]) => (
                    <div key={key} className="profile-field">
                      <strong>{key}:</strong> {value}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {yamlContent && (
            <div className="yaml-display">
              <h3>YAML Content</h3>
              <pre className="yaml-content">{yamlContent}</pre>
            </div>
          )}

          <div className="action-buttons">
            <button 
              onClick={handleStartApply} 
              className="primary-button"
              disabled={isApplying || !profileData}
            >
              <Play size={16} />
              Start Auto Apply
            </button>
            <button 
              onClick={handleStopApply} 
              className="secondary-button"
              disabled={!isApplying}
            >
              <Square size={16} />
              Stop
            </button>
            <button onClick={testOllamaConnection} className="secondary-button">
              <TestTube size={16} />
              Test Ollama Connection
            </button>
          </div>
        </div>
      )}

      {activeTab === 'conversations' && (
        <div className="tab-content">
          <div className="conversations-container">
            <div className="conversation-filters">
              <select 
                value={selectedCompany} 
                onChange={(e) => {
                  setSelectedCompany(e.target.value);
                  setSelectedJob('');
                  setSelectedQuestion('');
                }}
              >
                <option value="">All Companies</option>
                {getUniqueCompanies().map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
              
              <select 
                value={selectedJob} 
                onChange={(e) => {
                  setSelectedJob(e.target.value);
                  setSelectedQuestion('');
                }}
                disabled={!selectedCompany}
              >
                <option value="">All Jobs</option>
                {selectedCompany && getJobsForCompany(selectedCompany).map(job => (
                  <option key={job} value={job}>{job}</option>
                ))}
              </select>
              
              <select 
                value={selectedQuestion} 
                onChange={(e) => {
                  setSelectedQuestion(e.target.value);
                  handleConversationSelect(e.target.value);
                }}
                disabled={!selectedJob}
              >
                <option value="">Select a question</option>
                {selectedJob && getQuestionsForJob(selectedCompany, selectedJob).map(conv => (
                  <option key={conv.id} value={conv.id}>{conv.question.substring(0, 50)}...</option>
                ))}
              </select>
            </div>

            {currentConversation && (
              <div className="conversation-details">
                <div className="question-container">
                  <h4>Question:</h4>
                  <div className="conversation-text">{currentConversation.question}</div>
                </div>
                <div className="answer-container">
                  <h4>Answer:</h4>
                  <div className="conversation-text">{currentConversation.answer}</div>
                </div>
              </div>
            )}

            <div className="conversations-list">
              {conversations.length === 0 ? (
                <p>No conversations found. Start applying to jobs to see AI conversations here.</p>
              ) : (
                conversations.map(conv => (
                  <div key={conv.id} className="conversation-item">
                    <div className="conversation-header">
                      <strong>{conv.company}</strong> - {conv.jobTitle}
                    </div>
                    <div className="conversation-preview">
                      {conv.question.substring(0, 100)}...
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {statusMessage && (
        <div className="status-message">
          {statusMessage}
        </div>
      )}
    </div>
  );
};

export default App; 