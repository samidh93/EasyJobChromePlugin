import LinkedInBase from './LinkedInBase.js';

class LinkedInJobInfo extends LinkedInBase {
    static async getJobId() {
        try {
            const jobId = new URLSearchParams(window.location.search).get("currentJobId");
    
            if (!jobId) {
                this.debugLog("Job ID not found in URL");
                return null;
            }
            this.debugLog(`Found job ID: ${jobId}`);
            return jobId;
        } catch (error) {
            this.errorLog("Error getting job ID", error);
            return null;
        }
    }
    
    static async getJobTitle() {
        try {
            const titleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title h1');
            if (titleElement) {
                const title = titleElement.textContent.trim();
                this.debugLog(`Found job title: ${title}`);
                return title;
            }
            this.debugLog("Job title not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting job title", error);
            return null;
        }
    }

    static async getCompanyName() {
        try {
            const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
            if (companyElement) {
                const companyName = companyElement.textContent.trim();
                this.debugLog(`Found company name: ${companyName}`);
                return companyName;
            }
            this.debugLog("Company name not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting company name", error);
            return null;
        }
    }

    static async getLocation() {
        try {
            const locationElement = document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text');
            if (locationElement) {
                const location = locationElement.textContent.trim();
                this.debugLog(`Found location: ${location}`);
                return location;
            }
            this.debugLog("Location not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting location", error);
            return null;
        }
    }

    static async getJobType() {
        try {
            const jobType = document.querySelectorAll("button.job-details-preferences-and-skills .job-details-preferences-and-skills__pill")[1].querySelectorAll("span")[0].querySelectorAll("span")[0].textContent.trim();
            if (jobType) {
                this.debugLog(`Found jobType type: ${jobType}`);
                return jobType;
            }
            this.debugLog("jobType type not found");
        } catch (error) {
            this.errorLog("Error getting jobType type", error);
            return null;
        }
    }
    
    static async getRemoteType() {
        try {
            const remote = document.querySelectorAll("button.job-details-preferences-and-skills .job-details-preferences-and-skills__pill")[0].querySelectorAll("span")[0].querySelectorAll("span")[0].textContent.trim();
            if (remote) {
                this.debugLog(`Found remote type: ${remote}`);
                return remote;
            }
            this.debugLog("Remote type not found");
        } catch (error) {
            this.errorLog("Error getting remote type", error);
            return null;
        }
    }
    
    static async getJobDescription() {
        try {
            const descriptionElement = document.querySelector('.jobs-description__content');
            if (descriptionElement) {
                const description = descriptionElement.textContent.trim();
                this.debugLog("Found job description");
                return description;
            }
            this.debugLog("Job description not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting job description", error);
            return null;
        }
    }

    static async getApplicantCount() {
        try {
            const elements = document.querySelectorAll('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text');
            const applicantElement = elements.length > 0 ? elements[elements.length - 1] : null;
            if (applicantElement) {
                const count = applicantElement.textContent.trim();
                this.debugLog(`Found applicant count: ${count}`);
                return count;
            }
            this.debugLog("Applicant count not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting applicant count", error);
            return null;
        }
    }

    static async getPostedDate() {
        try {
            const applicantElement = document.querySelectorAll('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text')[2];
            if (applicantElement) {
                const count = applicantElement.textContent.trim();
                this.debugLog(`Found posted date: ${count}`);
                return count;
            }
            this.debugLog("posted date not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting applicant count", error);
            return null;
        }
    }
    static async getAllJobInfo() {
        try {
            const jobInfo = {
                jobId:await this.getJobId(),
                title: await this.getJobTitle(),
                company: await this.getCompanyName(),
                location: await this.getLocation(),
                jobType: await this.getJobType(),
                remoteType: await this.getRemoteType(),
                description: await this.getJobDescription(),
                applicantCount: await this.getApplicantCount(),
                postedDate: await this.getPostedDate()
            };
            this.debugLog("Retrieved all job information");
            return jobInfo;
        } catch (error) {
            this.errorLog("Error getting all job information", error);
            return null;
        }
    }
}

export default LinkedInJobInfo; 