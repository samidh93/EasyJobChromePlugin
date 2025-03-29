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
                
                // Process any form questions on the current page
                await this.processFormQuestions();
                
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
                        // Process any questions before clicking review
                        await this.processFormQuestions();
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
                            // Process any questions before clicking next
                            await this.processFormQuestions();
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

    static async answerQuestion(question, options = []) {
        try {
            console.log(`Answering question: ${question}`);
            console.log(`Available options:`, options);

            // Find the form element containing this question
            const formElements = document.querySelectorAll("div.fb-dash-form-element");
            for (const element of formElements) {
                const labelElement = element.querySelector("label");
                if (!labelElement) continue;

                // Clean up the question text by removing duplicate parts
                let questionText = labelElement.textContent.trim();
                // Remove duplicate text (e.g., "Email addressEmail address" -> "Email address")
                questionText = questionText.replace(/(.+?)\1/, '$1');
                if (questionText !== question) continue;

                // Find the input field
                const inputField = element.querySelector("input, textarea, select");
                if (!inputField) {
                    console.log("No input field found for question");
                    continue;
                }

                // Handle different input types
                switch (inputField.tagName.toLowerCase()) {
                    case 'input':
                        switch (inputField.type) {
                            case 'text':
                            case 'tel':
                            case 'email':
                                // Fill text input with appropriate data based on question
                                if (question.toLowerCase().includes('phone') || question.toLowerCase().includes('mobile')) {
                                    inputField.value = '1234567890';
                                } else if (question.toLowerCase().includes('email')) {
                                    inputField.value = 'example@email.com';
                                } else if (question.toLowerCase().includes('name')) {
                                    inputField.value = 'John Doe';
                                } else if (options.length > 0) {
                                    inputField.value = options[0];
                                } else {
                                    inputField.value = 'Yes';
                                }
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                break;

                            case 'radio':
                                // Find and click the radio option that matches the first option
                                const radioOptions = element.querySelectorAll('input[type="radio"]');
                                if (options.length > 0) {
                                    for (const radio of radioOptions) {
                                        const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                        if (radioLabel && radioLabel.textContent.trim() === options[0]) {
                                            radio.click();
                                            console.log(`Selected radio option: ${options[0]}`);
                                            break;
                                        }
                                    }
                                } else if (radioOptions.length > 0) {
                                    radioOptions[0].click();
                                    console.log(`Selected first radio option`);
                                }
                                break;

                            case 'checkbox':
                                inputField.checked = true;
                                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                break;
                        }
                        break;

                    case 'textarea':
                        if (options.length > 0) {
                            inputField.value = options[0];
                        } else {
                            inputField.value = 'I am interested in this position and believe my skills align well with the requirements.';
                        }
                        inputField.dispatchEvent(new Event('input', { bubbles: true }));
                        break;

                    case 'select':
                        if (options.length > 0) {
                            // Try to find the option that matches the first option in the list
                            for (let i = 0; i < inputField.options.length; i++) {
                                if (inputField.options[i].text.trim() === options[0]) {
                                    inputField.selectedIndex = i;
                                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                    console.log(`Selected option: ${options[0]}`);
                                    break;
                                }
                            }
                        } else if (inputField.options.length > 0) {
                            inputField.selectedIndex = 0;
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log(`Selected first option: ${inputField.options[0].text.trim()}`);
                        }
                        break;
                }

                // Wait a bit after filling the field
                await new Promise(resolve => setTimeout(resolve, 500));
                return true;
            }

            console.log(`Question not found: ${question}`);
            return false;
        } catch (error) {
            console.error(`Error answering question "${question}":`, error);
            return false;
        }
    }

    static async processFormQuestions() {
        try {
            console.log("Processing form questions");
            const formElements = document.querySelectorAll("div.fb-dash-form-element");
            console.log(`Found ${formElements.length} form elements`);

            for (const element of formElements) {
                try {
                    // Get the question label
                    const labelElement = element.querySelector("label");
                    if (!labelElement) {
                        console.log("No label found for form element");
                        continue;
                    }

                    // Clean up the question text by removing duplicate parts
                    let questionText = labelElement.textContent.trim();
                    // Remove duplicate text (e.g., "Email addressEmail address" -> "Email address")
                    questionText = questionText.replace(/(.+?)\1/, '$1');
                    console.log(`Processing question: ${questionText}`);

                    // Find the input field
                    const inputField = element.querySelector("input, textarea, select");
                    if (!inputField) {
                        console.log("No input field found for question");
                        continue;
                    }

                    // Get options based on input type
                    let options = [];
                    switch (inputField.tagName.toLowerCase()) {
                        case 'input':
                            if (inputField.type === 'radio') {
                                const radioOptions = element.querySelectorAll('input[type="radio"]');
                                radioOptions.forEach(radio => {
                                    const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                    if (radioLabel) {
                                        options.push(radioLabel.textContent.trim());
                                    }
                                });
                            }
                            break;
                        case 'select':
                            options = Array.from(inputField.options).map(option => option.text.trim());
                            break;
                    }

                    // Log available options
                    if (options.length > 0) {
                        console.log(`Available options for "${questionText}":`);
                        options.forEach((option, index) => {
                            //console.log(`  ${index + 1}. ${option}`);
                        });
                    }

                    // Answer the question
                    await this.answerQuestion(questionText, options);
                } catch (error) {
                    console.error(`Error processing form element: ${error.message}`);
                }
            }

            console.log("Completed processing form questions");
            return true;
        } catch (error) {
            console.error("Error in processFormQuestions:", error);
            return false;
        }
    }
}

export default LinkedInJobHelper;
