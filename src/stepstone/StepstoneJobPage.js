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
            
            // Open job in new tab and switch to it immediately
            console.log('[StepstoneJobPage] Opening job in new tab...');
            jobTab = await TabManager.openNewTab(jobInfo.url, true); // Open and activate immediately
            
            if (!jobTab || !jobTab.id) {
                console.log('[StepstoneJobPage] Failed to open job tab');
                return 'error';
            }
            
            console.log(`[StepstoneJobPage] Job opened in tab ${jobTab.id}`);
            console.log('[StepstoneJobPage] ✅ Switched to job tab - staying here until completion or timeout');
            
            // Wait for tab to initialize
            await this.wait(3000);
            
            // Try to wait for the job page to load completely  
            try {
                await TabManager.waitForTabLoad(jobTab.id, 30000);
                console.log('[StepstoneJobPage] Job page loaded successfully');
            } catch (loadError) {
                console.error('[StepstoneJobPage] Error waiting for tab load:', loadError.message);
                console.log('[StepstoneJobPage] Tab may have closed, been blocked, or redirected externally');
                // Close tab and return to main
                await TabManager.closeTab(jobTab.id);
                await TabManager.switchToTab(mainTabId);
                return 'error';
            }
            
            // Additional wait to ensure all dynamic content is loaded
            await this.wait(3000);
            console.log('[StepstoneJobPage] Finished waiting for dynamic content');
            
            // Check if stop was requested
            if (await shouldStop(isAutoApplyRunning)) {
                console.log('[StepstoneJobPage] Stop requested - closing job tab and returning to main');
                await TabManager.closeTab(jobTab.id);
                await TabManager.switchToTab(mainTabId);
                return 'stopped';
            }
            
            // Check if we're already on an application page
            try {
                const currentTab = await TabManager.getCurrentTab();
                if (currentTab && currentTab.url && currentTab.url.includes('/application/')) {
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('📍 [StepstoneJobPage] Already on application page');
                    console.log('   The form will be processed automatically by auto-start');
                    console.log('   NOT sending processJobInTab message (to avoid channel errors)');
                    console.log('   Polling for completion or stop...');
                    console.log('   URL:', currentTab.url);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    // Poll for form completion or stop request
                    const result = await this.pollForFormCompletion(jobTab.id, mainTabId, isAutoApplyRunning);
                    return result;
                }
            } catch (urlCheckError) {
                console.log('⚠️  Could not check current URL, proceeding with normal flow');
            }
            
            // If not on application page yet, send message to process job
            console.log('[StepstoneJobPage] Not on application page yet - sending process message...');
            console.log('[StepstoneJobPage] Target tab ID:', jobTab.id);
            
            let response = null;
            let lastError = null;
            
            // Try up to 3 times to send the message
            for (let attempt = 1; attempt <= 3; attempt++) {
                try {
                    console.log(`[StepstoneJobPage] Attempt ${attempt} to send message...`);
                    
                    response = await TabManager.sendMessageToTab(jobTab.id, {
                        action: 'processJobInTab',
                        jobInfo: jobInfo,
                        userData: window.currentUserData,
                        aiSettings: window.currentAiSettings
                    });
                    
                    console.log(`[StepstoneJobPage] Message sent successfully on attempt ${attempt}`);
                    break; // Success, exit retry loop
                    
                } catch (error) {
                    lastError = error;
                    console.error(`[StepstoneJobPage] Attempt ${attempt} failed:`, error.message);
                    
                    if (attempt < 3) {
                        console.log(`[StepstoneJobPage] Retrying in ${attempt} second(s)...`);
                        await this.wait(attempt * 1000);
                    }
                }
            }
            
            if (!response) {
                console.error('[StepstoneJobPage] Failed to send message after 3 attempts');
                console.error('[StepstoneJobPage] Last error:', lastError);
                
                // Close tab and return to main on communication failure
                await TabManager.closeTab(jobTab.id);
                await TabManager.switchToTab(mainTabId);
                return 'error';
            }
            
            // Check if job was skipped (already applied or external form) - handle immediately without polling
            if (response.result === 'skipped' || response.result === 'already_applied' || response.result === 'external_form') {
                const reasonMsg = response.result === 'external_form' 
                    ? 'External form detected (redirected to non-StepStone domain)' 
                    : 'Already applied or skipped';
                console.log(`[StepstoneJobPage] Job ${response.result} - closing tab immediately`);
                console.log('[StepstoneJobPage] Reason:', response.reason || reasonMsg);
                
                // Close tab and return to main immediately
                await TabManager.closeTab(jobTab.id);
                await TabManager.switchToTab(mainTabId);
                return response.result === 'external_form' ? 'skipped' : (response.result || 'skipped');
            }
            
            // Poll for form completion after receiving initial response
            console.log('[StepstoneJobPage] Received initial response, polling for completion...');
            console.log(`   Response result: ${response?.result || 'unknown'}`);
            
            // If response indicates processing (like when auto-start needs to run), poll for completion
            // Otherwise, if it's success/skipped/error, handle it appropriately
            if (response && response.result === 'processing') {
                console.log('[StepstoneJobPage] Form is being processed, polling for completion...');
                const result = await this.pollForFormCompletion(jobTab.id, mainTabId, isAutoApplyRunning);
                return result;
            } else if (response && (response.result === 'success' || response.result === 'skipped' || response.result === 'error')) {
                // If we got a definitive result, use it (but still poll briefly to ensure status is set if needed)
                console.log(`[StepstoneJobPage] Got ${response.result} result, verifying via polling...`);
                const pollResult = await this.pollForFormCompletion(jobTab.id, mainTabId, isAutoApplyRunning);
                return pollResult || response.result;
            } else {
                // Default: poll for completion
                const result = await this.pollForFormCompletion(jobTab.id, mainTabId, isAutoApplyRunning);
                return result;
            }
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error processing job:', error);
            
            console.log('[StepstoneJobPage] ❌ Error occurred - cleaning up');
            
            // Cleanup: close job tab if it was opened
            if (jobTab && jobTab.id) {
                try {
                    await TabManager.closeTab(jobTab.id);
                    console.log('[StepstoneJobPage] Job tab closed after error');
                } catch (closeError) {
                    console.error('[StepstoneJobPage] Error closing job tab during cleanup:', closeError);
                }
            }
            
            // Return to main tab
            if (mainTabId) {
                try {
                    await TabManager.switchToTab(mainTabId);
                    console.log('[StepstoneJobPage] Returned to main tab after error');
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
            console.log('[StepstoneJobPage] Current URL:', window.location.href);
            
            // Check if we're already on an application page
            // If the page shows "Bewerbung fortsetzen" button, we need to handle it, not return immediately
            if (window.location.href.includes('/application/')) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('📍 [StepstoneJobPage] Already on application page');
                console.log('   URL:', window.location.href);
                
                // Check if there's a "Bewerbung fortsetzen" button - if so, we need to process it
                const continueButton = await StepstoneForm.findContinueApplicationButton();
                
                if (continueButton) {
                    console.log('   Found "Bewerbung fortsetzen" button - processing it...');
                    // Extract job info and process the button click and form flow
                    const detailedJobInfo = await StepstoneJobInfo.extractJobInfo();
                    const finalJobInfo = jobInfo ? { ...jobInfo, ...detailedJobInfo } : detailedJobInfo;
                    
                    const applicationResult = await StepstoneForm.handleCompleteApplicationFlow(
                        finalJobInfo,
                        userData,
                        () => shouldStop(isAutoApplyRunning)
                    );
                    return applicationResult;
                } else {
                    console.log('   No "Bewerbung fortsetzen" button - form should auto-start');
                    console.log('   Waiting for auto-start to complete (will be detected via polling)...');
                    // Don't return immediately - let the polling detect when form completes
                    // The auto-start process will run and set status when done
                    return { result: 'processing', reason: 'Waiting for auto-start to complete' };
                }
            }
            
            // Wait for page to be fully loaded and interactive
            console.log('[StepstoneJobPage] Waiting for page to be fully loaded...');
            await this.wait(3000);
            
            // Additional check: wait for page readyState
            let attempts = 0;
            while (document.readyState !== 'complete' && attempts < 10) {
                console.log('[StepstoneJobPage] Page not complete yet, waiting... (attempt', attempts + 1, ')');
                await this.wait(500);
                attempts++;
            }
            console.log('[StepstoneJobPage] Page readyState:', document.readyState);
            
            // Extract detailed job information from the current page
            const detailedJobInfo = await StepstoneJobInfo.extractJobInfo();
            const finalJobInfo = { ...jobInfo, ...detailedJobInfo };
            
            console.log('[StepstoneJobPage] Extracted detailed job info');
            
            // Check if application form is available / find apply button
            console.log('[StepstoneJobPage] Looking for apply button...');
            console.log('[StepstoneJobPage] Searching for button[data-testid="harmonised-apply-button"]');
            const buttonResult = await this.findApplyButton();
            
            if (!buttonResult) {
                console.log('[StepstoneJobPage] Error finding apply button for:', finalJobInfo.title);
                return { result: 'error', reason: 'Error finding apply button' };
            }
            
            // Check if already applied
            if (buttonResult.alreadyApplied) {
                console.log('[StepstoneJobPage] Job already applied for:', finalJobInfo.title);
                console.log('[StepstoneJobPage] Returning skipped response (already applied)');
                return { result: 'skipped', reason: 'Already applied' };
            }
            
            // Check if button was found
            if (!buttonResult.button) {
                console.log('[StepstoneJobPage] No apply button found for:', finalJobInfo.title);
                console.log('[StepstoneJobPage] Reason:', buttonResult.reason || 'Unknown');
                return { result: 'skipped', reason: buttonResult.reason || 'No apply button found' };
            }
            
            console.log('[StepstoneJobPage] Apply button found and enabled!');
            
            // Store current URL before clicking
            const currentUrl = window.location.href;
            console.log('[StepstoneJobPage] Current URL before click:', currentUrl);
            
            // Click the apply button ("Jetzt bewerben" / "Apply now")
            console.log('[StepstoneJobPage] Clicking apply button...');
            buttonResult.button.click();
            
            // Wait for URL to change (form loads on different URL)
            console.log('[StepstoneJobPage] Waiting for form page to load...');
            const urlChanged = await this.waitForUrlChange(currentUrl, 10000);
            
            if (!urlChanged) {
                console.log('[StepstoneJobPage] URL did not change after clicking apply button');
                return { result: 'error', reason: 'Form page did not load' };
            }
            
            console.log('[StepstoneJobPage] Application page loaded, new URL:', window.location.href);
            
            // Wait for page to be ready
            await this.wait(2000);
            
            // Delegate complete application flow to StepstoneForm with stop callback
            const shouldStopCallback = async () => await shouldStop(isAutoApplyRunning);
            const applicationResult = await StepstoneForm.handleCompleteApplicationFlow(finalJobInfo, userData, shouldStopCallback);
            
            // Check result - handle external form specially
            if (applicationResult.result === 'external_form') {
                console.log('[StepstoneJobPage] External form detected - will skip this job');
                return { result: 'external_form', reason: applicationResult.reason || 'Redirected to external form' };
            }
            
            if (applicationResult.result !== 'success') {
                return applicationResult; // Return error/skip result
            }
            
            // Track the application
            await this.trackApplication(finalJobInfo, true, 'Application completed successfully');
            
            return applicationResult;
            
        } catch (error) {
            console.error('[StepstoneJobPage] Error processing job in tab:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Find the apply button on job detail page
     * StepStone uses a harmonised apply button with data-testid="harmonised-apply-button"
     * The button is disabled if already applied ("Schon beworben")
     * @returns {Promise<Object|null>} - Object with button element and status, or null
     */
    static async findApplyButton() {
        try {
            console.log('[StepstoneJobPage] Starting button search...');
            
            // Import selectors
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            
            // Debug: log all buttons on the page
            const allButtons = document.querySelectorAll('button');
            console.log(`[StepstoneJobPage] Total buttons on page: ${allButtons.length}`);
            
            // Primary selector - StepStone's harmonised apply button
            const harmonisedButton = document.querySelector(StepstoneSelectors.jobPage.applyButton[0]);
            
            if (harmonisedButton) {
                const isDisabled = harmonisedButton.hasAttribute('disabled') || harmonisedButton.disabled;
                const buttonText = harmonisedButton.textContent.trim();
                
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🔘 FOUND: harmonised-apply-button');
                console.log('   Text:', buttonText);
                console.log('   Disabled:', isDisabled);
                console.log('   Visible:', harmonisedButton.offsetParent !== null);
                console.log('   testid:', harmonisedButton.getAttribute('data-testid'));
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                if (isDisabled) {
                    // Button is disabled - job already applied
                    console.log('❌ Button disabled - Job already applied');
                    return { button: null, alreadyApplied: true, reason: 'Already applied' };
                }
                
                // Button is enabled - can apply
                console.log('✅ Apply button is ENABLED and CLICKABLE');
                return { button: harmonisedButton, alreadyApplied: false };
            } else {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('❌ harmonised-apply-button NOT FOUND');
                console.log('   All buttons on page:');
                
                // Debug: log ALL buttons with their details
                for (let i = 0; i < allButtons.length; i++) {
                    const btn = allButtons[i];
                    const text = btn.textContent.trim();
                    const testId = btn.getAttribute('data-testid');
                    const ariaLabel = btn.getAttribute('aria-label');
                    
                    if (text.length > 0 && text.length < 100) {
                        console.log(`   Button ${i}: "${text}"`);
                        console.log(`      disabled: ${btn.disabled}, testid: ${testId}, aria: ${ariaLabel}`);
                    }
                }
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            }
            
            // Fallback: Try other apply button patterns
            console.log('[StepstoneJobPage] Harmonised button not found, trying fallback selectors...');
            
            // Use remaining selectors from the list (skip first one which we already tried)
            const fallbackSelectors = StepstoneSelectors.jobPage.applyButton.slice(1);
            
            for (const selector of fallbackSelectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) {
                    console.log('[StepstoneJobPage] Found apply button with fallback selector:', selector);
                    return { button: button, alreadyApplied: false };
                }
            }
            
            // Try text-based search as last resort
            const buttons = document.querySelectorAll('button:not([disabled]), a[role="button"]');
            for (const button of buttons) {
                const text = button.textContent.trim().toLowerCase();
                if (text.includes('jetzt bewerben') || 
                    text.includes('apply now') ||
                    text.includes('ich bin interessiert') ||
                    text.includes('bewerben')) {
                    
                    if (button.offsetParent !== null && !button.disabled) {
                        console.log('[StepstoneJobPage] Found apply button with text:', button.textContent.trim());
                        return { button: button, alreadyApplied: false };
                    }
                }
            }
            
            console.log('[StepstoneJobPage] No apply button found on page');
            return { button: null, alreadyApplied: false, reason: 'No apply button found' };
            
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
            
            // Use the new complete application flow with stop callback
            console.log('[StepstoneJobPage] Starting complete application flow...');
            const shouldStopCallback = async () => await shouldStop(isAutoApplyRunning);
            const result = await StepstoneForm.handleCompleteApplicationFlow(jobInfo, userData, shouldStopCallback);
            
            if (result.result === 'success') {
                console.log(`[StepstoneJobPage] Application completed successfully for: ${jobInfo.title}`);
                
                // Track the application
                await this.trackApplication(jobInfo, true, 'Application completed successfully');
                
                sendStatusUpdate(`Applied to ${jobInfo.title} at ${jobInfo.company}`, 'success');
                return 'success';
            } else {
                console.log(`[StepstoneJobPage] Application failed for: ${jobInfo.title}`);
                console.log(`[StepstoneJobPage] Reason: ${result.reason}`);
                
                // Track the failed application
                await this.trackApplication(jobInfo, false, result.reason || 'Application failed');
                return 'error';
            }
            
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
     * Wait for URL to change (indicating navigation to form page)
     * @param {string} originalUrl - The URL before clicking apply
     * @param {number} timeout - Maximum time to wait in milliseconds
     * @returns {Promise<boolean>} - true if URL changed, false if timeout
     */
    static async waitForUrlChange(originalUrl, timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            if (window.location.href !== originalUrl) {
                console.log('[StepstoneJobPage] URL changed detected');
                return true;
            }
            await this.wait(500); // Check every 500ms
        }
        
        console.log('[StepstoneJobPage] Timeout waiting for URL change');
        return false;
    }
    
    /**
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    /**
     * Poll for form completion or stop request
     * @param {number} jobTabId - Job tab ID
     * @param {number} mainTabId - Main tab ID
     * @param {Object} isAutoApplyRunning - Auto-apply running flag
     * @returns {Promise<string>} - Result status
     */
    static async pollForFormCompletion(jobTabId, mainTabId, isAutoApplyRunning) {
        console.log('[StepstoneJobPage] 🔄 Polling for form completion or stop...');
        console.log(`   Job tab ID: ${jobTabId}, Main tab ID: ${mainTabId}`);
        
        const maxWaitTime = 10000; // 10 seconds
        const pollInterval = 200; // Check every 200ms for faster detection and tab closure
        const startTime = Date.now();
        
        while (true) {
            const elapsed = Date.now() - startTime;
            
            // Check if stop was requested
            if (await shouldStop(isAutoApplyRunning)) {
                console.log('⏸️  [StepstoneJobPage] Stop requested - keeping job tab open');
                console.log('[StepstoneJobPage] 🔄 Returning to main tab (tab stays open)');
                await TabManager.switchToTab(mainTabId);
                return 'stopped';
            }
            
            // Check for form completion status in storage
            try {
                const statusResult = await chrome.storage.local.get(['stepstoneFormStatus']);
                if (statusResult.stepstoneFormStatus) {
                    const status = statusResult.stepstoneFormStatus;
                    console.log('[StepstoneJobPage] Form status:', status);
                    
                    if (status.completed) {
                        console.log('[StepstoneJobPage] ✅ Form completed successfully');
                        console.log(`   Application ID: ${status.applicationId || 'N/A'}`);
                        
                        // Clear the status
                        await chrome.storage.local.remove(['stepstoneFormStatus']);
                        
                        // Close tab and return to main
                        console.log('[StepstoneJobPage] 🔒 Closing job tab and returning to main tab...');
                        try {
                            await TabManager.closeTab(jobTabId);
                            console.log('[StepstoneJobPage] ✅ Job tab closed successfully');
                        } catch (closeError) {
                            console.error('[StepstoneJobPage] Error closing job tab:', closeError);
                            // Continue anyway - try to switch to main tab
                        }
                        
                        try {
                            await TabManager.switchToTab(mainTabId);
                            console.log('[StepstoneJobPage] ✅ Returned to main tab - ready to continue with next job');
                        } catch (switchError) {
                            console.error('[StepstoneJobPage] Error switching to main tab:', switchError);
                        }
                        
                        return status.result || 'success';
                    }
                    
                    // Check if external form was detected (via auto-start or button click)
                    if (status.result === 'external_form' || status.shouldCloseTab) {
                        console.log('[StepstoneJobPage] 🌐 External form detected - closing tab');
                        console.log('[StepstoneJobPage] Reason:', status.reason || 'Redirected to external form');
                        
                        // Clear the status
                        await chrome.storage.local.remove(['stepstoneFormStatus']);
                        
                        // Close tab and return to main
                        try {
                            await TabManager.closeTab(jobTabId);
                            await TabManager.switchToTab(mainTabId);
                        } catch (closeError) {
                            console.error('[StepstoneJobPage] Error closing tab for external form:', closeError);
                        }
                        
                        return 'skipped'; // Treat as skipped to continue with next job
                    }
                    
                    if (status.stopped) {
                        console.log('[StepstoneJobPage] ⏸️  Form processing was stopped');
                        
                        // Clear the status
                        await chrome.storage.local.remove(['stepstoneFormStatus']);
                        
                        // Keep tab open, just return to main
                        console.log('[StepstoneJobPage] 🔄 Returning to main tab (job tab stays open)');
                        await TabManager.switchToTab(mainTabId);
                        
                        return 'stopped';
                    }
                    
                    if (status.error) {
                        console.log('[StepstoneJobPage] ❌ Form processing error:', status.errorMessage);
                        
                        // Clear the status
                        await chrome.storage.local.remove(['stepstoneFormStatus']);
                        
                        // Close tab and return to main
                        await TabManager.closeTab(jobTabId);
                        await TabManager.switchToTab(mainTabId);
                        
                        return 'error';
                    }
                }
            } catch (error) {
                console.error('[StepstoneJobPage] Error checking form status:', error);
            }
            
            // Check if timeout exceeded
            if (elapsed >= maxWaitTime) {
                console.log('[StepstoneJobPage] ⏱️  Timeout reached (3 minutes)');
                console.log('[StepstoneJobPage] 🔒 Closing job tab due to timeout');
                await TabManager.closeTab(jobTabId);
                await TabManager.switchToTab(mainTabId);
                return 'timeout';
            }
            
            // Wait before next poll
            await this.wait(pollInterval);
        }
    }
    
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