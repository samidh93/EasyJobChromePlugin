/**
 * BaseApplicationTracker - Abstract base class for application tracking across platforms
 * Provides shared functionality for tracking job applications in the database
 * Platform-specific implementations must extend this class and implement abstract methods
 */
class BaseApplicationTracker {
    constructor() {
        // No state tracking needed - we only save successful applications
    }

    // ================================
    // ABSTRACT METHODS (Must be implemented by subclasses)
    // ================================

    /**
     * Get the platform name (e.g., 'linkedin', 'stepstone')
     * @returns {string} Platform name
     */
    getPlatformName() {
        throw new Error('getPlatformName() must be implemented by subclass');
    }

    /**
     * Extract platform-specific job ID from jobInfo
     * @param {Object} jobInfo - Job information object
     * @returns {string|null} Platform-specific job ID or null if not available
     */
    getPlatformJobId(jobInfo) {
        throw new Error('getPlatformJobId() must be implemented by subclass');
    }

    /**
     * Map jobInfo to company data structure for database
     * @param {Object} jobInfo - Job information object
     * @returns {Object} Company data object
     */
    mapJobInfoToCompanyData(jobInfo) {
        throw new Error('mapJobInfoToCompanyData() must be implemented by subclass');
    }

    /**
     * Map jobInfo to job data structure for database
     * @param {Object} jobInfo - Job information object
     * @param {string} companyId - Company ID
     * @returns {Object} Job data object
     */
    mapJobInfoToJobData(jobInfo, companyId) {
        throw new Error('mapJobInfoToJobData() must be implemented by subclass');
    }

    /**
     * Normalize job type string to standard format
     * @param {string} jobType - Raw job type string
     * @returns {string} Normalized job type ('full-time', 'part-time', 'contract', 'internship')
     */
    normalizeJobType(jobType) {
        throw new Error('normalizeJobType() must be implemented by subclass');
    }

    /**
     * Parse applicant count from text
     * @param {string} countText - Applicant count text (may be null/undefined)
     * @returns {number} Parsed applicant count or 0 if not available
     */
    parseApplicantCount(countText) {
        throw new Error('parseApplicantCount() must be implemented by subclass');
    }

    /**
     * Parse posted date from text
     * @param {string} dateText - Posted date text
     * @returns {Date} Parsed date or current date if parsing fails
     */
    parsePostedDate(dateText) {
        throw new Error('parsePostedDate() must be implemented by subclass');
    }

    // ================================
    // COMMON METHODS (Shared implementation)
    // ================================

    /**
     * Logging utilities
     */
    debugLog(message, ...args) {
        console.log(`[${this.constructor.name}] ${message}`, ...args);
    }

    errorLog(message, error) {
        console.error(`[${this.constructor.name}] ${message}:`, error);
    }

    /**
     * Create a successful application record (only called after form submission)
     * @param {Object} jobInfo - Job information from platform
     * @param {Object} userData - Current user data
     * @param {Object} aiSettings - AI settings used
     * @param {string} resumeId - Resume ID used for application
     * @param {Array} questionsAnswers - Array of questions/answers collected during form processing
     * @returns {Promise<Object>} Created application object
     */
    async createSuccessfulApplication(jobInfo, userData, aiSettings, resumeId, questionsAnswers = []) {
        try {
            this.debugLog('Creating successful application record...');
            
            // First, create or find company
            const company = await this.createOrFindCompany(jobInfo);
            
            // Then, create or find job
            const job = await this.createOrFindJob(jobInfo, company.id);
            
            // Create application with 'applied' status since it was successfully submitted
            const application = await this.createApplication({
                user_id: userData.id,
                job_id: job.id,
                ai_settings_id: aiSettings.id,
                resume_id: resumeId,
                status: 'applied',
                notes: null
            });
            
            this.debugLog(`Successful application saved: ${application.id}`);
            
            // Now save all collected questions/answers for this successful application
            if (questionsAnswers && questionsAnswers.length > 0) {
                this.debugLog(`Saving ${questionsAnswers.length} questions/answers for application ${application.id}`);
                await this.saveQuestionsAnswers(application.id, questionsAnswers);
            }
            
            return application;
        } catch (error) {
            this.errorLog('Error creating successful application:', error);
            throw error;
        }
    }

    /**
     * Save questions and answers for a successful application
     * @param {string} applicationId - The application ID
     * @param {Array} questionsAnswers - Array of questions/answers to save
     * @returns {Promise<void>}
     */
    async saveQuestionsAnswers(applicationId, questionsAnswers) {
        try {
            for (const qa of questionsAnswers) {
                const qaData = {
                    application_id: applicationId,
                    question: qa.question,
                    answer: qa.answer,
                    question_type: qa.question_type || 'general',
                    ai_model_used: qa.ai_model_used || 'unknown',
                    confidence_score: qa.confidence_score || 0.95,
                    is_skipped: qa.is_skipped || false
                };

                const response = await chrome.runtime.sendMessage({
                    action: 'apiRequest',
                    method: 'POST',
                    url: '/questions-answers',
                    data: qaData
                });

                if (response && response.success) {
                    this.debugLog(`Question/answer saved: ${response.question_answer.id}`);
                } else {
                    this.debugLog(`Failed to save question/answer: ${response?.error}`);
                }
            }
            
            this.debugLog(`Successfully saved ${questionsAnswers.length} questions/answers for application ${applicationId}`);
        } catch (error) {
            this.errorLog('Error saving questions/answers:', error);
            // Don't throw error to avoid breaking the application creation process
        }
    }

    /**
     * Create or find company in database
     * @param {Object} jobInfo - Job information
     * @returns {Promise<Object>} Company object
     */
    async createOrFindCompany(jobInfo) {
        try {
            this.debugLog('Creating/finding company for job info:', jobInfo);
            
            if (!jobInfo || !jobInfo.company) {
                this.debugLog('Job info or company name is missing:', { jobInfo, company: jobInfo?.company });
                throw new Error('Company name is required');
            }

            // First, try to find existing company
            const existingCompany = await this.findCompanyByName(jobInfo.company);
            if (existingCompany) {
                this.debugLog(`Found existing company: ${existingCompany.name}`);
                return existingCompany;
            }

            // Map jobInfo to company data using platform-specific method
            const companyData = this.mapJobInfoToCompanyData(jobInfo);
            
            this.debugLog('Creating new company with data:', companyData);
            const newCompany = await this.createCompany(companyData);

            if (!newCompany) {
                throw new Error('Failed to create company - API request returned null');
            }

            this.debugLog(`Created new company: ${newCompany.name}`);
            return newCompany;
        } catch (error) {
            this.errorLog('Error creating/finding company:', error);
            throw error;
        }
    }

    /**
     * Create or find job in database
     * @param {Object} jobInfo - Job information
     * @param {string} companyId - Company ID
     * @returns {Promise<Object>} Job object
     */
    async createOrFindJob(jobInfo, companyId) {
        try {
            if (!jobInfo.title) {
                throw new Error('Job title is required');
            }

            // Check if job already exists by platform job ID
            const platformJobId = this.getPlatformJobId(jobInfo);
            if (platformJobId) {
                const platformName = this.getPlatformName();
                const existingJob = await this.findJobByPlatformId(platformName, platformJobId);
                if (existingJob) {
                    this.debugLog(`Found existing job: ${existingJob.title}`);
                    return existingJob;
                }
            }

            // Map jobInfo to job data using platform-specific method
            const jobData = this.mapJobInfoToJobData(jobInfo, companyId);
            
            this.debugLog('Creating new job with data:', jobData);
            const newJob = await this.createJob(jobData);

            if (!newJob) {
                throw new Error('Failed to create job - API request returned null');
            }

            this.debugLog(`Created new job: ${newJob.title}`);
            return newJob;
        } catch (error) {
            this.errorLog('Error creating/finding job:', error);
            throw error;
        }
    }

    /**
     * Create application in database
     * @param {Object} applicationData - Application data
     * @returns {Promise<Object>} Application object
     */
    async createApplication(applicationData) {
        try {
            this.debugLog('Creating application with data:', applicationData);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                url: '/applications',
                data: applicationData
            });

            this.debugLog('Application creation response:', response);

            if (response && response.success) {
                this.debugLog(`Application created: ${response.application.id}`);
                return response.application;
            } else {
                // Check if this is a duplicate key error
                if (response?.error && response.error.includes('duplicate key value violates unique constraint "applications_user_id_job_id_key"')) {
                    this.debugLog('Application already exists, fetching existing application...');
                    
                    // Fetch the existing application instead of creating a new one
                    const existingResponse = await chrome.runtime.sendMessage({
                        action: 'apiRequest',
                        method: 'GET',
                        url: `/applications/user/${applicationData.user_id}/job/${applicationData.job_id}`
                    });
                    
                    if (existingResponse && existingResponse.success) {
                        this.debugLog(`Found existing application: ${existingResponse.application.id}`);
                        return existingResponse.application;
                    } else {
                        this.debugLog('Failed to fetch existing application, falling back to error');
                        throw new Error(response?.error || 'Failed to create application');
                    }
                } else {
                    this.debugLog(`Failed to create application: ${response?.error}`);
                    throw new Error(response?.error || 'Failed to create application');
                }
            }
        } catch (error) {
            this.errorLog('Error creating application:', error);
            throw error;
        }
    }

    /**
     * Find company by name in database
     * @param {string} name - Company name
     * @returns {Promise<Object|null>} Company object or null if not found
     */
    async findCompanyByName(name) {
        try {
            this.debugLog('Searching for company by name:', name);
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/companies/name/${encodeURIComponent(name)}`
            });
            
            this.debugLog('Company search response:', response);
            return response?.success ? response.company : null;
        } catch (error) {
            this.debugLog('Error finding company:', error);
            return null;
        }
    }

    /**
     * Create company in database
     * @param {Object} companyData - Company data
     * @returns {Promise<Object>} Created company object
     */
    async createCompany(companyData) {
        try {
            this.debugLog('Sending API request to create company:', companyData);
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                url: '/companies',
                data: companyData
            });
            
            this.debugLog('Company creation API response:', response);
            
            if (!response) {
                throw new Error('No response received from API');
            }
            
            if (!response.success) {
                throw new Error(`API request failed: ${response.error || 'Unknown error'}`);
            }
            
            if (!response.company) {
                throw new Error('API returned success but no company data');
            }
            
            return response.company;
        } catch (error) {
            this.errorLog('Error creating company:', error);
            throw error;
        }
    }

    /**
     * Find job by platform ID in database
     * @param {string} platform - Platform name ('linkedin', 'stepstone', etc.)
     * @param {string} platformJobId - Platform-specific job ID
     * @returns {Promise<Object|null>} Job object or null if not found
     */
    async findJobByPlatformId(platform, platformJobId) {
        try {
            this.debugLog('Searching for job by platform ID:', { platform, platformJobId });
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/jobs/platform/${platform}/${platformJobId}`
            });
            
            this.debugLog('Job search response:', response);
            return response?.success ? response.job : null;
        } catch (error) {
            this.debugLog('Error finding job:', error);
            return null;
        }
    }

    /**
     * Create job in database
     * @param {Object} jobData - Job data
     * @returns {Promise<Object>} Created job object
     */
    async createJob(jobData) {
        try {
            this.debugLog('Sending API request to create job:', jobData);
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'POST',
                url: '/jobs',
                data: jobData
            });
            
            this.debugLog('Job creation API response:', response);
            
            if (!response) {
                throw new Error('No response received from API');
            }
            
            if (!response.success) {
                throw new Error(`API request failed: ${response.error || 'Unknown error'}`);
            }
            
            if (!response.job) {
                throw new Error('API returned success but no job data');
            }
            
            return response.job;
        } catch (error) {
            this.errorLog('Error creating job:', error);
            throw error;
        }
    }

    /**
     * Get current application data (if needed for state tracking)
     * @returns {Object} Current application and questions/answers
     */
    getCurrentApplicationData() {
        return {
            application: this.currentApplication || null,
            questionsAnswers: this.questionsAnswers || []
        };
    }
}

export default BaseApplicationTracker;
