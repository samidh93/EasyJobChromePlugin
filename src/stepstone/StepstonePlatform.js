import BasePlatform from '../platform/BasePlatform.js';
import StepstoneJobSearch from './StepstoneJobSearch.js';
import StepstoneJobPage from './StepstoneJobPage.js';
import StepstoneJobInfo from './StepstoneJobInfo.js';
import StepstoneForm from './StepstoneForm.js';
import { debugLog, sendStatusUpdate, shouldStop } from '../utils.js';

/**
 * StepstonePlatform - StepStone implementation of the platform abstraction
 * Provides complete StepStone auto-apply functionality
 */
class StepstonePlatform extends BasePlatform {
    constructor() {
        super('StepStone');
        this.config = {
            maxJobsPerPage: 20, // StepStone typically shows 20 jobs per page
            maxPages: 50, // StepStone limitation
            waitBetweenApplications: 2500,
            waitBetweenPages: 2500,
            supportedFileTypes: ['pdf', 'doc', 'docx']
        };
        this.selectors = {
            // Use stable selectors instead of dynamic CSS-in-JS classes
            searchContainer: '.at-facets-header-title', // Stable semantic class
            jobCountElement: '[data-at="search-jobs-count"]', // Stable data attribute
            jobListings: 'article[data-at="job-item"][class^="res"]', // Verified working selector 
            jobTitle: '[data-testid="job-item-title"]', // Verified working selector
            company: '[data-at="job-item-company-name"]', // Verified working selector
            location: '[data-at="job-item-location"]', // Verified working selector
            workType: '[data-at="job-item-work-from-home"]', // Verified working selector
            applyButton: 'button[class*="apply"], .apply-button, [data-testid*="apply"]'
        };
    }

    // ================================
    // REQUIRED INTERFACE METHODS
    // ================================

    /**
     * Start the auto-apply process for StepStone
     * This mirrors the original content script logic
     */
    async startAutoApply() {
        try {
            // Check if already running to prevent multiple instances
            if (this.isAutoApplyRunning()) {
                this.debugLog('StepStone auto-apply already running, skipping duplicate start');
                return;
            }
            
            // Check if we should resume from a page reload
            let resumeFromPage = null;
            try {
                const paginationState = await chrome.storage.local.get(['stepstonePaginationState', 'stepstoneAutoApplyRunning']);
                if (paginationState.stepstoneAutoApplyRunning === true && paginationState.stepstonePaginationState) {
                    resumeFromPage = paginationState.stepstonePaginationState.currentPage;
                    this.debugLog(`Resuming auto-apply from page ${resumeFromPage} after page reload`);
                    sendStatusUpdate(`Resuming auto-apply from page ${resumeFromPage}...`, 'info');
                }
            } catch (error) {
                this.debugLog('Error checking resume state:', error);
            }
            
            this.debugLog('Starting StepStone auto-apply process');
            this.setAutoApplyRunning(true);
            this.resetStopFlag();
            
            // Store running state for resume logic
            try {
                await chrome.storage.local.set({ 'stepstoneAutoApplyRunning': true });
            } catch (error) {
                this.debugLog('Error storing auto-apply running state:', error);
            }

            // Check if on correct page
            if (!this.isCurrentPlatform()) {
                throw new Error('Not on StepStone platform');
            }
            
            // Fetch and store resume ID (similar to LinkedIn)
            try {
                const resumeResult = await chrome.storage.local.get(['currentResumeId']);
                
                if (!resumeResult.currentResumeId && window.currentUserData) {
                    this.debugLog('Fetching default resume ID...');
                    const response = await chrome.runtime.sendMessage({
                        action: 'apiRequest',
                        method: 'GET',
                        url: `/users/${window.currentUserData.id}/resumes/default`
                    });
                    
                    if (response && response.success && response.resume) {
                        await chrome.storage.local.set({ 'currentResumeId': response.resume.id });
                        this.debugLog(`Resume ID stored: ${response.resume.id}`);
                    } else {
                        this.debugLog('Failed to get default resume from database');
                    }
                } else if (resumeResult.currentResumeId) {
                    this.debugLog(`Using existing resume ID: ${resumeResult.currentResumeId}`);
                }
            } catch (error) {
                this.debugLog('Error fetching resume ID:', error);
                // Continue even if resume fetch fails
            }

            // Find the search element - use stable selectors first
            let searchElement = document.querySelector(this.selectors.searchContainer);
            
            // Fallback selectors for main search area - avoid dynamic classes
            if (!searchElement) {
                const fallbackSelectors = [
                    'h1[class*="facets-header"]', // More specific than searchContainer
                    '[data-genesis-element="TEXT"]:has([data-at="search-jobs-count"])', // Look for container with job count
                    'h1:has([data-at="search-jobs-count"])', // Any h1 with job count
                    '[class*="search-results"]',
                    '[class*="job-results"]',
                    'main',
                    '[role="main"]',
                    'body'
                ];
                
                for (const selector of fallbackSelectors) {
                    searchElement = document.querySelector(selector);
                    if (searchElement) {
                        this.debugLog(`Using fallback search container: ${selector}`);
                        break;
                    }
                }
            }

            if (!searchElement) {
                sendStatusUpdate('Could not find jobs list. Please make sure you are on StepStone jobs page.', 'error');
                throw new Error('StepStone jobs search container not found');
            }

            // Get total jobs count
            const totalJobs = await this.getTotalJobsCount(searchElement);
            sendStatusUpdate(`Found ${totalJobs} jobs to process on StepStone`, 'info');

            if (totalJobs === 0) {
                sendStatusUpdate('No jobs found to process on StepStone', 'warning');
                return;
            }

            // Get available pages
            const totalPages = await this.getAvailablePages(searchElement, totalJobs);

            // Determine starting page (resume from saved state or start from 1)
            let startPage = resumeFromPage || 1;
            if (startPage > totalPages) {
                this.debugLog(`Resume page ${startPage} is beyond total pages ${totalPages}, starting from page 1`);
                startPage = 1;
            }
            
            this.debugLog(`Starting from page ${startPage} of ${totalPages} (resume: ${!!resumeFromPage})`);

            // Process each page
            for (let page = startPage; page <= totalPages; page++) {
                this.debugLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                this.debugLog(`Starting page ${page} of ${totalPages}`);
                this.debugLog(`Current URL: ${window.location.href}`);
                this.debugLog(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
                
                if (this.isStopRequested() || await shouldStop(this.isAutoApplyRunning)) {
                    this.debugLog('Stop requested during page processing');
                    return;
                }

                const pageProcessed = await this.processJobPage(page, totalPages, searchElement, this.isAutoApplyRunning);
                
                // If page processing failed or stop was requested, break
                if (pageProcessed === false) {
                    this.debugLog('Page processing returned false - stopping auto-apply');
                    break;
                }
                
                // Check if we're still on the same page after navigation (may have reloaded)
                // If page reloaded, the loop will stop because script context reset
                // This is expected if navigation used URL manipulation
                const currentUrl = window.location.href;
                this.debugLog(`After page ${page} processing, current URL: ${currentUrl}`);
                this.debugLog(`Loop will continue to page ${page + 1} if not last page`);
                
                // Refresh searchElement after navigation (in case DOM changed)
                // This ensures we have a valid reference for the next page
                if (page < totalPages) {
                    this.debugLog(`Refreshing searchElement for page ${page + 1}...`);
                    let refreshedSearchElement = document.querySelector(this.selectors.searchContainer);
                    if (!refreshedSearchElement) {
                        // Try fallback selectors
                        const fallbackSelectors = [
                            'h1[class*="facets-header"]',
                            '[data-genesis-element="TEXT"]:has([data-at="search-jobs-count"])',
                            'h1:has([data-at="search-jobs-count"])',
                            '[class*="search-results"]',
                            '[class*="job-results"]',
                            'main',
                            '[role="main"]',
                            'body'
                        ];
                        
                        for (const selector of fallbackSelectors) {
                            refreshedSearchElement = document.querySelector(selector);
                            if (refreshedSearchElement) {
                                this.debugLog(`Refreshed searchElement after navigation using: ${selector}`);
                                searchElement = refreshedSearchElement;
                                break;
                            }
                        }
                    } else {
                        searchElement = refreshedSearchElement;
                        this.debugLog('Refreshed searchElement after navigation');
                    }
                }
                
                // Additional stop check after each page
                if (this.isStopRequested() || await shouldStop(this.isAutoApplyRunning)) {
                    this.debugLog('Stop requested after page processing');
                    break;
                }
            }

            this.debugLog('StepStone auto-apply process completed');
            sendStatusUpdate('StepStone auto-apply process completed', 'success');

        } catch (error) {
            this.errorLog('Error in StepStone auto-apply process', error);
            sendStatusUpdate(`StepStone auto-apply error: ${error.message}`, 'error');
            throw error;
        } finally {
            this.setAutoApplyRunning(false);
            // Clear resume state when done
            try {
                await chrome.storage.local.remove(['stepstonePaginationState', 'stepstoneAutoApplyRunning']);
            } catch (error) {
                this.debugLog('Error clearing resume state:', error);
            }
        }
    }

    /**
     * Get total number of jobs using StepStone-specific logic
     */
    async getTotalJobsCount(searchElement) {
        try {
            return await StepstoneJobSearch.getTotalJobsSearchCount(searchElement);
        } catch (error) {
            this.errorLog('Error getting StepStone job count', error);
            return 0;
        }
    }

    /**
     * Get available pages using StepStone-specific logic
     */
    async getAvailablePages(searchElement, totalJobs) {
        try {
            return await StepstoneJobSearch.getAvailablePages(searchElement, totalJobs);
        } catch (error) {
            this.errorLog('Error getting StepStone available pages', error);
            return 1; // Default to 1 page if calculation fails
        }
    }

    /**
     * Process a single page using StepStone logic
     */
    async processJobPage(page, totalPages, searchElement, isAutoApplyRunning) {
        try {
            // Use the StepStone job page logic
            return await StepstoneJobPage.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
        } catch (error) {
            this.errorLog(`Error processing StepStone page ${page}`, error);
            return false; // Stop processing on error
        }
    }

    /**
     * Fill application form using StepStone-specific logic
     */
    async fillApplicationForm(jobData, userData) {
        try {
            this.debugLog(`Filling StepStone application form for: ${jobData.title} at ${jobData.company}`);
            return await StepstoneForm.fillApplicationForm(jobData, userData);
        } catch (error) {
            this.errorLog('Error filling StepStone application form', error);
            return false;
        }
    }

    /**
     * Extract job information using StepStone-specific logic
     */
    async extractJobInfo() {
        try {
            return await StepstoneJobInfo.extractJobInfo();
        } catch (error) {
            this.errorLog('Error extracting StepStone job info', error);
            return null;
        }
    }

    /**
     * Navigate to next page using StepStone-specific logic
     */
    async navigateToNextPage(currentPage) {
        try {
            return await StepstoneJobSearch.navigateToNextPage(currentPage + 1);
        } catch (error) {
            this.errorLog(`Error navigating to StepStone page ${currentPage + 1}`, error);
            return false;
        }
    }

    // ================================
    // PLATFORM-SPECIFIC METHODS
    // ================================

    isCurrentPlatform(url = window.location.href) {
        return /stepstone\.de/i.test(url) || 
               /stepstone\.com/i.test(url) ||
               /stepstone\.[a-z]{2,3}/i.test(url);
    }

    getSelectors() {
        return { ...this.selectors };
    }

    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if StepStone supports a feature
     */
    hasFeature(featureName) {
        const supportedFeatures = [
            'advancedSearch',
            'salaryFilter',
            'locationFilter',
            'experienceLevel',
            'jobType',
            'companySize'
        ];
        return supportedFeatures.includes(featureName);
    }

    /**
     * Check if platform supports multi-tab workflow
     * @returns {boolean}
     */
    supportsMultiTabWorkflow() {
        return true; // StepStone opens job details in new tabs
    }

    /**
     * Track application for StepStone
     */
    async trackApplication(jobData, success, reason) {
        try {
            this.debugLog(`Tracking StepStone application: ${jobData.title} - Success: ${success}`);
            if (!success && reason) {
                this.debugLog(`Application failed: ${reason}`);
            }
            
            // Use StepStone job page tracking
            await StepstoneJobPage.trackApplication(jobData, success, reason);
        } catch (error) {
            this.errorLog('Error tracking StepStone application', error);
        }
    }

    /**
     * Handle StepStone-specific errors
     */
    async handleError(error, context) {
        this.errorLog(`StepStone error in ${context}`, error);
        
        // Handle specific StepStone errors
        if (error.message.includes('rate limit') || error.message.includes('zu viele')) {
            this.debugLog('Rate limit detected - slowing down');
            await this.wait(5000); // Wait longer for rate limits
            return true; // Can continue
        }
        
        if (error.message.includes('not found') || error.message.includes('selector')) {
            this.debugLog('DOM element not found - possibly page structure changed');
            await this.wait(3000); // Wait and try to recover
            return true; // Can continue
        }
        
        if (error.message.includes('blocked') || error.message.includes('gesperrt')) {
            this.debugLog('Account blocked - stopping auto-apply');
            this.requestStop('account_blocked');
            return false; // Cannot continue
        }
        
        // For other errors, log and continue
        return true;
    }

    /**
     * Attempt recovery from failure state
     */
    async attemptRecovery() {
        try {
            this.debugLog('Attempting StepStone recovery');
            
            // Refresh current page elements
            await this.wait(2000);
            
            // Check if we're still on a valid StepStone page
            if (!this.isCurrentPlatform()) {
                this.debugLog('Not on StepStone page after recovery attempt');
                return false;
            }
            
            // Check if search container is available - use stable selectors
            let searchElement = document.querySelector(this.selectors.searchContainer);
            if (!searchElement) {
                // Try fallback selectors - avoid dynamic classes
                const fallbackSelectors = [
                    'h1[class*="facets-header"]',
                    '[data-genesis-element="TEXT"]:has([data-at="search-jobs-count"])',
                    'h1:has([data-at="search-jobs-count"])',
                    '[class*="search-results"]', 
                    'main', 
                    'body'
                ];
                for (const selector of fallbackSelectors) {
                    searchElement = document.querySelector(selector);
                    if (searchElement) {
                        this.debugLog(`Recovery using fallback selector: ${selector}`);
                        break;
                    }
                }
            }
            
            if (!searchElement) {
                this.debugLog('Search container not found after recovery');
                return false;
            }
            
            this.debugLog('StepStone recovery successful');
            return true;
            
        } catch (error) {
            this.errorLog('StepStone recovery failed', error);
            return false;
        }
    }

    /**
     * Get StepStone analytics data
     */
    getAnalytics() {
        return {
            platform: 'stepstone',
            processedPages: 0, // Could track this
            processedJobs: 0,  // Could track this
            successfulApplications: 0, // Could track this
            errors: 0 // Could track this
        };
    }

    // ================================
    // STEPSTONE-SPECIFIC HELPER METHODS
    // ================================

    /**
     * Check if we're on a StepStone job search page
     */
    isJobSearchPage(url = window.location.href) {
        return this.isCurrentPlatform(url) && 
               (url.includes('/jobs') || url.includes('/job/') || 
                url.includes('/stellenangebote') || url.includes('/stellenanzeige'));
    }

    /**
     * Get current search query from URL or page
     */
    getCurrentSearchQuery() {
        try {
            // Try to get from URL parameters first
            const urlParams = new URLSearchParams(window.location.search);
            let query = urlParams.get('q') || urlParams.get('query') || '';
            
            // If not in URL, try to extract from page using our search info method
            if (!query) {
                const searchInfo = StepstoneJobSearch.getCurrentSearchInfo();
                query = searchInfo.query || '';
            }
            
            return query;
        } catch (error) {
            this.errorLog('Error getting StepStone search query', error);
            return '';
        }
    }

    /**
     * Get current location filter from page
     */
    getCurrentLocationFilter() {
        try {
            const searchInfo = StepstoneJobSearch.getCurrentSearchInfo();
            return searchInfo.location || '';
        } catch (error) {
            this.errorLog('Error getting StepStone location filter', error);
            return '';
        }
    }

    /**
     * Get StepStone-specific job elements on current page
     */
    async getJobElementsOnPage() {
        try {
            // Use stable selector or fallback to document body
            let searchElement = document.querySelector(this.selectors.searchContainer);
            if (!searchElement) {
                // Try to find a better container than body
                const containerSelectors = [
                    'h1[class*="facets-header"]',
                    '[data-genesis-element="TEXT"]:has([data-at="search-jobs-count"])',
                    'main',
                    '[role="main"]'
                ];
                
                for (const selector of containerSelectors) {
                    searchElement = document.querySelector(selector);
                    if (searchElement) break;
                }
            }
            
            return await StepstoneJobSearch.getListOfJobsOnPage(searchElement || document.body);
        } catch (error) {
            this.errorLog('Error getting StepStone job elements', error);
            return [];
        }
    }

    /**
     * Check if application form is available for current job
     */
    async checkApplicationFormAvailability() {
        try {
            return await StepstoneForm.isApplicationFormAvailable();
        } catch (error) {
            this.errorLog('Error checking StepStone form availability', error);
            return false;
        }
    }
}

export default StepstonePlatform; 