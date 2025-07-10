import LinkedInBase from './LinkedInBase.js';
import LinkedInJobSearch from './LinkedInJobSearch.js';
import LinkedInJobInteraction from './LinkedInJobInteraction.js';
import LinkedInJobInfo from './LinkedInJobInfo.js';
import LinkedInForm from './LinkedInForm.js';
import { debugLog, sendStatusUpdate, shouldStop } from '../utils.js';

class LinkedInJobPage extends LinkedInBase {
    static async processJobPage(page, totalPages, searchElement, isAutoApplyRunning) {
        this.debugLog(`Processing page ${page}/${totalPages}`);
        sendStatusUpdate(`Processing page ${page} of ${totalPages}`, 'info');
        
        // Get all jobs on current page
        const jobs = await LinkedInJobSearch.getListOfJobsOnPage(searchElement);
        debugLog(`Found ${jobs.length} jobs on page ${page}`);
        
        // Process each job
        for (const job of jobs) {
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested during job processing - breaking job loop");
                return false; // Exit immediately
            }
            // Wait between applications to avoid rate limiting
            await LinkedInJob.processJob(job, isAutoApplyRunning);
            
            // Check again after each job
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested after job processing - breaking job loop");
                return false; // Exit immediately
            }
        }
        
        // After processing all jobs on current page, navigate to next page if not on last page
        if (page < totalPages) {
            debugLog(`Finished processing page ${page}, navigating to next page...`);
            sendStatusUpdate(`Moving to page ${page + 1} of ${totalPages}...`, 'info');
            
            const nextPageSuccess = await LinkedInJobSearch.goToNextPage();
            if (!nextPageSuccess) {
                debugLog("Failed to navigate to next page or reached last page");
                
                // Double-check if we're actually on the last page
                const isLastPage = await LinkedInJobSearch.isOnLastPage();
                if (isLastPage) {
                    debugLog("Confirmed: reached the last page");
                    sendStatusUpdate("Reached the last page of results", 'info');
                } else {
                    debugLog("Navigation failed but not on last page - stopping process");
                    sendStatusUpdate("Failed to navigate to next page - stopping", 'error');
                }
                return false; // Stop processing
            } else {
                debugLog(`Successfully navigated to page ${page + 1}`);
            }
        } else {
            debugLog(`Finished processing last page (${page}/${totalPages})`);
        }
        
        return true; // Continue processing
    }
}

class LinkedInJob extends LinkedInBase {
    static async processJob(job, isAutoApplyRunning) {
        try {
            // Click on the job to view details
            const clickableElement = await LinkedInJobInteraction.getJobClickableElement(job);
            await LinkedInJobInteraction.clickOnJob(clickableElement);
            debugLog('Clicked on job');
            await LinkedInJobInteraction.scrollDownToLoadNextJob(job);
            debugLog('Scrolled to job');
            if (await shouldStop(isAutoApplyRunning)) return;
            // check if the job is already applied
            const isNotApplied = await LinkedInJobInteraction.isEasyButtonAvailable();
            debugLog('Is Easy Apply button available:', isNotApplied);
            if (!isNotApplied) {
                debugLog('Job already applied. Skipping...');
                sendStatusUpdate('Job already applied. Skipping...', 'info');
                return;
            }
            
            // Get job info
            const jobInfo = await LinkedInJobInfo.getAllJobInfo();
            debugLog('Job info:', jobInfo);
            await chrome.storage.local.set({ 'currentJob': jobInfo });
            
            // Try to click Easy Apply button
            await LinkedInJobInteraction.clickEasyApply();
            debugLog('Attempted to click Easy Apply');
            // Wait for the form to load
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested before form processing");
                return;
            }
            
            // process form with a callback that checks the actual stop state
            const shouldStopCallback = async () => {
                return await shouldStop(isAutoApplyRunning);
            };
            await LinkedInForm.processForm(shouldStopCallback);
            debugLog('Processed application form');
            await chrome.storage.local.remove('currentJob');
            debugLog('Removed current job from storage');
        } catch (error) {
            console.error('Error processing job:', error);
            debugLog('Error processing job:', { error: error.message, stack: error.stack });
            sendStatusUpdate('Error processing job. Continuing to next one...', 'error');
            // Keep forms open as requested by user
        }
    }
}

export default LinkedInJobPage;
export { LinkedInJob };