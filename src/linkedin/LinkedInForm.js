import LinkedInBase from './LinkedInBase.js';
import AIQuestionAnswerer from '../ai/AIQuestionAnswerer.js'

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
            const formTimeout = setTimeout(async () => {
                this.debugLog("Form processing timeout reached");
                // For async callbacks, we can't set .value, so we'll let the while loop handle it
            }, 3 * 60 * 1000);

            let currentPageProcessed = false;
            let stopRequested = false;

            while (!stopRequested) {
                // Check stop condition - handle both function and object with value
                if (typeof shouldStop === 'function') {
                    stopRequested = await shouldStop();
                } else if (shouldStop && shouldStop.value !== undefined) {
                    stopRequested = shouldStop.value;
                } else {
                    stopRequested = !!shouldStop;
                }
                
                if (stopRequested) {
                    this.debugLog("Stop requested during form processing");
                    break;
                }
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
                            const result = await this.processFormQuestions(shouldStop);
                            if (result.stopped) {
                                this.debugLog("Form questions processing stopped by user");
                                break;
                            }
                            if (!result.success) {
                                this.debugLog("Form questions processing failed");
                                // Continue with review anyway
                            }
                            currentPageProcessed = true;
                            this.debugLog("Current page form questions processed, will not reprocess");
                        } else if (currentPageProcessed) {
                            this.debugLog("Skipping redundant form processing for current page");
                        } else {
                            this.debugLog("No form questions found on current page");
                        }

                        await this.clickReviewApplication();
                        await this.wait(2000);

                        // Check if we should stop after clicking review
                        if (typeof shouldStop === 'function') {
                            stopRequested = await shouldStop();
                        } else if (shouldStop && shouldStop.value !== undefined) {
                            stopRequested = shouldStop.value;
                        } else {
                            stopRequested = !!shouldStop;
                        }
                        
                        if (stopRequested) {
                            this.debugLog("Stop requested after clicking review");
                            break;
                        }

                        // Check for questions on the review page
                        const reviewFormElements = document.querySelectorAll("div.fb-dash-form-element");
                        if (reviewFormElements.length > 0) {
                            this.debugLog("Found questions on review page");
                            const result = await this.processFormQuestions(shouldStop);
                            if (result.stopped) {
                                this.debugLog("Review questions processing stopped by user");
                                break;
                            }
                            if (!result.success) {
                                this.debugLog("Review questions processing failed");
                                // Continue with submit anyway
                            }
                        } else {
                            this.debugLog("No questions found on review page");
                        }

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
                        const result = await this.processFormQuestions(shouldStop);
                        if (result.stopped) {
                            this.debugLog("Form questions processing stopped by user");
                            break;
                        }
                        if (!result.success) {
                            this.debugLog("Form questions processing failed");
                            // Continue to next step anyway
                        }
                        currentPageProcessed = true;
                        this.debugLog("Form questions processed");
                    }

                    // Check for next page button
                    const nextButton = await this.findNextButton();
                    if (nextButton) {
                        this.debugLog("Found next button, moving to next page");

                        await this.clickNextPage();
                        await this.wait(2000);

                        // Check if we should stop after navigation
                        if (typeof shouldStop === 'function') {
                            stopRequested = await shouldStop();
                        } else if (shouldStop && shouldStop.value !== undefined) {
                            stopRequested = shouldStop.value;
                        } else {
                            stopRequested = !!shouldStop;
                        }
                        
                        if (stopRequested) {
                            this.debugLog("Stop requested after navigation");
                            break;
                        }

                        // Reset the flag for the new page
                        currentPageProcessed = false;
                        continue;
                    }

                    // Check for submit button (final page without review)
                    const submitButton = await this.findSubmitButton();
                    if (submitButton) {
                        this.debugLog("Found submit button, submitting application");

                        // Check if we should stop before final submit
                        if (typeof shouldStop === 'function') {
                            stopRequested = await shouldStop();
                        } else if (shouldStop && shouldStop.value !== undefined) {
                            stopRequested = shouldStop.value;
                        } else {
                            stopRequested = !!shouldStop;
                        }
                        
                        if (stopRequested) {
                            this.debugLog("Stop requested before final submit");
                            break;
                        }

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

    /**
     * Check if a question should be skipped because it's already prefilled in LinkedIn
     * @param {string} questionText - The question text to check
     * @returns {boolean} - True if the question should be skipped
     */
    static shouldSkipQuestion(questionText) {
        const lowerQuestion = questionText.toLowerCase();
        
        // Use comprehensive direct keyword matching
        return this.shouldSkipQuestionDirect(lowerQuestion);
    }

    /**
     * Comprehensive keyword matching for common languages
     * @param {string} lowerQuestion - Lowercase question text
     * @returns {boolean} - True if should skip
     */
    static shouldSkipQuestionDirect(lowerQuestion) {
        // Skip email-related questions
        if (lowerQuestion.includes('email') || lowerQuestion.includes('e-mail') || lowerQuestion.includes('e-mail-adresse')) {
            return true;
        }
        
        // Skip phone number questions (English, German, Spanish, French, Italian)
        const phoneTerms = [
            'phone', 'mobile', 'cell', 'telephone', 'handy',  // English
            'telefon', 'handynummer', 'handynumer', 'mobilnummer', 'handy', // German (including typo)
            'teléfono', 'móvil', 'celular', 'teléfono móvil', // Spanish
            'téléphone', 'portable', 'mobile', 'téléphone portable', // French
            'telefono', 'cellulare', 'mobile', 'telefono cellulare' // Italian
        ];
        
        if (phoneTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Skip country code / area code questions
        const codeTerms = [
            'country code', 'area code', 'phone prefix', 'calling code', 'prefix', // English
            'landsvorwahl', 'vorwahl', 'ländercode', 'vorwahl',                   // German
            'código de país', 'código de área', 'prefijo', 'código',              // Spanish
            'indicatif pays', 'indicatif', 'préfixe', 'indicatif téléphonique',   // French
            'prefisso', 'codice paese', 'prefisso telefonico'                     // Italian
        ];
        
        if (codeTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Skip general contact information
        const contactTerms = [
            'contact information', 'contact details', 'contact',        // English
            'kontaktinformation', 'kontaktdaten', 'kontakt',           // German
            'información de contacto', 'datos de contacto', 'contacto', // Spanish
            'coordonnées', 'informations de contact', 'contact',       // French
            'informazioni di contatto', 'dati di contatto', 'contatto'  // Italian
        ];
        
        if (contactTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Skip name-related questions (first name, last name, full name)
        const nameTerms = [
            'first name', 'last name', 'full name', 'name', 'given name', 'family name', // English
            'vorname', 'nachname', 'vollständiger name', 'name', 'familienname',         // German
            'nombre', 'apellido', 'nombre completo', 'primer nombre', 'segundo nombre',  // Spanish
            'prénom', 'nom', 'nom complet', 'nom de famille',                            // French
            'nome', 'cognome', 'nome completo', 'nome di battesimo'                       // Italian
        ];
        
        if (nameTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        return false;
    }



    static async processFormQuestions(shouldStop = null) {
        try {
            this.debugLog("Processing form questions");
            const formElements = document.querySelectorAll("div.fb-dash-form-element");
            this.debugLog(`Found ${formElements.length} form elements`);

            for (const element of formElements) {
                // Check if we should stop before processing each question
                if (shouldStop) {
                    let stopRequested = false;
                    if (typeof shouldStop === 'function') {
                        stopRequested = await shouldStop();
                    } else if (shouldStop && shouldStop.value !== undefined) {
                        stopRequested = shouldStop.value;
                    } else {
                        stopRequested = !!shouldStop;
                    }
                    
                    if (stopRequested) {
                        this.debugLog("Stop requested during form questions processing");
                        return { stopped: true };
                    }
                }
                
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

                    // Check if this question should be skipped (already prefilled in LinkedIn)
                    if (this.shouldSkipQuestion(questionText)) {
                        this.debugLog(`Skipping prefilled question: ${questionText}`);
                        continue;
                    }

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
                    const questionResult = await this.answerQuestion(questionText, options, inputField, element, shouldStop);
                    
                    // Check if the process was stopped
                    if (questionResult.stopped) {
                        this.debugLog("Form questions processing stopped by user");
                        return { stopped: true };
                    }
                    
                    if (!questionResult.success) {
                        this.debugLog(`Failed to answer question: ${questionText}`);
                        // Continue to next question on failure
                    }
                } catch (error) {
                    this.errorLog(`Error processing form element: ${error.message}`, error);
                }
            }

            this.debugLog("Completed processing form questions");
            return { success: true };
        } catch (error) {
            this.errorLog("Error in processFormQuestions", error);
            return { success: false };
        }
    }

    static async answerQuestion(question, options = [], inputField, element, shouldStop = null) {
        try {
            // Get current AI settings from window.currentAiSettings
            let aiSettings = null;
            if (window.currentAiSettings) {
                aiSettings = window.currentAiSettings;
                this.debugLog(`Using AI settings from current settings:`, aiSettings);
            }
            
            // Get current user ID from storage
            let userId = null;
            try {
                const userResult = await chrome.storage.local.get(['currentUser']);
                if (userResult.currentUser && userResult.currentUser.id) {
                    userId = userResult.currentUser.id;
                    this.debugLog(`Using user ID: ${userId}`);
                }
            } catch (error) {
                this.errorLog('Error getting current user:', error);
            }
            
            // Create AIQuestionAnswerer instance with the current user ID
            const ai = new AIQuestionAnswerer(userId);
            
            // If we have AI settings from the popup, use them directly
            if (aiSettings) {
                // Create a settings object that matches the database format
                const settings = {
                    ai_provider: aiSettings.provider,
                    ai_model: aiSettings.model,
                    apiKey: aiSettings.apiKey,
                    is_default: true
                };
                
                // Set the settings directly in the AISettingsManager
                ai.aiSettingsManager.setSettings(settings);
                this.debugLog(`Set AI settings directly: provider=${settings.ai_provider}, model=${settings.ai_model}`);
            }

            this.debugLog(`Answering question: ${question}`);
            this.debugLog(`Available options:`, options);

            // Load user resume data from Chrome storage
            try {
                const result = await chrome.storage.local.get(['userResumeData', 'userResumeText', 'userResumeType']);
                if (result && (result.userResumeData || result.userResumeText)) {
                    this.debugLog('Found user resume data in storage');
                    // Set the user context in the AI instance with structured data if available
                    if (result.userResumeData) {
                        await ai.setUserContext(result.userResumeData, result.userResumeText);
                        this.debugLog('Set structured user context in AI instance');
                    } else {
                        await ai.setUserContext(result.userResumeText);
                        this.debugLog('Set text user context in AI instance');
                    }
                } else {
                    this.debugLog('No user resume found in storage');
                }
            } catch (error) {
                this.errorLog('Error loading user resume from storage:', error);
            }

            // Get current resume ID from storage
            let resumeId = null;
            try {
                const resumeResult = await chrome.storage.local.get(['currentResumeId']);
                if (resumeResult.currentResumeId) {
                    resumeId = resumeResult.currentResumeId;
                    this.debugLog(`Using resume ID: ${resumeId}`);
                }
            } catch (error) {
                this.errorLog('Error getting current resume ID:', error);
            }

            // Get the answer using our simplified approach with stop callback
            const result = await ai.answerQuestion(question, options, shouldStop, resumeId);

            // Check if the process was stopped
            if (result.stopped) {
                this.debugLog("Question answering stopped by user");
                return { stopped: true };
            }

            if (!result.success || !result.answer) {
                this.debugLog("No answer generated for question");
                return { success: false };
            }

            const answer = result.answer;
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
            return { success: true };
        } catch (error) {
            this.errorLog(`Error answering question "${question}"`, error);
            return { success: false };
        }
    }


}

export default LinkedInForm; 