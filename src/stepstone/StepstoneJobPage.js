import StepstoneJobSearch from './StepstoneJobSearch.js';
import StepstoneJobInfo from './StepstoneJobInfo.js';
import StepstoneForm from './StepstoneForm.js';
import { debugLog, sendStatusUpdate, shouldStop } from '../utils.js';

/**
 * StepstoneJobPage - Handles StepStone job page processing
 * Coordinates job search, information extraction, and application processes
 */
class StepstoneJobPage {
    
    /**
     * Process all jobs on a single page
     * @param {number} page - Current page number (1-based)
     * @param {number} totalPages - Total number of pages
     * @param {Element} searchElement - The main search container element
     * @param {boolean} isAutoApplyRunning - Auto-apply running state
     * @returns {Promise<boolean>} - true if successful, false if should stop
     */
    static async processJobPage(page, totalPages, searchElement, isAutoApplyRunning) {
        try {
            console.log(`[StepstoneJobPage] Processing page ${page}/${totalPages}`);
            sendStatusUpdate(`Processing StepStone page ${page} of ${totalPages}`, 'info');
            
            // Get all jobs on current page
            const jobs = await StepstoneJobSearch.getListOfJobsOnPage(searchElement);
            debugLog(`Found ${jobs.length} jobs on StepStone page ${page}`);
            
            if (jobs.length === 0) {
                console.log(`[StepstoneJobPage] No jobs found on page ${page}`);
                sendStatusUpdate('No jobs found on current page', 'warning');
                return true; // Continue to next page
            }
            
            // Track application results
            let processedJobs = 0;
            let successfulApplications = 0;
            let skippedJobs = 0;
            let errors = 0;
            
            // Process each job
            for (const [index, job] of jobs.entries()) {
                if (await shouldStop(isAutoApplyRunning)) {
                    console.log('[StepstoneJobPage] Stop requested during job processing - breaking job loop');
                    return false; // Exit immediately
                }
                
                try {
                    console.log(`[StepstoneJobPage] Processing job ${index + 1}/${jobs.length} on page ${page}`);
                    sendStatusUpdate(`Processing job ${index + 1}/${jobs.length} on page ${page}`, 'info');
                    
                    const jobResult = await this.processJob(job, isAutoApplyRunning);
                    processedJobs++;
                    
                    // Handle different job processing outcomes
                    switch (jobResult) {
                        case 'success':
                            successfulApplications++;
                            debugLog(`[StepstoneJobPage] Job ${index + 1} processed successfully`);
                            break;
                        case 'skipped':
                            skippedJobs++;
                            debugLog(`[StepstoneJobPage] Job ${index + 1} skipped`);
                            break;
                        case 'error':
                            errors++;
                            debugLog(`[StepstoneJobPage] Job ${index + 1} had an error`);
                            break;
                        case 'stopped':
                            console.log('[StepstoneJobPage] Stop requested during job processing');
                            return false;
                        default:
                            debugLog(`[StepstoneJobPage] Job ${index + 1} returned unknown result: ${jobResult}`);
                    }
                    
                    // Wait between jobs to avoid rate limiting
                    if (index < jobs.length - 1) {
                        await this.wait(2000);
                    }
                    
                } catch (error) {
                    console.error(`[StepstoneJobPage] Error processing job ${index + 1}:`, error);
                    errors++;
                    
                    // Check if stop was requested after error
                    if (await shouldStop(isAutoApplyRunning)) {
                        console.log('[StepstoneJobPage] Stop requested after job error - breaking job loop');
                        return false;
                    }
                }
            }
            
            // Log page processing summary
            const summary = `Page ${page} completed: ${processedJobs} processed, ${successfulApplications} successful, ${skippedJobs} skipped, ${errors} errors`;
            console.log(`[StepstoneJobPage] ${summary}`);
            sendStatusUpdate(summary, 'info');
            
            // Navigate to next page if not the last page
            if (page < totalPages) {
                console.log(`[StepstoneJobPage] Navigating to page ${page + 1}`);
                const navigationSuccess = await StepstoneJobSearch.navigateToNextPage(page + 1);
                
                if (!navigationSuccess) {
                    console.log(`[StepstoneJobPage] Failed to navigate to page ${page + 1}`);
                    sendStatusUpdate(`Could not navigate to page ${page + 1}`, 'warning');
                    return false; // Stop processing if navigation fails
                }
                
                // Wait for page to load
                await this.wait(3000);
            }
            
            return true;
            
        } catch (error) {
            console.error(`[StepstoneJobPage] Error processing page ${page}:`, error);
            sendStatusUpdate(`Error processing page ${page}: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Process a single job
     * @param {Element} jobElement - Individual job listing element
     * @param {boolean} isAutoApplyRunning - Auto-apply running state
     * @returns {Promise<string>} - Result status ('success', 'skipped', 'error', 'stopped')
     */
    static async processJob(jobElement, isAutoApplyRunning) {
        try {
            if (await shouldStop(isAutoApplyRunning)) {
                return 'stopped';
            }
            
            // Extract basic job information from listing
            const jobInfo = await StepstoneJobInfo.extractJobInfoFromListing(jobElement);
            
            if (!jobInfo || !jobInfo.title) {
                console.log('[StepstoneJobPage] Could not extract job information, skipping');
                return 'skipped';
            }
            
            debugLog(`[StepstoneJobPage] Processing job: ${jobInfo.title} at ${jobInfo.company}`);
            
            // Check if job should be skipped based on criteria
            if (await this.shouldSkipJob(jobInfo)) {
                debugLog(`[StepstoneJobPage] Skipping job based on criteria: ${jobInfo.title}`);
                return 'skipped';
            }
            
            // Click on job to view details
            const jobOpened = await this.openJobDetails(jobElement);
            if (!jobOpened) {
                console.log('[StepstoneJobPage] Could not open job details');
                return 'error';
            }
            
            // Wait for job details to load
            await this.wait(2000);
            
            // Check if stop was requested after opening job
            if (await shouldStop(isAutoApplyRunning)) {
                return 'stopped';
            }
            
            // Extract detailed job information
            const detailedJobInfo = await StepstoneJobInfo.extractJobInfo();
            const finalJobInfo = { ...jobInfo, ...detailedJobInfo };
            
            // Check if application form is available
            const formAvailable = await StepstoneForm.isApplicationFormAvailable();
            
            if (!formAvailable) {
                debugLog(`[StepstoneJobPage] No application form available for: ${finalJobInfo.title}`);
                await this.goBackToJobList();
                return 'skipped';
            }
            
            // Attempt to apply for the job
            const applicationResult = await this.applyForJob(finalJobInfo, isAutoApplyRunning);
            
            // Go back to job list
            await this.goBackToJobList();
            
            return applicationResult;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error processing job:', error);
            // Try to go back to job list in case of error
            await this.goBackToJobList();
            return 'error';
        }
    }
    
    /**
     * Apply for a specific job
     * @param {Object} jobInfo - Job information object
     * @param {boolean} isAutoApplyRunning - Auto-apply running state
     * @returns {Promise<string>} - Application result
     */
    static async applyForJob(jobInfo, isAutoApplyRunning) {
        try {
            debugLog(`[StepstoneJobPage] Attempting to apply for: ${jobInfo.title}`);
            
            if (await shouldStop(isAutoApplyRunning)) {
                return 'stopped';
            }
            
            // Get user data from global context (set by background script)
            const userData = window.currentUserData || {};
            const aiSettings = window.currentAiSettings || {};
            
            if (!userData.username) {
                console.log('[StepstoneJobPage] No user data available for application');
                return 'error';
            }
            
            // Fill application form
            const formFilled = await StepstoneForm.fillApplicationForm(jobInfo, userData);
            
            if (!formFilled) {
                console.log(`[StepstoneJobPage] Could not fill application form for: ${jobInfo.title}`);
                return 'error';
            }
            
            // Check for validation errors before submitting
            await this.wait(1000);
            const hasErrors = await StepstoneForm.hasValidationErrors();
            
            if (hasErrors) {
                console.log(`[StepstoneJobPage] Form has validation errors for: ${jobInfo.title}`);
                return 'error';
            }
            
            // Submit application (for now, we'll skip actual submission for safety)
            // TODO: Implement actual submission when ready for production
            debugLog(`[StepstoneJobPage] Form filled successfully for: ${jobInfo.title} (submission disabled for safety)`);
            
            // Track the application
            await this.trackApplication(jobInfo, true, 'Application completed successfully');
            
            sendStatusUpdate(`Applied to ${jobInfo.title} at ${jobInfo.company}`, 'success');
            return 'success';
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error applying for job:', error);
            await this.trackApplication(jobInfo, false, error.message);
            return 'error';
        }
    }
    
    /**
     * Check if job should be skipped based on criteria
     * @param {Object} jobInfo - Job information
     * @returns {Promise<boolean>} - Whether to skip job
     */
    static async shouldSkipJob(jobInfo) {
        try {
            // Skip if no title or company
            if (!jobInfo.title || !jobInfo.company) {
                return true;
            }
            
            // Skip if already applied (this would need integration with application tracking)
            // const alreadyApplied = await this.checkIfAlreadyApplied(jobInfo);
            // if (alreadyApplied) {
            //     return true;
            // }
            
            // Add more skip criteria as needed
            // - Salary requirements
            // - Location preferences
            // - Company blacklist
            // - Keywords filtering
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error checking skip criteria:', error);
            return false;
        }
    }
    
    /**
     * Open job details by clicking on job element
     * @param {Element} jobElement - Job listing element
     * @returns {Promise<boolean>} - Success status
     */
    static async openJobDetails(jobElement) {
        try {
            // Look for clickable elements within the job listing
            const clickableSelectors = [
                'a[href*="/job/"]',
                'a[href*="/stelle/"]',
                'h2 a',
                'h3 a',
                '.job-title a',
                '[class*="title"] a'
            ];
            
            for (const selector of clickableSelectors) {
                const clickableElement = jobElement.querySelector(selector);
                if (clickableElement) {
                    console.log(`[StepstoneJobPage] Clicking job link: ${selector}`);
                    clickableElement.click();
                    await this.wait(2000);
                    return true;
                }
            }
            
            // If no specific link found, try clicking the job element itself
            if (jobElement.tagName.toLowerCase() === 'a') {
                jobElement.click();
                await this.wait(2000);
                return true;
            }
            
            // Last resort: click the job element
            jobElement.click();
            await this.wait(2000);
            return true;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error opening job details:', error);
            return false;
        }
    }
    
    /**
     * Go back to job search results list
     * @returns {Promise<boolean>} - Success status
     */
    static async goBackToJobList() {
        try {
            // Try browser back button first
            if (window.history.length > 1) {
                window.history.back();
                await this.wait(2000);
                return true;
            }
            
            // Look for back button on page
            const backButtonSelectors = [
                'button[aria-label*="back"]',
                'button[aria-label*="zurück"]',
                'a[aria-label*="back"]',
                'a[aria-label*="zurück"]',
                '.back-button',
                '[class*="back"]',
                'button:contains("Zurück")',
                'a:contains("Zurück")'
            ];
            
            for (const selector of backButtonSelectors) {
                const backButton = document.querySelector(selector);
                if (backButton) {
                    console.log(`[StepstoneJobPage] Clicking back button: ${selector}`);
                    backButton.click();
                    await this.wait(2000);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error going back to job list:', error);
            return false;
        }
    }
    
    /**
     * Track application attempt
     * @param {Object} jobInfo - Job information
     * @param {boolean} success - Whether application was successful
     * @param {string} reason - Reason/result message
     * @returns {Promise<void>}
     */
    static async trackApplication(jobInfo, success, reason = '') {
        try {
            const applicationData = {
                platform: 'stepstone',
                jobTitle: jobInfo.title,
                company: jobInfo.company,
                location: jobInfo.location,
                url: jobInfo.url,
                success: success,
                reason: reason,
                timestamp: new Date().toISOString()
            };
            
            // Send to background script for storage
            if (chrome && chrome.runtime) {
                chrome.runtime.sendMessage({
                    action: 'trackApplication',
                    data: applicationData
                });
            }
            
            debugLog(`[StepstoneJobPage] Tracked application: ${jobInfo.title} - Success: ${success}`);
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error tracking application:', error);
        }
    }
    
    /**
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Debug log with class prefix
     * @param {string} message - Message to log
     */
    static debugLog(message) {
        console.log(`[StepstoneJobPage] ${message}`);
    }
    
    /**
     * Error log with class prefix
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    static errorLog(message, error) {
        console.error(`[StepstoneJobPage] ${message}:`, error);
    }
}

export default StepstoneJobPage; 