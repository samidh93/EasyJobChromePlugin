import LinkedInBase from './LinkedInBase.js';
import AIQuestionAnswerer from '../ai/AIQuestionAnswerer.js'
import applicationTracker from './ApplicationTracker.js'

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

            // If not found, look for the specific structure after form submission
            if (!doneButton) {
                // Look for button in modal actionbar with Done text
                doneButton = document.querySelector('.artdeco-modal__actionbar button.artdeco-button--primary');
                if (doneButton) {
                    const spanText = doneButton.querySelector('span.artdeco-button__text');
                    if (!spanText || spanText.textContent.trim() !== 'Done') {
                        doneButton = null;
                    } else {
                        this.debugLog("Found Done button in modal actionbar");
                    }
                }
            }

            // If still not found, try broader search
            if (!doneButton) {
                const buttons = document.querySelectorAll('button.artdeco-button.artdeco-button--primary');
                for (const button of buttons) {
                    const spanText = button.querySelector('span.artdeco-button__text');
                    if (spanText && spanText.textContent.trim() === 'Done') {
                        doneButton = button;
                        this.debugLog("Found Done button by primary button search");
                        break;
                    }
                }
            }

            if (doneButton) {
                this.debugLog("Clicking Done button to complete submission");
                doneButton.click();
                this.debugLog("Successfully clicked Done button");
            } else {
                this.debugLog("Done button not found - may not be required for this form type");
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

    static async processForm(shouldStop, jobInfo = null) {
        let formTimeout = null;
        
        try {
            this.debugLog("Starting form processing");

            // Store job info for later use when application is successful
            this.currentJobInfo = jobInfo;
            
            // Initialize array to collect questions/answers during form processing
            this.collectedQuestionsAnswers = [];
            
            // Initialize progress tracking for form processing timeout safety
            this.lastProgressTime = Date.now();
            this.noProgressCount = 0;
            
            this.debugLog("Job info stored for successful completion");

            // Set timeout for form processing (3 minutes)
            formTimeout = setTimeout(async () => {
                this.debugLog("Form processing timeout reached - closing form automatically");
                try {
                    await this.closeForm(false); // Close and discard
                    this.debugLog("Form closed due to timeout");
                } catch (error) {
                    this.errorLog("Error closing form after timeout:", error);
                }
                // Set stop flag to exit the processing loop
                if (typeof shouldStop === 'object' && shouldStop.hasOwnProperty('value')) {
                    shouldStop.value = true;
                }
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
                        // Reset progress tracking - we found a button
                        this.lastProgressTime = Date.now();
                        this.noProgressCount = 0;

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

                        // First click Done button if it appears
                        await this.clickDoneAfterSubmit();
                        
                        // Wait a bit more and then click Dismiss to close any remaining modal
                        await this.wait(1000);
                        await this.clickDismissAfterSubmit();

                        // Create and save successful application
                        await this.saveSuccessfulApplication();

                        this.debugLog("Clicked submit button after review");
                        clearTimeout(reviewTimeout);
                        break;
                    }

                    // Check for form questions if no review button
                    const formElements = document.querySelectorAll("div.fb-dash-form-element");
                    if (formElements.length > 0 && !currentPageProcessed) {
                        this.debugLog("Found form questions, processing...");
                        // Reset progress tracking - we found form elements
                        this.lastProgressTime = Date.now();
                        this.noProgressCount = 0;
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
                        // Reset progress tracking - we found a button
                        this.lastProgressTime = Date.now();
                        this.noProgressCount = 0;

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
                        // Reset progress tracking - we found a button
                        this.lastProgressTime = Date.now();
                        this.noProgressCount = 0;

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

                        // First click Done button if it appears
                        await this.clickDoneAfterSubmit();
                        
                        // Wait a bit more and then click Dismiss to close any remaining modal
                        await this.wait(1000);
                        await this.clickDismissAfterSubmit();

                        // Create and save successful application
                        await this.saveSuccessfulApplication();

                        break;
                    }

                    // If no buttons found, wait and try again
                    this.debugLog("No navigation buttons found, waiting...");
                    await this.wait(1000);
                    
                    // Add safety mechanism - if we've been waiting too long without progress, close form
                    if (!this.lastProgressTime) {
                        this.lastProgressTime = Date.now();
                        this.noProgressCount = 0;
                    } else {
                        this.noProgressCount = (this.noProgressCount || 0) + 1;
                        
                        // If no progress for 30 seconds (30 iterations), close form
                        if (this.noProgressCount >= 30) {
                            this.debugLog("No progress for 30 seconds - closing form automatically");
                            try {
                                await this.closeForm(false); // Close and discard
                                this.debugLog("Form closed due to no progress");
                            } catch (error) {
                                this.errorLog("Error closing form after no progress:", error);
                            }
                            break;
                        }
                    }

                } catch (error) {
                    this.errorLog("Error in form processing loop", error);
                    await this.wait(2000);
                }
            }

            clearTimeout(formTimeout);

            // Clean up progress tracking
            this.lastProgressTime = null;
            this.noProgressCount = 0;

            // No need to track failures - only successful applications are saved
            this.debugLog("Form processing completed successfully");
            return true;
        } catch (error) {
            this.errorLog("Error processing form", error);
            
            // Clean up timeout and progress tracking
            if (formTimeout) {
                clearTimeout(formTimeout);
            }
            this.lastProgressTime = null;
            this.noProgressCount = 0;
            
            // Close form on critical processing error
            this.debugLog("Closing form due to critical processing error");
            try {
                await this.closeForm(false); // Close and discard
                this.debugLog("Form closed due to processing error");
            } catch (closeError) {
                this.errorLog("Error closing form after processing error:", closeError);
            }
            
            return false;
        }
    }

    /**
     * Save successful application to database
     */
    static async saveSuccessfulApplication() {
        try {
            this.debugLog("Saving successful application");

            if (!this.currentJobInfo) {
                this.debugLog('No job info available, skipping application save');
                return;
            }

            // Get current user data
            const userResult = await chrome.storage.local.get(['currentUser']);
            if (!userResult.currentUser) {
                this.debugLog('No current user found, skipping application save');
                return;
            }

            // Get current AI settings
            const aiSettings = window.currentAiSettings;
            if (!aiSettings) {
                this.debugLog('No AI settings found, skipping application save');
                return;
            }

            // Get current resume ID
            const resumeResult = await chrome.storage.local.get(['currentResumeId']);
            if (!resumeResult.currentResumeId) {
                this.debugLog('No current resume ID found, skipping application save');
                return;
            }

            // Create successful application record with collected questions/answers
            await applicationTracker.createSuccessfulApplication(
                this.currentJobInfo,
                userResult.currentUser,
                aiSettings,
                resumeResult.currentResumeId,
                this.collectedQuestionsAnswers || []
            );

            this.debugLog(`Successful application saved with ${this.collectedQuestionsAnswers?.length || 0} questions/answers`);
        } catch (error) {
            this.errorLog('Error saving successful application:', error);
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



    /**
     * Get hardcoded answers for common questions that don't need AI processing
     * @param {string} question - The question text
     * @param {Array} options - Available options for the question
     * @returns {string|null} - Hardcoded answer or null if no hardcoded answer exists
     */
    static getHardcodedAnswer(question, options = []) {
        const questionLower = question.toLowerCase();
        
        // Date/start availability questions → return a concrete date (mm/dd/yyyy)
        const dateTerms = [
            'start date', 'starting date', 'ideal starting date', 'available to start', 'availability to start', 'earliest start date',
            'when can you start', 'availability date',
            // German
            'startdatum', 'verfügbar ab', 'beginn', 'frühestes startdatum',
            // French
            'date de début', 'disponible pour commencer',
            // Spanish
            'fecha de inicio', 'disponible para comenzar',
            // Italian
            'data di inizio', 'disponibile a iniziare'
        ];
        if (dateTerms.some(term => questionLower.includes(term))) {
            return this.computePreferredStartDateMMDDYYYY();
        }

        // Commuting questions - always answer "Yes"
        if (questionLower.includes('comfortable commuting') || 
            questionLower.includes('commute to this') ||
            questionLower.includes('willing to commute') ||
            questionLower.includes('able to commute') ||
            questionLower.includes('commuting to this job') ||
            questionLower.includes('travel to this location') ||
            questionLower.includes('comfortable traveling') ||
            (questionLower.includes('commut') && questionLower.includes('location')) ||
            (questionLower.includes('travel') && questionLower.includes('job') && questionLower.includes('location'))) {
            
            // Check if "Yes" is in the options
            for (const option of options) {
                if (option.toLowerCase().trim() === 'yes' || 
                    option.toLowerCase().trim() === 'ja' ||
                    option.toLowerCase().trim() === 'oui' ||
                    option.toLowerCase().trim() === 'sí') {
                    return option.trim();
                }
            }
            
            // If no options or "Yes" not found in options, return "Yes"
            return "Yes";
        }
        
        // Add more hardcoded answers here as needed
        // Example: Remote work questions
        // if (questionLower.includes('work remotely') || questionLower.includes('remote work')) {
        //     return "Yes";
        // }
        
        return null; // No hardcoded answer for this question
    }

    /**
     * Compute preferred start date as two months from today in mm/dd/yyyy
     * @returns {string}
     */
    static computePreferredStartDateMMDDYYYY() {
        const today = new Date();
        const target = new Date(today);
        // Add 2 months per preference [[memory:3199149]]
        target.setMonth(target.getMonth() + 2);
        return this.formatDateMMDDYYYY(target);
    }

    /**
     * Format a Date object as mm/dd/yyyy
     * @param {Date} date
     * @returns {string}
     */
    static formatDateMMDDYYYY(date) {
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const yyyy = date.getFullYear();
        return `${mm}/${dd}/${yyyy}`;
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
            // Check for hardcoded answers to common questions
            const hardcodedAnswer = this.getHardcodedAnswer(question, options);
            if (hardcodedAnswer) {
                this.debugLog(`Using hardcoded answer for question: ${question} -> ${hardcodedAnswer}`);
                
                // Fill the field with hardcoded answer
                await this.fillFieldWithAnswer(inputField, element, hardcodedAnswer, question);
                
                // Collect question and answer for tracking
                try {
                    const questionType = this.detectQuestionType(question);
                    const isSkipped = this.shouldSkipQuestion(question);
                    
                    this.collectedQuestionsAnswers.push({
                        question: question,
                        answer: hardcodedAnswer,
                        question_type: questionType,
                        ai_model_used: 'hardcoded',
                        confidence_score: 1.0,
                        is_skipped: isSkipped
                    });
                    
                    this.debugLog(`Collected hardcoded question/answer (${this.collectedQuestionsAnswers.length} total)`);
                } catch (error) {
                    this.errorLog('Error collecting hardcoded question/answer:', error);
                }
                
                // Wait for potential validation errors to appear
                await this.wait(1500);
                
                // Check for validation errors and retry if needed
                const retryResult = await this.handleValidationErrorsWithRetry(
                    question, options, inputField, element, shouldStop, null, hardcodedAnswer
                );
                
                if (retryResult.stopped) {
                    return { stopped: true };
                }
                
                return { success: retryResult.success };
            }
            
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

            // Get current resume ID directly from database
            let resumeId = null;
            try {
                this.debugLog('=== RESUME ID RETRIEVAL DEBUG ===');
                
                // First try to get from storage (for performance)
                const resumeResult = await chrome.storage.local.get(['currentResumeId']);
                this.debugLog('Resume result from storage:', resumeResult);
                
                if (resumeResult.currentResumeId) {
                    resumeId = resumeResult.currentResumeId;
                    this.debugLog(`Using resume ID from storage: ${resumeId}`);
                } else {
                    // If not in storage, get from database
                    this.debugLog('No resume ID in storage, fetching from database...');
                    
                    if (userId) {
                        this.debugLog(`Fetching default resume for user: ${userId}`);
                        const response = await chrome.runtime.sendMessage({
                            action: 'apiRequest',
                            method: 'GET',
                            url: `/users/${userId}/resumes/default`
                        });
                        
                        this.debugLog('Default resume API response:', response);
                        this.debugLog('Response success:', response?.success);
                        this.debugLog('Response resume:', response?.resume);
                        this.debugLog('Response error:', response?.error);
                        
                        if (response && response.success && response.resume) {
                            resumeId = response.resume.id;
                            this.debugLog(`Got resume ID from database: ${resumeId}`);
                            
                            // Store in storage for future use
                            await chrome.storage.local.set({ 'currentResumeId': resumeId });
                            this.debugLog('Stored resume ID in storage for future use');
                        } else {
                            this.debugLog('Failed to get default resume from database:', response);
                            this.debugLog('Response details:', {
                                success: response?.success,
                                error: response?.error,
                                status: response?.status,
                                message: response?.message
                            });
                        }
                    } else {
                        this.debugLog('No user ID available for resume fetch');
                    }
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

            // If this looks like a cover letter prompt, sanitize placeholders and signature
            let finalAnswer = answer;
            try {
                if (this.isCoverLetterQuestion(question)) {
                    const fullName = await this.getUserFullName();
                    finalAnswer = this.sanitizeCoverLetter(answer, fullName);
                    this.debugLog('Sanitized cover letter answer');
                }
            } catch (e) {
                this.errorLog('Error during cover letter sanitization', e);
            }

            // Collect question and answer for later saving (only if application is successful)
            try {
                const questionType = this.detectQuestionType(question);
                const aiModel = window.currentAiSettings?.model || 'unknown';
                const isSkipped = this.shouldSkipQuestion(question);
                
                this.collectedQuestionsAnswers.push({
                    question: question,
                    answer: finalAnswer,
                    question_type: questionType,
                    ai_model_used: aiModel,
                    confidence_score: 0.95, // Default confidence
                    is_skipped: isSkipped
                });
                
                this.debugLog(`Collected question/answer (${this.collectedQuestionsAnswers.length} total)`);
            } catch (error) {
                this.errorLog('Error collecting question/answer:', error);
                // Don't throw error to avoid breaking the form process
            }

            // Fill in the answer using the provided inputField
            switch (inputField.tagName.toLowerCase()) {
                case 'input':
                    switch (inputField.type) {
                        case 'text':
                        case 'tel':
                        case 'email':
                        case 'number':
                            // Check if this is a typeahead/autocomplete field
                            if (inputField.getAttribute('role') === 'combobox' && 
                                inputField.getAttribute('aria-autocomplete') === 'list') {
                                this.debugLog(`Detected typeahead field for question: ${question}`);
                                await this.handleTypeaheadField(inputField, finalAnswer, element);
                            } else {
                                inputField.value = finalAnswer;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            }
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
                    inputField.value = finalAnswer;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    break;

                case 'select':
                    for (let i = 0; i < inputField.options.length; i++) {
                        if (inputField.options[i].text.trim() === finalAnswer) {
                            inputField.selectedIndex = i;
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            this.debugLog(`Selected option: ${finalAnswer}`);
                            break;
                        }
                    }
                    break;
            }

            // Wait for potential validation errors to appear
            await this.wait(1500);
            
            // Check for validation errors and retry if needed
            const retryResult = await this.handleValidationErrorsWithRetry(
                question, options, inputField, element, shouldStop, resumeId, answer
            );
            
            if (retryResult.stopped) {
                return { stopped: true };
            }
            
            return { success: retryResult.success };
        } catch (error) {
            this.errorLog(`Error answering question "${question}"`, error);
            return { success: false };
        }
    }

    /**
     * Detect cover letter questions by common phrases (multi-language)
     * @param {string} question
     * @returns {boolean}
     */
    static isCoverLetterQuestion(question) {
        const q = (question || '').toLowerCase();
        const terms = [
            'cover letter',
            'anschreiben',
            'motivationsschreiben',
            'motivation letter',
            'anschreiben hochladen',
            'anschreiben eingeben',
            'anschreiben text'
        ];
        return terms.some(t => q.includes(t));
    }

    /**
     * Try to get the user's full name from storage/user context
     * @returns {Promise<string>} Full name or empty string
     */
    static async getUserFullName() {
        try {
            const result = await chrome.storage.local.get(['currentUser', 'userResumeData']);
            const user = result.currentUser || {};
            // Prefer explicit fullName, then first+last, then username
            if (user.fullName && typeof user.fullName === 'string') return user.fullName.trim();
            if (user.firstName || user.lastName) return `${user.firstName || ''} ${user.lastName || ''}`.trim();
            // Try resume data common shapes
            const resume = result.userResumeData || {};
            if (resume.name && typeof resume.name === 'string') return resume.name.trim();
            if (resume.basics && resume.basics.name) return String(resume.basics.name).trim();
            if (user.username) return String(user.username).trim();
        } catch (_) {}
        return '';
    }

    /**
     * Sanitize AI-generated cover letter text: remove headings, placeholders, and ensure proper signature
     * @param {string} text
     * @param {string} fullName
     * @returns {string}
     */
    static sanitizeCoverLetter(text, fullName = '') {
        if (!text || typeof text !== 'string') return text;
        let cleaned = text.replace(/\r\n/g, '\n');

        // Remove duplicate leading headings like "Cover letter"
        cleaned = cleaned
            .split('\n')
            .filter((line, idx) => !(idx <= 2 && /^\s*cover\s*letter\s*$/i.test(line)))
            .join('\n')
            .trim();

        // Replace common placeholders for name with actual full name, or remove if not available
        const placeholderPatterns = [
            /\[\s*your\s*name\s*\]/gi,
            /\[\s*name\s*\]/gi,
            /<\s*your\s*name\s*>/gi,
            /\{\s*your\s*name\s*\}/gi,
            /your name/gi,
            /YOUR NAME/gi
        ];

        for (const re of placeholderPatterns) {
            cleaned = cleaned.replace(re, fullName || '');
        }

        // If we ended up with trailing placeholder artifacts, clean multiple blank lines
        cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim();

        // Optionally enforce signature policy: do not auto-append signature if name is unknown
        // If the last non-empty line is a bare placeholder, drop it
        const lines = cleaned.split('\n');
        while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
        if (lines.length > 0) {
            const last = lines[lines.length - 1].trim();
            if (/^\[.*name.*\]$/.test(last.toLowerCase())) {
                lines.pop();
            }
        }
        cleaned = lines.join('\n');

        return cleaned.trim();
    }



    /**
     * Detect validation errors in form fields
     * @param {HTMLElement} element - The form element to check for validation errors
     * @returns {Object} - Object with hasError boolean and errorMessage string
     */
    static async detectValidationError(element) {
        try {
            // Look for LinkedIn's validation error elements
            const errorSelectors = [
                '.artdeco-inline-feedback--error[role="alert"]',
                '.artdeco-inline-feedback.artdeco-inline-feedback--error',
                '[role="alert"][class*="error"]',
                '.fb-dash-form-element__error-text',
                '.error-message'
            ];
            
            let errorElement = null;
            for (const selector of errorSelectors) {
                errorElement = element.querySelector(selector);
                if (errorElement) {
                    this.debugLog(`Found error element with selector: ${selector}`);
                    break;
                }
            }
            
            if (!errorElement) {
                // Also check in parent elements and document
                const parentElement = element.parentElement;
                if (parentElement) {
                    for (const selector of errorSelectors) {
                        errorElement = parentElement.querySelector(selector);
                        if (errorElement) {
                            this.debugLog(`Found error element in parent with selector: ${selector}`);
                            break;
                        }
                    }
                }
            }
            
            if (errorElement) {
                // Extract error message from various possible locations
                const messageSelectors = [
                    '.artdeco-inline-feedback__message',
                    '.error-message-text',
                    '.fb-dash-form-element__error-text',
                    'span[class*="message"]',
                    'span[class*="error"]'
                ];
                
                let errorMessage = '';
                for (const selector of messageSelectors) {
                    const messageElement = errorElement.querySelector(selector);
                    if (messageElement && messageElement.textContent.trim()) {
                        errorMessage = messageElement.textContent.trim();
                        break;
                    }
                }
                
                // If no specific message element found, use the error element's text content
                if (!errorMessage && errorElement.textContent.trim()) {
                    errorMessage = errorElement.textContent.trim();
                }
                
                if (errorMessage) {
                    this.debugLog(`Validation error detected: ${errorMessage}`);
                    return {
                        hasError: true,
                        errorMessage: errorMessage,
                        errorType: 'validation'
                    };
                }
            }
            
            return { hasError: false };
        } catch (error) {
            this.errorLog('Error detecting validation error:', error);
            return { hasError: false };
        }
    }
    
    /**
     * Handle validation errors with retry logic
     * @param {string} question - Original question
     * @param {Array} options - Available options
     * @param {HTMLElement} inputField - Input field element
     * @param {HTMLElement} element - Parent form element
     * @param {Function|Object} shouldStop - Stop condition
     * @param {string} resumeId - Resume ID
     * @param {string} originalAnswer - The original answer that caused validation error
     * @returns {Object} - Result object with success/stopped status
     */
    static async handleValidationErrorsWithRetry(question, options, inputField, element, shouldStop, resumeId, originalAnswer) {
        try {
            const maxRetries = 3;
            let retryCount = 0;
            
            while (retryCount < maxRetries) {
                // Check for validation errors
                const validationResult = await this.detectValidationError(element);
                
                if (!validationResult.hasError) {
                    this.debugLog('No validation errors detected, field filled successfully');
                    return { success: true };
                }
                
                // Validation error detected, prepare for retry
                retryCount++;
                this.debugLog(`Validation error attempt ${retryCount}/${maxRetries}: ${validationResult.errorMessage}`);
                
                if (retryCount >= maxRetries) {
                    this.errorLog(`Max retries (${maxRetries}) reached for question: ${question}`);
                    this.errorLog(`Final validation error: ${validationResult.errorMessage}`);
                    this.debugLog("Closing form due to validation retry exhaustion");
                    
                    try {
                        await this.closeForm(false); // Close and discard
                        this.debugLog("Form closed due to validation failure");
                    } catch (error) {
                        this.errorLog("Error closing form after validation failure:", error);
                    }
                    
                    return { success: false, formClosed: true };
                }
                
                // Check if we should stop before retry
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
                        this.debugLog("Stop requested during validation retry");
                        return { stopped: true };
                    }
                }
                
                // Create enhanced retry prompt with validation constraints
                const retryPrompt = this.createRetryPrompt(question, validationResult.errorMessage, originalAnswer, retryCount);
                this.debugLog(`Retry attempt ${retryCount} with enhanced prompt: ${retryPrompt}`);
                
                // Get new answer from AI
                const userId = await this.getCurrentUserId();
                const ai = new AIQuestionAnswerer(userId);
                
                // Set AI settings if available
                if (window.currentAiSettings) {
                    const settings = {
                        ai_provider: window.currentAiSettings.provider,
                        ai_model: window.currentAiSettings.model,
                        apiKey: window.currentAiSettings.apiKey,
                        is_default: true
                    };
                    ai.aiSettingsManager.setSettings(settings);
                }
                
                // Load user context
                await this.loadUserContextForAI(ai);
                
                // Get retry answer
                const retryResult = await ai.answerQuestion(retryPrompt, options, shouldStop, resumeId);
                
                if (retryResult.stopped) {
                    return { stopped: true };
                }
                
                if (!retryResult.success || !retryResult.answer) {
                    this.debugLog(`Retry attempt ${retryCount} failed - no answer generated`);
                    continue;
                }
                
                const newAnswer = retryResult.answer;
                this.debugLog(`Retry attempt ${retryCount} - AI answer: ${newAnswer}`);
                
                // Clear field and fill with new answer
                await this.fillFieldWithAnswer(inputField, element, newAnswer, question);
                
                // Wait for validation
                await this.wait(1500);
            }
            
            return { success: false };
        } catch (error) {
            this.errorLog('Error in validation retry logic:', error);
            
            // Close form on validation retry error
            this.debugLog("Closing form due to validation retry error");
            try {
                await this.closeForm(false); // Close and discard
                this.debugLog("Form closed due to validation retry error");
            } catch (closeError) {
                this.errorLog("Error closing form after validation retry error:", closeError);
            }
            
            return { success: false, formClosed: true };
        }
    }
    
    /**
     * Create an enhanced retry prompt based on validation error
     * @param {string} originalQuestion - Original question
     * @param {string} errorMessage - Validation error message
     * @param {string} originalAnswer - Original answer that failed
     * @param {number} retryCount - Current retry attempt
     * @returns {string} - Enhanced prompt for retry
     */
    static createRetryPrompt(originalQuestion, errorMessage, originalAnswer, retryCount) {
        // Extract specific constraints from error message
        let constraint = '';
        const errorLower = errorMessage.toLowerCase();
        
        // Number range constraints
        if (errorLower.includes('zwischen') || errorLower.includes('between')) {
            const rangeMatch = errorMessage.match(/(\d+)\s*(?:und|and|to|-)\s*(\d+)/);
            if (rangeMatch) {
                constraint = `Provide only a number between ${rangeMatch[1]} and ${rangeMatch[2]}.`;
            }
        }
        
        // Whole number constraints
        if (errorLower.includes('whole') || errorLower.includes('ganze') || errorLower.includes('integer')) {
            constraint += ' Use only whole numbers (no decimals or text).';
        }
        
        // Decimal number constraints
        if (errorLower.includes('decimal number')) {
            constraint += ' Provide a decimal number (with decimals allowed).';
        }
        
        // Minimum value constraints
        if (errorLower.includes('larger than') || errorLower.includes('greater than') || errorLower.includes('above')) {
            const minMatch = errorMessage.match(/(?:larger than|greater than|above)\s*(\d+(?:\.\d+)?)/i);
            if (minMatch) {
                constraint += ` The number must be larger than ${minMatch[1]}.`;
            }
        }
        
        // Maximum value constraints  
        if (errorLower.includes('smaller than') || errorLower.includes('less than') || errorLower.includes('below')) {
            const maxMatch = errorMessage.match(/(?:smaller than|less than|below)\s*(\d+(?:\.\d+)?)/i);
            if (maxMatch) {
                constraint += ` The number must be smaller than ${maxMatch[1]}.`;
            }
        }
        
        // Positive number constraints
        if (errorLower.includes('positive') || (errorLower.includes('larger than') && errorLower.includes('0'))) {
            constraint += ' Provide only positive numbers (greater than 0).';
        }
        
        // Format constraints
        if (errorLower.includes('format') || errorLower.includes('invalid')) {
            constraint += ' Follow the exact format required.';
        }
        
        // Date constraints
        if (errorLower.includes('date') || errorLower.includes('datum')) {
            // Detect explicit format hints like mm/dd/yyyy
            const formatMatch = errorMessage.match(/m+\/?d+\/?y+/i);
            if (formatMatch) {
                constraint += ` Provide the date in ${formatMatch[0]} format.`;
            } else {
                constraint += ' Provide date in the correct format.';
            }
        }
        
        // Email constraints
        if (errorLower.includes('email') || errorLower.includes('e-mail')) {
            constraint += ' Provide a valid email format.';
        }
        
        // If no specific constraint detected, use the error message directly
        if (!constraint) {
            constraint = `Follow this requirement: ${errorMessage}`;
        }
        
        // Create retry prompt
        let retryPrompt = `${constraint} Answer this question with ONLY the required value, no extra text: ${originalQuestion}`;
        
        // Add context about previous failure for multiple retries
        if (retryCount > 1) {
            retryPrompt += ` (Previous answer "${originalAnswer}" was rejected - provide a different answer that meets the requirements)`;
        }
        
        return retryPrompt;
    }
    
    /**
     * Helper method to get current user ID
     * @returns {string|null} - User ID or null
     */
    static async getCurrentUserId() {
        try {
            const userResult = await chrome.storage.local.get(['currentUser']);
            return userResult.currentUser?.id || null;
        } catch (error) {
            this.errorLog('Error getting current user ID:', error);
            return null;
        }
    }
    
    /**
     * Helper method to load user context for AI
     * @param {AIQuestionAnswerer} ai - AI instance
     */
    static async loadUserContextForAI(ai) {
        try {
            const result = await chrome.storage.local.get(['userResumeData', 'userResumeText', 'userResumeType']);
            if (result && (result.userResumeData || result.userResumeText)) {
                if (result.userResumeData) {
                    await ai.setUserContext(result.userResumeData, result.userResumeText);
                } else {
                    await ai.setUserContext(result.userResumeText);
                }
            }
        } catch (error) {
            this.errorLog('Error loading user context for AI:', error);
        }
    }
    
    /**
     * Helper method to fill field with answer
     * @param {HTMLElement} inputField - Input field element
     * @param {HTMLElement} element - Parent form element
     * @param {string} answer - Answer to fill
     * @param {string} question - Question for logging
     */
    static async fillFieldWithAnswer(inputField, element, answer, question) {
        try {
            // Clear existing value first
            inputField.value = '';
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            
            // Wait a moment
            await this.wait(300);
            
            // Fill with new answer using the same logic as original answerQuestion
            switch (inputField.tagName.toLowerCase()) {
                case 'input':
                    switch (inputField.type) {
                        case 'text':
                        case 'tel':
                        case 'email':
                        case 'number':
                            // Check if this is a typeahead/autocomplete field
                            if (inputField.getAttribute('role') === 'combobox' && 
                                inputField.getAttribute('aria-autocomplete') === 'list') {
                                await this.handleTypeaheadField(inputField, answer, element);
                            } else {
                                inputField.value = answer;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
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
                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
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
        } catch (error) {
            this.errorLog(`Error filling field with retry answer "${answer}":`, error);
        }
    }

    /**
     * Detect question type for tracking purposes
     * @param {string} question - The question text
     * @returns {string} - Question type
     */
    static detectQuestionType(question) {
        const questionLower = question.toLowerCase();
        
        if (questionLower.includes('level of') || questionLower.includes('proficiency in') || questionLower.includes('fluent in')) {
            return 'language_level';
        } else if (questionLower.includes('skill') || questionLower.includes('experience') || questionLower.includes('years') || questionLower.includes('technology') || questionLower.includes('programming') || questionLower.includes('language') || questionLower.includes('c++') || questionLower.includes('python') || questionLower.includes('java')) {
            return 'skills';
        } else if (questionLower.includes('education') || questionLower.includes('degree') || questionLower.includes('study') || questionLower.includes('university') || questionLower.includes('college')) {
            return 'education';
        } else if (questionLower.includes('language') || questionLower.includes('speak') || questionLower.includes('fluent')) {
            return 'languages';
        } else if (questionLower.includes('notice') || questionLower.includes('period') || questionLower.includes('availability') || questionLower.includes('start date')) {
            return 'notice';
        } else if (questionLower.includes('salary') || questionLower.includes('compensation') || questionLower.includes('pay')) {
            return 'salary';
        } else if (questionLower.includes('visa') || questionLower.includes('citizenship') || questionLower.includes('work permit')) {
            return 'visa';
        } else if (questionLower.includes('certification') || questionLower.includes('certificate')) {
            return 'certifications';
        } else {
            return 'general';
        }
    }

    /**
     * Check if LinkedIn's Easy Apply daily limit message is displayed
     * @returns {Object} - Object with hasLimit boolean and message string
     */
    static async checkEasyApplyLimit() {
        try {
            this.debugLog("Checking for Easy Apply daily limit message...");
            
            // First check if we previously detected a daily limit today (cached check)
            this.debugLog("Checking cached daily limit info...");
            try {
                const result = await chrome.storage.local.get(['dailyLimitReached', 'dailyLimitMessage', 'dailyLimitTime']);
                
                if (result.dailyLimitReached) {
                    const limitTime = new Date(result.dailyLimitTime);
                    const now = new Date();
                    
                    // Check if the limit was set today (reset daily limits at midnight)
                    const isToday = limitTime.toDateString() === now.toDateString();
                    
                    if (isToday) {
                        this.debugLog("Easy Apply daily limit detected from cached info (previously detected today)");
                        return {
                            hasLimit: true,
                            message: result.dailyLimitMessage,
                            type: 'cached_daily_limit'
                        };
                    } else {
                        // Limit was from a previous day, clear it
                        await chrome.storage.local.remove(['dailyLimitReached', 'dailyLimitMessage', 'dailyLimitTime']);
                        this.debugLog("Cleared old daily limit info from previous day");
                    }
                } else {
                    this.debugLog("No cached daily limit info found, checking DOM...");
                }
            } catch (storageError) {
                this.debugLog("Error checking cached daily limit info:", storageError);
                // Continue with DOM check
            }
            
            // Then check for the error message container in DOM
            this.debugLog("Checking DOM for daily limit messages...");
            const errorElements = document.querySelectorAll('.artdeco-inline-feedback--error[role="alert"]');
            this.debugLog(`Found ${errorElements.length} error elements in DOM`);
            
            for (const errorElement of errorElements) {
                const messageElement = errorElement.querySelector('.artdeco-inline-feedback__message');
                if (messageElement) {
                    const messageText = messageElement.textContent.trim();
                    this.debugLog(`Found error message: ${messageText}`);
                    
                    // Check for Easy Apply limit indicators
                    if (messageText.toLowerCase().includes('easy apply limit') ||
                        messageText.toLowerCase().includes('daily submissions') ||
                        messageText.toLowerCase().includes('reached today\'s') ||
                        messageText.toLowerCase().includes('continue applying tomorrow')) {
                        
                        this.debugLog("Easy Apply daily limit detected from DOM!");
                        return {
                            hasLimit: true,
                            message: messageText,
                            type: 'dom_daily_limit'
                        };
                    }
                }
            }
            
            // Also check if Easy Apply button is disabled
            const easyApplyButton = document.querySelector('.jobs-s-apply button');
            if (easyApplyButton && easyApplyButton.disabled) {
                this.debugLog("Easy Apply button is disabled - may indicate limit reached");
                
                // Look for nearby error messages
                const nearbyError = easyApplyButton.closest('.jobs-s-apply')?.querySelector('.artdeco-inline-feedback--error');
                if (nearbyError) {
                    const nearbyMessage = nearbyError.querySelector('.artdeco-inline-feedback__message')?.textContent.trim();
                    if (nearbyMessage) {
                        return {
                            hasLimit: true,
                            message: nearbyMessage,
                            type: 'button_disabled'
                        };
                    }
                }
                
                return {
                    hasLimit: true,
                    message: 'Easy Apply button is disabled',
                    type: 'button_disabled'  
                };
            }
            
            this.debugLog("No Easy Apply limit detected (checked both cached info and DOM)");
            return { hasLimit: false };
            
        } catch (error) {
            this.errorLog('Error checking Easy Apply limit:', error);
            return { hasLimit: false };
        }
    }

    /**
     * Handle typeahead/autocomplete fields (like city selection)
     * @param {HTMLInputElement} inputField - The input field element
     * @param {string} answer - The answer to input
     * @param {HTMLElement} element - The parent element containing the field
     */
    static async handleTypeaheadField(inputField, answer, element) {
        try {
            this.debugLog(`Handling typeahead field with answer: ${answer}`);
            
            // Clear any existing value and focus the field
            inputField.value = '';
            inputField.focus();
            
            // Type the answer to trigger suggestions
            inputField.value = answer;
            
            // Trigger multiple events to ensure the typeahead activates
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('keyup', { bubbles: true }));
            inputField.dispatchEvent(new KeyboardEvent('keydown', { key: answer.slice(-1), bubbles: true }));
            
            // Also try focus and click events in case they're needed
            inputField.dispatchEvent(new Event('focus', { bubbles: true }));
            inputField.dispatchEvent(new Event('click', { bubbles: true }));
            
            // Wait for suggestions to appear with adaptive timing
            this.debugLog('Waiting for suggestions to appear...');
            let attempts = 0;
            let suggestionsContainer = null;
            
            // Try multiple times with increasing wait times
            while (attempts < 5 && !suggestionsContainer) {
                await this.wait(300 + (attempts * 200)); // 300ms, 500ms, 700ms, 900ms, 1100ms
                
                const listboxId = inputField.getAttribute('aria-owns') || inputField.getAttribute('aria-controls');
                if (listboxId) {
                    suggestionsContainer = document.getElementById(listboxId);
                }
                
                if (!suggestionsContainer) {
                    suggestionsContainer = element.querySelector('[role="listbox"]') ||
                                        element.parentElement.querySelector('[role="listbox"]') ||
                                        document.querySelector('[role="listbox"]');
                }
                
                if (suggestionsContainer && suggestionsContainer.querySelectorAll('[role="option"]').length > 0) {
                    break;
                }
                
                suggestionsContainer = null; // Reset if no options found
                attempts++;
                
                if (attempts < 5) {
                    this.debugLog(`Attempt ${attempts}: No suggestions found, retrying...`);
                    // Re-trigger events
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                }
            }
            
            // suggestionsContainer is already found from the retry loop above
            
            if (suggestionsContainer) {
                this.debugLog('Found suggestions container');
                
                // Find all suggestion options
                const suggestions = suggestionsContainer.querySelectorAll('[role="option"]');
                this.debugLog(`Found ${suggestions.length} suggestions`);
                
                if (suggestions.length > 0) {
                    // Look for the best matching suggestion
                    let bestMatch = null;
                    const answerLower = answer.toLowerCase();
                    
                    // First, try to find exact match with the input country/city
                    for (const suggestion of suggestions) {
                        const suggestionText = suggestion.textContent.trim().toLowerCase();
                        
                        // Check if suggestion starts with our answer and contains common countries
                        if (suggestionText.startsWith(answerLower)) {
                            // Prioritize suggestions with common countries for job applications
                            if (suggestionText.includes('germany') || 
                                suggestionText.includes('united states') || 
                                suggestionText.includes('united kingdom') || 
                                suggestionText.includes('canada') || 
                                suggestionText.includes('france') || 
                                suggestionText.includes('netherlands') ||
                                suggestionText.includes('switzerland') ||
                                suggestionText.includes('austria')) {
                                bestMatch = suggestion;
                                break;
                            }
                        }
                    }
                    
                    // If no Germany match, just take the first suggestion that starts with our answer
                    if (!bestMatch) {
                        for (const suggestion of suggestions) {
                            const suggestionText = suggestion.textContent.trim().toLowerCase();
                            if (suggestionText.startsWith(answerLower)) {
                                bestMatch = suggestion;
                                break;
                            }
                        }
                    }
                    
                    // If still no match, take the first suggestion
                    if (!bestMatch) {
                        bestMatch = suggestions[0];
                    }
                    
                    if (bestMatch) {
                        const selectedText = bestMatch.textContent.trim();
                        this.debugLog(`Selecting suggestion: ${selectedText}`);
                        
                        // Scroll into view if needed
                        bestMatch.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        
                        // Add visual highlight to show selection
                        bestMatch.style.backgroundColor = '#e6f3ff';
                        
                        // Try multiple click methods to ensure it works
                        bestMatch.click();
                        bestMatch.dispatchEvent(new MouseEvent('click', { bubbles: true }));
                        
                        // Wait for the selection to be processed
                        await this.wait(500);
                        
                        // Verify the input field was updated
                        this.debugLog(`Input field value after selection: "${inputField.value}"`);
                        
                        // Trigger additional events to ensure the selection is registered
                        inputField.dispatchEvent(new Event('change', { bubbles: true }));
                        inputField.dispatchEvent(new Event('blur', { bubbles: true }));
                        
                        return { success: true, selectedValue: selectedText };
                    }
                }
            } else {
                this.debugLog('No suggestions container found, falling back to normal input');
                // If no suggestions found, treat as normal input
                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                inputField.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            
            return { success: true };
            
        } catch (error) {
            this.errorLog('Error handling typeahead field:', error);
            
            // Fallback to normal input handling
            inputField.value = answer;
            inputField.dispatchEvent(new Event('input', { bubbles: true }));
            inputField.dispatchEvent(new Event('change', { bubbles: true }));
            
            return { success: false, error: error.message };
        }
    }


}

export default LinkedInForm; 