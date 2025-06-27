import LinkedInBase from './LinkedInBase.js';
import AIQuestionAnswerer from '../ai/AIQuestionAnswerer.js'
import conversationHistory from '../ai/ConversationHistory.js';

class LinkedInForm extends LinkedInBase {
    static async closeForm(save = false) {
        try {
            // Reset AIQuestionAnswerer instance when closing the form            
            let closeButton = document.querySelector('button[aria-label="Dismiss"]');

            if (!closeButton) {
                closeButton = document.querySelector('button[aria-label="Close"]') ||
                    document.querySelector('button[aria-label="Cancel"]') ||
                    document.querySelector('button[data-test-modal-close-btn]');
            }

            if (closeButton) {
                closeButton.click();
                await this.wait();

                if (save) {
                    const saveButton = document.querySelector('button[data-control-name="save_application_btn"]');
                    if (saveButton) {
                        saveButton.click();
                        this.debugLog("Closed form and saved application");
                    }
                } else {
                    const discardButton = document.querySelector('button[data-control-name="discard_application_confirm_btn"]') ||
                        document.querySelector('button[data-test-dialog-secondary-btn]');
                    if (discardButton) {
                        discardButton.click();
                        this.debugLog("Closed form and discarded application");
                    }
                }

                await this.wait();
            }
        } catch (error) {
            this.errorLog("Error closing form", error);
            try {
                const allCloseButtons = document.querySelectorAll('button');
                for (const button of allCloseButtons) {
                    if (button.textContent.toLowerCase().includes('close') ||
                        button.textContent.toLowerCase().includes('cancel') ||
                        button.getAttribute('aria-label')?.toLowerCase().includes('close') ||
                        button.getAttribute('aria-label')?.toLowerCase().includes('dismiss')) {
                        button.click();
                        await this.wait(500);
                    }
                }
            } catch (finalError) {
                this.errorLog("Failed final attempt to close form", finalError);
            }
        }
    }

    static async clickNextPage() {
        try {
            await this.wait();
            const nextPageButton = document.querySelector('button[aria-label="Continue to next step"]');
            if (nextPageButton) {
                nextPageButton.click();
                this.debugLog("Clicked on next page button");
            }
        } catch (error) {
            this.errorLog("Error clicking on next page button", error);
        }
    }

    static async clickPreviousPage() {
        try {
            await this.wait();
            const previousPageButton = document.querySelector('button[aria-label="Back to previous step"]');
            if (previousPageButton) {
                previousPageButton.click();
                this.debugLog("Clicked on previous page button");
            }
        } catch (error) {
            this.errorLog("Error clicking on previous page button", error);
        }
    }

    static async clickReviewApplication() {
        try {
            await this.wait();
            const reviewButton = document.querySelector('button[aria-label="Review your application"]');
            if (reviewButton) {
                reviewButton.click();
                this.debugLog("Clicked on review button");
            }
        } catch (error) {
            this.errorLog("Error clicking on review button", error);
        }
    }

    static async clickSubmitApplication() {
        try {
            await this.wait();
            const submitButton = document.querySelector('button[aria-label="Submit application"]');
            if (submitButton) {
                submitButton.click();
                this.debugLog("Clicked on submit button");
            }
        } catch (error) {
            this.errorLog("Error clicking on submit button", error);
        }
    }
    static async clickDoneAfterSubmit() {
        try {
            // Try the aria-label approach first
            let doneButton = document.querySelector('button[aria-label="Done"]');

            // If not found, try finding by class and text content
            if (!doneButton) {
                // use the span and class to find the button
                //<span class="artdeco-button__text">Done</span>
                doneButton = document.querySelector('button.artdeco-button span.artdeco-button__text');
                this.debugLog("Found done button", doneButton);
            }

            if (doneButton) {
                doneButton.click();
                this.debugLog("Clicked on Done button");
            } else {
                this.debugLog("Done button not found");
            }
        } catch (error) {
            this.errorLog("Error clicking on Done button", error);
        }
    }

    static async clickDismissAfterSubmit() {
        try {
            // Try the aria-label approach first
            let dismissButton = document.querySelector('button[aria-label="Dismiss"]');

            // If not found, try finding by data attribute
            if (!dismissButton) {
                dismissButton = document.querySelector('button[data-test-modal-close-btn]');
            }

            // If still not found, try finding by class and SVG icon
            if (!dismissButton) {
                const buttons = document.querySelectorAll('button.artdeco-button--circle.artdeco-modal__dismiss');
                for (const button of buttons) {
                    if (button.querySelector('svg use[href="#close-medium"]')) {
                        dismissButton = button;
                        break;
                    }
                }
            }

            if (dismissButton) {
                dismissButton.click();
                this.debugLog("Clicked on Dismiss button");
            } else {
                this.debugLog("Dismiss button not found");
            }
        } catch (error) {
            this.errorLog("Error clicking on Dismiss button", error);
        }
    }

    static async findReviewButton() {
        try {
            const reviewButton = document.querySelector('button[aria-label="Review your application"]');
            return reviewButton;
        } catch (error) {
            this.errorLog("Error finding review button", error);
            return null;
        }
    }

    static async findNextButton() {
        try {
            const nextButton = document.querySelector('button[aria-label="Continue to next step"]');
            return nextButton;
        } catch (error) {
            this.errorLog("Error finding next button", error);
            return null;
        }
    }

    static async findSubmitButton() {
        try {
            const submitButton = document.querySelector('button[aria-label="Submit application"]');
            return submitButton;
        } catch (error) {
            this.errorLog("Error finding submit button", error);
            return null;
        }
    }

    static async findDoneButton() {
        try {
            // Try the aria-label approach first
            let doneButton = document.querySelector('button[aria-label="Done"]');

            // If not found, try finding by class and text content
            if (!doneButton) {
                const buttons = document.querySelectorAll('button.artdeco-button');
                for (const button of buttons) {
                    const spanText = button.querySelector('span.artdeco-button__text');
                    if (spanText && spanText.textContent.trim() === 'Done') {
                        doneButton = button;
                        break;
                    }
                }
            }

            return doneButton;
        } catch (error) {
            this.errorLog("Error finding done button", error);
            return null;
        }
    }

    static async processForm(shouldStop) {
        try {
            this.debugLog("Starting form processing");

            // Set timeout for form processing (3 minutes)
            const formTimeout = setTimeout(() => {
                this.debugLog("Form processing timeout reached");
                shouldStop.value = true;
            }, 3 * 60 * 1000);

            let currentPageProcessed = false;

            while (!shouldStop.value) {
                try {
                    // Check for review button first
                    const reviewButton = await this.findReviewButton();

                    if (reviewButton) {
                        this.debugLog("Found review button");

                        // Set timeout for review processing (1 minute)
                        const reviewTimeout = setTimeout(() => {
                            this.debugLog("Review processing timeout reached");
                            shouldStop.value = true;
                        }, 1 * 60 * 1000);

                        // Check if there are questions on the current page before clicking review
                        const formElements = document.querySelectorAll("div.fb-dash-form-element");
                        if (formElements.length > 0 && !currentPageProcessed) {
                            this.debugLog("Found questions on current page, processing before review");
                            await this.processFormQuestions();
                            currentPageProcessed = true;
                            this.debugLog("Current page form questions processed, will not reprocess");
                        } else if (currentPageProcessed) {
                            this.debugLog("Skipping redundant form processing for current page");
                        } else {
                            this.debugLog("No form questions found on current page");
                        }

                        // Flush any pending questions before moving to review
                        await this.flushPendingQuestions();

                        await this.clickReviewApplication();
                        await this.wait(2000);

                        // Check for questions on the review page
                        const reviewFormElements = document.querySelectorAll("div.fb-dash-form-element");
                        if (reviewFormElements.length > 0) {
                            this.debugLog("Found questions on review page");
                            await this.processFormQuestions();
                        } else {
                            this.debugLog("No questions found on review page");
                        }

                        // Flush questions after review page processing
                        await this.flushPendingQuestions();

                        await this.clickSubmitApplication();

                        // Wait for potential Done button popup and handle it
                        await this.wait(2000);

                        await this.clickDismissAfterSubmit();

                        this.debugLog("Clicked submit button after review");
                        clearTimeout(reviewTimeout);
                        break;
                    }

                    // Check for form questions if no review button
                    const formElements = document.querySelectorAll("div.fb-dash-form-element");
                    if (formElements.length > 0 && !currentPageProcessed) {
                        this.debugLog("Found form questions, processing...");
                        await this.processFormQuestions();
                        currentPageProcessed = true;
                        this.debugLog("Form questions processed");
                    }

                    // Check for next page button
                    const nextButton = await this.findNextButton();
                    if (nextButton) {
                        this.debugLog("Found next button, moving to next page");

                        // Flush pending questions before moving to next page
                        await this.flushPendingQuestions();

                        await this.clickNextPage();
                        await this.wait(2000);

                        // Reset the flag for the new page
                        currentPageProcessed = false;
                        continue;
                    }

                    // Check for submit button (final page without review)
                    const submitButton = await this.findSubmitButton();
                    if (submitButton) {
                        this.debugLog("Found submit button, submitting application");

                        // Flush any remaining questions before final submission
                        await this.flushPendingQuestions();

                        await this.clickSubmitApplication();

                        // Wait for potential Done button popup and handle it
                        await this.wait(2000);

                        await this.clickDismissAfterSubmit();


                        break;
                    }

                    // If no buttons found, wait and try again
                    this.debugLog("No navigation buttons found, waiting...");
                    await this.wait(1000);

                } catch (error) {
                    this.errorLog("Error in form processing loop", error);
                    await this.wait(2000);
                }
            }

            clearTimeout(formTimeout);
            this.debugLog("Form processing completed");
            return true;
        } catch (error) {
            this.errorLog("Error processing form", error);
            return false;
        }
    }

    static async processFormQuestions() {
        try {
            this.debugLog("Processing form questions");
            const formElements = document.querySelectorAll("div.fb-dash-form-element");
            this.debugLog(`Found ${formElements.length} form elements`);

            for (const element of formElements) {
                try {
                    const labelElement = element.querySelector("legend span.fb-dash-form-element__label span")
                        || element.querySelector("label");
                    if (!labelElement) {
                        this.debugLog("No label found for form element");
                        continue;
                    }

                    let questionText = labelElement.textContent.trim();
                    questionText = questionText.replace(/(.+?)\1/, '$1');
                    this.debugLog(`Processing question: ${questionText}`);

                    const inputField = element.querySelector("input, textarea, select");
                    if (!inputField) {
                        this.debugLog("No input field found for question");
                        continue;
                    }

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

                    if (options.length > 0) {
                        this.debugLog(`Available options for "${questionText}":`);
                    }

                    // Pass the inputField directly to avoid redundant search
                    await this.answerQuestion(questionText, options, inputField, element);
                } catch (error) {
                    this.errorLog(`Error processing form element: ${error.message}`, error);
                }
            }

            this.debugLog("Completed processing form questions");
            return true;
        } catch (error) {
            this.errorLog("Error in processFormQuestions", error);
            return false;
        }
    }

    static async answerQuestion(question, options = [], inputField, element) {
        try {
            // Create a new instance of AIQuestionAnswerer instead of using singleton
            const ai = new AIQuestionAnswerer();

            this.debugLog(`Answering question: ${question}`);
            this.debugLog(`Available options:`, options);

            // Load user profile data from Chrome storage
            try {
                const result = await chrome.storage.local.get('userProfileYaml');
                if (result && result.userProfileYaml) {
                    this.debugLog('Found user profile YAML in storage');
                    // Set the user context in the AI instance
                    await ai.setUserContext(result.userProfileYaml);
                    this.debugLog('Set user context in AI instance');
                } else {
                    this.debugLog('No user profile found in storage');
                }
            } catch (error) {
                this.errorLog('Error loading user profile from storage:', error);
            }

            // Save to chrome.storage for persistence
            const currentJob = await chrome.storage.local.get('currentJob');
            ai.setJob(currentJob);

            // Get the answer directly without re-searching for form elements
            let answer = await ai.answerQuestion(question, options);

            if (!answer) {
                this.debugLog("No answer generated for question");
                return false;
            }

            this.debugLog(`AI Answer: ${answer}`);

            // Fill in the answer using the provided inputField
            switch (inputField.tagName.toLowerCase()) {
                case 'input':
                    switch (inputField.type) {
                        case 'text':
                        case 'tel':
                        case 'email':
                            inputField.value = answer;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            break;

                        case 'radio':
                            const radioOptions = element.querySelectorAll('input[type="radio"]');
                            for (const radio of radioOptions) {
                                const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                if (radioLabel && radioLabel.textContent.trim() === answer) {
                                    radio.click();
                                    this.debugLog(`Selected radio option: ${answer}`);
                                    break;
                                }
                            }
                            break;

                        case 'checkbox':
                            inputField.checked = true;
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                    }
                    break;

                case 'textarea':
                    inputField.value = answer;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    break;

                case 'select':
                    for (let i = 0; i < inputField.options.length; i++) {
                        if (inputField.options[i].text.trim() === answer) {
                            inputField.selectedIndex = i;
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            this.debugLog(`Selected option: ${answer}`);
                            break;
                        }
                    }
                    break;
            }

            await this.wait(500);
            return true;
        } catch (error) {
            this.errorLog(`Error answering question "${question}"`, error);
            return false;
        }
    }

    /**
     * Flush pending questions from the AI instance
     * This ensures all questions are stored before page transitions
     */
    static async flushPendingQuestions() {
        try {
            // Create a temporary AI instance to access the flush method
            const ai = new AIQuestionAnswerer();

            // Load job info
            const currentJob = await chrome.storage.local.get('currentJob');
            ai.setJob(currentJob);

            // Flush any pending questions
            await ai.flushPendingQuestions();

            this.debugLog("Flushed pending questions");
        } catch (error) {
            this.errorLog("Error flushing pending questions", error);
        }
    }

    /**
     * Finalize conversation for the current page before moving to next
     * This method is now simplified since we use batching
     */
    static async finalizePageConversation() {
        try {
            this.debugLog("Finalizing page conversation");

            // Just flush pending questions - no need for complex conversation management
            await this.flushPendingQuestions();

            this.debugLog("Page conversation finalized");
        } catch (error) {
            this.errorLog("Error finalizing page conversation", error);
        }
    }
}

export default LinkedInForm; 