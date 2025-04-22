// popup.js
document.addEventListener('DOMContentLoaded', () => {

    const startApplyButton = document.getElementById('start-apply');
    const stopApplyButton = document.getElementById('stop-apply');
    const testOllamaButton = document.getElementById('test-ollama');
    const yamlFileInput = document.getElementById('yaml-file');
    const loadYamlButton = document.getElementById('load-yaml');
    const yamlContent = document.getElementById('yaml-content');
    const statusMessage = document.getElementById('status-message');
    const downloadExampleButton = document.getElementById('download-example');
    
    // Variable to store the selected file
    let selectedYamlFile = null;

    // Add Clear All Data button
    const clearAllDataButton = document.createElement('button');
    clearAllDataButton.id = 'clear-all-data';
    clearAllDataButton.textContent = 'Clear All Data';
    clearAllDataButton.classList.add('danger-button');
    clearAllDataButton.style.marginTop = '10px';
    clearAllDataButton.style.backgroundColor = '#dc3545';
    clearAllDataButton.style.color = 'white';
    clearAllDataButton.style.border = 'none';
    clearAllDataButton.style.padding = '8px 16px';
    clearAllDataButton.style.borderRadius = '4px';
    clearAllDataButton.style.cursor = 'pointer';
    clearAllDataButton.style.width = '100%'; // Make button full width
    clearAllDataButton.style.display = 'block'; // Ensure block display
    clearAllDataButton.onclick = clearAllData;
    
    // Add the clear all data button under the Load Profile button's parent container
    const fileInputRow = document.querySelector('.file-input-row');
    if (fileInputRow && fileInputRow.parentNode) {
        fileInputRow.parentNode.insertBefore(clearAllDataButton, fileInputRow.nextSibling);
    }

    function showStatus(message, type = 'info') {
      statusMessage.textContent = message;
      statusMessage.className = `status-message ${type}`;
    }

    // Function to update button states
    function updateButtonStates(isRunning) {
        startApplyButton.disabled = isRunning;
        stopApplyButton.disabled = !isRunning;
    }

    // Function to check if YAML profile is already loaded
    function checkYamlStatus() {
        chrome.storage.local.get(['userProfileYaml', 'yamlLastUploaded', 'yamlFileName'], function(result) {
            if (result && result.userProfileYaml) {
                // Get file name or show default
                const fileName = result.yamlFileName || 'profile.yaml';
                
                // Show a preview of the YAML content (first 50 chars)
                const previewContent = result.userProfileYaml.substring(0, 50) + 
                                      (result.userProfileYaml.length > 50 ? '...' : '');
                
                // Format timestamp if available
                let timeInfo = '';
                if (result.yamlLastUploaded) {
                    try {
                        const uploadDate = new Date(result.yamlLastUploaded);
                        timeInfo = `${uploadDate.toLocaleDateString()} at ${uploadDate.toLocaleTimeString()}`;
                    } catch (e) {
                        console.error('Error parsing timestamp:', e);
                    }
                }
                
                // Display the status message
                showStatus('YAML profile is loaded and ready to use', 'success');
                
                // Update the yaml content display
                if (yamlContent) {
                    yamlContent.textContent = previewContent;
                }
                
                // Create profile info container
                const profileInfoContainer = document.getElementById('profile-info-container');
                profileInfoContainer.innerHTML = ''; // Clear previous content
                
                const profileInfo = document.createElement('div');
                profileInfo.className = 'yaml-profile-info';
                
                // Add file name and upload time
                const profileName = document.createElement('span');
                profileName.className = 'yaml-profile-name';
                profileName.textContent = `📄 ${fileName}`;
                profileInfo.appendChild(profileName);
                
                if (timeInfo) {
                    const profileTimestamp = document.createElement('span');
                    profileTimestamp.className = 'yaml-profile-timestamp';
                    profileTimestamp.textContent = `Uploaded on: ${timeInfo}`;
                    profileInfo.appendChild(profileTimestamp);
                }
                
                // Add actions section with remove button
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'yaml-profile-actions';
                
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-profile-btn';
                removeButton.textContent = 'Remove Profile';
                removeButton.onclick = removeUserProfile;
                actionsDiv.appendChild(removeButton);
                
                profileInfo.appendChild(actionsDiv);
                profileInfoContainer.appendChild(profileInfo);
            } else {
                // Clear the profile info container if no profile is loaded
                const profileInfoContainer = document.getElementById('profile-info-container');
                if (profileInfoContainer) {
                    profileInfoContainer.innerHTML = '';
                }
            }
        });
    }

    // Function to remove user profile from storage
    async function removeUserProfile() {
        try {
            await chrome.storage.local.remove(['userProfileYaml', 'yamlLastUploaded', 'yamlFileName', 'userDataHash']);
            
            // Clear UI elements
            const profileInfoContainer = document.getElementById('profile-info-container');
            profileInfoContainer.innerHTML = '';
            
            if (yamlContent) {
                yamlContent.textContent = '';
            }
            
            showStatus('Profile removed successfully', 'info');
        } catch (error) {
            console.error('Error removing profile:', error);
            showStatus('Failed to remove profile', 'error');
        }
    }

    // Function to send message to content script with retry
    async function sendMessageToContentScript(message, maxRetries = 3) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab) {
            console.error('No active tab found');
            return null;
        }

        let retries = 0;
        while (retries < maxRetries) {
            try {
                const response = await new Promise((resolve, reject) => {
                    chrome.tabs.sendMessage(tab.id, message, (response) => {
                        if (chrome.runtime.lastError) {
                            reject(chrome.runtime.lastError);
                        } else {
                            resolve(response);
                        }
                    });
                });
                return response;
            } catch (error) {
                console.log(`Attempt ${retries + 1} failed:`, error);
                retries++;
                if (retries < maxRetries) {
                    // Wait before retrying
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }
        }
        return null;
    }

    // Check current state when popup opens
    async function checkCurrentState() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab.url.includes('linkedin.com/jobs')) {
                showStatus('Please navigate to LinkedIn Jobs page first', 'error');
                updateButtonStates(false);
                return;
            }

            // Query the content script for current state
            const response = await sendMessageToContentScript({ action: 'GET_STATE' });
            if (response && response.isRunning) {
                updateButtonStates(true);
                showStatus('Auto-apply process is running...', 'info');
            } else {
                updateButtonStates(false);
            }
        } catch (error) {
            console.error('Error checking current state:', error);
            showStatus('Error checking current state', 'error');
            updateButtonStates(false);
        }
    }

    // Initialize state when popup opens
    checkCurrentState();
    
    // Check if YAML is already loaded
    checkYamlStatus();

    // Load saved dropdown options
    loadDropdownOptions();

    // For testing: Add sample conversation data when in development
    const testDataButton = document.createElement('button');
    testDataButton.textContent = 'Reset Data';
    testDataButton.classList.add('secondary-button');
    testDataButton.style.marginTop = '10px';
    testDataButton.onclick = insertTestData;
    document.querySelector('#conversations-tab').appendChild(testDataButton);

    // Message listener for status updates
    const messageListener = (message, sender, sendResponse) => {
        // Only handle specific message types that the popup needs to process
        let handled = false;
        
        if (message.type === 'STATUS_UPDATE') {
            showStatus(message.text, message.status);
            handled = true;
        }
        if (message.type === 'PROCESS_COMPLETE') {
            updateButtonStates(false);
            showStatus(message.text || 'Auto-apply process completed!', 'success');
            handled = true;
        }
        if (message.action === 'CONVERSATION_UPDATED') {
            console.log('Conversation updated:', message.data);
            updateConversationDropdowns(message.data);
            handled = true;
        }
        if (message.type === 'EMBEDDING_PROGRESS') {
            // Handle embedding progress updates
            const { progress, total, percent, status } = message.data;
            console.log(`Embedding progress: ${progress}/${total} (${percent}%) - ${status}`);
            
            // Ensure progress bar is visible
            showEmbeddingProgressBar();
            updateEmbeddingProgress(progress, total, status);
            handled = true;
        }
        if (message.type === 'EMBEDDING_COMPLETE') {
            // Handle embedding completion
            if (message.success) {
                showStatus('Embeddings generated successfully!', 'success');
                // Update progress to 100%
                updateEmbeddingProgress(100, 100, 'Complete!');
                
                // Update YAML status display without requiring refresh
                checkYamlStatus();
                
                // Hide progress bar after a delay
                setTimeout(() => {
                    hideEmbeddingProgressBar();
                }, 3000);
            } else {
                showStatus(`Embedding generation failed: ${message.error || 'Unknown error'}`, 'error');
                updateEmbeddingProgress(0, 100, `Error: ${message.error || 'Unknown error'}`);
                
                // Mark progress bar as error
                const progressBar = document.getElementById('embedding-progress-bar');
                if (progressBar) progressBar.classList.add('error');
            }
            handled = true;
        }
        
        // Only send a response if we actually handled this message
        if (handled && sendResponse) {
            sendResponse({ received: true });
            return false; // Synchronous response
        }
        
        // Return undefined so other listeners can handle the message
        return undefined;
    };

    // Add message listener
    chrome.runtime.onMessage.addListener(messageListener);

    // Remove message listener when popup closes
    window.addEventListener('unload', () => {
        chrome.runtime.onMessage.removeListener(messageListener);
    });

    // Start auto-apply process
    startApplyButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            if (!tab.url.includes('linkedin.com/jobs')) {
                showStatus('Please navigate to LinkedIn Jobs page first', 'error');
                return;
            }

            updateButtonStates(true);
            showStatus('Starting auto-apply process...', 'info');

            // Send message to content script to start the process
            await sendMessageToContentScript({ action: 'START_AUTO_APPLY' });

        } catch (error) {
            console.error('Error starting auto-apply:', error);
            showStatus('Error starting auto-apply process', 'error');
            updateButtonStates(false);
        }
    });

    // Stop auto-apply process
    stopApplyButton.addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            await sendMessageToContentScript({ action: 'STOP_AUTO_APPLY' });
            
            updateButtonStates(false);
            showStatus('Stopping auto-apply process...', 'info');
        } catch (error) {
            console.error('Error stopping auto-apply:', error);
            showStatus('Error stopping auto-apply process', 'error');
        }
    });

    // Test Ollama connection
    testOllamaButton.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        showStatus('Testing Ollama connection...', 'info');
        
        // Try to remove any previous help sections
        const oldHelpSection = document.querySelector('.help-section');
        if (oldHelpSection) {
          oldHelpSection.remove();
        }
        
        chrome.runtime.sendMessage({ action: 'testOllama' }, (response) => {
          if (response && response.success) {
            showStatus(`Ollama connection successful! Using port ${response.data.port || 11434} and model "${response.data.version || 'unknown'}"`, 'success');
          } else {
            const errorMsg = response?.error || 'Unknown error';
            const troubleshooting = response?.troubleshooting || 'Make sure Ollama is installed and running on your computer.';
            
            console.error('Ollama connection error:', errorMsg);
            showStatus(`Ollama connection failed: ${errorMsg}`, 'error');
            
            // Create a help section with troubleshooting tailored to the specific error
            const helpSection = document.createElement('div');
            helpSection.className = 'help-section';
            
            let helpContent = `
              <h3>Troubleshooting Ollama Connection</h3>
              <ol>
                <li>Make sure Ollama is installed on your computer. Visit <a href="https://ollama.ai" target="_blank">ollama.ai</a> to download.</li>
                <li>Open a terminal and run <code>ollama serve</code> to start the Ollama server.</li>
            `;
            
            // Add error-specific help
            if (errorMsg.includes('Failed to connect') || errorMsg.includes('fetch')) {
              helpContent += `
                <li><strong>Connection issue detected:</strong> Ollama server might not be running. Check if you see Ollama in your system tray or task manager.</li>
                <li>If running, try restarting it with <code>ollama serve</code>.</li>
              `;
            } else if (errorMsg.includes('timeout')) {
              helpContent += `
                <li><strong>Timeout detected:</strong> Ollama is responding too slowly. This could be due to low system resources or a large model.</li>
                <li>Try closing other resource-intensive applications.</li>
                <li>Consider using a smaller model by running <code>ollama pull gemma:2b</code> in your terminal.</li>
              `;
            } else if (errorMsg.includes('parse') || errorMsg.includes('format')) {
              helpContent += `
                <li><strong>Response format issue detected:</strong> Ollama's response couldn't be properly understood.</li>
                <li>Try updating Ollama to the latest version.</li>
                <li>Check if the model is fully downloaded with <code>ollama list</code>.</li>
              `;
            }
            
            // Add general model instructions
            helpContent += `
                <li>Make sure the required model is installed by running <code>ollama pull qwen2.5:3b</code> in your terminal.</li>
                <li>If that doesn't work, try a different model with <code>ollama pull gemma:2b</code> or <code>ollama pull llama3:8b</code>.</li>
                <li>Check if any firewall or security software is blocking connections to localhost.</li>
                <li>Try restarting your computer and the Ollama service.</li>
              </ol>
              <p>${troubleshooting}</p>
            `;
            
            helpSection.innerHTML = helpContent;
            
            // Add the help section after the status message
            const statusMessageElement = document.getElementById('status-message');
            if (statusMessageElement && statusMessageElement.parentNode) {
              statusMessageElement.parentNode.insertBefore(helpSection, statusMessageElement.nextSibling);
            }
          }
        });
      } catch (error) {
        console.error('Error testing Ollama:', error);
        showStatus('Error testing Ollama connection', 'error');
      }
    });

    // Tab handling
    document.querySelectorAll('.tab-button').forEach(button => {
      button.addEventListener('click', () => {
        // Remove active class from all buttons and contents
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked button and corresponding content
        button.classList.add('active');
        document.getElementById(`${button.dataset.tab}-tab`).classList.add('active');
        
        // If switching to conversations tab, refresh the list
        if (button.dataset.tab === 'conversations') {
        }
      });
    });

    // Function to handle file selection (but not upload yet)
    yamlFileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            selectedYamlFile = null;
            return;
        }
        
        // Store the file for later processing
        selectedYamlFile = file;
        
        // Show a status message indicating the file is selected but not processed
        showStatus(`File "${file.name}" selected. Click "Load Profile" to process it.`, 'info');
    });
    
    // Function to handle the Load Profile button click
    loadYamlButton.addEventListener('click', () => {
        // Check if a file has been selected
        if (!selectedYamlFile) {
            showStatus('Please select a YAML file first.', 'error');
            return;
        }
        
        // Process the selected file
        const reader = new FileReader();
        reader.onload = function(e) {
            const content = e.target.result;
            
            showStatus('Uploading YAML profile...', 'info');
            
            // Show the embedding progress bar immediately
            showEmbeddingProgressBar();
            updateEmbeddingProgress(0, 100, 'Preparing to generate embeddings...');
            
            // Upload to background script for processing
            chrome.runtime.sendMessage({
                action: 'setUserData',
                yamlContent: content,
                fileName: selectedYamlFile.name
            }, function(response) {
                if (response.success) {
                    showStatus('YAML profile uploaded successfully. Generating embeddings...', 'success');
                } else {
                    showStatus('Error: ' + (response.error || 'Failed to process YAML'), 'error');
                    // Hide progress bar on error
                    hideEmbeddingProgressBar();
                }
            });
            
            // Clear the file input and selected file
            yamlFileInput.value = '';
            selectedYamlFile = null;
        };
        reader.readAsText(selectedYamlFile);
    });

    // Download example profile button
    downloadExampleButton.addEventListener('click', async () => {
        try {
            // Fetch the example profile from the extension
            const response = await fetch(chrome.runtime.getURL('input/example_profile.yaml'));
            
            if (!response.ok) {
                throw new Error(`Failed to fetch example profile: ${response.status} ${response.statusText}`);
            }
            
            const yamlText = await response.text();
            
            // Create a download link
            const blob = new Blob([yamlText], { type: 'text/yaml' });
            const url = URL.createObjectURL(blob);
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = 'example_profile.yaml';
            
            // Append link to the document, click it, and remove it
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up the URL object
            URL.revokeObjectURL(url);
            
            showStatus('Example profile downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading example profile:', error);
            showStatus('Error downloading example profile', 'error');
        }
    });

    // Function to clear all data
    function clearAllData() {
        // Ask for confirmation before clearing data
        if (!confirm('Are you sure you want to clear all data? This will remove your YAML profile, embeddings, and all other stored data. This action cannot be undone.')) {
            return;
        }

        // Show status message
        showStatus('Clearing all data...', 'info');
        
        // Remove all data from storage
        chrome.storage.local.clear(function() {
            console.log('All data cleared from Chrome storage');
            
            // Update UI to reflect cleared data
            yamlContent.textContent = '';
            checkYamlStatus();
            loadDropdownOptions();
            
            // Show success message
            showStatus('All data has been cleared successfully', 'success');
        });
    }

});

// Function to save dropdown options to Chrome storage with company-job mapping
function saveDropdownOptions() {
  const companyDropdown = document.getElementById('company-filter');
  const jobDropdown = document.getElementById('job-filter');
  
  const companies = [];
  const jobs = [];
  // Track company-job relationships
  const companyJobMap = {};
  
  // Get all company options
  for (let i = 1; i < companyDropdown.options.length; i++) { // Start from 1 to skip the "All Companies" option
    const companyValue = companyDropdown.options[i].value;
    companies.push({
      value: companyValue,
      text: companyDropdown.options[i].textContent
    });
    // Initialize the company in our map if it doesn't exist
    if (!companyJobMap[companyValue]) {
      companyJobMap[companyValue] = [];
    }
  }
  
  // Get all job options with company mapping
  for (let i = 1; i < jobDropdown.options.length; i++) { // Start from 1 to skip the "All Jobs" option
    const jobValue = jobDropdown.options[i].value;
    const jobText = jobDropdown.options[i].textContent;
    const jobCompany = jobDropdown.options[i].getAttribute('data-company');
    
    jobs.push({
      value: jobValue,
      text: jobText,
      company: jobCompany
    });
    
    // Add this job to the company's job list
    if (jobCompany && companyJobMap[jobCompany]) {
      companyJobMap[jobCompany].push({
        value: jobValue,
        text: jobText
      });
    }
  }
  
  // Save to Chrome storage
  chrome.storage.local.set({
    'dropdownData': {
      companies: companies,
      jobs: jobs,
      companyJobMap: companyJobMap,
      lastUpdated: new Date().toISOString()
    }
  }, function() {
    console.log('Dropdown data saved to Chrome storage');
  });
}

// Function to load dropdown options from Chrome storage
function loadDropdownOptions() {
  console.log('Loading dropdown options...');
  chrome.storage.local.get(['dropdownData', 'conversationData'], function(result) {
    console.log('Retrieved storage data:', result);
    
    const companyDropdown = document.getElementById('company-filter');
    const jobDropdown = document.getElementById('job-filter');
    
    if (!companyDropdown || !jobDropdown) {
      console.error('Dropdown elements not found!');
      return;
    }
    
    // Clear existing options except the first one
    while (companyDropdown.options.length > 1) companyDropdown.remove(1);
    while (jobDropdown.options.length > 1) jobDropdown.remove(1);
    
    // Load companies
    if (result.dropdownData && result.dropdownData.companies && result.dropdownData.companies.length > 0) {
      console.log('Loading companies:', result.dropdownData.companies);
      result.dropdownData.companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company.value;
        option.textContent = company.text;
        companyDropdown.appendChild(option);
      });
    } else {
      console.log('No companies found in dropdownData');
      // If no data exists, try to load test data
      insertTestData();
    }
    
    // Load jobs
    if (result.dropdownData && result.dropdownData.jobs && result.dropdownData.jobs.length > 0) {
      console.log('Loading jobs:', result.dropdownData.jobs);
      result.dropdownData.jobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job.value;
        option.textContent = job.text;
        option.setAttribute('data-company', job.company);
        jobDropdown.appendChild(option);
      });
    } else {
      console.log('No jobs found in dropdownData');
    }
    
    // Add event listeners
    companyDropdown.addEventListener('change', updateJobDropdown);
    jobDropdown.addEventListener('change', updateQuestionDropdown);
    
    // Question dropdown event listener
    const questionDropdown = document.getElementById('question-filter');
    if (questionDropdown) {
      questionDropdown.addEventListener('change', displaySelectedQuestionAnswer);
    }
    
    console.log('Dropdown data loaded from Chrome storage');
  });
}

// Function to update job dropdown based on selected company
function updateJobDropdown() {
  console.log('Updating job dropdown...');
  const companyDropdown = document.getElementById('company-filter');
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
  
  if (!companyDropdown || !jobDropdown || !questionDropdown) {
    console.error('Required dropdown elements not found!');
    return;
  }
  
  const selectedCompany = companyDropdown.value;
  console.log('Selected company:', selectedCompany);
  
  // Store current selection
  const currentJobSelection = jobDropdown.value;
  
  // Clear all job options except the first "All Jobs" option
  while (jobDropdown.options.length > 1) {
    jobDropdown.remove(1);
  }
  
  // Clear and disable the question dropdown
  while (questionDropdown.options.length > 1) {
    questionDropdown.remove(1);
  }
  questionDropdown.disabled = true;
  
  // Clear displayed question and answer
  const questionText = document.getElementById('question-text');
  const answerText = document.getElementById('answer-text');
  if (questionText) questionText.textContent = '';
  if (answerText) answerText.textContent = '';
  
  chrome.storage.local.get('dropdownData', function(result) {
    console.log('Retrieved dropdown data for jobs:', result.dropdownData);
    
    if (result.dropdownData && result.dropdownData.jobs) {
      let jobsToShow;
      
      if (selectedCompany === '') {
        // Show all jobs
        jobsToShow = result.dropdownData.jobs;
      } else {
        // Filter jobs by company
        jobsToShow = result.dropdownData.jobs.filter(job => {
          console.log('Checking job:', job, 'against company:', selectedCompany);
          return job.company === selectedCompany;
        });
      }
      
      console.log('Jobs to show:', jobsToShow);
      
      if (jobsToShow.length > 0) {
        jobsToShow.forEach(job => {
          const option = document.createElement('option');
          option.value = job.value;
          option.textContent = job.text;
          option.setAttribute('data-company', job.company);
          jobDropdown.appendChild(option);
        });
        
        // Restore selection if possible
        if (currentJobSelection) {
          const jobExists = jobsToShow.some(job => job.value === currentJobSelection);
          if (jobExists) {
            jobDropdown.value = currentJobSelection;
          } else {
            jobDropdown.value = '';
          }
        }
      } else {
        console.log('No jobs found for company:', selectedCompany);
      }
    } else {
      console.log('No jobs data found in dropdownData');
    }
  });
}

// Function to update the question dropdown based on selected job
function updateQuestionDropdown() {
  console.log('Updating question dropdown...');
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
  
  if (!jobDropdown || !questionDropdown) {
    console.error('Required dropdown elements not found!');
    return;
  }
  
  const selectedJob = jobDropdown.value;
  console.log("Selected job:", selectedJob);
  
  // Clear all question options except the first "Select a question" option
  while (questionDropdown.options.length > 1) {
    questionDropdown.remove(1);
  }
  
  // Clear displayed question and answer
  const questionText = document.getElementById('question-text');
  const answerText = document.getElementById('answer-text');
  if (questionText) questionText.textContent = '';
  if (answerText) answerText.textContent = '';
  
  if (selectedJob === '') {
    // If no job is selected, disable the question dropdown
    questionDropdown.disabled = true;
    return;
  }
  
  // Get conversation data for the selected job
  chrome.storage.local.get('conversationData', function(result) {
    console.log("Retrieved conversation data:", result.conversationData);
    
    if (result.conversationData && result.conversationData[selectedJob]) {
      const jobConversations = result.conversationData[selectedJob];
      console.log("Job conversations:", jobConversations);
      
      if (jobConversations && jobConversations.length > 0) {
        // Enable the question dropdown
        questionDropdown.disabled = false;
        
        // Track questions already added to avoid duplicates in the dropdown
        const addedQuestions = new Set();
        
        // Add each question to the dropdown
        jobConversations.forEach((conversation, index) => {
          if (!Array.isArray(conversation)) {
            console.error('Invalid conversation format:', conversation);
            return;
          }
          
          // Find the user message
          const userMsg = conversation.find(msg => msg.role === 'user');
          const assistantMsg = conversation.find(msg => msg.role === 'assistant');
          
          if (userMsg && assistantMsg) {
            const questionText = extractQuestionText(userMsg.content);
            
            // Create a unique identifier for the option value (index in array)
            // and add the question text as the display text
            const option = document.createElement('option');
            option.value = index;
            
            // If we have seen this question before, add the answer as a suffix to differentiate
            if (addedQuestions.has(questionText)) {
              const shortAnswer = assistantMsg.content.substring(0, 10);
              option.textContent = `${questionText} (${shortAnswer}...)`;
            } else {
              option.textContent = questionText;
              addedQuestions.add(questionText);
            }
            
            console.log('Adding question to dropdown:', option.textContent);
            questionDropdown.appendChild(option);
          } else {
            console.error('Missing user or assistant message in conversation:', conversation);
          }
        });
        
        if (questionDropdown.options.length <= 1) {
          console.log("No valid questions found for this job");
          questionDropdown.disabled = true;
        } else {
          console.log(`Added ${questionDropdown.options.length - 1} questions to dropdown`);
          
          // Automatically select the most recent question (last in the array)
          if (questionDropdown.options.length > 1) {
            questionDropdown.selectedIndex = questionDropdown.options.length - 1;
            displaySelectedQuestionAnswer();
          }
        }
      } else {
        console.log("No conversations found for this job");
        questionDropdown.disabled = true;
      }
    } else {
      console.log("No conversation data found for job:", selectedJob);
      questionDropdown.disabled = true;
    }
  });
}

// Function to extract a short question title from the full question content
function extractQuestionText(content) {
  // Clean up the content first
  const cleanContent = content
    .replace(/User Context Data Hint:.+/s, '') // Remove context data
    .replace(/IMPORTANT:.+/s, '') // Remove IMPORTANT section
    .replace(/Available Options:.+/s, '') // Remove options
    .trim();
    
  // Check for "Form Question: " format
  const questionMatch = cleanContent.match(/Form Question:\s*([^?]+)\s*\?/);
  if (questionMatch && questionMatch[1]) {
    // Return just the question part, nicely formatted
    return questionMatch[1].trim();
  }
  
  // Try to find a question in the content with alternative formats
  const altQuestionMatch = content.match(/Question:\s*([^?]+)\s*\?/i) || 
                          content.match(/([^.]+\?)/);
  if (altQuestionMatch && altQuestionMatch[1]) {
    return altQuestionMatch[1].trim();
  }
  
  // If that fails, just take the first 50 characters
  return content.substring(0, 50) + (content.length > 50 ? '...' : '');
}

// Function to display the selected question and answer
function displaySelectedQuestionAnswer() {
  console.log('Displaying selected question and answer...');
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
  const questionText = document.getElementById('question-text');
  const answerText = document.getElementById('answer-text');
  
  if (!jobDropdown || !questionDropdown || !questionText || !answerText) {
    console.error('Required elements not found!');
    return;
  }
  
  const selectedJob = jobDropdown.value;
  const selectedQuestion = questionDropdown.value;
  
  console.log("Display Q&A for job:", selectedJob, "question index:", selectedQuestion);
  
  if (selectedJob === '' || selectedQuestion === '') {
    questionText.textContent = '';
    answerText.textContent = '';
    return;
  }
  
  chrome.storage.local.get('conversationData', function(result) {
    console.log("Conversation data for display:", result.conversationData);
    
    if (result.conversationData && 
        result.conversationData[selectedJob] && 
        result.conversationData[selectedJob][selectedQuestion]) {
      
      const conversation = result.conversationData[selectedJob][selectedQuestion];
      console.log("Selected conversation:", conversation);
      
      if (Array.isArray(conversation)) {
        // Find the user and assistant messages (skip system message)
        const userMsg = conversation.find(msg => msg.role === 'user');
        const assistantMsg = conversation.find(msg => msg.role === 'assistant');
        
        if (userMsg && assistantMsg) {
          // Clean up the user message (question) for display
          let displayQuestion = userMsg.content || "Question not available";
          
          // Remove boilerplate from the question
          displayQuestion = displayQuestion
            .replace(/User Context Data Hint:.+/s, '') // Remove context data
            .replace(/IMPORTANT:.+/s, '') // Remove IMPORTANT section
            .trim();
            
          // If it has Form Question format, clean it up more
          const formQuestionMatch = displayQuestion.match(/Form Question:\s*([^?]+)\s*\?/);
          if (formQuestionMatch) {
            displayQuestion = `Question: ${formQuestionMatch[1].trim()}?`;
          }
          
          // Now handle the options part if present
          const optionsMatch = userMsg.content.match(/Available Options:\s*\[(.*)\]/);
          if (optionsMatch && optionsMatch[1]) {
            const options = optionsMatch[1]
              .split(',')
              .map(opt => opt.trim().replace(/^"|"$/g, ''))
              .filter(opt => opt);
              
            if (options.length > 0) {
              displayQuestion += "\n\nOptions:\n• " + options.join("\n• ");
            }
          }
          
          // Format answer for display
          let displayAnswer = assistantMsg.content || "Answer not available";
          
          questionText.textContent = displayQuestion;
          answerText.textContent = displayAnswer;
          console.log('Displayed Q&A:', { 
            question: displayQuestion, 
            answer: displayAnswer 
          });
        } else {
          console.error('Missing user or assistant message in conversation:', conversation);
          questionText.textContent = "Error: Invalid conversation format";
          answerText.textContent = "Please try selecting another question";
        }
      } else {
        console.error("Invalid conversation format:", conversation);
        questionText.textContent = "Error: Invalid conversation format";
        answerText.textContent = "Please try selecting another question";
      }
    } else {
      console.log("Conversation data not found for selection");
      questionText.textContent = 'Question data not found';
      answerText.textContent = 'Answer data not found';
    }
  });
}

// Function to update the company and job dropdowns
function updateConversationDropdowns(data) {
  console.log('Updating conversation dropdowns with data:', data);
  
  const companyDropdown = document.getElementById('company-filter');
  const jobDropdown = document.getElementById('job-filter');
  
  if (!data || !data.company || !data.title) {
    console.log('Missing company or job title in conversation data');
    return;
  }
  
  // First, get existing data
  chrome.storage.local.get(['dropdownData', 'conversationData'], function(result) {
    let dropdownData = result.dropdownData || { companies: [], jobs: [], companyJobMap: {} };
    let conversationData = result.conversationData || {};
    
    let dataChanged = false;
    
    // Check if company already exists
    if (!dropdownData.companies.some(c => c.value === data.company)) {
      dropdownData.companies.push({
        value: data.company,
        text: data.company
      });
      dataChanged = true;
    }
    
    // Check if job already exists
    if (!dropdownData.jobs.some(j => j.value === data.title)) {
      dropdownData.jobs.push({
        value: data.title,
        text: data.title,
        company: data.company
      });
      dataChanged = true;
    }
    
    // Update company-job mapping
    if (!dropdownData.companyJobMap[data.company]) {
      dropdownData.companyJobMap[data.company] = [];
    }
    if (!dropdownData.companyJobMap[data.company].some(j => j.value === data.title)) {
      dropdownData.companyJobMap[data.company].push({
        value: data.title,
        text: data.title
      });
    }
    
    // Save conversation data
    if (data.conversation && Array.isArray(data.conversation) && data.conversation.length > 0) {
      if (!conversationData[data.title]) {
        conversationData[data.title] = [];
      }
      
      // Find the user question message and assistant answer for comparison
      const newUserMsg = data.conversation.find(msg => msg.role === 'user');
      const newAssistantMsg = data.conversation.find(msg => msg.role === 'assistant');
      
      // Better duplicate detection by comparing both question and answer
      let isExisting = false;
      if (newUserMsg && newAssistantMsg) {
        isExisting = conversationData[data.title].some(existingConv => {
          const existingUserMsg = existingConv.find(msg => msg.role === 'user');
          return existingUserMsg && existingUserMsg.content === newUserMsg.content;
        });
      } else {
        // Fallback to old method if we can't find user/assistant messages
        isExisting = conversationData[data.title].some(existingConv => {
          return existingConv[0]?.content === data.conversation[0]?.content;
        });
      }
      
      if (!isExisting) {
        console.log('Adding new conversation:', {
          question: newUserMsg?.content,
          answer: newAssistantMsg?.content
        });
        conversationData[data.title].push(data.conversation);
      } else {
        console.log('Skipping duplicate conversation');
      }
    }
    
    // Save all data to storage
    chrome.storage.local.set({
      dropdownData: dropdownData,
      conversationData: conversationData
    }, function() {
      console.log('Data saved to storage:', { dropdownData, conversationData });
      
      // Reload dropdowns to show new data
      loadDropdownOptions();
    });
  });
}

// Test function to insert sample conversation data
function insertTestData() {
    console.log('Inserting test data...');
    
    const sampleData = {
        companies: ['Test'],
        jobs: [
            { company: 'Test', title: 'Test Job' }
        ],
        conversations: {
            'Test Job': [
                [
                    { role: 'user', content: 'Form Question: What is your experience level?\nUser Context: [experience...]\nAvailable Options: "Junior", "Mid-level", "Senior"\nIMPORTANT: You MUST choose EXACTLY ONE option from the list above.' },
                    { role: 'assistant', content: 'Senior' }
                ]
            ]
        }
    };
    
    console.log('Test data prepared:', sampleData);
    
    // Clear existing dropdowns
    const companyDropdown = document.getElementById('company-filter');
    const jobDropdown = document.getElementById('job-filter');
    
    if (!companyDropdown || !jobDropdown) {
        console.error('Dropdown elements not found!');
        return;
    }
    
    // Reset dropdowns
    while (companyDropdown.options.length > 1) companyDropdown.remove(1);
    while (jobDropdown.options.length > 1) jobDropdown.remove(1);
    
    // Add companies
    sampleData.companies.forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = company;
        companyDropdown.appendChild(option);
    });
    
    // Add jobs
    sampleData.jobs.forEach(job => {
        const option = document.createElement('option');
        option.value = job.title;
        option.textContent = job.title;
        option.setAttribute('data-company', job.company);
        jobDropdown.appendChild(option);
    });
    
    // Prepare dropdown data in the format expected by the app
    const dropdownData = {
        companies: sampleData.companies.map(company => ({
            value: company,
            text: company
        })),
        jobs: sampleData.jobs.map(job => ({
            value: job.title,
            text: job.title,
            company: job.company
        })),
        companyJobMap: {},
        lastUpdated: new Date().toISOString()
    };
    
    // Build company-job map
    sampleData.companies.forEach(company => {
        dropdownData.companyJobMap[company] = sampleData.jobs
            .filter(job => job.company === company)
            .map(job => ({
                value: job.title,
                text: job.title
            }));
    });
    
    // Save dropdown data
    chrome.storage.local.set({ 'dropdownData': dropdownData }, function() {
        console.log('Test dropdown data saved:', dropdownData);
    });
    
    // Save conversation data
    let conversationData = {};
    Object.entries(sampleData.conversations).forEach(([jobTitle, conversations]) => {
        conversationData[jobTitle] = conversations;
    });
    
    chrome.storage.local.set({ 'conversationData': conversationData }, function() {
        console.log('Test conversation data saved:', conversationData);
        // Update UI to show we have data
        const statusMessage = document.getElementById('status-message');
        if (statusMessage) {
            statusMessage.textContent = 'Data resetted successfully';
            statusMessage.className = 'status-message success';
            
            // After data is loaded, update dropdown to show it
            updateJobDropdown();
        }
    });
}

// Add these new functions for the progress bar
function showEmbeddingProgressBar() {
  let progressContainer = document.getElementById('embedding-progress-container');
  
  if (!progressContainer) {
    // Create the progress bar container if it doesn't exist
    progressContainer = document.createElement('div');
    progressContainer.id = 'embedding-progress-container';
    progressContainer.className = 'progress-container';
    
    // Create the actual progress bar element
    const progressBar = document.createElement('div');
    progressBar.id = 'embedding-progress-bar';
    progressBar.className = 'progress-bar';
    
    // Create text for percentage and status
    const progressText = document.createElement('div');
    progressText.id = 'embedding-progress-text';
    progressText.className = 'progress-text';
    progressText.textContent = '0%';
    
    const progressStatus = document.createElement('div');
    progressStatus.id = 'embedding-progress-status';
    progressStatus.className = 'progress-status';
    progressStatus.textContent = 'Starting...';
    
    // Add elements to container
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    progressContainer.appendChild(progressStatus);
    
    // Add some CSS to the head if not already present
    const styleId = 'progress-bar-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .progress-container {
          width: 100%;
          height: 24px;
          background-color: #f5f5f5;
          border-radius: 4px;
          margin: 15px 0;
          position: relative;
          overflow: hidden;
          box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .progress-bar {
          height: 100%;
          background-color: #4CAF50;
          width: 0%;
          transition: width 0.3s ease;
          position: relative;
          border-radius: 4px;
        }
        .progress-bar.error {
          background-color: #f44336;
        }
        .progress-text {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #333;
          font-weight: bold;
          z-index: 2;
        }
        .progress-status {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #333;
          font-size: 12px;
          z-index: 2;
          max-width: 70%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Append to the proper location in the popup
    const profileInfoContainer = document.getElementById('profile-info-container');
    profileInfoContainer.appendChild(progressContainer);
  } else {
    // If it exists, just make it visible
    progressContainer.style.display = 'block';
    
    // Reset the progress bar
    const progressBar = document.getElementById('embedding-progress-bar');
    if (progressBar) {
      progressBar.style.width = '0%';
      progressBar.classList.remove('error');
    }
    
    const progressText = document.getElementById('embedding-progress-text');
    if (progressText) {
      progressText.textContent = '0%';
    }
    
    const progressStatus = document.getElementById('embedding-progress-status');
    if (progressStatus) {
      progressStatus.textContent = 'Starting...';
    }
  }
}

function updateEmbeddingProgress(progress, total, status) {
  const percent = total > 0 ? Math.round((progress / total) * 100) : 0;
  
  const progressBar = document.getElementById('embedding-progress-bar');
  const progressText = document.getElementById('embedding-progress-text');
  const progressStatus = document.getElementById('embedding-progress-status');
  
  if (progressBar && progressText && progressStatus) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `${percent}%`;
    progressStatus.textContent = status || '';
    
    // Mark as error if status includes 'Error'
    if (status && status.includes('Error')) {
      progressBar.classList.add('error');
    } else {
      progressBar.classList.remove('error');
    }
    
    // Hide when complete (100%)
    if (percent === 100 && !status.includes('Error')) {
      // Wait a moment before hiding so the user can see the completion
      setTimeout(() => {
        hideEmbeddingProgressBar();
      }, 3000);
    }
  }
}

function hideEmbeddingProgressBar() {
  // Don't remove it, just hide it so we can reuse it later
  const progressContainer = document.getElementById('embedding-progress-container');
  if (progressContainer) {
    progressContainer.style.display = 'none';
  }
}