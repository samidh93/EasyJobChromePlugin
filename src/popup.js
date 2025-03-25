// popup.js
document.addEventListener('DOMContentLoaded', () => {

    const startApplyButton = document.getElementById('start-apply');
    const stopApplyButton = document.getElementById('stop-apply');
    const statusMessage = document.getElementById('status-message');

    function showStatus(message, type = 'info') {
      statusMessage.textContent = message;
      statusMessage.className = `status-message ${type}`;
    }

    // Start auto-apply process
    startApplyButton.addEventListener('click', async () => {
      try {
        // Get current active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        if (!tab.url.includes('linkedin.com/jobs')) {
          showStatus('Please navigate to LinkedIn Jobs page first', 'error');
          return;
        }

        // Update UI state
        startApplyButton.disabled = true;
        stopApplyButton.disabled = false;
        showStatus('Starting auto-apply process...', 'info');

        // Send message to content script to start the process
        chrome.tabs.sendMessage(tab.id, { action: 'START_AUTO_APPLY' });

        // Listen for status updates from content script
        chrome.runtime.onMessage.addListener((message) => {
          if (message.type === 'STATUS_UPDATE') {
            showStatus(message.text, message.status);
          }
          if (message.type === 'PROCESS_COMPLETE') {
            startApplyButton.disabled = false;
            stopApplyButton.disabled = true;
            showStatus('Auto-apply process completed!', 'success');
          }
        });

      } catch (error) {
        console.error('Error starting auto-apply:', error);
        showStatus('Error starting auto-apply process', 'error');
        startApplyButton.disabled = false;
        stopApplyButton.disabled = true;
      }
    });

    // Stop auto-apply process
    stopApplyButton.addEventListener('click', async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        chrome.tabs.sendMessage(tab.id, { action: 'STOP_AUTO_APPLY' });
        
        startApplyButton.disabled = false;
        stopApplyButton.disabled = true;
        showStatus('Auto-apply process stopped', 'info');
      } catch (error) {
        console.error('Error stopping auto-apply:', error);
        showStatus('Error stopping auto-apply process', 'error');
      }
    });
  
});
  