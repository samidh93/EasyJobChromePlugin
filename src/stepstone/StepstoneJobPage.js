import StepstoneJobSearch from './StepstoneJobSearch.js';
import StepstoneJobInfo from './StepstoneJobInfo.js';
import StepstoneForm from './StepstoneForm.js';
import TabManager from '../utils/TabManager.js';
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
     * Process a single job using multi-tab workflow
     * @param {Element} jobElement - Individual job listing element
     * @param {boolean} isAutoApplyRunning - Auto-apply running state
     * @returns {Promise<string>} - Result status ('success', 'skipped', 'error', 'stopped')
     */
    static async processJob(jobElement, isAutoApplyRunning) {
        let jobTab = null;
        const mainTabId = window.mainSearchTabId;
        
        try {
            if (await shouldStop(isAutoApplyRunning)) {
                return 'stopped';
            }
            
            // Extract basic job information from listing (including URL)
            const jobInfo = await StepstoneJobInfo.extractJobInfoFromListing(jobElement);
            
            if (!jobInfo || !jobInfo.title || !jobInfo.url) {
                console.log('[StepstoneJobPage] Could not extract job information or URL, skipping');
                return 'skipped';
            }
            
            debugLog(`[StepstoneJobPage] Processing job: ${jobInfo.title} at ${jobInfo.company}`);
            debugLog(`[StepstoneJobPage] Job URL: ${jobInfo.url}`);
            
            // Check if job should be skipped based on criteria
            if (await this.shouldSkipJob(jobInfo)) {
                debugLog(`[StepstoneJobPage] Skipping job based on criteria: ${jobInfo.title}`);
                return 'skipped';
            }
            
            // Open job in new tab
            console.log('[StepstoneJobPage] Opening job in new tab...');
            jobTab = await TabManager.openNewTab(jobInfo.url, true);
            
            if (!jobTab || !jobTab.id) {
                console.log('[StepstoneJobPage] Failed to open job tab');
                return 'error';
            }
            
            console.log(`[StepstoneJobPage] Job opened in tab ${jobTab.id}`);
            
            // Wait for the job page to load completely
            await TabManager.waitForTabLoad(jobTab.id, 30000);
            console.log('[StepstoneJobPage] Job page loaded');
            
            // Additional wait to ensure all dynamic content is loaded
            await this.wait(3000);
            
            // Check if stop was requested
            if (await shouldStop(isAutoApplyRunning)) {
                await TabManager.closeTab(jobTab.id);
                await TabManager.switchToTab(mainTabId);
                return 'stopped';
            }
            
            // Send message to job tab to process the application
            console.log('[StepstoneJobPage] Sending process message to job tab...');
            
            try {
                const response = await TabManager.sendMessageToTab(jobTab.id, {
                    action: 'processJobInTab',
                    jobInfo: jobInfo,
                    userData: window.currentUserData,
                    aiSettings: window.currentAiSettings
                });
                
                console.log('[StepstoneJobPage] Received response from job tab:', response);
                
                // Close the job tab after processing
                await this.wait(2000); // Brief wait to see the result
                await TabManager.closeTab(jobTab.id);
                
                // Switch back to main search tab
                await TabManager.switchToTab(mainTabId);
                await this.wait(1000);
                
                return response?.result || 'error';
                
            } catch (messageError) {
                console.error('[StepstoneJobPage] Error communicating with job tab:', messageError);
                
                // Try to close the job tab
                try {
                    await TabManager.closeTab(jobTab.id);
                } catch (closeError) {
                    console.error('[StepstoneJobPage] Error closing job tab:', closeError);
                }
                
                // Switch back to main tab
                try {
                    await TabManager.switchToTab(mainTabId);
                } catch (switchError) {
                    console.error('[StepstoneJobPage] Error switching to main tab:', switchError);
                }
                
                return 'error';
            }
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error processing job:', error);
            
            // Cleanup: close job tab if it was opened
            if (jobTab && jobTab.id) {
                try {
                    await TabManager.closeTab(jobTab.id);
                } catch (closeError) {
                    console.error('[StepstoneJobPage] Error closing job tab during cleanup:', closeError);
                }
            }
            
            // Return to main tab
            if (mainTabId) {
                try {
                    await TabManager.switchToTab(mainTabId);
                } catch (switchError) {
                    console.error('[StepstoneJobPage] Error switching to main tab during cleanup:', switchError);
                }
            }
            
            return 'error';
        }
    }
    
    /**
     * Process job application in the job detail tab
     * This method runs in the context of the job detail page (new tab)
     * @param {Object} jobInfo - Job information from listing
     * @param {Object} userData - User data
     * @param {Object} aiSettings - AI settings
     * @returns {Promise<Object>} - Result with status
     */
    static async processJobInTab(jobInfo, userData, aiSettings) {
        try {
            console.log('[StepstoneJobPage] Processing job in tab:', jobInfo.title);
            
            // Wait for page to be fully loaded
            await this.wait(2000);
            
            // Extract detailed job information from the current page
            const detailedJobInfo = await StepstoneJobInfo.extractJobInfo();
            const finalJobInfo = { ...jobInfo, ...detailedJobInfo };
            
            console.log('[StepstoneJobPage] Extracted detailed job info');
            
            // Check if application form is available / find "I'm interested" button
            const applyButton = await this.findApplyButton();
            
            if (!applyButton) {
                console.log('[StepstoneJobPage] No apply button found for:', finalJobInfo.title);
                return { result: 'skipped', reason: 'No apply button found' };
            }
            
            // Click the apply button ("Ich bin interessiert" / "I'm interested")
            console.log('[StepstoneJobPage] Clicking apply button...');
            applyButton.click();
            
            // Wait for form to appear
            await this.wait(3000);
            
            // Check if application form is available
            const formAvailable = await StepstoneForm.isApplicationFormAvailable();
            
            if (!formAvailable) {
                console.log('[StepstoneJobPage] No application form available for:', finalJobInfo.title);
                return { result: 'skipped', reason: 'No application form available' };
            }
            
            // Fill application form
            const formFilled = await StepstoneForm.fillApplicationForm(finalJobInfo, userData);
            
            if (!formFilled) {
                console.log('[StepstoneJobPage] Could not fill application form for:', finalJobInfo.title);
                return { result: 'error', reason: 'Could not fill form' };
            }
            
            // Check for validation errors before submitting
            await this.wait(1000);
            const hasErrors = await StepstoneForm.hasValidationErrors();
            
            if (hasErrors) {
                console.log('[StepstoneJobPage] Form has validation errors for:', finalJobInfo.title);
                return { result: 'error', reason: 'Form validation errors' };
            }
            
            // Submit application (for now, we'll skip actual submission for safety)
            // TODO: Implement actual submission when ready for production
            console.log('[StepstoneJobPage] Form filled successfully (submission disabled for safety)');
            
            // Track the application
            await this.trackApplication(finalJobInfo, true, 'Application completed successfully');
            
            return { 
                result: 'success', 
                message: `Applied to ${finalJobInfo.title} at ${finalJobInfo.company}`,
                jobInfo: finalJobInfo
            };
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error processing job in tab:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Find the apply button on job detail page
     * StepStone uses "Ich bin interessiert" or "Jetzt bewerben" buttons
     * @returns {Promise<Element|null>} - Apply button element
     */
    static async findApplyButton() {
        try {
            // StepStone apply button selectors (German and English)
            const applyButtonSelectors = [
                'button:has-text("Ich bin interessiert")',
                'button:has-text("Jetzt bewerben")',
                'button:has-text("Apply now")',
                'button:has-text("I\'m interested")',
                'button[class*="apply"]:not([disabled])',
                'button[class*="bewerbung"]:not([disabled])',
                'a[class*="apply"]',
                'a[class*="bewerbung"]',
                '[data-testid*="apply"]',
                '.apply-button:not([disabled])',
                '.bewerbung-button:not([disabled])'
            ];
            
            // Try text-based search first (most reliable for StepStone)
            const buttons = document.querySelectorAll('button, a[role="button"]');
            for (const button of buttons) {
                const text = button.textContent.trim().toLowerCase();
                if (text.includes('ich bin interessiert') || 
                    text.includes('jetzt bewerben') || 
                    text.includes('apply now') ||
                    text.includes('interested')) {
                    
                    // Check if button is visible and not disabled
                    if (button.offsetParent !== null && !button.disabled) {
                        console.log('[StepstoneJobPage] Found apply button with text:', button.textContent.trim());
                        return button;
                    }
                }
            }
            
            // Fallback to selector-based search
            for (const selector of applyButtonSelectors) {
                // Skip :has-text selectors as they're not standard CSS
                if (selector.includes(':has-text')) continue;
                
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    console.log('[StepstoneJobPage] Found apply button with selector:', selector);
                    return button;
                }
            }
            
            console.log('[StepstoneJobPage] No apply button found');
            return null;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error finding apply button:', error);
            return null;
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