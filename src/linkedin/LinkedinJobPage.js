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
        
        // Track consecutive disabled buttons to detect potential daily limit
        let consecutiveDisabledCount = 0;
        const DISABLED_THRESHOLD = 5; // If 5+ consecutive jobs have disabled buttons, check for daily limit
        
        // Process each job
        for (const job of jobs) {
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested during job processing - breaking job loop");
                return false; // Exit immediately
            }
            
            try {
                // Wait between applications to avoid rate limiting
                const jobResult = await LinkedInJob.processJob(job, isAutoApplyRunning);
                
                // Handle different job processing outcomes
                if (jobResult === 'disabled_button') {
                    consecutiveDisabledCount++;
                    this.debugLog(`Consecutive disabled buttons: ${consecutiveDisabledCount}/${DISABLED_THRESHOLD}`);
                    
                    // If we hit threshold, proactively check for daily limit
                    if (consecutiveDisabledCount >= DISABLED_THRESHOLD) {
                        this.debugLog(`Hit threshold of ${DISABLED_THRESHOLD} consecutive disabled buttons - checking for daily limit`);
                        const limitCheck = await LinkedInForm.checkEasyApplyLimit();
                        if (limitCheck.hasLimit) {
                            this.debugLog(`Daily limit detected after ${consecutiveDisabledCount} disabled buttons: ${limitCheck.message}`);
                            sendStatusUpdate(`Auto-apply completed - Daily limit reached`, 'info');
                            
                            // Store the limit message for frontend display
                            try {
                                await chrome.storage.local.set({
                                    'dailyLimitReached': true,
                                    'dailyLimitMessage': limitCheck.message,
                                    'dailyLimitTime': new Date().toISOString()
                                });
                            } catch (error) {
                                this.debugLog('Error storing daily limit info:', error);
                            }
                            
                            // Stop the auto-apply process immediately
                            if (typeof window !== 'undefined' && window.requestAutoApplyStop) {
                                window.requestAutoApplyStop('daily_limit_reached');
                            }
                            
                            // Send message to background to stop auto-apply
                            try {
                                await chrome.runtime.sendMessage({
                                    action: 'stopAutoApply',
                                    reason: 'daily_limit_reached'
                                });
                            } catch (error) {
                                this.debugLog('Error sending stop message to background:', error);
                            }
                            
                            this.debugLog('Auto-apply stopped gracefully due to daily limit detected from consecutive disabled buttons');
                            return false; // Exit immediately
                        } else {
                            this.debugLog(`${consecutiveDisabledCount} consecutive disabled buttons but no daily limit detected - continuing`);
                        }
                    }
                } else if (jobResult === 'success') {
                    // Reset counter on successful application
                    consecutiveDisabledCount = 0;
                    this.debugLog('Job processed successfully');
                } else if (jobResult === 'daily_limit_reached') {
                    // Daily limit already detected and handled in processJob
                    return false; // Exit immediately
                } else if (jobResult === 'stopped') {
                    // Stop was requested
                    return false; // Exit immediately
                } else {
                    // For other outcomes (error, no_job_info), reset counter but continue
                    consecutiveDisabledCount = 0;
                }
            } catch (error) {
                // Reset counter on error
                consecutiveDisabledCount = 0;
                
                // If processJob throws an error (like daily limit), check if stop was requested
                if (await shouldStop(isAutoApplyRunning)) {
                    this.debugLog("Stop requested after job error - breaking job loop");
                    return false; // Exit immediately
                }
                // Otherwise continue to next job
                this.debugLog("Error in job processing, continuing to next job:", error.message);
            }
            
            // Check again after each job (this should catch the immediate stop flag)
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
            if (await shouldStop(isAutoApplyRunning)) return 'stopped';
            
            // Check if the job is already applied
            const isNotApplied = await LinkedInJobInteraction.isEasyButtonAvailable();
            debugLog('Is Easy Apply button available:', isNotApplied);
            if (!isNotApplied) {
                debugLog('Job already applied or button disabled. Checking if this might be due to daily limit...');
                
                // If Easy Apply button is disabled, check if it's due to daily limit
                // This catches cases where LinkedIn disables all buttons site-wide
                const limitCheck = await LinkedInForm.checkEasyApplyLimit();
                if (limitCheck.hasLimit) {
                    debugLog(`Daily limit detected while checking disabled button: ${limitCheck.message}`);
                    sendStatusUpdate(`Auto-apply completed - Daily limit reached`, 'info');
                    
                    // Store the limit message for frontend display
                    try {
                        await chrome.storage.local.set({
                            'dailyLimitReached': true,
                            'dailyLimitMessage': limitCheck.message,
                            'dailyLimitTime': new Date().toISOString()
                        });
                    } catch (error) {
                        debugLog('Error storing daily limit info:', error);
                    }
                    
                    // Stop the auto-apply process immediately
                    if (typeof window !== 'undefined' && window.requestAutoApplyStop) {
                        window.requestAutoApplyStop('daily_limit_reached');
                    }
                    
                    // Send message to background to stop auto-apply
                    try {
                        await chrome.runtime.sendMessage({
                            action: 'stopAutoApply',
                            reason: 'daily_limit_reached'
                        });
                    } catch (error) {
                        debugLog('Error sending stop message to background:', error);
                    }
                    
                    debugLog('Auto-apply stopped gracefully due to daily limit detected from disabled button');
                    return 'daily_limit_reached';
                }
                
                debugLog('Job already applied (not due to daily limit). Skipping...');
                sendStatusUpdate('Job already applied. Skipping...', 'info');
                return 'disabled_button'; // Signal that button was disabled
            }
            
            // Get job info
            const jobInfo = await LinkedInJobInfo.getAllJobInfo();
            

            
            if (!jobInfo) {
                debugLog('ERROR: Job info is null, cannot proceed');
                return 'no_job_info';
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
            
            // Check for Easy Apply daily limit before clicking
            const limitCheck = await LinkedInForm.checkEasyApplyLimit();
            if (limitCheck.hasLimit) {
                debugLog(`Easy Apply limit reached: ${limitCheck.message}`);
                sendStatusUpdate(`Auto-apply completed - Daily limit reached`, 'info');
                
                // Store the limit message for frontend display
                try {
                    await chrome.storage.local.set({
                        'dailyLimitReached': true,
                        'dailyLimitMessage': limitCheck.message,
                        'dailyLimitTime': new Date().toISOString()
                    });
                } catch (error) {
                    debugLog('Error storing daily limit info:', error);
                }
                
                // Stop the auto-apply process immediately using global stop function
                if (typeof window !== 'undefined' && window.requestAutoApplyStop) {
                    window.requestAutoApplyStop('daily_limit_reached');
                }
                
                // Send message to background to stop auto-apply
                try {
                    await chrome.runtime.sendMessage({
                        action: 'stopAutoApply',
                        reason: 'daily_limit_reached'
                    });
                } catch (error) {
                    debugLog('Error sending stop message to background:', error);
                }
                
                debugLog('Auto-apply stopped gracefully due to daily limit');
                return; // Return gracefully instead of throwing error
            }
            
            // Click Easy Apply button
            await LinkedInJobInteraction.clickEasyApply();
            
            // Wait for the form to load
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            if (await shouldStop(isAutoApplyRunning)) {
                this.debugLog("Stop requested before form processing");
                return 'stopped';
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
            return 'success'; // Successfully processed job
        } catch (error) {
            console.error('Error processing job:', error);
            debugLog('Error processing job:', { error: error.message, stack: error.stack });
            sendStatusUpdate('Error processing job. Continuing to next one...', 'error');
            // Keep forms open as requested by user
            return 'error'; // Error occurred during processing
        }
    }


}

export default LinkedInJobPage;
export { LinkedInJob };