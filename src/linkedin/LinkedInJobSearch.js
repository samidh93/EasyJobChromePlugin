import LinkedInBase from './LinkedInBase.js';

class LinkedInJobSearch extends LinkedInBase {
    static async getTotalJobsSearchCount(element) {
        try {
            await this.wait();

            const totalResultsElement = element.querySelector(".jobs-search-results-list__subtitle");
            if (totalResultsElement) {
                const totalResultsText = totalResultsElement.textContent.trim();
                const totalResultsInt = parseInt(
                    totalResultsText.split(" ")[0]
                        .replace(/,/g, "")
                        .replace(/\./g, "")
                        .replace(/\+/g, "")
                );

                this.debugLog(`Total jobs found: ${totalResultsInt}`);
                return totalResultsInt;
            } else {
                this.debugLog("No results found");
                return 0;
            }
        } catch (error) {
            this.errorLog("Error fetching total jobs count", error);
            return 0;
        }
    }

    static async getAvailablePages(element, totalJobs) {
        try {
            await this.wait();
            const listPages = element.querySelector('ul[class*="jobs-search-pagination__pages"]');
            if (!listPages) {
                this.debugLog("Pagination list not found.");
                return 0;
            }
            const listPagesAvailable = listPages.querySelectorAll("li");
            if (listPagesAvailable.length === 0) {
                this.debugLog("No pagination items found.");
                return 0;
            }
            const lastPage = listPagesAvailable[listPagesAvailable.length - 1];
            this.debugLog(`Last page: ${lastPage}`);
            const totalPages = Math.ceil(totalJobs / 25);
            this.debugLog(`Total pages available: ${totalPages}`);
            return totalPages;
        } catch (error) {
            this.errorLog("Error fetching available pages", error);
            return 0;
        }
    }

    static async getListOfJobsOnPage(element) {
        try {
            await this.wait();

            const jobsContainer = element.querySelector(".scaffold-layout__list");
            if (!jobsContainer) {
                this.debugLog("Jobs container not found.");
                return [];
            }
            const jobElements = jobsContainer.querySelectorAll("li[class*='scaffold-layout__list-item']");

            this.debugLog(`Found ${jobElements.length} jobs on this page.`);
            return Array.from(jobElements);
        } catch (error) {
            this.errorLog("Error fetching list of jobs", error);
            return [];
        }
    }
}

export default LinkedInJobSearch; 