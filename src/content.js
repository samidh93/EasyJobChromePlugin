import { LinkedInJobSearch, LinkedInJobInteraction, LinkedInJobInfo, LinkedInForm, LinkedInJobPage } from './linkedin/index.js';
import { debugLog, sendStatusUpdate, shouldStop, DEBUG } from './utils.js';
import memoryStore from './ai/MemoryStore.js';
import AIQuestionAnswerer from './ai/AIQuestionAnswerer.js';

let isAutoApplyRunning = false;

// Main auto-apply function
async function startAutoApply() {
  try {
    debugLog('Starting auto-apply process');
    debugLog('Current URL:', window.location.href);

    if (await shouldStop(isAutoApplyRunning)) return;

    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");
    debugLog('Search element found:', !!searchElement);

    if (!searchElement) {
      debugLog('Available elements on page:', {
        body: document.body.innerHTML.substring(0, 500) + '...',
        possibleSelectors: {
          scaffold: document.querySelector(".scaffold-layout"),
          jobsSearch: document.querySelector(".jobs-search-two-pane__layout"),
          anyJobsRelated: document.querySelectorAll('[class*="jobs-"]')
        }
      });
      sendStatusUpdate('Could not find jobs list. Please make sure you are on LinkedIn jobs page.', 'error');
      return;
    }

    // Get total jobs count
    debugLog('Getting total jobs count');
    const totalJobs = await LinkedInJobSearch.getTotalJobsSearchCount(searchElement);
    debugLog('Total jobs found:', totalJobs);
    sendStatusUpdate(`Found ${totalJobs} jobs to process`, 'info');

    // Get available pages
    debugLog('Getting available pages');
    const totalPages = await LinkedInJobSearch.getAvailablePages(searchElement, totalJobs);
    debugLog('Total pages found:', totalPages);

    // Process each page
    for (let page = 1; page <= totalPages; page++) {
      if (await shouldStop(isAutoApplyRunning)) return;
      const pageProcessed = await LinkedInJobPage.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
      
      // If page processing failed (e.g., couldn't navigate to next page), stop the process
      if (pageProcessed === false) {
        debugLog(`Page processing failed or reached end, stopping at page ${page}`);
        break;
      }
    }
    if (!await shouldStop(isAutoApplyRunning)) {
      debugLog('Auto-apply process completed');
      sendStatusUpdate('Auto-apply process completed!', 'success');
      chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
    }
  } catch (error) {
    console.error('Error in auto-apply process:', error);
    debugLog('Fatal error in auto-apply process:', { error: error.message, stack: error.stack });
    sendStatusUpdate('Error in auto-apply process', 'error');
    await LinkedInForm.closeForm(false);
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  debugLog('Received message in content script:', message);
  if (message.action === 'START_AUTO_APPLY') {
    if (!isAutoApplyRunning) {
      isAutoApplyRunning = true;
      debugLog('Starting auto-apply process');
      startAutoApply();
    }
  } else if (message.action === 'STOP_AUTO_APPLY') {
    debugLog('Stopping auto-apply process');
    isAutoApplyRunning = false;
  } else if (message.action === 'GET_STATE') {
    debugLog('Getting current state');
    sendResponse({ isRunning: isAutoApplyRunning });
  }
  // Return true to indicate we will send a response asynchronously
  return true;
});

// Initialize AI systems
console.log('Initializing EasyJob AI systems...');

// Load stored embeddings on page load
async function initializeAI() {
  try {
    console.log('-----------------------------------');
    console.log('🔄 EasyJob AI System Initialization');
    console.log('-----------------------------------');

    // Preload embeddings first (added optimization)
    console.log('Preloading embeddings into memory...');
    await memoryStore.preloadEmbeddings();

    // Get memory store size
    const memoryStoreSize = Object.keys(memoryStore.data).length;

    // Get storage size
    const storageCount = await memoryStore.getStoredEmbeddingsCount();

    console.log('Memory status:', {
      memoryStoreSize: memoryStoreSize,
      storageCount: storageCount,
      hasLoadedFromStorage: memoryStore.hasTriedLoading
    });

    if (memoryStoreSize > 0) {
      console.log('✅ Embeddings successfully loaded into memory');

      // Initialize AI Question Answerer for form filling
      const ai = new AIQuestionAnswerer();
      console.log('✅ AI question answerer initialized and ready');
    } else {
      console.log('⚠️ No embeddings found in memory. Checking storage and profile status...');

      // Check if user profile exists
      const profileExists = await new Promise(resolve => {
        chrome.storage.local.get('userProfile', result => {
          resolve(!!result.userProfile);
        });
      });

      if (profileExists) {
        console.log('🔍 User profile exists but embeddings are not generated or failed to load.');
        console.log('💡 Please open the extension popup and reload the profile to generate embeddings.');

        // Try one more direct storage check
        chrome.storage.local.get(null, function (items) {
          console.log('📊 Storage overview:', {
            totalItems: Object.keys(items).length,
            hasProfile: !!items.userProfile,
            hasEmbeddings: !!items.storedEmbeddings,
            profileSize: items.userProfile ? JSON.stringify(items.userProfile).length : 0,
            embeddingsSize: items.storedEmbeddings ? JSON.stringify(items.storedEmbeddings).length : 0
          });
        });
      } else {
        console.log('❌ No user profile found in storage.');
        console.log('💡 Please upload a profile through the extension popup.');
      }
    }

    console.log('-----------------------------------');
  } catch (error) {
    console.error('❌ Error initializing AI:', error);
  }
}

// Run initialization
initializeAI(); 