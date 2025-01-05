class LinkedInJobHelper {
    static getTotalJobsSearchCount(element) {
        try {
            const totalResultsElement = element.querySelector(".jobs-search-results-list__subtitle");
            if (totalResultsElement) {
                const totalResultsText = totalResultsElement.textContent.trim();
                const totalResultsInt = parseInt(
                    totalResultsText.split(" ")[0]
                        .replace(/,/g, "")
                        .replace(/\./g, "")
                        .replace(/\+/g, "")
                );

                console.log(`Total jobs found: ${totalResultsInt}`);
                return totalResultsInt;
            } else {
                console.log("No results found");
                return 0;
            }
        } catch (error) {
            console.error("An error occurred while fetching total jobs count:", error);
            return 0;
        }
    }

    static getAvailablePages(element) {
        try {
            const listPages = element.querySelector('ul[class*="artdeco-pagination__pages--number"]');
            if (!listPages) {
                console.log("Pagination list not found.");
                return 0;
            }

            const listPagesAvailable = listPages.querySelectorAll("li");
            if (listPagesAvailable.length === 0) {
                console.log("No pagination items found.");
                return 0;
            }

            const lastLi = listPagesAvailable[listPagesAvailable.length - 1];
            const lastPage = lastLi.getAttribute("data-test-pagination-page-btn");

            if (lastPage) {
                const pagesAvailable = parseInt(lastPage, 10);
                console.log(`Total pages available: ${pagesAvailable}`);
                return pagesAvailable;
            } else {
                console.log("Could not find 'data-test-pagination-page-btn' attribute.");
                return 0;
            }
        } catch (error) {
            console.error("Exception occurred while fetching available pages:", error);
            return 0;
        }
    }

    static async getListOfJobsOnPage(element) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const jobsContainer = element.querySelector(".scaffold-layout__list");
            if (!jobsContainer) {
                console.log("Jobs container not found.");
                return [];
            }
            const jobElements = jobsContainer.querySelectorAll("li[class*='scaffold-layout__list-item']");

            console.log(`Found ${jobElements.length} jobs on the page.`);
            return Array.from(jobElements);
        } catch (error) {
            console.error("Exception occurred while fetching the list of jobs:", error);
            return [];
        }
    }

    static isJobApplied(job) {
        try {
            const applied = job.querySelector(
                "ul.job-card-list__footer-wrapper li.job-card-container__footer-item strong span.tvm__text--neutral"
            );
            if (applied && applied.textContent.includes("Applied")) {
                console.info("Skipping already applied job");
                return true;
            }
        } catch (error) {
            console.info("Job not applied, extracting job data");
        }
        return false;
    }

    static clickJob(jobElement) {
        if (window.location.href.includes('linkedin.com/jobs')) {
            const applyButton = document.querySelector('.jobs-s-apply button');
            if (applyButton) {
                console.log(applyButton);
                applyButton.addEventListener('click', () => {
                    this.fillApplicationForm();
                });
            }
        }
    }

    static fillApplicationForm() {
        const nameField = document.querySelector('input[name="firstName"]');
        const emailField = document.querySelector('input[name="email"]');
        const resumeField = document.querySelector('input[type="file"]');

        if (nameField && emailField) {
            nameField.value = 'Your First Name';
            emailField.value = 'your-email@example.com';

            if (resumeField) {
                const resumePath = 'path/to/your/resume.pdf';
                resumeField.value = resumePath;
            }
        }
    }
}

export default LinkedInJobHelper;
