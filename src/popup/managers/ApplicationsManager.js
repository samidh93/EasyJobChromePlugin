class ApplicationsManager {
    constructor() {
        this.applications = [];
        this.selectedApplication = null;
        this.listeners = [];
        this.filters = {
            company: '',
            job: ''
        };
    }

    // Add listener for applications state changes
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of applications state changes
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    applications: this.applications,
                    selectedApplication: this.selectedApplication,
                    filters: this.filters
                });
            } catch (error) {
                console.error('Error in applications listener:', error);
            }
        });
    }

    // Get current applications state
    getApplicationsState() {
        return {
            applications: this.applications,
            selectedApplication: this.selectedApplication,
            filters: this.filters
        };
    }

    // Load applications for a user
    async loadApplications(userId) {
        if (!userId) {
            console.log('ApplicationsManager: No user ID provided, skipping applications load');
            this.applications = [];
            this.notifyListeners();
            return { success: false, error: 'No user ID provided' };
        }

        try {
            console.log('ApplicationsManager: Loading applications for user:', userId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/applications`
            });

            if (response && response.success) {
                console.log('ApplicationsManager: Successfully loaded applications:', response.applications);
                
                // Transform the data to match the expected format
                const transformedApplications = response.applications.map(app => ({
                    id: app.id,
                    jobTitle: app.job_title,
                    company: app.company_name,
                    status: app.status,
                    appliedAt: app.applied_at,
                    location: app.location,
                    isRemote: app.is_remote,
                    notes: app.notes,
                    questionsAnswers: [] // Will be loaded when application is selected
                }));
                
                this.applications = transformedApplications;
                this.notifyListeners();
                return { success: true, applications: transformedApplications };
            } else {
                console.error('ApplicationsManager: Failed to load applications:', response);
                this.applications = [];
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to load applications' };
            }
        } catch (error) {
            console.error('ApplicationsManager: Error loading applications:', error);
            this.applications = [];
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Load questions and answers for a specific application
    async loadApplicationQuestions(applicationId) {
        if (!applicationId) {
            return { success: false, error: 'No application ID provided' };
        }

        try {
            console.log('ApplicationsManager: Loading questions for application:', applicationId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/applications/${applicationId}/questions-answers`
            });

            if (response && response.success) {
                console.log('ApplicationsManager: Successfully loaded questions:', response.questions_answers);
                return { success: true, questionsAnswers: response.questions_answers };
            } else {
                console.error('ApplicationsManager: Failed to load questions:', response);
                return { success: false, error: response?.error || 'Failed to load questions' };
            }
        } catch (error) {
            console.error('ApplicationsManager: Error loading questions:', error);
            return { success: false, error: error.message };
        }
    }

    // Select an application and load its details
    async selectApplication(applicationId) {
        const application = this.applications.find(app => app.id === applicationId);
        
        if (!application) {
            console.error('ApplicationsManager: Application not found:', applicationId);
            return { success: false, error: 'Application not found' };
        }

        try {
            // Load questions and answers for this application
            const questionsResponse = await this.loadApplicationQuestions(applicationId);
            
            if (questionsResponse.success) {
                application.questionsAnswers = questionsResponse.questionsAnswers;
            } else {
                application.questionsAnswers = [];
                console.warn('ApplicationsManager: Failed to load questions for application:', questionsResponse.error);
            }

            this.selectedApplication = application;
            this.notifyListeners();
            
            return { success: true, application: application };
        } catch (error) {
            console.error('ApplicationsManager: Error selecting application:', error);
            return { success: false, error: error.message };
        }
    }

    // Clear selected application
    clearSelectedApplication() {
        this.selectedApplication = null;
        this.notifyListeners();
    }

    // Set filters
    setFilters(filters) {
        this.filters = { ...this.filters, ...filters };
        this.notifyListeners();
    }

    // Get filtered applications
    getFilteredApplications() {
        let filtered = this.applications;

        if (this.filters.company) {
            filtered = filtered.filter(app => app.company === this.filters.company);
        }

        if (this.filters.job) {
            filtered = filtered.filter(app => app.jobTitle === this.filters.job);
        }

        return filtered;
    }

    // Get unique companies from applications
    getUniqueCompanies() {
        return [...new Set(this.applications.map(app => app.company))].filter(Boolean);
    }

    // Get jobs for a specific company
    getJobsForCompany(company) {
        return [...new Set(this.applications.filter(app => app.company === company).map(app => app.jobTitle))].filter(Boolean);
    }

    // Get applications for a specific job
    getApplicationsForJob(company, jobTitle) {
        return this.applications.filter(app => app.company === company && app.jobTitle === jobTitle);
    }

    // Get application statistics
    async getApplicationStats(userId) {
        if (!userId) {
            return { success: false, error: 'No user ID provided' };
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/applications/stats?userId=${userId}`
            });

            if (response && response.success) {
                return { success: true, stats: response.stats };
            } else {
                return { success: false, error: response?.error || 'Failed to load stats' };
            }
        } catch (error) {
            console.error('ApplicationsManager: Error loading stats:', error);
            return { success: false, error: error.message };
        }
    }

    // Clear all data
    clear() {
        this.applications = [];
        this.selectedApplication = null;
        this.filters = { company: '', job: '' };
        this.notifyListeners();
    }
}

// Create singleton instance
const applicationsManager = new ApplicationsManager();

export default applicationsManager; 