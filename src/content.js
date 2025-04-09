import { LinkedInJobSearch, LinkedInJobInteraction, LinkedInJobInfo, LinkedInForm } from './linkedin/index.js';
import { debugLog, sendStatusUpdate, shouldStop, DEBUG } from './utils.js';

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

            debugLog(`Processing page ${page}/${totalPages}`);
            sendStatusUpdate(`Processing page ${page} of ${totalPages}`, 'info');

            // Get all jobs on current page
            const jobs = await LinkedInJobSearch.getListOfJobsOnPage(searchElement);
            debugLog(`Found ${jobs.length} jobs on page ${page}`);

            // Process each job
            for (const job of jobs) {
                if (await shouldStop(isAutoApplyRunning)) return;

                try {
                    // Click on the job to view details
                    const clickableElement = await LinkedInJobInteraction.getJobClickableElement(job);
                    await LinkedInJobInteraction.clickOnJob(clickableElement);
                    debugLog('Clicked on job');
                    await LinkedInJobInteraction.scrollDownToLoadNextJob(job);
                    debugLog('Scrolled to job');
                    if (await shouldStop(isAutoApplyRunning)) return;
                    
                    // Get job info
                    const jobInfo = await LinkedInJobInfo.getAllJobInfo();
                    debugLog('Job info:', jobInfo);

                    // Try to click Easy Apply button
                    await LinkedInJobInteraction.clickEasyApply();
                    debugLog('Attempted to click Easy Apply');
                    // Wait for the form to load
                    await new Promise(resolve => setTimeout(resolve, 2000));

                    if (await shouldStop(isAutoApplyRunning)) {
                        await LinkedInForm.closeForm(false);
                        return;
                    }
                    // process form
                    await LinkedInForm.processForm(() => shouldStop(isAutoApplyRunning));
                    debugLog('Processed application form');
                    // Close the form
                    //await LinkedInForm.closeForm(false);
                    //debugLog('Closed application form');
                } catch (error) {
                    console.error('Error processing job:', error);
                    debugLog('Error processing job:', { error: error.message, stack: error.stack });
                    sendStatusUpdate('Error processing job. Continuing to next one...', 'error');
                    // Try to close any open forms when there's an error
                    await LinkedInForm.closeForm(false);
                }

                // Wait between applications to avoid rate limiting
                if (!await shouldStop(isAutoApplyRunning)) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    debugLog('Waited cooldown period');
                }
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
    debugLog('Received message:', message);
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
    } else if (message.action === 'TEST_OLLAMA') {
        debugLog('Testing Ollama connection');
        chrome.runtime.sendMessage({ action: 'testOllama' }, response => {
            debugLog('Ollama test response:', response);
            sendResponse(response);
        });
    }
    // Return true to indicate we will send a response asynchronously
    return true;
}); 