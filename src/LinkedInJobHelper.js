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

    static async getAvailablePages(element) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));

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

            console.log(`Found ${jobElements.length} jobs on this page.`);
            return Array.from(jobElements);
        } catch (error) {
            console.error("Exception occurred while fetching the list of jobs:", error);
            return [];
        }
    }

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
        } catch (error) {
            console.info("could not click on job element", error);
        }
    }

    static async clickApply(jobElement) {
        try {
            const applyButton = document.querySelector('.jobs-s-apply button');
            if (applyButton) {
                applyButton.click();
            };
        }
        catch (error) {
            console.error("Error while clicking on apply button", error);
        }
    }
    
    static async getFormElements() {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const formElements = document.querySelector('.jobs-easy-apply-modal');
            if (formElements) {
                console.log("Found form elements");
                return formElements;
            }
            else {
                console.log("Could not find form elements");
                return null;
            }
        }
        catch (error) {
            console.error("Error while fetching form elements", error);
            return null;
        }
    }
    // close form
    static async closeForm(Form, save=false) {
        try {
            const closeButton = Form.querySelector('button[aria-label="Dismiss"]');
            if (closeButton) {
                closeButton.click();
                await new Promise((resolve) => setTimeout(resolve, 500));
                if (save) {
                    const saveButton = Form.querySelector('button[data-control-name="save_application_btn"]'); 
                    if (saveButton) {
                        saveButton.click();
                    }
                } else {
                    const discardButton = Form.querySelector('button[data-control-name="discard_application_confirm_btn"]');
                    if (discardButton) {
                        discardButton.click();
                    }
                }
            }
        } catch (error) {
            console.error("Error while closing form", error);
        }
    }
    static async clickNextPage(Form) {
        try {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            const nextPageButton = Form.querySelector('button[aria-label="Continue to next step"]');
            if (nextPageButton) {
                nextPageButton.click();
            }
        }
        catch (error) {
            console.error("Error while clicking on next page button", error);
        }
    }
}

export default LinkedInJobHelper;
