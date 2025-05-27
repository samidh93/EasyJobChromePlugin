/**
 * EasyJob Conversation Data Exporter
 * 
 * This script exports conversation data from Chrome storage for debugging purposes.
 * 
 * Instructions:
 * 1. Open the EasyJob extension popup
 * 2. Open browser console (F12 or right-click > Inspect)
 * 3. Paste this script and press Enter
 * 4. A file download will start with the exported data
 */

(function exportConversationData() {
  console.log('Starting conversation data export...');
  
  // Retrieve the conversation data from Chrome storage
  chrome.storage.local.get('conversationData', function(result) {
    if (chrome.runtime.lastError) {
      console.error('Error retrieving data:', chrome.runtime.lastError);
      return;
    }
    
    const conversationData = result.conversationData || {};
    const jobCount = Object.keys(conversationData).length;
    
    if (jobCount === 0) {
      console.warn('No conversation data found in storage!');
      return;
    }
    
    // Count total conversations
    let totalConversations = 0;
    Object.values(conversationData).forEach(conversations => {
      if (Array.isArray(conversations)) {
        totalConversations += conversations.length;
      }
    });
    
    console.log(`Found ${jobCount} jobs with a total of ${totalConversations} conversations`);
    
    // Create a JSON blob and trigger download
    const dataStr = JSON.stringify(conversationData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = 'conversation_data_debug.json';
    
    // Append, click, and remove link to trigger download
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(url);
      console.log('Export complete! File: conversation_data_debug.json');
    }, 100);
  });
})(); 