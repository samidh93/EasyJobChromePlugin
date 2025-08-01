import LinkedInBase from './LinkedInBase.js';

class ApplicationTracker extends LinkedInBase {
    constructor() {
        super();
        // No state tracking needed - we only save successful applications
    }

    // Ensure error logging methods are available
    debugLog(message, ...args) {
        console.log(`[ApplicationTracker] ${message}`, ...args);
    }

    errorLog(message, error) {
        console.error(`[ApplicationTracker] ${message}:`, error);
    }

    /**
     * Create a successful application record (only called after form submission)
     * @param {Object} jobInfo - Job information from LinkedIn
     * @param {Object} userData - Current user data
     * @param {Object} aiSettings - AI settings used
     * @param {string} resumeId - Resume ID used for application
     * @param {Array} questionsAnswers - Array of questions/answers collected during form processing
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
     * @returns {Object} Company object
     */
    async createOrFindCompany(jobInfo) {
        try {
            this.debugLog('Creating/finding company for job info:', jobInfo);
            this.debugLog('Job info type:', typeof jobInfo);
            this.debugLog('Job info keys:', jobInfo ? Object.keys(jobInfo) : 'null');
            
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

            // Create new company
            const companyData = {
                name: jobInfo.company,
                industry: null, // Could be extracted from job description later
                size: null,
                location: jobInfo.location,
                website: null,
                linkedin_url: null
            };
            
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
     * @returns {Object} Job object
     */
    async createOrFindJob(jobInfo, companyId) {
        try {
            if (!jobInfo.title) {
                throw new Error('Job title is required');
            }

            // Check if job already exists by LinkedIn job ID
            if (jobInfo.jobId) {
                const existingJob = await this.findJobByPlatformId('linkedin', jobInfo.jobId);
                if (existingJob) {
                    this.debugLog(`Found existing job: ${existingJob.title}`);
                    return existingJob;
                }
            }

            // Create new job
            const newJob = await this.createJob({
                company_id: companyId,
                title: jobInfo.title,
                location: jobInfo.location,
                is_remote: jobInfo.remoteType?.toLowerCase().includes('remote') || false,
                job_type: this.normalizeJobType(jobInfo.jobType),
                platform: 'linkedin',
                platform_job_id: jobInfo.jobId,
                job_url: window.location.href,
                job_description: jobInfo.description,
                applicant_count: this.parseApplicantCount(jobInfo.applicantCount),
                posted_date: this.parsePostedDate(jobInfo.postedDate),
                status: 'active'
            });

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
     * @returns {Object} Application object
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



    // Helper methods for API calls
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

    // Utility methods
    normalizeJobType(jobType) {
        if (!jobType) return 'full-time';
        
        const type = jobType.toLowerCase();
        if (type.includes('full')) return 'full-time';
        if (type.includes('part')) return 'part-time';
        if (type.includes('contract')) return 'contract';
        if (type.includes('intern')) return 'internship';
        return 'full-time';
    }

    parseApplicantCount(countText) {
        if (!countText) return 0;
        
        const match = countText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    parsePostedDate(dateText) {
        if (!dateText) return new Date();
        
        // Simple parsing for common LinkedIn date formats
        const now = new Date();
        
        if (dateText.includes('today')) return now;
        if (dateText.includes('yesterday')) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }
        
        // Try to parse "X days ago" format
        const daysMatch = dateText.match(/(\d+)\s*days?\s*ago/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - days);
            return pastDate;
        }
        
        return now;
    }

    /**
     * Get current application data
     * @returns {Object} Current application and questions/answers
     */
    getCurrentApplicationData() {
        return {
            application: this.currentApplication,
            questionsAnswers: this.questionsAnswers
        };
    }
}

// Create singleton instance
const applicationTracker = new ApplicationTracker();
export default applicationTracker; 