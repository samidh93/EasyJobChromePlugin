/**
 * BasePlatform - Abstract base class defining the common interface for all job platforms
 * Provides shared utilities and enforces consistent method signatures across platforms
 */
class BasePlatform {
    constructor(platformName) {
        this.platformName = platformName;
        this._isAutoApplyRunning = false;
        this.stopRequested = false;
    }

    // ================================
    // ABSTRACT METHODS (Must be implemented by subclasses)
    // ================================

    /**
     * Start the auto-apply process for this platform
     * @returns {Promise<void>}
     */
    async startAutoApply() {
        throw new Error(`${this.platformName}: startAutoApply() must be implemented`);
    }

    /**
     * Get total number of jobs in current search
     * @param {Element} searchElement - The main search container element
     * @returns {Promise<number>}
     */
    async getTotalJobsCount(searchElement) {
        throw new Error(`${this.platformName}: getTotalJobsCount() must be implemented`);
    }

    /**
     * Get total number of available pages
     * @param {Element} searchElement - The main search container element
     * @param {number} totalJobs - Total number of jobs
     * @returns {Promise<number>}
     */
    async getAvailablePages(searchElement, totalJobs) {
        throw new Error(`${this.platformName}: getAvailablePages() must be implemented`);
    }

    /**
     * Process a single job page
     * @param {number} page - Current page number
     * @param {number} totalPages - Total number of pages
     * @param {Element} searchElement - The main search container element
     * @param {boolean} isAutoApplyRunning - Whether auto-apply is currently running
     * @returns {Promise<boolean>} - true if successful, false if should stop
     */
    async processJobPage(page, totalPages, searchElement, isAutoApplyRunning) {
        throw new Error(`${this.platformName}: processJobPage() must be implemented`);
    }

    /**
     * Fill out application form with user data
     * @param {Object} jobData - Information about the job
     * @param {Object} userData - User's profile and resume data
     * @returns {Promise<boolean>} - Success status
     */
    async fillApplicationForm(jobData, userData) {
        throw new Error(`${this.platformName}: fillApplicationForm() must be implemented`);
    }

    /**
     * Extract job information from current page
     * @returns {Promise<Object>} - Job details object
     */
    async extractJobInfo() {
        throw new Error(`${this.platformName}: extractJobInfo() must be implemented`);
    }

    /**
     * Navigate to the next page of job listings
     * @param {number} currentPage - Current page number
     * @returns {Promise<boolean>} - Success status
     */
    async navigateToNextPage(currentPage) {
        throw new Error(`${this.platformName}: navigateToNextPage() must be implemented`);
    }

    /**
     * Check if the platform supports a specific feature
     * @param {string} featureName - Name of the feature to check
     * @returns {boolean}
     */
    hasFeature(featureName) {
        return false; // Default: no optional features
    }

    // ================================
    // SHARED UTILITIES (Available to all platforms)
    // ================================

    /**
     * Wait for specified milliseconds
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    /**
     * Wait for specified milliseconds (instance method)
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    async wait(ms = 1000) {
        return BasePlatform.wait(ms);
    }

    /**
     * Log debug message with platform prefix
     * @param {string} message - Message to log
     */
    debugLog(message) {
        console.log(`[${this.platformName}] ${message}`);
    }

    /**
     * Log error message with platform prefix
     * @param {string} message - Error message
     * @param {Error} error - Error object (optional)
     */
    errorLog(message, error = null) {
        if (error) {
            console.error(`[${this.platformName}] ${message}:`, error);
        } else {
            console.error(`[${this.platformName}] ${message}`);
        }
    }

    /**
     * Set auto-apply running state
     * @param {boolean} running - Whether auto-apply is running
     */
    setAutoApplyRunning(running) {
        this._isAutoApplyRunning = running;
    }

    /**
     * Get auto-apply running state
     * @returns {boolean}
     */
    isAutoApplyRunning() {
        return this._isAutoApplyRunning;
    }

    /**
     * Request stop of auto-apply process
     * @param {string} reason - Reason for stopping
     */
    requestStop(reason = 'manual') {
        this.debugLog(`Stop requested: ${reason}`);
        this.stopRequested = true;
        this._isAutoApplyRunning = false;
    }

    /**
     * Check if stop was requested
     * @returns {boolean}
     */
    isStopRequested() {
        return this.stopRequested;
    }

    /**
     * Reset stop flag (for new auto-apply sessions)
     */
    resetStopFlag() {
        this.stopRequested = false;
    }

    /**
     * Wait for element to appear in DOM
     * @param {string} selector - CSS selector
     * @param {number} timeout - Timeout in milliseconds
     * @param {Element} parent - Parent element to search within (optional)
     * @returns {Promise<Element|null>}
     */
    async waitForElement(selector, timeout = 10000, parent = document) {
        return new Promise((resolve) => {
            const element = parent.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }

            const observer = new MutationObserver(() => {
                const element = parent.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });

            observer.observe(parent, {
                childList: true,
                subtree: true
            });

            // Timeout fallback
            setTimeout(() => {
                observer.disconnect();
                resolve(null);
            }, timeout);
        });
    }

    /**
     * Scroll element into view smoothly
     * @param {Element} element - Element to scroll to
     * @param {boolean} center - Whether to center the element
     */
    scrollIntoView(element, center = true) {
        if (element) {
            element.scrollIntoView({
                behavior: 'smooth',
                block: center ? 'center' : 'nearest'
            });
        }
    }

    /**
     * Get platform name
     * @returns {string}
     */
    getPlatformName() {
        return this.platformName;
    }

    /**
     * Check if current URL matches platform
     * @param {string} url - URL to check (defaults to current URL)
     * @returns {boolean}
     */
    isCurrentPlatform(url = window.location.href) {
        // This should be overridden by subclasses for specific URL patterns
        return false;
    }
}

export default BasePlatform; 