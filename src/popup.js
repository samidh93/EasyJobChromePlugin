// popup.js
document.addEventListener('DOMContentLoaded', () => {

    const startApplyButton = document.getElementById('start-apply');
    const stopApplyButton = document.getElementById('stop-apply');
    const testOllamaButton = document.getElementById('test-ollama');
    const yamlFileInput = document.getElementById('yaml-file');
    const loadYamlButton = document.getElementById('load-yaml');
    const yamlContent = document.getElementById('yaml-content');
    const statusMessage = document.getElementById('status-message');

    function showStatus(message, type = 'info') {
      statusMessage.textContent = message;
      statusMessage.className = `status-message ${type}`;
    }

    // Function to update button states
    function updateButtonStates(isRunning) {
        startApplyButton.disabled = isRunning;
        stopApplyButton.disabled = !isRunning;
    }

    // Load and display YAML file
    loadYamlButton.addEventListener('click', async () => {
        const file = yamlFileInput.files[0];
        if (!file) {
            showStatus('Please select a YAML file first', 'error');
            return;
        }

        try {
            const text = await file.text();
            yamlContent.textContent = text;
            yamlContent.style.display = 'block';

            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.tabs.sendMessage(tab.id, { 
                action: 'LOAD_YAML', 
                content: text 
            }, response => {
                if (response && response.success) {
                    showStatus('Profile loaded successfully', 'success');
                } else {
                    showStatus('Error loading profile: ' + (response?.error || 'Unknown error'), 'error');
                }
            });
        } catch (error) {
            console.error('Error reading YAML file:', error);
            showStatus('Error reading YAML file', 'error');
        }
    });

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
            chrome.tabs.sendMessage(tab.id, { action: 'GET_STATE' }, (response) => {
                if (response && response.isRunning) {
                    updateButtonStates(true);
                    showStatus('Auto-apply process is running...', 'info');
                } else {
                    updateButtonStates(false);
                }
            });
        } catch (error) {
            console.error('Error checking current state:', error);
            showStatus('Error checking current state', 'error');
            updateButtonStates(false);
        }
    }

    // Initialize state when popup opens
    checkCurrentState();

    // Load saved dropdown options
    loadDropdownOptions();

    // For testing: Add sample conversation data when in development
    const testDataButton = document.createElement('button');
    testDataButton.textContent = 'Load Test Data';
    testDataButton.classList.add('secondary-button');
    testDataButton.style.marginTop = '10px';
    testDataButton.onclick = insertTestData;
    document.querySelector('#conversations-tab').appendChild(testDataButton);

    // Message listener for status updates
    const messageListener = (message, sender, sendResponse) => {
        if (message.type === 'STATUS_UPDATE') {
            showStatus(message.text, message.status);
        }
        if (message.type === 'PROCESS_COMPLETE') {
            updateButtonStates(false);
            showStatus(message.text || 'Auto-apply process completed!', 'success');
        }
        if (message.action === 'CONVERSATION_UPDATED') {
            console.log('Conversation updated:', message.data);
            updateConversationDropdowns(message.data);
        }
        
        // Always send a response to close the message channel properly
        if (sendResponse) {
            sendResponse({ received: true });
        }
        
        // Return false to indicate synchronous handling
        return false;
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
        chrome.tabs.sendMessage(tab.id, { action: 'START_AUTO_APPLY' });

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
        chrome.tabs.sendMessage(tab.id, { action: 'STOP_AUTO_APPLY' });
        
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
        
        chrome.runtime.sendMessage({ action: 'testOllama' }, (response) => {
          if (response && response.success) {
            showStatus('Ollama connection successful!', 'success');
          } else {
            showStatus(`Ollama connection failed: ${response?.error || 'Unknown error'}`, 'error');
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
    questionDropdown.addEventListener('change', displaySelectedQuestionAnswer);
    
    console.log('Dropdown data loaded from Chrome storage');
  });
}

// Function to update job dropdown based on selected company
function updateJobDropdown() {
  console.log('Updating job dropdown...');
  const companyDropdown = document.getElementById('company-filter');
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
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
  document.getElementById('question-text').textContent = '';
  document.getElementById('answer-text').textContent = '';
  
  chrome.storage.local.get('dropdownData', function(result) {
    console.log('Retrieved dropdown data for jobs:', result.dropdownData);
    
    if (result.dropdownData && result.dropdownData.jobs) {
      const jobsToShow = selectedCompany === '' 
        ? result.dropdownData.jobs 
        : result.dropdownData.jobs.filter(job => job.company === selectedCompany);
      
      console.log('Jobs to show:', jobsToShow);
      
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
    }
  });
}

// Function to update the question dropdown based on selected job
function updateQuestionDropdown() {
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
  const selectedJob = jobDropdown.value;
  
  console.log("Updating question dropdown for job:", selectedJob);
  
  // Clear all question options except the first "Select a question" option
  while (questionDropdown.options.length > 1) {
    questionDropdown.remove(1);
  }
  
  // Clear displayed question and answer
  document.getElementById('question-text').textContent = '';
  document.getElementById('answer-text').textContent = '';
  
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
      
      if (jobConversations.length > 0) {
        // Enable the question dropdown
        questionDropdown.disabled = false;
        
        // Add each question to the dropdown
        jobConversations.forEach((conversation, index) => {
          // Find the user message - could be at index 0 or 1
          const userMsgIndex = conversation.findIndex(msg => msg.role === 'user');
          const assistantMsgIndex = conversation.findIndex(msg => msg.role === 'assistant');
          
          if (userMsgIndex !== -1 && assistantMsgIndex !== -1) {
            const questionText = extractQuestionText(conversation[userMsgIndex].content);
            
            const option = document.createElement('option');
            option.value = index;
            option.textContent = questionText;
            questionDropdown.appendChild(option);
          }
        });
        
        if (questionDropdown.options.length <= 1) {
          console.log("No valid questions found for this job");
          questionDropdown.disabled = true;
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
  // Try to extract the question part from the content
  const questionMatch = content.match(/Form Question: (.*?)(\n|$)/);
  if (questionMatch && questionMatch[1]) {
    return questionMatch[1].trim();
  }
  
  // If that fails, just take the first 50 characters
  return content.substring(0, 50) + (content.length > 50 ? '...' : '');
}

// Function to display the selected question and answer
function displaySelectedQuestionAnswer() {
  const jobDropdown = document.getElementById('job-filter');
  const questionDropdown = document.getElementById('question-filter');
  const questionText = document.getElementById('question-text');
  const answerText = document.getElementById('answer-text');
  
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
        // Find the user and assistant messages regardless of position
        const userMsg = conversation.find(msg => msg.role === 'user');
        const assistantMsg = conversation.find(msg => msg.role === 'assistant');
        
        if (userMsg && assistantMsg) {
          questionText.textContent = userMsg.content || "Question not available";
          answerText.textContent = assistantMsg.content || "Answer not available";
        }
      } else {
        console.log("Invalid conversation format:", conversation);
        questionText.textContent = "Conversation data format error";
        answerText.textContent = "Invalid conversation data format";
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
      
      // Check if conversation already exists
      const isExisting = conversationData[data.title].some(existingConv => {
        return existingConv[0]?.content === data.conversation[0]?.content;
      });
      
      if (!isExisting) {
        conversationData[data.title].push(data.conversation);
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
    const sampleData = {
        companies: ['Google', 'Microsoft', 'Amazon'],
        jobs: [
            { company: 'Google', title: 'Software Engineer' },
            { company: 'Microsoft', title: 'Product Manager' },
            { company: 'Amazon', title: 'Data Scientist' }
        ],
        conversations: {
            'Software Engineer': [
                [
                    { role: 'user', content: 'Form Question: Notice period\nUser Context: female [certifications...]\nAvailable Options: "Option auswählen", "Available immediately", "1 week", "2 weeks", "3 weeks", "1 month", "2 months", "3 months and more"\n\nIMPORTANT: You MUST choose EXACTLY ONE option from the list above.' },
                    { role: 'assistant', content: '3 months and more' }
                ],
                [
                    { role: 'user', content: 'Form Question: What is your salary expectations (gross)?\nUser Context: [education...]\nIMPORTANT: Return ONLY the answer as a plain string' },
                    { role: 'assistant', content: '100000' }
                ]
            ],
            'Product Manager': [
                [
                    { role: 'user', content: 'Form Question: Years of experience?\nUser Context: [experience...]\nIMPORTANT: Return ONLY the answer as a plain string' },
                    { role: 'assistant', content: '5' }
                ]
            ]
        }
    };
    
    console.log('Inserting test data');
    
    // Clear existing dropdowns
    const companyDropdown = document.getElementById('company-filter');
    const jobDropdown = document.getElementById('job-filter');
    
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
    
    // Save dropdown data
    saveDropdownOptions();
    
    // Save conversation data
    let conversationData = {};
    Object.entries(sampleData.conversations).forEach(([jobTitle, conversations]) => {
        conversationData[jobTitle] = conversations;
    });
    
    chrome.storage.local.set({ 'conversationData': conversationData }, function() {
        console.log('Test conversation data saved:', conversationData);
        // Update UI to show we have data
        document.getElementById('status-message').textContent = 'Test data loaded successfully';
        document.getElementById('status-message').className = 'status-message success';
    });
}