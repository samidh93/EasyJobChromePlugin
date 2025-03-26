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
    ////////////////////// JOB LIST ELEMENT //////////////////////
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


    static async clickOnJob(jobElement) {
        // click on the job element
        try {
            jobElement.click();
            console.log("Clicked on job element");
        } catch (error) {
            console.info("could not click on job element", error);
        }
    }



    /////////////////////////////////////////////////////////
    ////////////////////////// JOB EMBEDDED PAGE //////////////////////////
    /////////////////////////////////////////////////////////
    static async clickEasyApply() {
        try {
            const applyButton = document.querySelector('.jobs-s-apply button');
            if (applyButton) {
                applyButton.click();
                console.log("Clicked on easy apply button");
                return true;
            };
            throw new Error("Easy apply button not found");
        }
        catch (error) {
            console.error("Error while clicking on easy apply button", error);
            throw error;
        }
    }

    /////////////////////////////////////////////////////////
    ////////////////////////// JOB INFO //////////////////////////
    /////////////////////////////////////////////////////////
    static async getJobTitle() {
        try {
            const titleElement = document.querySelector('.job-details-jobs-unified-top-card__job-title h1');
            if (titleElement) {
                const title = titleElement.textContent.trim();
                console.log(`Found job title: ${title}`);
                return title;
            }
            console.log("Job title not found");
            return null;
        } catch (error) {
            console.error("Error while getting job title:", error);
            return null;
        }
    }

    static async getCompanyName() {
        try {
            const companyElement = document.querySelector('.job-details-jobs-unified-top-card__company-name a');
            if (companyElement) {
                const companyName = companyElement.textContent.trim();
                console.log(`Found company name: ${companyName}`);
                return companyName;
            }
            console.log("Company name not found");
            return null;
        } catch (error) {
            console.error("Error while getting company name:", error);
            return null;
        }
    }

    static async getLocation() {
        try {
            const locationElement = document.querySelector('.job-details-jobs-unified-top-card__tertiary-description-container .tvm__text');
            if (locationElement) {
                const location = locationElement.textContent.trim();
                console.log(`Found location: ${location}`);
                return location;
            }
            console.log("Location not found");
            return null;
        } catch (error) {
            console.error("Error while getting location:", error);
            return null;
        }
    }

    static async getJobType() {
        try {
            const jobTypeElement = document.querySelector('.job-details-preferences-and-skills__pill .ui-label');
            if (jobTypeElement) {
                const jobTypeText = jobTypeElement.textContent.trim();
                // Extract just the job type (Remote, Hybrid, or Onsite)
                const jobType = jobTypeText.split('Matches')[0].trim();
                console.log(`Found job type: ${jobType}`);
                return jobType;
            }
            console.log("Job type not found");
            return null;
        } catch (error) {
            console.error("Error while getting job type:", error);
            return null;
        }
    }

    static async getJobDescription() {
        try {
            const descriptionElement = document.querySelector('.jobs-description__content');
            if (descriptionElement) {
                const description = descriptionElement.textContent.trim();
                console.log("Found job description");
                return description;
            }
            console.log("Job description not found");
            return null;
        } catch (error) {
            console.error("Error while getting job description:", error);
            return null;
        }
    }

    static async getApplicantCount() {
        try {
            const applicantElement = document.querySelector('.jobs-premium-applicant-insights__list-item .jobs-premium-applicant-insights__list-num');
            if (applicantElement) {
                const count = applicantElement.textContent.trim();
                console.log(`Found applicant count: ${count}`);
                return count;
            }
            console.log("Applicant count not found");
            return null;
        } catch (error) {
            console.error("Error while getting applicant count:", error);
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
            console.log("Retrieved all job information");
            return jobInfo;
        } catch (error) {
            console.error("Error while getting all job information:", error);
            return null;
        }
    }

    /////////////////////////////////////////////////////////
    ////////////////////////// FORM //////////////////////////
    /////////////////////////////////////////////////////////
    // close form
    static async closeForm(save = false) {
        try {
            // First try to find the close button
            let closeButton = document.querySelector('button[aria-label="Dismiss"]');

            // If not found, try alternative selectors that might be present during different stages
            if (!closeButton) {
                closeButton = document.querySelector('button[aria-label="Close"]') ||
                    document.querySelector('button[aria-label="Cancel"]') ||
                    document.querySelector('button[data-test-modal-close-btn]');
            }

            if (closeButton) {
                closeButton.click();
                await new Promise((resolve) => setTimeout(resolve, 1000));

                // Handle save/discard dialog if it appears
                if (save) {
                    const saveButton = document.querySelector('button[data-control-name="save_application_btn"]');
                    if (saveButton) {
                        saveButton.click();
                        console.log("closed form and saved application");
                    }
                } else {
                    const discardButton = document.querySelector('button[data-control-name="discard_application_confirm_btn"]') ||
                        document.querySelector('button[data-test-dialog-secondary-btn]');
                    if (discardButton) {
                        discardButton.click();
                        console.log("closed form and discarded application");
                    }
                }

                // Wait a bit to ensure the form is fully closed
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
        } catch (error) {
            console.error("Error while closing form", error);
            // Try one last time with a more aggressive approach
            try {
                const allCloseButtons = document.querySelectorAll('button');
                for (const button of allCloseButtons) {
                    if (button.textContent.toLowerCase().includes('close') ||
                        button.textContent.toLowerCase().includes('cancel') ||
                        button.getAttribute('aria-label')?.toLowerCase().includes('close') ||
                        button.getAttribute('aria-label')?.toLowerCase().includes('dismiss')) {
                        button.click();
                        await new Promise((resolve) => setTimeout(resolve, 500));
                    }
                }
            } catch (finalError) {
                console.error("Failed final attempt to close form", finalError);
            }
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

    static async processForm(shouldStop) {
        try {
            const startTime = Date.now();
            const timeout = 3 * 60 * 1000; // 3 minutes in milliseconds
            let isSubmitted = false;

            // Main loop - runs for up to 3 minutes
            while (!isSubmitted && (Date.now() - startTime) < timeout) {
                console.log("Starting form processing iteration");
                
                // Check if we should stop
                if (await shouldStop()) {
                    console.log("Stop requested during form processing");
                    return false;
                }
                
                // Inner loop - looks for review button for up to 1 minute
                const reviewStartTime = Date.now();
                const reviewTimeout = 60 * 1000; // 1 minute
                let reviewFound = false;

                while (!reviewFound && (Date.now() - reviewStartTime) < reviewTimeout) {
                    // Check if we should stop
                    if (await shouldStop()) {
                        console.log("Stop requested during review loop");
                        return false;
                    }

                    // Look for review button
                    const reviewButton = document.querySelector('button[aria-label="Review your application"]');
                    if (reviewButton) {
                        reviewButton.click();
                        console.log("Found and clicked review button");
                        reviewFound = true;
                        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for review page
                        
                        // Try to submit after review
                        const submitButton = document.querySelector('button[aria-label="Submit application"]');
                        if (submitButton) {
                            submitButton.click();
                            console.log("Clicked submit button after review");
                            isSubmitted = true;
                            break;
                        }
                    } else {
                        // If no review button, try next page
                        const nextPageButton = document.querySelector('button[aria-label="Continue to next step"]');
                        if (nextPageButton) {
                            nextPageButton.click();
                            console.log("Clicked next page button");
                            await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait for next page
                        } else {
                            // Check if we're already on the submit page
                            const submitButton = document.querySelector('button[aria-label="Submit application"]');
                            if (submitButton) {
                                submitButton.click();
                                console.log("Found submit button without review");
                                isSubmitted = true;
                                break;
                            }
                        }
                    }
                    
                    // Wait before next iteration of inner loop
                    await new Promise((resolve) => setTimeout(resolve, 2000));
                }

                if (!reviewFound) {
                    console.log("Review button not found within 1 minute, continuing to next iteration");
                }

                // Wait before next iteration of main loop
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }

            if (!isSubmitted) {
                console.log("Form processing timed out after 3 minutes");
                return false;
            }

            console.log("Form processed and submitted successfully");
            return true;
        } catch (error) {
            console.error("Error while processing form:", error);
            return false;
        }
    }

    /////////////////////////////////////////////////
    ////////////////////// END //////////////////////   
    /////////////////////////////////////////////////
}

export default LinkedInJobHelper;
