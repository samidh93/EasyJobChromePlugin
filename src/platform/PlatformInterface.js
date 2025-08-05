/**
 * PlatformInterface - Documentation of the common interface all platforms must implement
 * 
 * This file serves as:
 * 1. Documentation for developers implementing new platforms
 * 2. Reference for the expected method signatures
 * 3. Guide for platform-specific features and capabilities
 * 
 * All platform implementations (LinkedInPlatform, IndeedPlatform, StepstonePlatform)
 * must extend BasePlatform and implement these required methods.
 */

/**
 * @interface PlatformInterface
 * @extends BasePlatform
 */
export const PlatformInterface = {
    
    // ================================
    // REQUIRED METHODS (Must be implemented)
    // ================================

    /**
     * Start the auto-apply process for this platform
     * This is the main entry point called by the content script
     * 
     * @async
     * @returns {Promise<void>}
     * @throws {Error} If auto-apply cannot be started
     * 
     * Implementation notes:
     * - Should check if on correct page type (job search/listing)
     * - Initialize platform-specific state
     * - Handle the complete auto-apply workflow
     * - Send status updates to popup via utils.sendStatusUpdate()
     */
    startAutoApply: async () => {},

    /**
     * Get total number of jobs in current search results
     * 
     * @async
     * @param {Element} searchElement - The main search container element
     * @returns {Promise<number>} Total number of jobs found
     * 
     * Implementation notes:
     * - Parse job count from platform-specific elements
     * - Handle cases where count is not displayed
     * - Return 0 if no jobs found or count unavailable
     */
    getTotalJobsCount: async (searchElement) => {},

    /**
     * Calculate total number of available pages
     * 
     * @async
     * @param {Element} searchElement - The main search container element
     * @param {number} totalJobs - Total number of jobs from getTotalJobsCount()
     * @returns {Promise<number>} Number of pages to process
     * 
     * Implementation notes:
     * - Calculate based on jobs per page (platform-specific)
     * - Handle pagination limits (some platforms cap at 40 pages)
     * - Return 1 if pagination not available
     */
    getAvailablePages: async (searchElement, totalJobs) => {},

    /**
     * Process all jobs on a single page
     * 
     * @async
     * @param {number} page - Current page number (1-based)
     * @param {number} totalPages - Total number of pages
     * @param {Element} searchElement - The main search container element
     * @param {boolean} isAutoApplyRunning - Auto-apply running state
     * @returns {Promise<boolean>} true if successful, false if should stop
     * 
     * Implementation notes:
     * - Navigate to correct page if not already there
     * - Process each job listing on the page
     * - Handle stop requests and rate limiting
     * - Return false to stop entire process
     */
    processJobPage: async (page, totalPages, searchElement, isAutoApplyRunning) => {},

    /**
     * Fill out application form with user data
     * 
     * @async
     * @param {Object} jobData - Job information object
     * @param {Object} userData - User profile and resume data
     * @returns {Promise<boolean>} true if application submitted successfully
     * 
     * Expected jobData structure:
     * {
     *   title: string,
     *   company: string,
     *   location: string,
     *   url: string,
     *   description?: string,
     *   requirements?: string
     * }
     * 
     * Expected userData structure:
     * {
     *   resume: Object,
     *   coverLetter?: string,
     *   answers: Object, // Pre-filled answers for common questions
     *   preferences: Object
     * }
     */
    fillApplicationForm: async (jobData, userData) => {},

    /**
     * Extract job information from current job page/listing
     * 
     * @async
     * @returns {Promise<Object>} Job details object
     * 
     * Should return object with structure:
     * {
     *   title: string,
     *   company: string,
     *   location: string,
     *   url: string,
     *   description?: string,
     *   requirements?: string,
     *   salary?: string,
     *   jobType?: string, // full-time, part-time, contract, etc.
     *   remote?: boolean,
     *   postedDate?: string
     * }
     */
    extractJobInfo: async () => {},

    /**
     * Navigate to the next page of job listings
     * 
     * @async
     * @param {number} currentPage - Current page number
     * @returns {Promise<boolean>} true if navigation successful
     * 
     * Implementation notes:
     * - Handle different pagination styles (buttons, infinite scroll, etc.)
     * - Wait for new content to load
     * - Return false if no next page available
     */
    navigateToNextPage: async (currentPage) => {},

    // ================================
    // OPTIONAL METHODS (Platform-specific features)
    // ================================

    /**
     * Check if platform supports a specific feature
     * 
     * @param {string} featureName - Feature to check
     * @returns {boolean} true if feature is supported
     * 
     * Common features:
     * - 'advancedSearch': Advanced search filters
     * - 'bulkApply': Apply to multiple jobs at once
     * - 'saveJob': Save job for later
     * - 'companyFollow': Follow company
     * - 'salaryFilter': Filter by salary range
     * - 'experienceLevel': Filter by experience level
     */
    hasFeature: (featureName) => {},

    /**
     * Use advanced search features (if supported)
     * 
     * @async
     * @param {Object} searchCriteria - Advanced search parameters
     * @returns {Promise<boolean>} true if search applied successfully
     * 
     * Example searchCriteria:
     * {
     *   keywords: string[],
     *   location: string,
     *   salaryMin: number,
     *   salaryMax: number,
     *   experienceLevel: string,
     *   jobType: string,
     *   companySize: string,
     *   industry: string
     * }
     */
    useAdvancedSearch: async (searchCriteria) => {},

    /**
     * Save job for later (if supported)
     * 
     * @async
     * @param {Object} jobData - Job to save
     * @returns {Promise<boolean>} true if job saved successfully
     */
    saveJob: async (jobData) => {},

    /**
     * Follow company (if supported)
     * 
     * @async
     * @param {string} companyName - Company to follow
     * @returns {Promise<boolean>} true if company followed successfully
     */
    followCompany: async (companyName) => {},

    // ================================
    // PLATFORM-SPECIFIC CUSTOMIZATION
    // ================================

    /**
     * Override URL pattern matching (from BasePlatform)
     * 
     * @param {string} url - URL to check
     * @returns {boolean} true if URL matches this platform
     */
    isCurrentPlatform: (url) => {},

    /**
     * Get platform-specific selectors
     * 
     * @returns {Object} CSS selectors for key elements
     * 
     * Example return:
     * {
     *   jobListings: '.job-item',
     *   jobTitle: '.job-title',
     *   company: '.company-name',
     *   applyButton: '.apply-btn',
     *   nextPageButton: '.next-page'
     * }
     */
    getSelectors: () => {},

    /**
     * Get platform-specific configuration
     * 
     * @returns {Object} Platform configuration
     * 
     * Example return:
     * {
     *   maxJobsPerPage: 25,
     *   maxPages: 40,
     *   waitBetweenApplications: 2000,
     *   waitBetweenPages: 3000,
     *   supportedFileTypes: ['pdf', 'doc', 'docx']
     * }
     */
    getConfig: () => {},

    // ================================
    // ERROR HANDLING & RECOVERY
    // ================================

    /**
     * Handle platform-specific errors
     * 
     * @async
     * @param {Error} error - Error that occurred
     * @param {string} context - Context where error occurred
     * @returns {Promise<boolean>} true if error was handled and can continue
     */
    handleError: async (error, context) => {},

    /**
     * Attempt to recover from failure state
     * 
     * @async
     * @returns {Promise<boolean>} true if recovery successful
     */
    attemptRecovery: async () => {},

    // ================================
    // ANALYTICS & TRACKING
    // ================================

    /**
     * Track application attempt
     * 
     * @async
     * @param {Object} jobData - Job that was applied to
     * @param {boolean} success - Whether application was successful
     * @param {string} reason - Reason if application failed
     * @returns {Promise<void>}
     */
    trackApplication: async (jobData, success, reason) => {},

    /**
     * Get platform-specific analytics data
     * 
     * @returns {Object} Analytics data for this session
     */
    getAnalytics: () => {}
};

/**
 * Implementation Guidelines:
 * 
 * 1. EXTEND BasePlatform: All platforms must extend the BasePlatform class
 * 
 * 2. IMPLEMENT REQUIRED METHODS: The first 7 methods are required for basic functionality
 * 
 * 3. OPTIONAL FEATURES: Implement optional methods based on platform capabilities
 * 
 * 4. ERROR HANDLING: Use this.errorLog() and this.debugLog() for consistent logging
 * 
 * 5. ASYNC/AWAIT: Most methods should be async as they interact with DOM
 * 
 * 6. STOP CHECKING: Regularly check this.isStopRequested() in long-running operations
 * 
 * 7. RATE LIMITING: Use this.wait() between operations to avoid being blocked
 * 
 * 8. DOM INTERACTION: Use this.waitForElement() for reliable element selection
 * 
 * 9. CONSISTENT INTERFACE: Match method signatures exactly for seamless platform switching
 * 
 * 10. TESTING: Include debug methods and status reporting for troubleshooting
 */

export default PlatformInterface; 