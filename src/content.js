import LinkedInJobHelper from './LinkedInJobHelper.js';

let isAutoApplyRunning = false;
const DEBUG = true;  // Toggle debugging

// Function to check if the process should stop
async function shouldStop() {
    if (!isAutoApplyRunning) {
        debugLog('Auto-apply process stopped by user');
        sendStatusUpdate('Auto-apply process stopped', 'info');
        chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
        return true;
    }
    return false;
}

// Debug logger
function debugLog(message, data = null) {
    if (!DEBUG) return;
    const timestamp = new Date().toISOString().split('T')[1];
    const logMessage = `[EasyJob Debug ${timestamp}] ${message}`;
    if (data) {
        console.log(logMessage, data);
    } else {
        console.log(logMessage);
    }
}

// Function to send status updates to popup
function sendStatusUpdate(text, status = 'info') {
    debugLog(`Status Update: ${status} - ${text}`);
    chrome.runtime.sendMessage({
        type: 'STATUS_UPDATE',
        text,
        status
    });
}

// Main auto-apply function
async function startAutoApply() {
    try {
        debugLog('Starting auto-apply process');
        debugLog('Current URL:', window.location.href);
        
        if (await shouldStop()) return;
        
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
        const totalJobs = await LinkedInJobHelper.getTotalJobsSearchCount(searchElement);
        debugLog('Total jobs found:', totalJobs);
        sendStatusUpdate(`Found ${totalJobs} jobs to process`, 'info');

        // Get available pages
        debugLog('Getting available pages');
        const totalPages = await LinkedInJobHelper.getAvailablePages(searchElement, totalJobs);
        debugLog('Total pages found:', totalPages);
        
        // Process each page
        for (let page = 1; page <= totalPages; page++) {
            if (await shouldStop()) return;
            
            debugLog(`Processing page ${page}/${totalPages}`);
            sendStatusUpdate(`Processing page ${page} of ${totalPages}`, 'info');
            
            // Get all jobs on current page
            const jobs = await LinkedInJobHelper.getListOfJobsOnPage(searchElement);
            debugLog(`Found ${jobs.length} jobs on page ${page}`);
            
            // Process each job
            for (const job of jobs) {
                if (await shouldStop()) return;

                try {
                    debugLog('Processing job:', job.innerHTML.substring(0, 200));
                    // Click on the job to view details
                    const clickableElement = await LinkedInJobHelper.getJobClickableElement(job);
                    
                    if (clickableElement) {
                        if (await shouldStop()) {
                            await LinkedInJobHelper.closeForm(false);
                            return;
                        }
                        
                        await LinkedInJobHelper.scrollDownToLoadNextJob(job);
                        debugLog('Scrolled to job');
                        
                        if (await shouldStop()) return;
                        
                        await LinkedInJobHelper.clickOnJob(clickableElement);
                        debugLog('Clicked on job');
                        
                        // Wait for job details to load
                        await new Promise(resolve => setTimeout(resolve, 2000));
                        
                        if (await shouldStop()) {
                            await LinkedInJobHelper.closeForm(false);
                            return;
                        }
                        
                        // Try to click Easy Apply button
                        await LinkedInJobHelper.clickEasyApply();
                        debugLog('Attempted to click Easy Apply');
                        
                        if (await shouldStop()) {
                            await LinkedInJobHelper.closeForm(false);
                            return;
                        }
                        
                        // Store job application data
                        const jobTitle = clickableElement.querySelector('.job-card-list__title')?.textContent.trim() || 'Unknown Position';
                        const company = clickableElement.querySelector('.job-card-container__company-name')?.textContent.trim() || 'Unknown Company';
                        debugLog('Job details:', { jobTitle, company });
                        
                        await storeJobApplication({
                            title: jobTitle,
                            company: company,
                            status: 'Applied'
                        });
                        debugLog('Stored job application');

                        sendStatusUpdate(`Applied to ${jobTitle} at ${company}`, 'success');
                        
                        // Close the form
                        await LinkedInJobHelper.closeForm(true);
                        debugLog('Closed application form');
                    }
                } catch (error) {
                    console.error('Error processing job:', error);
                    debugLog('Error processing job:', { error: error.message, stack: error.stack });
                    sendStatusUpdate('Error processing job. Continuing to next one...', 'error');
                    // Try to close any open forms when there's an error
                    await LinkedInJobHelper.closeForm(false);
                }
                
                // Wait between applications to avoid rate limiting
                if (!await shouldStop()) {
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    debugLog('Waited cooldown period');
                }
            }
        }
        
        if (!await shouldStop()) {
            debugLog('Auto-apply process completed');
            sendStatusUpdate('Auto-apply process completed!', 'success');
            chrome.runtime.sendMessage({ type: 'PROCESS_COMPLETE' });
        }
        
    } catch (error) {
        console.error('Error in auto-apply process:', error);
        debugLog('Fatal error in auto-apply process:', { error: error.message, stack: error.stack });
        sendStatusUpdate('Error in auto-apply process', 'error');
        await LinkedInJobHelper.closeForm(false);
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
    }
    // Return true to indicate we will send a response asynchronously
    return true;
});
