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
            await this.wait();
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
            await this.wait();
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

    static async processForm(shouldStop) {
        try {
            // Reset the AIQuestionAnswerer instance for a fresh form            
            const startTime = Date.now();
            const timeout = 3 * 60 * 1000; // 3 minutes
            let isSubmitted = false;

            // Create a new instance of AIQuestionAnswerer
            const ai = new AIQuestionAnswerer();

            // Flag to track if we've processed the current page already
            let currentPageProcessed = false;

            while (!isSubmitted && (Date.now() - startTime) < timeout) {
                this.debugLog("Starting form processing iteration");

                if (await shouldStop()) {
                    this.debugLog("Stop requested during form processing");
                    return false;
                }

                // Check if the current page has form questions that need processing
                const formElements = document.querySelectorAll("div.fb-dash-form-element");
                const hasFormQuestions = formElements.length > 0;

                // Process the form questions only if we haven't processed this page yet and there are questions
                if (!currentPageProcessed && hasFormQuestions) {
                    this.debugLog(`Found ${formElements.length} form questions on current page`);
                    await this.processFormQuestions();
                    currentPageProcessed = true;
                    this.debugLog("Current page form questions processed, will not reprocess");
                } else if (!hasFormQuestions) {
                    this.debugLog("No form questions found on current page");
                } else {
                    this.debugLog("Skipping redundant form processing for current page");
                }

                const reviewStartTime = Date.now();
                const reviewTimeout = 60 * 1000; // 1 minute
                let reviewFound = false;

                while (!reviewFound && (Date.now() - reviewStartTime) < reviewTimeout) {
                    if (await shouldStop()) {
                        this.debugLog("Stop requested during review loop");
                        return false;
                    }

                    const reviewButton = document.querySelector('button[aria-label="Review your application"]');
                    if (reviewButton) {
                        // Click the review button
                        await this.clickReviewApplication();
                        this.debugLog("Found and clicked review button");
                        reviewFound = true;
                        await this.wait(2000);

                        // Reset the currentPageProcessed flag because we're now on a new page (the review page)
                        // This allows us to check for and process any questions on the review page
                        currentPageProcessed = false;

                        // Check if we now have a submit button
                        const submitButton = document.querySelector('button[aria-label="Submit application"]');
                        if (submitButton) {
                            // Check if there are any questions on the review page
                            const reviewPageFormElements = document.querySelectorAll("div.fb-dash-form-element");
                            if (reviewPageFormElements.length > 0) {
                                this.debugLog(`Found ${reviewPageFormElements.length} form questions on review page`);
                                await this.processFormQuestions();
                            } else {
                                this.debugLog("No questions found on review page");
                            }

                            // Finalize conversation before submitting
                            await this.finalizePageConversation();
                            await this.clickSubmitApplication();
                            this.debugLog("Clicked submit button after review");
                            isSubmitted = true;
                            try {
                                await this.clickDoneAfterSubmit();
                                await this.clickDismissAfterSubmit();
                            } catch (error) {
                                this.errorLog("Error with post-submission actions", error);
                            }
                            break;
                        }
                    } else {
                        const nextPageButton = document.querySelector('button[aria-label="Continue to next step"]');
                        if (nextPageButton) {
                            // Finalize conversation before moving to next page
                            await this.finalizePageConversation();

                            // Don't reprocess the form before clicking next
                            await this.clickNextPage();
                            this.debugLog("Clicked next page button");
                            await this.wait(2000);

                            // Reset the flag since we're on a new page
                            currentPageProcessed = false;
                        } else {
                            const submitButton = document.querySelector('button[aria-label="Submit application"]');
                            if (submitButton) {
                                // Finalize conversation before submitting
                                await this.finalizePageConversation();

                                await this.clickSubmitApplication();
                                this.debugLog("Found submit button without review");
                                isSubmitted = true;
                                try {
                                    await this.clickDoneAfterSubmit();
                                    await this.clickDismissAfterSubmit();
                                } catch (error) {
                                    this.errorLog("Error with post-submission actions", error);
                                }
                                break;
                            }
                        }
                    }

                    await this.wait(2000);
                }

                if (!reviewFound) {
                    this.debugLog("Review button not found within 1 minute, continuing to next iteration");
                }

                await this.wait(2000);
            }

            if (!isSubmitted) {
                this.debugLog("Form processing timed out after 3 minutes");
                return false;
            }

            this.debugLog("Form processed and submitted successfully");
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
     * Finalize conversation for the current page before moving to next
     * This ensures each page's conversation is saved properly
     */
    static async finalizePageConversation() {
        try {
            this.debugLog("Preparing to finalize conversation for current page");

            // Add a delay to ensure all conversation updates have been processed
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Create a new instance of AIQuestionAnswerer
            const ai = new AIQuestionAnswerer();

            // Load job info
            const currentJob = await chrome.storage.local.get('currentJob');
            ai.setJob(currentJob);

            // Save the conversation data directly to storage before finalizing
            // This ensures we have a backup of the full conversation
            try {
                const conversation = conversationHistory.getCurrentHistory();
                if (conversation && conversation.length > 1 && currentJob?.currentJob?.title) {
                    await new Promise(resolve => {
                        chrome.storage.local.get(['conversationData'], function (result) {
                            let conversationData = result.conversationData || {};
                            const jobTitle = currentJob.currentJob.title;

                            if (!conversationData[jobTitle]) {
                                conversationData[jobTitle] = [];
                            }

                            // Add the full conversation as a backup
                            conversationData[jobTitle].push(conversation);

                            chrome.storage.local.set({ conversationData }, resolve);
                        });
                    });
                    this.debugLog("Saved full conversation backup to storage before finalizing");
                }
            } catch (storageError) {
                this.errorLog("Error saving conversation backup:", storageError);
            }

            // Now finalize the conversation
            ai.finalizeConversation();

            this.debugLog("Finalized conversation for current page");
        } catch (error) {
            this.errorLog("Error finalizing page conversation", error);
        }
    }
}

export default LinkedInForm; 