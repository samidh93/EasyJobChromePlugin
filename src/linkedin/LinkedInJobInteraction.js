import LinkedInBase from './LinkedInBase.js';

class LinkedInJobInteraction extends LinkedInBase {
    static async getJobClickableElement(job) {
        try {
            await this.wait();

            const clickableElement = job.querySelector("a");
            if (clickableElement) {
                return clickableElement;
            } else {
                this.debugLog("Could not find clickable element for job");
                return null;
            }
        } catch (error) {
            this.errorLog("Error fetching clickable element", error);
            return null;
        }
    }

    static async scrollDownToLoadNextJob(job) {
        try {
            await this.wait();
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            this.debugLog("Scrolled down to load next job");
        } catch (error) {
            this.errorLog("Error scrolling down to load next job", error);
        }
    }

    static async clickOnJob(jobElement) {
        try {
            jobElement.click();
            this.debugLog("Clicked on job element");
        } catch (error) {
            this.debugLog("Could not click on job element", error);
        }
    }

    static async clickEasyApply() {
        try {
            const applyButton = document.querySelector('.jobs-s-apply button');
            if (applyButton) {
                applyButton.click();
                this.debugLog("Clicked on easy apply button");
                return true;
            }
            throw new Error("Easy apply button not found");
        } catch (error) {
            this.errorLog("Error clicking on easy apply button", error);
            throw error;
        }
    }
}

export default LinkedInJobInteraction; 