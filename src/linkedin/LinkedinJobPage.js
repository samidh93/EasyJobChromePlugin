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
            

            
            if (!jobInfo) {
                debugLog('ERROR: Job info is null, cannot proceed');
                return;
            }
            
            // Store current user data for application tracking
            if (window.currentUserData) {
                await chrome.storage.local.set({ 'currentUser': window.currentUserData });
            }
            
            // Store current resume ID for application tracking
            try {
                const resumeResult = await chrome.storage.local.get(['currentResumeId']);
                
                if (!resumeResult.currentResumeId && window.currentUserData) {
                    const response = await chrome.runtime.sendMessage({
                        action: 'apiRequest',
                        method: 'GET',
                        url: `/users/${window.currentUserData.id}/resumes/default`
                    });
                    
                    if (response && response.success && response.resume) {
                        await chrome.storage.local.set({ 'currentResumeId': response.resume.id });
                    }
                }
            } catch (error) {
                debugLog('Error storing resume ID:', error);
            }
            
            // Click Easy Apply button
            await LinkedInJobInteraction.clickEasyApply();
            
            // Wait for the form to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested before form processing");
                return;
            }
            
            console.log('=== CALLING PROCESS FORM ===');
            console.log('About to call processForm with jobInfo:', jobInfo);
            console.log('Current URL before form processing:', window.location.href);
            console.log('=== END CALLING PROCESS FORM ===');
            
            const shouldStopCallback = async () => {
                return await shouldStop(isAutoApplyRunning);
            };
            await LinkedInForm.processForm(shouldStopCallback, jobInfo);
            debugLog('Processed application form');
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