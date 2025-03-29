import LinkedInBase from './LinkedInBase.js';

class LinkedInJobInfo extends LinkedInBase {
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
            const jobTypeElement = document.querySelector('.job-details-preferences-and-skills__pill .ui-label');
            if (jobTypeElement) {
                const jobTypeText = jobTypeElement.textContent.trim();
                const jobType = jobTypeText.split('Matches')[0].trim();
                this.debugLog(`Found job type: ${jobType}`);
                return jobType;
            }
            this.debugLog("Job type not found");
            return null;
        } catch (error) {
            this.errorLog("Error getting job type", error);
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
            const applicantElement = document.querySelector('.jobs-premium-applicant-insights__list-item .jobs-premium-applicant-insights__list-num');
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

    static async getAllJobInfo() {
        try {
            const jobInfo = {
                title: await this.getJobTitle(),
                company: await this.getCompanyName(),
                location: await this.getLocation(),
                jobType: await this.getJobType(),
                description: await this.getJobDescription(),
                applicantCount: await this.getApplicantCount()
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