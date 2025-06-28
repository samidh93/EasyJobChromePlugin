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

    static async goToNextPage() {
        try {
            await this.wait();
            
            // Look for the next page button using the specific selector from LinkedIn
            const nextButton = document.querySelector('button[aria-label="View next page"]') ||
                              document.querySelector('button.jobs-search-pagination__button--next') ||
                              document.querySelector('button[aria-label="Next"]');
            
            if (nextButton && !nextButton.disabled) {
                this.debugLog("Found next page button, clicking...");
                nextButton.click();
                this.debugLog("Clicked next page button");
                
                // Wait for the page to load
                await this.wait(3000);
                
                // Wait for jobs to load
                const jobsLoaded = true; //await this.waitForJobsToLoad();
                
                if (jobsLoaded) {
                    this.debugLog("Successfully navigated to next page");
                    return true;
                } else {
                    this.debugLog("Jobs failed to load on next page");
                    return false;
                }
            } else {
                this.debugLog("Next page button not found or disabled - likely on last page");
                return false;
            }
        } catch (error) {
            this.errorLog("Error navigating to next page", error);
            return false;
        }
    }

 

    static async isOnLastPage() {
        try {
            const nextButton = document.querySelector('button[aria-label="View next page"]') ||
                              document.querySelector('button.jobs-search-pagination__button--next');
            
            return !nextButton || nextButton.disabled;
        } catch (error) {
            this.errorLog("Error checking if on last page", error);
            return true; // Assume last page if error
        }
    }
}

export default LinkedInJobSearch; 