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

    // Message listener for status updates
    const messageListener = (message) => {
        if (message.type === 'STATUS_UPDATE') {
            showStatus(message.text, message.status);
        }
        if (message.type === 'PROCESS_COMPLETE') {
            updateButtonStates(false);
            showStatus(message.text || 'Auto-apply process completed!', 'success');
        }
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
        
        chrome.tabs.sendMessage(tab.id, { action: 'TEST_OLLAMA' }, (response) => {
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
  
});
  