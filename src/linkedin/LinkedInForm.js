import LinkedInBase from './LinkedInBase.js';
import AIQuestionAnswerer from '../ai/AIQuestionAnswerer.js'

class LinkedInForm extends LinkedInBase {
    static async closeForm(save = false) {
        try {
            // Reset AIQuestionAnswerer instance when closing the form
            AIQuestionAnswerer.resetInstance();
            
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
            AIQuestionAnswerer.resetInstance();
            
            const startTime = Date.now();
            const timeout = 3 * 60 * 1000; // 3 minutes
            let isSubmitted = false;

            while (!isSubmitted && (Date.now() - startTime) < timeout) {
                this.debugLog("Starting form processing iteration");

                if (await shouldStop()) {
                    this.debugLog("Stop requested during form processing");
                    return false;
                }

                await this.processFormQuestions();

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
                        await this.processFormQuestions();
                        await this.clickReviewApplication();
                        this.debugLog("Found and clicked review button");
                        reviewFound = true;
                        await this.wait(2000);

                        const submitButton = document.querySelector('button[aria-label="Submit application"]');
                        if (submitButton) {
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
                            await this.processFormQuestions();
                            await this.clickNextPage();
                            this.debugLog("Clicked next page button");
                            await this.wait(2000);
                        } else {
                            const submitButton = document.querySelector('button[aria-label="Submit application"]');
                            if (submitButton) {
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
                    const labelElement = element.querySelector("label");
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

                    await this.answerQuestion(questionText, options);
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

    static async answerQuestion(question, options = []) {
        try {
            // Use the singleton instance instead of creating a new one
            const ai = AIQuestionAnswerer.getInstance();
            
            this.debugLog(`Answering question: ${question}`);
            this.debugLog(`Available options:`, options);
            
            // Save to chrome.storage for persistence
            const currentJob = await chrome.storage.local.get('currentJob');
            ai.setJob(currentJob)
            const formElements = document.querySelectorAll("div.fb-dash-form-element");
            for (const element of formElements) {
                const labelElement = element.querySelector("label");
                if (!labelElement) continue;

                let questionText = labelElement.textContent.trim();
                questionText = questionText.replace(/(.+?)\1/, '$1');
                if (questionText !== question) continue;

                const inputField = element.querySelector("input, textarea, select");
                if (!inputField) {
                    this.debugLog("No input field found for question");
                    continue;
                }

                let answer;
                answer = await ai.answerQuestion(question, options);

                if (!answer) {
                    this.debugLog("No answer generated for question");
                    continue;
                }
                this.debugLog(`AI Answer: ${answer}`);

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
            }

            this.debugLog(`Question not found: ${question}`);
            return false;
        } catch (error) {
            this.errorLog(`Error answering question "${question}"`, error);
            return false;
        }
    }
}

export default LinkedInForm; 