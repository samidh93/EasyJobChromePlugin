class LinkedInJobHelper {
    static async getTotalJobsSearchCount(element) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

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
    /////////////////////////////////////////////////
    ////////////////////// PAGINATION ////////////////
    /////////////////////////////////////////////////
    static async getAvailablePages(element, totalJobs) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Query pagination element using class name pattern
            const listPages = element.querySelector('ul[class*="jobs-search-pagination__pages"]');
            if (!listPages) {
                console.log("Pagination list not found.");
                return 0;
            }
            const listPagesAvailable = listPages.querySelectorAll("li");
            if (listPagesAvailable.length === 0) {
                console.log("No pagination items found.");
                return 0;
            }
            // Get the last pagination item
            const lastPage = listPagesAvailable[listPagesAvailable.length - 1];
            console.log(`Last page: ${lastPage}`);
            // Calculate total pages based on total jobs (25 jobs per page)
            const totalPages = Math.ceil(totalJobs / 25);
            console.log(`Total pages available: ${totalPages}`);
            return totalPages;
        } catch (error) {
            console.error("Exception occurred while fetching available pages:", error);
            return 0;
        }
    }
    /////////////////////////////////////////////////
    ////////////////////// JOBS //////////////////////
    /////////////////////////////////////////////////
    static async getListOfJobsOnPage(element) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const jobsContainer = element.querySelector(".scaffold-layout__list");
            if (!jobsContainer) {
                console.log("Jobs container not found.");
                return [];
            }
            const jobElements = jobsContainer.querySelectorAll("li[class*='scaffold-layout__list-item']");

            console.log(`Found ${jobElements.length} jobs on this page.`);
            return Array.from(jobElements);
        } catch (error) {
            console.error("Exception occurred while fetching the list of jobs:", error);
            return [];
        }
    }

    /////////////////////////////////////////////////
    ////////////////////// JOB //////////////////////
    /////////////////////////////////////////////////
    static async getJobClickableElement(job) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

            const clickableElement = job.querySelector("a");
            if (clickableElement) {
                return clickableElement;
            } else {
                console.log("Could not find clickable element for job");
                return null;
            }
        } catch (error) {
            console.error("Exception occurred while fetching clickable element:", error);
            return null;
        }
    }

    static async scrollDownToLoadNextJob(job) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            job.scrollIntoView({ behavior: 'smooth', block: 'center' });
            console.log("Scrolled down to load next job");
        }
        catch (error) {
            console.error("Error while scrolling down to load next job", error);
        }
    }

    static async getJobElements(job) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const jobElements = job.querySelector(".jobs-search__job-details")
            if (jobElements) {
                console.log("Found job elements");
                return jobElements;
            }
            else {
                console.log("Could not find job elements");
                return null;
            }
        }
        catch (error) {
            console.error("Error while fetching job elements", error);
            return null;
        }
    }
    static async clickOnJob(jobElement) {
        // click on the job element
        try {
            jobElement.click();
            console.log("Clicked on job element");
        } catch (error) {
            console.info("could not click on job element", error);
        }
    }

    static async clickEasyApply() {
        try {
            const applyButton = document.querySelector('.jobs-s-apply button');
            if (applyButton) {
                applyButton.click();
                console.log("Clicked on easy apply button");
            };
        }
        catch (error) {
            console.error("Error while clicking on apply button", error);
        }
    }

/////////////////////////////////////////////////////////
////////////////////////// FORM //////////////////////////
/////////////////////////////////////////////////////////
    // close form
    static async closeForm(save = false) {
        try {
            const closeButton = document.querySelector('button[aria-label="Dismiss"]');
            if (closeButton) {
                closeButton.click();
                await new Promise((resolve) => setTimeout(resolve, 1000));
                if (save) {
                    const saveButton = document.querySelector('button[data-control-name="save_application_btn"]');
                    if (saveButton) {
                        saveButton.click();
                        console.log("closed form and saved application");
                    }
                } else {
                    const discardButton = document.querySelector('button[data-control-name="discard_application_confirm_btn"]');
                    if (discardButton) {
                        discardButton.click();
                        console.log("closed form and discarded application");
                    }
                }
            }
        } catch (error) {
            console.error("Error while closing form", error);
        }
    }
    static async clickNextPage() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const nextPageButton = document.querySelector('button[aria-label="Continue to next step"]');
            if (nextPageButton) {
                nextPageButton.click();
                console.log("Clicked on next page button");
            }
        }
        catch (error) {
            console.error("Error while clicking on next page button", error);
        }
    }
    static async clickPreviousPage() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const previousPageButton = document.querySelector('button[aria-label="Back to previous step"]');
            if (previousPageButton) {
                previousPageButton.click();
                console.log("Clicked on previous page button");
            }
        }
        catch (error) {
            console.error("Error while clicking on previous page button", error);
        }
    }
    static async clickReviewApplication() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const reviewButton = document.querySelector('button[aria-label="Review your application"]');
            if (reviewButton) {
                reviewButton.click();
                console.log("Clicked on review button");
            }
        }
        catch (error) {
            console.error("Error while clicking on review button", error);
        }
    }
    static async clickSubmitApplication() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const submitButton = document.querySelector('button[aria-label="Submit application"]');
            if (submitButton) {
                submitButton.click();
                console.log("Clicked on submit button");
            }
        }
        catch (error) {
            console.error("Error while clicking on submit button", error);
        }
    }
    



















































    /////////////////////////////////////////////////
    ////////////////////// END //////////////////////   
    /////////////////////////////////////////////////
}

export default LinkedInJobHelper;
