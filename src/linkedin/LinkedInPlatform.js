import BasePlatform from '../platform/BasePlatform.js';
import LinkedInJobSearch from './LinkedInJobSearch.js';
import LinkedInJobPage from './LinkedinJobPage.js';
import LinkedInJobInfo from './LinkedInJobInfo.js';
import LinkedInForm from './LinkedInForm.js';
import LinkedInJobInteraction from './LinkedInJobInteraction.js';
import { debugLog, sendStatusUpdate, shouldStop } from '../utils.js';

/**
 * LinkedInPlatform - LinkedIn implementation of the platform abstraction
 * Wraps existing LinkedIn modules to provide the common platform interface
 */
class LinkedInPlatform extends BasePlatform {
    constructor() {
        super('LinkedIn');
        this.config = {
            maxJobsPerPage: 25,
            maxPages: 40, // LinkedIn limitation
            waitBetweenApplications: 2000,
            waitBetweenPages: 3000,
            supportedFileTypes: ['pdf', 'doc', 'docx']
        };
        this.selectors = {
            searchContainer: '.scaffold-layout.jobs-search-two-pane__layout',
            jobListings: '.jobs-search-results-list .jobs-search-results__list-item',
            jobTitle: '.job-title',
            company: '.job-details-jobs-unified-top-card__company-name',
            applyButton: '.jobs-apply-button',
            nextPageButton: '.artdeco-pagination__button--next'
        };
    }

    // ================================
    // REQUIRED INTERFACE METHODS
    // ================================

    /**
     * Start the auto-apply process for LinkedIn
     * This mirrors the original content script logic
     */
    async startAutoApply() {
        try {
            this.debugLog('Starting LinkedIn auto-apply process');
            this.setAutoApplyRunning(true);
            this.resetStopFlag();

            // Check if on correct page
            if (!this.isCurrentPlatform()) {
                throw new Error('Not on LinkedIn platform');
            }

            // Find the search element - this is the main container
            const searchElement = document.querySelector(this.selectors.searchContainer);
            if (!searchElement) {
                sendStatusUpdate('Could not find jobs list. Please make sure you are on LinkedIn jobs page.', 'error');
                throw new Error('LinkedIn jobs search container not found');
            }

            // Get total jobs count
            const totalJobs = await this.getTotalJobsCount(searchElement);
            sendStatusUpdate(`Found ${totalJobs} jobs to process`, 'info');

            if (totalJobs === 0) {
                sendStatusUpdate('No jobs found to process', 'warning');
                return;
            }

            // Get available pages
            const totalPages = await this.getAvailablePages(searchElement, totalJobs);

            // Process each page
            for (let page = 1; page <= totalPages; page++) {
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
                
                // Additional stop check after each page
                if (this.isStopRequested() || await shouldStop(this.isAutoApplyRunning)) {
                    this.debugLog('Stop requested after page processing');
                    break;
                }
            }

            this.debugLog('LinkedIn auto-apply process completed');
            sendStatusUpdate('Auto-apply process completed', 'success');

        } catch (error) {
            this.errorLog('Error in LinkedIn auto-apply process', error);
            sendStatusUpdate(`Auto-apply error: ${error.message}`, 'error');
            throw error;
        } finally {
            this.setAutoApplyRunning(false);
        }
    }

    /**
     * Get total number of jobs using LinkedIn-specific logic
     */
    async getTotalJobsCount(searchElement) {
        try {
            return await LinkedInJobSearch.getTotalJobsSearchCount(searchElement);
        } catch (error) {
            this.errorLog('Error getting LinkedIn job count', error);
            return 0;
        }
    }

    /**
     * Get available pages using LinkedIn-specific logic
     */
    async getAvailablePages(searchElement, totalJobs) {
        try {
            return await LinkedInJobSearch.getAvailablePages(searchElement, totalJobs);
        } catch (error) {
            this.errorLog('Error getting LinkedIn available pages', error);
            return 1; // Default to 1 page if calculation fails
        }
    }

    /**
     * Process a single page using existing LinkedIn logic
     */
    async processJobPage(page, totalPages, searchElement, isAutoApplyRunning) {
        try {
            // Use the existing LinkedInJobPage logic
            return await LinkedInJobPage.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
        } catch (error) {
            this.errorLog(`Error processing LinkedIn page ${page}`, error);
            return false; // Stop processing on error
        }
    }

    /**
     * Fill application form using LinkedIn-specific logic
     */
    async fillApplicationForm(jobData, userData) {
        try {
            // This would use the existing LinkedInForm logic
            // For now, return true as the existing system handles this internally
            this.debugLog(`Filling LinkedIn application form for: ${jobData.title} at ${jobData.company}`);
            return true;
        } catch (error) {
            this.errorLog('Error filling LinkedIn application form', error);
            return false;
        }
    }

    /**
     * Extract job information using LinkedIn-specific logic
     */
    async extractJobInfo() {
        try {
            return await LinkedInJobInfo.extractJobInfo();
        } catch (error) {
            this.errorLog('Error extracting LinkedIn job info', error);
            return null;
        }
    }

    /**
     * Navigate to next page using LinkedIn-specific logic
     */
    async navigateToNextPage(currentPage) {
        try {
            // Use existing LinkedIn navigation logic if available
            // For now, return true as existing system handles pagination
            this.debugLog(`Navigating to LinkedIn page ${currentPage + 1}`);
            return true;
        } catch (error) {
            this.errorLog(`Error navigating to LinkedIn page ${currentPage + 1}`, error);
            return false;
        }
    }

    // ================================
    // PLATFORM-SPECIFIC METHODS
    // ================================

    /**
     * Check if current URL is LinkedIn
     */
    isCurrentPlatform(url = window.location.href) {
        return /linkedin\.com/i.test(url) || /linkedin\.[a-z]{2,3}/i.test(url);
    }

    /**
     * Get LinkedIn-specific selectors
     */
    getSelectors() {
        return { ...this.selectors };
    }

    /**
     * Get LinkedIn-specific configuration
     */
    getConfig() {
        return { ...this.config };
    }

    /**
     * Check if LinkedIn supports a feature
     */
    hasFeature(featureName) {
        const supportedFeatures = [
            'advancedSearch',
            'saveJob',
            'companyFollow',
            'experienceLevel',
            'salaryFilter'
        ];
        return supportedFeatures.includes(featureName);
    }

    /**
     * Check if platform supports multi-tab workflow
     * @returns {boolean}
     */
    supportsMultiTabWorkflow() {
        return false; // LinkedIn uses single-tab with modals
    }

    /**
     * Track application for LinkedIn
     */
    async trackApplication(jobData, success, reason) {
        try {
            // This could integrate with existing ApplicationTracker
            this.debugLog(`Tracking LinkedIn application: ${jobData.title} - Success: ${success}`);
            if (!success && reason) {
                this.debugLog(`Application failed: ${reason}`);
            }
        } catch (error) {
            this.errorLog('Error tracking LinkedIn application', error);
        }
    }

    /**
     * Handle LinkedIn-specific errors
     */
    async handleError(error, context) {
        this.errorLog(`LinkedIn error in ${context}`, error);
        
        // Handle specific LinkedIn errors
        if (error.message.includes('daily limit')) {
            this.debugLog('Daily limit reached - stopping auto-apply');
            this.requestStop('daily_limit');
            return false; // Cannot continue
        }
        
        if (error.message.includes('not found') || error.message.includes('selector')) {
            this.debugLog('DOM element not found - possibly page structure changed');
            await this.wait(3000); // Wait and try to recover
            return true; // Can continue
        }
        
        // For other errors, log and continue
        return true;
    }

    /**
     * Attempt recovery from failure state
     */
    async attemptRecovery() {
        try {
            this.debugLog('Attempting LinkedIn recovery');
            
            // Refresh current page elements
            await this.wait(2000);
            
            // Check if we're still on a valid LinkedIn page
            if (!this.isCurrentPlatform()) {
                this.debugLog('Not on LinkedIn page after recovery attempt');
                return false;
            }
            
            // Check if search container is available
            const searchElement = document.querySelector(this.selectors.searchContainer);
            if (!searchElement) {
                this.debugLog('Search container not found after recovery');
                return false;
            }
            
            this.debugLog('LinkedIn recovery successful');
            return true;
            
        } catch (error) {
            this.errorLog('LinkedIn recovery failed', error);
            return false;
        }
    }

    /**
     * Get LinkedIn analytics data
     */
    getAnalytics() {
        return {
            platform: 'linkedin',
            processedPages: 0, // Could track this
            processedJobs: 0,  // Could track this
            successfulApplications: 0, // Could track this
            errors: 0 // Could track this
        };
    }

    // ================================
    // LINKEDIN-SPECIFIC HELPER METHODS
    // ================================

    /**
     * Check if we're on a LinkedIn job search page
     */
    isJobSearchPage(url = window.location.href) {
        return this.isCurrentPlatform(url) && 
               (url.includes('/jobs/') || url.includes('/job/'));
    }

    /**
     * Get current search query from URL
     */
    getCurrentSearchQuery() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('keywords') || '';
    }

    /**
     * Get current location filter from URL
     */
    getCurrentLocationFilter() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('location') || '';
    }

    /**
     * Get LinkedIn-specific job elements on current page
     */
    async getJobElementsOnPage() {
        const searchElement = document.querySelector(this.selectors.searchContainer);
        if (!searchElement) return [];
        
        return await LinkedInJobSearch.getListOfJobsOnPage(searchElement);
    }

    /**
     * Check LinkedIn Easy Apply limit
     */
    async checkEasyApplyLimit() {
        try {
            return await LinkedInForm.checkEasyApplyLimit();
        } catch (error) {
            this.errorLog('Error checking LinkedIn Easy Apply limit', error);
            return { hasLimit: false, message: '' };
        }
    }
}

export default LinkedInPlatform; 