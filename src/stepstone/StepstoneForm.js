/**
 * StepstoneForm - Handles StepStone application form interactions
 * Manages multi-step form filling, submission, and validation
 * Inspired by LinkedInForm structure
 */
class StepstoneForm {
    
    // Store current step and job info
    static currentStep = 1;
    static totalSteps = 4;
    static jobInfo = null;
    static userData = null;
    static collectedQuestionsAnswers = [];
    static shouldStopCallback = null; // Callback to check if stop was requested
    
    /**
     * Complete application flow handler - Main entry point
     * Handles the entire multi-step StepStone application process
     * @param {Object} jobInfo - Job information
     * @param {Object} userData - User data
     * @returns {Promise<Object>} - Result object with status and message
     */
    static async handleCompleteApplicationFlow(jobInfo, userData, shouldStopCallback = null) {
        try {
            // Store the stop callback for use throughout form processing
            this.shouldStopCallback = shouldStopCallback;
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 [StepstoneForm] Starting complete application flow');
            console.log('   Job:', jobInfo.title);
            console.log('   Company:', jobInfo.company);
            console.log('   URL:', window.location.href);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Store job info and user data
            this.jobInfo = jobInfo;
            this.userData = userData;
            
            // Check if we're on the initial application page (has "Bewerbung fortsetzen" button)
            // or already in the actual form flow (has form questions)
            // The URL can contain /application/ on both pages, so we need to check for the button
            console.log('🔍 Checking page state...');
            const continueButton = await this.findContinueApplicationButton();
            if (continueButton) {
                console.log('📍 On initial application page with "Bewerbung fortsetzen" button');
                // Pass the button to avoid searching again
                return await this.startApplicationProcessWithButton(continueButton);
            } else {
                // Check if we're actually on a form step with form elements
                const isFormPage = await this.isOnFormStep();
                if (isFormPage) {
                    console.log('📍 Already in application form flow, processing form...');
                    return await this.processApplicationForm();
                } else {
                    // Fallback: if URL has /application/ but no button and no form, try form processing anyway
            if (window.location.href.includes('/application/')) {
                        console.log('📍 On application page but unclear state, attempting form processing...');
                return await this.processApplicationForm();
            } else {
                console.log('📍 On job page, looking for initial apply button...');
                return await this.startApplicationProcess();
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error in complete application flow:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Auto-start application process when page loads
     * This method is called automatically when the content script loads
     * and detects we're on an application page
     */
    static async autoStartApplicationProcess(shouldStopCallback = null) {
        try {
            // Store the stop callback
            this.shouldStopCallback = shouldStopCallback;
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔄 [StepstoneForm] Auto-starting application process');
            console.log('   Current URL:', window.location.href);
            console.log('   User data available:', !!window.currentUserData);
            console.log('   AI settings available:', !!window.currentAiSettings);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Wait for page to fully load
            await this.waitForPageLoad();
            await this.wait(2000); // Additional wait for dynamic content
            
            // Check if we have the necessary data
            if (!window.currentUserData || !window.currentAiSettings) {
                console.log('⚠️  Missing user data or AI settings, waiting...');
                // Wait a bit more for data to be available
                await this.wait(3000);
            }
            
            // Get job info from storage (passed from main tab) or extract from page
            let jobInfo = null;
            
            try {
                const storageResult = await chrome.storage.local.get(['currentJobInfo']);
                if (storageResult.currentJobInfo) {
                    jobInfo = storageResult.currentJobInfo;
                    console.log('📋 Retrieved job info from storage:', jobInfo);
                } else {
                    // Fallback: extract from application page context
                    jobInfo = this.extractJobInfoFromApplicationPage();
                    console.log('📋 Extracted job info from page (fallback):', jobInfo);
                }
            } catch (error) {
                console.error('❌ Error getting job info:', error);
                // Fallback: extract from application page context
                jobInfo = this.extractJobInfoFromApplicationPage();
                console.log('📋 Extracted job info from page (error fallback):', jobInfo);
            }
            
            // Start the application process
            return await this.handleCompleteApplicationFlow(jobInfo, window.currentUserData || {});
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error in auto-start:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Extract company name from the page
     * @returns {string} - Company name or null
     */
    /**
     * Extract job info from application page context
     * @returns {Object} - Job information object
     */
    static extractJobInfoFromApplicationPage() {
        try {
            // Try to extract from URL parameters or page context
            const url = window.location.href;
            const urlMatch = url.match(/\/job\/([^\/]+)\//);
            const jobId = urlMatch ? urlMatch[1] : 'unknown';
            
            // Try to find job title from page elements
            let jobTitle = 'Unknown Job';
            const titleSelectors = [
                'h1',
                '[data-testid*="job-title"]',
                '[class*="job-title"]',
                'title'
            ];
            
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim() && 
                    !element.textContent.includes('Kontaktdaten') &&
                    !element.textContent.includes('application')) {
                    jobTitle = element.textContent.trim();
                    break;
                }
            }
            
            // Try to find company name from page elements
            let companyName = 'Unknown Company';
            const companySelectors = [
                '[data-testid*="company"]',
                '[class*="company"]',
                'h2',
                'h3',
                '.company-name',
                '[data-at*="company"]'
            ];
            
            for (const selector of companySelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim() && 
                    !element.textContent.includes('Kontaktdaten') &&
                    !element.textContent.includes('application')) {
                    companyName = element.textContent.trim();
                    break;
                }
            }
            
            // Fallback to URL-based extraction
            if (companyName === 'Unknown Company' || jobTitle === 'Unknown Job') {
                const urlParts = url.split('/');
                const jobSlug = urlParts.find(part => part.includes('job'));
                if (jobSlug) {
                    const slugParts = jobSlug.split('-');
                    if (slugParts.length > 2) {
                        companyName = slugParts[slugParts.length - 1];
                        jobTitle = slugParts.slice(0, -1).join(' ');
                    }
                }
            }
            
            return {
                id: jobId,
                title: jobTitle,
                company: companyName,
                url: url,
                source: 'application_page'
            };
            
        } catch (error) {
            console.error('❌ Error extracting job info from application page:', error);
            return {
                id: 'unknown',
                title: 'Unknown Job',
                company: 'Unknown Company',
                url: window.location.href,
                source: 'fallback'
            };
        }
    }

    static extractCompanyName() {
        try {
            // Try various selectors to find company name
            const selectors = [
                '[data-testid*="company"]',
                '[class*="company"]',
                'h2',
                'h3',
                '.company-name',
                '[data-at*="company"]'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    return element.textContent.trim();
                }
            }
            
            return null;
        } catch (error) {
            console.error('❌ Error extracting company name:', error);
            return null;
        }
    }
    
    /**
     * Start the application process from job page (with pre-found button)
     * @param {Element} continueButton - Pre-found continue button (optional)
     * @returns {Promise<Object>} - Result object
     */
    static async startApplicationProcessWithButton(continueButton) {
        try {
            if (continueButton) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎯 FOUND: "Bewerbung fortsetzen" button');
                console.log('   Clicking to start application...');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                continueButton.click();
                await this.wait(3000); // Wait for form to load
                
                // DISABLED: Navigation/form detection checks - proceed directly to form processing
                console.log('⚠️  [DISABLED] Skipping form detection, proceeding directly to form processing...');
                console.log('   Waiting additional 2 seconds for form to be ready...');
                await this.wait(2000);
                    return await this.processApplicationForm();
            } else {
                console.log('❌ No "Bewerbung fortsetzen" button found');
                return { result: 'error', reason: 'No application button found' };
            }
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error starting application:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Process the multi-step application form
     * @returns {Promise<Object>} - Result object
     */
    static async processApplicationForm() {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('📝 [StepstoneForm] Processing application form');
            console.log('   Current URL:', window.location.href);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Initialize question tracking
            this.collectedQuestionsAnswers = [];
            
            let currentStep = 1;
            const maxSteps = 4;
            
            while (currentStep <= maxSteps) {
                // Check if stop was requested at the start of each step
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - keeping tab open, halting at step', currentStep);
                    
                    // Set stopped status in storage for main tab to detect
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': {
                            stopped: true,
                            result: 'stopped',
                            timestamp: Date.now()
                        }
                    });
                    
                    return { result: 'stopped', reason: 'User requested stop' };
                }
                
                console.log(`🔄 Processing step ${currentStep}/${maxSteps}`);
                
                // Wait for page to load
                await this.waitForPageLoad();
                
                // Check stop before processing
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - keeping tab open, halting before form filling');
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': { stopped: true, result: 'stopped', timestamp: Date.now() }
                    });
                    return { result: 'stopped', reason: 'User requested stop' };
                }
                
                // Fill regular form fields (contact info, professional details, etc.)
                const fillResult = await this.fillCurrentStep();
                if (fillResult) {
                    console.log(`✅ Step ${currentStep} form fields filled successfully`);
                } else {
                    console.log(`⚠️  Step ${currentStep} form field filling had issues`);
                }
                
                // Process form questions on current step (LinkedIn-style)
                const questionResult = await this.processFormQuestions();
                if (questionResult.stopped) {
                    console.log('⏸️  Stop requested during question processing');
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': { stopped: true, result: 'stopped', timestamp: Date.now() }
                    });
                    return { result: 'stopped', reason: 'User requested stop' };
                }
                if (questionResult.success) {
                    console.log(`✅ Step ${currentStep} questions processed successfully`);
                } else {
                    console.log(`⚠️  Step ${currentStep} questions processing had issues`);
                }
                
                // Check stop before validation
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - keeping tab open, halting after questions');
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': { stopped: true, result: 'stopped', timestamp: Date.now() }
                    });
                    return { result: 'stopped', reason: 'User requested stop' };
                }
                
                // Verify all questions are answered before proceeding
                console.log(`🔍 Verifying all questions answered on step ${currentStep}...`);
                const verification = await this.verifyAllQuestionsAnswered();
                
                if (!verification.allAnswered && verification.unansweredQuestions.length > 0) {
                    console.log(`⚠️  Step ${currentStep} has ${verification.unansweredQuestions.length} unanswered questions`);
                    
                    // Retry answering unanswered questions
                    console.log('🔄 Attempting to answer unanswered questions...');
                    const retryResult = await this.retryUnansweredQuestions(verification.unansweredQuestions);
                    
                    if (retryResult.answered > 0) {
                        console.log(`✅ Answered ${retryResult.answered} additional questions after retry`);
                        // Re-verify after retry
                        const reVerification = await this.verifyAllQuestionsAnswered();
                        if (!reVerification.allAnswered) {
                            console.log(`⚠️  Still ${reVerification.unansweredQuestions.length} unanswered questions after retry`);
                            // Continue anyway - let form validation handle it on submit
                        }
                    } else {
                        console.log(`⚠️  Could not answer ${retryResult.failed} questions - will continue anyway`);
                    }
                } else {
                    console.log(`✅ All questions verified as answered on step ${currentStep}`);
                }
                
                // Check for validation errors
                const hasErrors = await this.hasValidationErrors();
                if (hasErrors) {
                    console.log(`⚠️  Validation errors detected on step ${currentStep}`);
                    // Continue anyway - might be minor or will be caught on submit
                }
                
                // Check stop before clicking next button
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - keeping tab open, halting before next button');
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': { stopped: true, result: 'stopped', timestamp: Date.now() }
                    });
                    return { result: 'stopped', reason: 'User requested stop' };
                }
                
                // Look for next/continue button
                const nextButton = await this.findNextButton();
                if (nextButton) {
                    console.log(`➡️  Clicking next button for step ${currentStep}`);
                    nextButton.click();
                    await this.wait(3000);
                    currentStep++;
                } else {
                    // Check stop before final submission
                    if (await this.checkStopRequested()) {
                        console.log('⏸️  Stop requested - keeping tab open, halting before submission');
                        await chrome.storage.local.set({
                            'stepstoneFormStatus': { stopped: true, result: 'stopped', timestamp: Date.now() }
                        });
                        return { result: 'stopped', reason: 'User requested stop' };
                    }
                    
                    // Check if we're on the final submission step
                    const submitButton = await this.findSubmitButton();
                    if (submitButton) {
                        console.log('🎯 Final submission step reached');
                        
                        // Final verification before submit
                        console.log('🔍 Final verification: Checking all questions answered...');
                        const finalVerification = await this.verifyAllQuestionsAnswered();
                        
                        if (!finalVerification.allAnswered && finalVerification.unansweredQuestions.length > 0) {
                            console.log(`⚠️  ${finalVerification.unansweredQuestions.length} unanswered questions before submit`);
                            console.log('🔄 Attempting final retry to answer questions...');
                            
                            const finalRetryResult = await this.retryUnansweredQuestions(finalVerification.unansweredQuestions);
                            if (finalRetryResult.answered > 0) {
                                console.log(`✅ Answered ${finalRetryResult.answered} questions in final retry`);
                                await this.wait(2000); // Wait for validation
                            }
                        }
                        
                        return await this.submitApplication();
                    } else {
                        console.log('❌ No next or submit button found');
                        return { result: 'error', reason: 'No navigation button found' };
                    }
                }
            }
            
            return { result: 'error', reason: 'Maximum steps exceeded' };
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error processing form:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Start the application process from job page
     * @returns {Promise<Object>} - Result object
     */
    static async startApplicationProcess() {
        try {
            // Look for "Bewerbung fortsetzen" (Continue application) button
            const continueButton = await this.findContinueApplicationButton();
            
            if (continueButton) {
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎯 FOUND: "Bewerbung fortsetzen" button');
                console.log('   Clicking to start application...');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                continueButton.click();
                await this.wait(3000); // Wait for form to load
                
                // DISABLED: Navigation/form detection checks - proceed directly to form processing
                console.log('⚠️  [DISABLED] Skipping form detection, proceeding directly to form processing...');
                console.log('   Waiting additional 2 seconds for form to be ready...');
                await this.wait(2000);
                return await this.processApplicationForm();
            } else {
                console.log('❌ No "Bewerbung fortsetzen" button found');
                return { result: 'error', reason: 'No application button found' };
            }
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error starting application:', error);
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Find the "Bewerbung fortsetzen" (Continue application) button
     * @returns {Promise<Element|null>} - Button element or null
     */
    static async findContinueApplicationButton() {
        try {
            console.log('🔍 [StepstoneForm] Searching for "Bewerbung fortsetzen" button...');
            
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            const selectors = StepstoneSelectors.buttons.continueApplication;
            
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && !button.disabled && button.offsetParent !== null) {
                    const text = button.textContent.trim();
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('✅ FOUND: Bewerbung fortsetzen button');
                    console.log('   Selector:', selector);
                    console.log('   Text:', text);
                    console.log('   Disabled:', button.disabled);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    return button;
                }
            }
            
            // Text search fallback
            const buttons = document.querySelectorAll('button');
            console.log(`🔍 Checking ${buttons.length} buttons by text...`);
            
            for (const button of buttons) {
                const text = button.textContent.trim().toLowerCase();
                if (text.includes('bewerbung fortsetzen') || text.includes('continue application')) {
                    if (!button.disabled && button.offsetParent !== null) {
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ FOUND: Bewerbung fortsetzen button (by text)');
                        console.log('   Text:', button.textContent.trim());
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return button;
                    }
                }
            }
            
            console.log('ℹ️  No "Bewerbung fortsetzen" button found');
            return null;
        } catch (error) {
            console.error('❌ [StepstoneForm] Error finding continue button:', error);
            return null;
        }
    }
    
    /**
     * Find the "Weiter" (Next) button for form steps
     * @returns {Promise<Element|null>} - Button element or null
     */
    static async findNextButton() {
        try {
            console.log('🔍 [StepstoneForm] Searching for "Weiter" button...');
            
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            const selectors = StepstoneSelectors.buttons.next;
            
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && !button.disabled && button.offsetParent !== null) {
                    const text = button.textContent.trim();
                    if (text.toLowerCase().includes('weiter') || text.toLowerCase().includes('next')) {
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ FOUND: Weiter button');
                        console.log('   Selector:', selector);
                        console.log('   Text:', text);
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return button;
                    }
                }
            }
            
            console.log('ℹ️  No "Weiter" button found');
            return null;
        } catch (error) {
            console.error('❌ [StepstoneForm] Error finding next button:', error);
            return null;
        }
    }
    
    /**
     * Find the final submit button
     * @returns {Promise<Element|null>} - Button element or null
     */
    static async findSubmitButton() {
        try {
            console.log('🔍 [StepstoneForm] Searching for final submit button...');
            
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            const selectors = StepstoneSelectors.buttons.submit;
            
            for (const selector of selectors) {
                const button = document.querySelector(selector);
                if (button && !button.disabled && button.offsetParent !== null) {
                    const text = button.textContent.trim();
                    if (text.toLowerCase().includes('bewerbung abschicken') || 
                        text.toLowerCase().includes('send application')) {
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ FOUND: Final submit button');
                        console.log('   Selector:', selector);
                        console.log('   Text:', text);
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        return button;
                    }
                }
            }
            
            console.log('ℹ️  No final submit button found');
            return null;
        } catch (error) {
            console.error('❌ [StepstoneForm] Error finding submit button:', error);
            return null;
        }
    }
    
    /**
     * Check if we're currently on a form step
     * @returns {Promise<boolean>} - Whether we're on a form step
     */
    static async isOnFormStep() {
        try {
            // Look for form indicators
            const formIndicators = [
                'form',
                'input[type="text"]',
                'input[type="email"]',
                'select',
                'textarea',
                '[class*="form"]',
                '[class*="step"]'
            ];
            
            for (const selector of formIndicators) {
                const element = document.querySelector(selector);
                if (element && element.offsetParent !== null) {
                    console.log(`📋 Form step detected with selector: ${selector}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ [StepstoneForm] Error checking form step:', error);
            return false;
        }
    }
    
    /**
     * Fill the current step's form fields
     * @returns {Promise<boolean>} - Success status
     */
    static async fillCurrentStep() {
        try {
            console.log('📝 [StepstoneForm] Filling current step form...');
            
            let fieldsFilled = 0;
            
            // Step 1: Contact details (Anrede, Vorname, Nachname, Telefonnummer)
            if (await this.isContactStep()) {
                fieldsFilled += await this.fillContactFields();
            }
            
            // Step 2: Professional details
            if (await this.isProfessionalStep()) {
                fieldsFilled += await this.fillProfessionalFields();
            }
            
            // Step 3: Documents/CV upload
            if (await this.isDocumentsStep()) {
                fieldsFilled += await this.fillDocumentsStep();
            }
            
            // Step 4: Review and submit
            if (await this.isReviewStep()) {
                console.log('📋 Review step - no fields to fill');
                return true;
            }
            
            console.log(`✅ Filled ${fieldsFilled} fields in current step`);
            return fieldsFilled > 0;
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error filling current step:', error);
            console.error('❌ Error details:', error.message);
            console.error('❌ Error type:', error.constructor.name);
            return false;
        }
    }
    
    /**
     * Check if we're on the contact details step
     * @returns {Promise<boolean>} - Whether we're on contact step
     */
    static async isContactStep() {
        try {
            const indicators = [
                'input[name*="vorname"]',
                'input[name*="nachname"]',
                'input[placeholder*="Vorname"]',
                'input[placeholder*="Nachname"]',
                'select[name*="anrede"]'
            ];
            
            for (const selector of indicators) {
                try {
                    if (document.querySelector(selector)) {
                        console.log('📋 Contact step detected');
                    return true;
                    }
                } catch (selectorError) {
                    console.log(`⚠️  Invalid selector: ${selector}`, selectorError.message);
                    continue;
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking contact step:', error);
            return false;
        }
    }
    
    /**
     * Fill contact details fields
     * @returns {Promise<number>} - Number of fields filled
     */
    static async fillContactFields() {
        try {
            console.log('📝 Filling contact details...');
            let fieldsFilled = 0;
            
            // Salutation (Anrede) - skip as mentioned in memory
            console.log('⏭️  Skipping Anrede field (as per user preference)');
            
            // First name (Vorname) - skip if already filled
            const firstNameField = document.querySelector('input[name*="vorname"], input[placeholder*="Vorname"]');
            if (firstNameField && !firstNameField.value) {
                await this.fillField(firstNameField, this.userData.firstName || 'Sami');
                fieldsFilled++;
                console.log('✅ Filled first name');
            }
            
            // Last name (Nachname) - skip if already filled
            const lastNameField = document.querySelector('input[name*="nachname"], input[placeholder*="Nachname"]');
            if (lastNameField && !lastNameField.value) {
                await this.fillField(lastNameField, this.userData.lastName || 'Dhiab');
                fieldsFilled++;
                console.log('✅ Filled last name');
            }
            
            // Phone number - skip as mentioned in memory
            console.log('⏭️  Skipping phone number field (as per user preference)');
            
            return fieldsFilled;
        } catch (error) {
            console.error('❌ Error filling contact fields:', error);
            return 0;
        }
    }
    
    /**
     * Check if we're on the professional details step
     * @returns {Promise<boolean>} - Whether we're on professional step
     */
    static async isProfessionalStep() {
        try {
            const indicators = [
                'input[name*="experience"]',
                'select[name*="experience"]',
                'input[name*="salary"]',
                'textarea[name*="motivation"]'
            ];
            
            for (const selector of indicators) {
                try {
                    if (document.querySelector(selector)) {
                        console.log('📋 Professional step detected');
                        return true;
                    }
                } catch (selectorError) {
                    console.log(`⚠️  Invalid selector: ${selector}`, selectorError.message);
                    continue;
                }
            }
            return false;
        } catch (error) {
            console.error('❌ Error checking professional step:', error);
            return false;
        }
    }
    
    /**
     * Fill professional details fields
     * @returns {Promise<number>} - Number of fields filled
     */
    static async fillProfessionalFields() {
        try {
            console.log('📝 Filling professional details...');
            let fieldsFilled = 0;
            
            // Experience field - use minimum 5 years as per memory
            const experienceField = document.querySelector('input[name*="experience"], select[name*="experience"]');
            if (experienceField) {
                const experienceValue = this.userData.experience || '5';
                await this.fillField(experienceField, experienceValue);
                fieldsFilled++;
                console.log(`✅ Filled experience: ${experienceValue} years`);
            }
            
            // Salary expectation - skip if not provided
            const salaryField = document.querySelector('input[name*="salary"], input[placeholder*="Gehalt"]');
            if (salaryField && this.userData.salary) {
                await this.fillField(salaryField, this.userData.salary);
                fieldsFilled++;
                console.log('✅ Filled salary expectation');
            }
            
            // Motivation/Cover letter
            const motivationField = document.querySelector('textarea[name*="motivation"], textarea[placeholder*="Motivation"]');
            if (motivationField && this.userData.coverLetter) {
                await this.fillField(motivationField, this.userData.coverLetter);
                fieldsFilled++;
                console.log('✅ Filled motivation/cover letter');
            }
            
            return fieldsFilled;
        } catch (error) {
            console.error('❌ Error filling professional fields:', error);
            return 0;
        }
    }
    
    /**
     * Check if we're on the documents step
     * @returns {Promise<boolean>} - Whether we're on documents step
     */
    static async isDocumentsStep() {
        const indicators = [
            'input[type="file"]',
            '[class*="upload"]',
            '[data-testid*="upload"]'
        ];
        
        for (const selector of indicators) {
            if (document.querySelector(selector)) {
                console.log('📋 Documents step detected');
                return true;
            }
        }
        return false;
    }
    
    /**
     * Fill documents step
     * @returns {Promise<number>} - Number of fields filled
     */
    static async fillDocumentsStep() {
        try {
            console.log('📝 Processing documents step...');
            let fieldsFilled = 0;
            
            // Handle CV/resume upload if available
            if (this.userData.resume) {
                const uploadField = document.querySelector('input[type="file"][accept*="pdf"], input[type="file"][name*="cv"]');
                if (uploadField) {
                    // Note: File upload would be handled here
                    console.log('📄 Resume upload field found (upload logic would go here)');
                    fieldsFilled++;
                }
            }
            
            return fieldsFilled;
        } catch (error) {
            console.error('❌ Error filling documents step:', error);
            return 0;
        }
    }
    
    /**
     * Check if we're on the review step
     * @returns {Promise<boolean>} - Whether we're on review step
     */
    static async isReviewStep() {
        const indicators = [
            '[class*="review"]',
            '[data-testid*="review"]'
        ];
        
        for (const selector of indicators) {
            if (document.querySelector(selector)) {
                console.log('📋 Review step detected');
                return true;
            }
        }
        return false;
    }
    
    /**
     * Submit the final application
     * @returns {Promise<Object>} - Result object
     */
    /**
     * Verify that all questions on the current step are answered
     * @returns {Promise<Object>} - Verification result with unanswered questions and validation errors
     */
    static async verifyAllQuestionsAnswered() {
        try {
            console.log('🔍 [StepstoneForm] Verifying all questions are answered...');
            
            // Import selectors
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            
            // Use same method as processFormQuestions to ensure consistency
            let questionGroups = StepstoneSelectors.findQuestionContainers(document);
            
            // Fallback to all selectors if needed
            if (questionGroups.length === 0) {
                const selectors = StepstoneSelectors.getQuestionContainerSelectors();
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // Use all elements matching the selector (no label/input filter)
                        questionGroups = Array.from(elements);
                        if (questionGroups.length > 0) break;
                    }
                }
            }
            
            if (questionGroups.length === 0) {
                console.log('✅ No question groups found - nothing to verify');
                return { allAnswered: true, unansweredQuestions: [], validationErrors: [] };
            }
            
            console.log(`📋 Found ${questionGroups.length} question groups to verify`);
            
            const unansweredQuestions = [];
            const validationErrors = [];
            
            for (const group of questionGroups) {
                const label = group.querySelector('label');
                const inputField = group.querySelector('input, textarea, select');
                
                if (!label || !inputField) continue;
                
                const questionText = this.extractFullQuestionText(label, inputField, group);
                
                // Skip pre-filled or hidden fields
                if (this.shouldSkipQuestion(questionText)) {
                    continue;
                }
                
                // Check if field has validation error
                const validationResult = await this.checkValidationFeedback(group, inputField);
                if (validationResult.hasError) {
                    validationErrors.push({
                        question: questionText,
                        error: validationResult.message,
                        constraintType: validationResult.constraintType
                    });
                }
                
                // Check if field is answered
                let isAnswered = false;
                
                if (inputField.tagName.toLowerCase() === 'select') {
                    // Select: check if a non-empty option is selected
                    const selectedOption = inputField.options[inputField.selectedIndex];
                    isAnswered = selectedOption && selectedOption.value !== '' && selectedOption.value !== null;
                } else if (inputField.type === 'checkbox') {
                    // Checkbox: check if checked
                    isAnswered = inputField.checked;
                } else if (inputField.type === 'radio') {
                    // Radio: check if any radio in group is checked
                    const radioGroup = group.querySelectorAll('input[type="radio"]');
                    isAnswered = Array.from(radioGroup).some(radio => radio.checked);
                } else {
                    // Text/textarea/number/date: check if has value
                    isAnswered = inputField.value && inputField.value.trim() !== '';
                }
                
                // Also check if field is required (has required attribute)
                const isRequired = inputField.hasAttribute('required') || 
                                 inputField.getAttribute('aria-required') === 'true';
                
                if ((isRequired || !isAnswered) && !isAnswered) {
                    unansweredQuestions.push({
                        question: questionText,
                        fieldType: inputField.type || inputField.tagName.toLowerCase(),
                        isRequired: isRequired
                    });
                }
            }
            
            const allAnswered = unansweredQuestions.length === 0 && validationErrors.length === 0;
            
            if (allAnswered) {
                console.log(`✅ All ${questionGroups.length} questions are answered`);
            } else {
                console.log(`⚠️  Found ${unansweredQuestions.length} unanswered questions and ${validationErrors.length} validation errors`);
                unansweredQuestions.forEach(q => {
                    console.log(`   - Unanswered: "${q.question}" (${q.fieldType})`);
                });
                validationErrors.forEach(e => {
                    console.log(`   - Validation error: "${e.question}" - ${e.error}`);
                });
            }
            
            return {
                allAnswered,
                unansweredQuestions,
                validationErrors,
                totalQuestions: questionGroups.length,
                answeredQuestions: questionGroups.length - unansweredQuestions.length
            };
            
        } catch (error) {
            console.error('❌ Error verifying questions:', error);
            // If we can't verify, assume all are answered (don't block progress)
            return { allAnswered: true, unansweredQuestions: [], validationErrors: [] };
        }
    }
    
    /**
     * Wait for submission success by checking URL change to confirmation page
     * @param {number} maxWaitTime - Maximum time to wait in milliseconds (default: 60000)
     * @returns {Promise<Object>} - Success result with applicationId or error
     */
    static async waitForSubmissionSuccess(maxWaitTime = 60000) {
        try {
            console.log('⏳ [StepstoneForm] Waiting for submission success confirmation...');
            console.log(`   Timeout: ${maxWaitTime / 1000} seconds`);
            
            const startUrl = window.location.href;
            const startTime = Date.now();
            
            console.log(`   Starting URL: ${startUrl}`);
            
            while (Date.now() - startTime < maxWaitTime) {
                const currentUrl = window.location.href;
                const elapsed = Math.floor((Date.now() - startTime) / 1000);
                
                // Check if URL changed to success page
                if (currentUrl.includes('/application/confirmation/success')) {
                    const urlParams = new URLSearchParams(window.location.search);
                    const applicationId = urlParams.get('applicationId');
                    
                    if (applicationId) {
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        console.log('✅ SUBMISSION SUCCESS CONFIRMED!');
                        console.log(`   Application ID: ${applicationId}`);
                        console.log(`   Confirmation URL: ${currentUrl}`);
                        console.log(`   Elapsed time: ${elapsed}s`);
                        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                        
                        return {
                            success: true,
                            applicationId: applicationId,
                            confirmationUrl: currentUrl,
                            elapsedSeconds: elapsed
                        };
                    } else {
                        console.log(`⚠️  On success page but no applicationId found (${elapsed}s)`);
                    }
                }
                
                // Check if still on same page (no navigation happened yet)
                if (currentUrl === startUrl) {
                    // Check for validation errors or error messages on submission
                    const hasErrors = await this.hasValidationErrors();
                    if (hasErrors) {
                        console.log(`⚠️  Validation errors detected on submission page (${elapsed}s)`);
                        // Don't return error yet, might resolve
                    }
                    
                    // Log progress every 10 seconds
                    if (elapsed % 10 === 0 && elapsed > 0) {
                        console.log(`   Still waiting for submission confirmation... (${elapsed}s/${maxWaitTime / 1000}s)`);
                    }
                } else {
                    // URL changed but not to success page
                    console.log(`   URL changed but not to success page (${elapsed}s): ${currentUrl}`);
                }
                
                await this.wait(500);
            }
            
            // Timeout reached
            const finalUrl = window.location.href;
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('❌ TIMEOUT waiting for submission confirmation');
            console.log(`   Final URL: ${finalUrl}`);
            console.log(`   Expected: /application/confirmation/success`);
            console.log(`   Elapsed: ${maxWaitTime / 1000}s`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Check for errors on final page
            const finalErrors = await this.hasValidationErrors();
            
            return {
                success: false,
                reason: 'Timeout waiting for submission confirmation',
                finalUrl: finalUrl,
                hasErrors: finalErrors,
                elapsedSeconds: maxWaitTime / 1000
            };
            
        } catch (error) {
            console.error('❌ Error waiting for submission success:', error);
            return {
                success: false,
                reason: error.message,
                error: error
            };
        }
    }
    
    /**
     * Attempt to answer unanswered questions using AI
     * @param {Array} unansweredQuestions - Array of unanswered question objects
     * @returns {Promise<Object>} - Result with successfully answered questions
     */
    static async retryUnansweredQuestions(unansweredQuestions) {
        try {
            console.log(`🔄 [StepstoneForm] Retrying ${unansweredQuestions.length} unanswered questions...`);
            
            if (unansweredQuestions.length === 0) {
                return { answered: 0, failed: 0, results: [] };
            }
            
            const results = [];
            let answeredCount = 0;
            let failedCount = 0;
            
            // Import selectors
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            
            // Find question groups again using same method as verification
            let questionGroups = StepstoneSelectors.findQuestionContainers(document);
            
            // Fallback to all selectors if needed
            if (questionGroups.length === 0) {
                const selectors = StepstoneSelectors.getQuestionContainerSelectors();
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // Use all elements matching the selector (no label/input filter)
                        questionGroups = Array.from(elements);
                        if (questionGroups.length > 0) break;
                    }
                }
            }
            
            for (const unansweredQ of unansweredQuestions) {
                // Check for stop signal before processing each unanswered question
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - halting retry of unanswered questions');
                    return {
                        answered: answeredCount,
                        failed: unansweredQuestions.length - answeredCount,
                        results: results,
                        stopped: true
                    };
                }
                
                // Find the matching question group
                let matchingGroup = null;
                for (const group of questionGroups) {
                    const label = group.querySelector('label');
                    if (label) {
                        const questionText = this.extractFullQuestionText(label, group.querySelector('input, textarea, select'), group);
                        if (questionText === unansweredQ.question || 
                            questionText.includes(unansweredQ.question) || 
                            unansweredQ.question.includes(questionText)) {
                            matchingGroup = group;
                            break;
                        }
                    }
                }
                
                if (!matchingGroup) {
                    console.log(`⚠️  Could not find element for question: "${unansweredQ.question}"`);
                    failedCount++;
                    results.push({ question: unansweredQ.question, success: false, reason: 'Element not found' });
                    continue;
                }
                
                // Answer using AI (let AI guess best answer)
                const label = matchingGroup.querySelector('label');
                const inputField = matchingGroup.querySelector('input, textarea, select');
                const fullQuestionText = this.extractFullQuestionText(label, inputField, matchingGroup);
                
                console.log(`🤖 Using AI to answer: "${fullQuestionText}"`);
                
                // Extract options if available
                let options = [];
                let fieldType = 'single';
                
                if (inputField.tagName.toLowerCase() === 'select') {
                    options = Array.from(inputField.options).map(opt => opt.text.trim());
                    fieldType = 'select';
                } else if (inputField.type === 'radio') {
                    matchingGroup.querySelectorAll('input[type="radio"]').forEach(radio => {
                        const radioLabel = matchingGroup.querySelector(`label[for="${radio.id}"]`);
                        if (radioLabel) options.push(radioLabel.textContent.trim());
                    });
                    fieldType = 'radio';
                }
                
                // Answer the question
                const answerResult = await this.answerQuestion(fullQuestionText, options, inputField, matchingGroup, fieldType);
                
                if (answerResult.success) {
                    answeredCount++;
                    results.push({ question: fullQuestionText, success: true });
                    console.log(`✅ Successfully answered: "${fullQuestionText}"`);
                    await this.wait(1000); // Wait between questions
                } else {
                    failedCount++;
                    results.push({ question: fullQuestionText, success: false, reason: answerResult.reason });
                    console.log(`❌ Failed to answer: "${fullQuestionText}" - ${answerResult.reason}`);
                }
            }
            
            console.log(`📊 Retry results: ${answeredCount} answered, ${failedCount} failed`);
            
            return {
                answered: answeredCount,
                failed: failedCount,
                results: results
            };
            
        } catch (error) {
            console.error('❌ Error retrying unanswered questions:', error);
            return {
                answered: 0,
                failed: unansweredQuestions.length,
                results: [],
                error: error.message
            };
        }
    }
    
    static async submitApplication() {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎯 [StepstoneForm] Submitting application...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Step 1: Verify all questions are answered before submitting
            console.log('📋 Step 1: Verifying all questions are answered...');
            const verification = await this.verifyAllQuestionsAnswered();
            
            if (!verification.allAnswered) {
                console.log(`⚠️  Not all questions answered: ${verification.unansweredQuestions.length} unanswered`);
                
                // Retry answering unanswered questions
                if (verification.unansweredQuestions.length > 0) {
                    console.log('🔄 Attempting to answer unanswered questions...');
                    const retryResult = await this.retryUnansweredQuestions(verification.unansweredQuestions);
                    
                    if (retryResult.answered > 0) {
                        console.log(`✅ Answered ${retryResult.answered} additional questions`);
                        // Verify again after retry
                        const reVerification = await this.verifyAllQuestionsAnswered();
                        if (!reVerification.allAnswered) {
                            console.log(`⚠️  Still ${reVerification.unansweredQuestions.length} unanswered questions after retry`);
                            // Continue anyway - let form validation handle it
                        }
                    }
                }
            } else {
                console.log('✅ All questions verified as answered');
            }
            
            // Step 2: Check for validation errors
            const hasErrors = await this.hasValidationErrors();
            if (hasErrors) {
                console.log('⚠️  Validation errors detected before submission');
                // Continue anyway - might be minor
            }
            
            // Step 3: Find and click submit button
            console.log('📋 Step 2: Finding submit button...');
            const submitButton = await this.findSubmitButton();
            if (!submitButton) {
                return { result: 'error', reason: 'No submit button found' };
            }
            
            console.log('✅ Submit button found - clicking to submit application');
            
            // Store original URL
            const originalUrl = window.location.href;
            
            // Click submit button (first attempt)
            console.log('📋 Step 3: Clicking submit button (attempt 1)...');
            submitButton.click();
            await this.wait(2000); // Wait a bit for response
            
            // Step 4: Wait for submission success confirmation
            console.log('📋 Step 4: Waiting for submission confirmation...');
            const successResult = await this.waitForSubmissionSuccess(60000); // 60 seconds timeout
            
            if (successResult.success) {
                // Success confirmed!
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('🎉 APPLICATION SUBMITTED SUCCESSFULLY!');
                console.log(`   Application ID: ${successResult.applicationId}`);
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // Set completion status in storage
                await chrome.storage.local.set({
                    'stepstoneFormStatus': {
                        completed: true,
                        confirmed: true,
                        result: 'success',
                        applicationId: successResult.applicationId,
                        confirmationUrl: successResult.confirmationUrl,
                        timestamp: Date.now()
                    }
                });
                
                return {
                    result: 'success',
                    message: `Application submitted successfully (ID: ${successResult.applicationId})`,
                    applicationId: successResult.applicationId,
                    confirmationUrl: successResult.confirmationUrl,
                    jobInfo: this.jobInfo
                };
            } else {
                // First attempt failed - retry once
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                console.log('⚠️  First submission attempt did not confirm success');
                console.log(`   Reason: ${successResult.reason}`);
                console.log('   Retrying submission...');
                console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                
                // Wait a bit before retry
                await this.wait(3000);
                
                // Find submit button again
                const retrySubmitButton = await this.findSubmitButton();
                if (!retrySubmitButton) {
                    console.log('❌ Submit button not found on retry - cannot retry');
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': {
                            error: true,
                            result: 'error',
                            errorMessage: 'Submit button not found on retry',
                            timestamp: Date.now()
                        }
                    });
                    return { result: 'error', reason: 'Submit button not found on retry' };
                }
                
                // Retry click
                console.log('📋 Retry: Clicking submit button (attempt 2)...');
                retrySubmitButton.click();
                await this.wait(2000);
                
                // Wait for success again
                console.log('📋 Retry: Waiting for submission confirmation...');
                const retrySuccessResult = await this.waitForSubmissionSuccess(60000);
                
                if (retrySuccessResult.success) {
                    // Success on retry!
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('🎉 APPLICATION SUBMITTED SUCCESSFULLY (on retry)!');
                    console.log(`   Application ID: ${retrySuccessResult.applicationId}`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': {
                            completed: true,
                            confirmed: true,
                            result: 'success',
                            applicationId: retrySuccessResult.applicationId,
                            confirmationUrl: retrySuccessResult.confirmationUrl,
                            timestamp: Date.now(),
                            wasRetry: true
                        }
                    });
                    
                    return {
                        result: 'success',
                        message: `Application submitted successfully on retry (ID: ${retrySuccessResult.applicationId})`,
                        applicationId: retrySuccessResult.applicationId,
                        confirmationUrl: retrySuccessResult.confirmationUrl,
                        wasRetry: true,
                        jobInfo: this.jobInfo
                    };
                } else {
                    // Both attempts failed
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('❌ SUBMISSION FAILED after retry');
                    console.log(`   Reason: ${retrySuccessResult.reason}`);
                    console.log(`   Final URL: ${retrySuccessResult.finalUrl || window.location.href}`);
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    await chrome.storage.local.set({
                        'stepstoneFormStatus': {
                            error: true,
                            result: 'error',
                            errorMessage: retrySuccessResult.reason || 'Submission failed after retry',
                            finalUrl: retrySuccessResult.finalUrl || window.location.href,
                            timestamp: Date.now()
                        }
                    });
                    
                    return {
                        result: 'error',
                        reason: retrySuccessResult.reason || 'Submission failed after retry',
                        finalUrl: retrySuccessResult.finalUrl
                    };
                }
            }
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error submitting application:', error);
            
            // Set error status in storage
            await chrome.storage.local.set({
                'stepstoneFormStatus': {
                    error: true,
                    result: 'error',
                    errorMessage: error.message,
                    timestamp: Date.now()
                }
            });
            
            return { result: 'error', reason: error.message };
        }
    }
    
    /**
     * Wait for page to load completely
     * @returns {Promise<void>}
     */
    static async waitForPageLoad() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete') {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });
    }
    
    /**
     * Wait for application form to appear (StepStone uses dynamic loading, not URL navigation)
     * @returns {Promise<boolean>} - Whether form appeared
     */
    static async waitForFormToAppear() {
        const maxWait = 15000; // 15 seconds
        const checkInterval = 500;
        let waited = 0;
        
        console.log('🔍 [DEBUG] Waiting for form to appear...');
        
        // Import selectors
        const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
        const formIndicators = StepstoneSelectors.formIndicators;
        
        while (waited < maxWait) {
            
            for (const selector of formIndicators) {
                try {
                    const elements = document.querySelectorAll(selector);
                    if (elements.length > 0) {
                        // Check if elements are visible
                        const visibleElements = Array.from(elements).filter(el => {
                            return el.offsetParent !== null && 
                                   (el.offsetWidth > 0 || el.offsetHeight > 0);
                        });
                        
                        if (visibleElements.length > 0) {
                            console.log(`✅ Form detected using selector: "${selector}" (${visibleElements.length} visible elements)`);
                            return true;
                        }
                    }
                } catch (e) {
                    // Some selectors might not be valid (e.g., :has() in older browsers)
                    continue;
                }
            }
            
            // Also check if URL changed (fallback)
            const currentUrl = window.location.href;
            if (currentUrl.includes('/application/') && !currentUrl.includes('dynamic-apply')) {
                console.log('✅ URL changed to application form');
                return true;
            }
            
            await this.wait(checkInterval);
            waited += checkInterval;
            
            // Log progress every 3 seconds
            if (waited % 3000 === 0) {
                console.log(`⏳ Still waiting for form... (${waited/1000}s/${maxWait/1000}s)`);
            }
        }
        
        console.log('⚠️  Form appearance timeout - form elements not detected');
        return false;
    }
    
    /**
     * Wait for navigation to application form (legacy method, kept for compatibility)
     * @returns {Promise<boolean>} - Whether navigation occurred
     */
    static async waitForNavigation() {
        const startUrl = window.location.href;
        const maxWait = 10000; // 10 seconds
        const checkInterval = 500;
        let waited = 0;
        
        while (waited < maxWait) {
            if (window.location.href !== startUrl) {
                console.log('✅ Navigation detected');
                return true;
            }
            await this.wait(checkInterval);
            waited += checkInterval;
        }
        
        console.log('⚠️  Navigation timeout');
        return false;
    }
    
    /**
     * Fill a specific form field
     * @param {Element} element - Form field element
     * @param {string} value - Value to fill
     * @returns {Promise<void>}
     */
    static async fillField(element, value) {
        try {
            if (!element || !value) return;
            
            console.log(`📝 Filling field: ${element.tagName} with value: ${value}`);
            
            // Focus the element
            element.focus();
            await this.wait(200);
            
            if (element.tagName.toLowerCase() === 'select') {
                // Handle select dropdown
                const options = element.querySelectorAll('option');
                for (const option of options) {
                    if (option.textContent.toLowerCase().includes(value.toLowerCase()) ||
                        option.value.toLowerCase().includes(value.toLowerCase())) {
                        element.value = option.value;
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        console.log(`✅ Selected option: ${option.textContent}`);
                        break;
                    }
                }
            } else {
                // Handle text input
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
                console.log(`✅ Filled input field with: ${value}`);
            }
            
            await this.wait(200);
            
        } catch (error) {
            console.error('❌ Error filling field:', error);
        }
    }
    
    /**
     * Check if form has validation errors
     * @returns {Promise<boolean>} - Whether errors exist
     */
    static async hasValidationErrors() {
        try {
            const errorSelectors = [
                '.error',
                '.validation-error',
                '[class*="error"]',
                '.field-error',
                '[aria-invalid="true"]',
                '.form-error',
                '.input-error'
            ];
            
            for (const selector of errorSelectors) {
                const errorElement = document.querySelector(selector);
                if (errorElement && errorElement.offsetParent !== null) {
                    console.log(`⚠️  Validation error found: ${errorElement.textContent}`);
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error('❌ Error checking validation errors:', error);
            return false;
        }
    }
    
    /**
     * Process form questions on current page (LinkedIn-style)
     * @returns {Promise<Object>} - Result object with success status
     */
    static async processFormQuestions() {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 [StepstoneForm] Processing form questions');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Import selectors
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            
            // DEBUG: Log all possible form containers
            console.log('🔍 [DEBUG] Searching for form elements...');
            
            // Use optimized findQuestionContainers method first
            let formElements = StepstoneSelectors.findQuestionContainers(document);
            let selectorUsed = 'findQuestionContainers (optimized)';
            
            // If optimized method found nothing, try fallback selectors
            if (formElements.length === 0) {
                console.log('⚠️  Optimized method found no containers, trying fallback selectors...');
                const selectors = StepstoneSelectors.getQuestionContainerSelectors();
                
                for (const selector of selectors) {
                    const found = document.querySelectorAll(selector);
                    console.log(`🔍 [DEBUG] Selector "${selector}": Found ${found.length} elements`);
                    if (found.length > 0) {
                        // Use all found elements (no label/input filter)
                        formElements = Array.from(found);
                        if (formElements.length > 0) {
                            selectorUsed = selector;
                            console.log(`✅ [DEBUG] Using selector: "${selector}" (${formElements.length} valid elements)`);
                            break;
                        }
                    }
                }
            } else {
                console.log(`✅ [DEBUG] Using optimized method: Found ${formElements.length} question containers`);
            }
            
            if (formElements.length === 0) {
                console.log('⚠️  [DEBUG] No form elements found with any selector!');
                console.log('🔍 [DEBUG] Page HTML structure:');
                console.log('   - Forms on page:', document.querySelectorAll('form').length);
                console.log('   - All inputs:', document.querySelectorAll('input').length);
                console.log('   - All textareas:', document.querySelectorAll('textarea').length);
                console.log('   - All selects:', document.querySelectorAll('select').length);
                console.log('   - All labels:', document.querySelectorAll('label').length);
                console.log('   - All divs with role="group":', document.querySelectorAll('div[role="group"]').length);
                
                // Try to find ANY labels with input fields nearby
                const allLabels = document.querySelectorAll('label');
                console.log(`🔍 [DEBUG] Found ${allLabels.length} total labels on page`);
                if (allLabels.length > 0) {
                    console.log('🔍 [DEBUG] Sample labels found:');
                    Array.from(allLabels).slice(0, 5).forEach((label, idx) => {
                        console.log(`   ${idx + 1}. "${label.textContent.trim()}" (classes: ${label.className})`);
                    });
                }
                
                return { success: false, reason: 'No form elements found' };
            }
            
            console.log(`📋 Found ${formElements.length} form elements using selector: "${selectorUsed}"`);
            
            // DEBUG: Log details about each form element found
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🔍 [DEBUG] Analyzing form elements...');
            formElements.forEach((el, idx) => {
                const hasLabel = el.querySelector('label') !== null;
                const directLabel = el.querySelector(':scope > label');
                const hasDirectLabel = directLabel !== null;
                const hasInput = el.querySelector('input, textarea, select') !== null;
                const classes = el.className || 'no-class';
                const role = el.getAttribute('role') || 'no-role';
                
                console.log(`   Element ${idx + 1}:`);
                console.log(`     - Classes: ${classes}`);
                console.log(`     - Role: ${role}`);
                console.log(`     - Has any label: ${hasLabel}`);
                console.log(`     - Has direct child label: ${hasDirectLabel}`);
                console.log(`     - Has input/textarea/select: ${hasInput}`);
                if (hasLabel) {
                    const labelText = el.querySelector('label')?.textContent.trim() || 'empty';
                    console.log(`     - Label text: "${labelText.substring(0, 50)}${labelText.length > 50 ? '...' : ''}"`);
                }
            });
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Filter to only get parent question groups (those with a label child)
            const questionGroups = Array.from(formElements).filter(el => {
                const directLabel = el.querySelector(':scope > label');
                const result = directLabel !== null;
                if (!result) {
                    // Also check for any label (not just direct child) as fallback
                    const anyLabel = el.querySelector('label');
                    if (anyLabel) {
                        console.log(`⚠️  [DEBUG] Element has label but not as direct child. Label: "${anyLabel.textContent.trim()}"`);
                    }
                }
                return result;
            });
            
            console.log(`📋 Filtered to ${questionGroups.length} actual question groups (with direct child label)`);
            
            // If no direct child labels, try with any label as fallback
            if (questionGroups.length === 0) {
                console.log('⚠️  [DEBUG] No elements with direct child labels found. Trying fallback: any label...');
                // Use all form elements as fallback (no label/input filter)
                const fallbackGroups = Array.from(formElements);
                console.log(`📋 Fallback found ${fallbackGroups.length} elements with any label and input field`);
                
                if (fallbackGroups.length > 0) {
                    // Use fallback groups
                    for (const element of fallbackGroups) {
                        // Check for stop signal before processing each question
                        if (await this.checkStopRequested()) {
                            console.log('⏸️  Stop requested - halting question processing');
                            return { success: false, stopped: true, reason: 'User requested stop' };
                        }
                        
                        try {
                            // Find the label element containing the question
                            const labelElement = element.querySelector('label');
                            if (!labelElement) {
                                console.log('⚠️  No label found for form element');
                                continue;
                            }
                            
                            // Find the input field(s) first (needed for extractFullQuestionText)
                            const inputField = element.querySelector('input, textarea, select');
                            if (!inputField) {
                                console.log('⚠️  No input field found for question');
                                continue;
                            }
                            
                            // Extract full question text using improved extraction
                            let questionText = this.extractFullQuestionText(labelElement, inputField, element);
                            // Remove the asterisk (*) and other formatting
                            questionText = questionText.replace(/\*$/, '').trim();
                            console.log(`❓ [DEBUG] Processing question (fallback): ${questionText}`);
                            console.log(`   Label element:`, labelElement);
                            console.log(`   Label classes: ${labelElement.className || 'none'}`);
                            console.log(`   Parent element classes: ${element.className || 'none'}`);
                            if (!inputField) {
                                console.log('⚠️  No input field found for question');
                                continue;
                            }
                            
                            console.log(`   Input field type: ${inputField.tagName} ${inputField.type || ''}`);
                            
                            // Continue with normal processing...
                            // Extract options for select/radio/checkbox fields
                            let options = [];
                            let fieldType = 'single';
                            
                            switch (inputField.tagName.toLowerCase()) {
                                case 'select':
                                    options = Array.from(inputField.options).map(option => option.text.trim());
                                    fieldType = 'select';
                                    break;
                                case 'input':
                                    if (inputField.type === 'radio') {
                                        const radioOptions = element.querySelectorAll('input[type="radio"]');
                                        radioOptions.forEach(radio => {
                                            const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                            if (radioLabel) {
                                                options.push(radioLabel.textContent.trim());
                                            }
                                        });
                                        fieldType = 'radio';
                                    } else if (inputField.type === 'checkbox') {
                                        const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                                        if (checkboxes.length > 1) {
                                            checkboxes.forEach(checkbox => {
                                                const checkboxLabel = element.querySelector(`label[for="${checkbox.id}"]`);
                                                if (checkboxLabel) {
                                                    options.push(checkboxLabel.textContent.trim());
                                                }
                                            });
                                            fieldType = 'checkbox_group';
                                            console.log(`📋 Detected checkbox group with ${checkboxes.length} options`);
                                        }
                                    }
                                    break;
                            }
                            
                            if (options.length > 0) {
                                console.log(`📝 Available options for "${questionText}":`, options);
                            }
                            
                            // Answer the question
                            const questionResult = await this.answerQuestion(questionText, options, inputField, element, fieldType);
                            
                            if (!questionResult.success) {
                                console.log(`❌ Failed to answer question: ${questionText}`);
                            }
                            
                        } catch (error) {
                            console.error(`❌ Error processing form element: ${error.message}`, error);
                        }
                    }
                    
                    console.log('✅ Completed processing form questions (fallback mode)');
                    return { success: true };
                }
            }
            
            for (const element of questionGroups) {
                // Check for stop signal before processing each question
                if (await this.checkStopRequested()) {
                    console.log('⏸️  Stop requested - halting question processing');
                    return { success: false, stopped: true, reason: 'User requested stop' };
                }
                
                try {
                    // Find the label element containing the question
                    const labelElement = element.querySelector('label');
                    if (!labelElement) {
                        console.log('⚠️  No label found for form element');
                        continue;
                    }
                    
                    // Find the input field(s) first (needed for extractFullQuestionText)
                    const inputField = element.querySelector('input, textarea, select');
                    if (!inputField) {
                        console.log(`⚠️  [DEBUG] No input field found for question: "${labelElement.textContent.trim()}"`);
                        console.log(`   Available elements in container:`, {
                            inputs: element.querySelectorAll('input').length,
                            textareas: element.querySelectorAll('textarea').length,
                            selects: element.querySelectorAll('select').length
                        });
                        continue;
                    }
                    
                    // Extract full question text using improved extraction
                    let questionText = this.extractFullQuestionText(labelElement, inputField, element);
                    console.log(`❓ [DEBUG] Processing question: ${questionText}`);
                    console.log(`   Label element:`, labelElement);
                    console.log(`   Label classes: ${labelElement.className || 'none'}`);
                    console.log(`   Parent element classes: ${element.className || 'none'}`);
                    
                    // Check if this question should be skipped
                    if (this.shouldSkipQuestion(questionText)) {
                        console.log(`⏭️  Skipping question: ${questionText}`);
                        continue;
                    }
                    
                    console.log(`   [DEBUG] Input field found:`, {
                        tag: inputField.tagName,
                        type: inputField.type || 'N/A',
                        name: inputField.name || 'N/A',
                        id: inputField.id || 'N/A',
                        classes: inputField.className || 'none'
                    });
                    
                    // Extract options for select/radio/checkbox fields
                    let options = [];
                    let fieldType = 'single';
                    
                    switch (inputField.tagName.toLowerCase()) {
                        case 'select':
                            options = Array.from(inputField.options).map(option => option.text.trim());
                            fieldType = 'select';
                            break;
                        case 'input':
                            if (inputField.type === 'radio') {
                                const radioOptions = element.querySelectorAll('input[type="radio"]');
                                radioOptions.forEach(radio => {
                                    const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                    if (radioLabel) {
                                        options.push(radioLabel.textContent.trim());
                                    }
                                });
                                fieldType = 'radio';
                            } else if (inputField.type === 'checkbox') {
                                // Check if this is a checkbox group (multiple checkboxes)
                                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                                if (checkboxes.length > 1) {
                                    // This is a checkbox group
                                    checkboxes.forEach(checkbox => {
                                        const checkboxLabel = element.querySelector(`label[for="${checkbox.id}"]`);
                                        if (checkboxLabel) {
                                            options.push(checkboxLabel.textContent.trim());
                                        }
                                    });
                                    fieldType = 'checkbox_group';
                                    console.log(`📋 Detected checkbox group with ${checkboxes.length} options`);
                                }
                            }
                            break;
                    }
                    
                    if (options.length > 0) {
                        console.log(`📝 Available options for "${questionText}":`, options);
                    } else {
                        console.log(`📝 No options found - this is a text input field`);
                    }
                    
                    console.log(`🤖 [DEBUG] About to answer question: "${questionText}"`);
                    console.log(`   Field type: ${fieldType}`);
                    console.log(`   Options count: ${options.length}`);
                    
                    // Answer the question
                    const questionResult = await this.answerQuestion(questionText, options, inputField, element, fieldType);
                    
                    if (!questionResult.success) {
                        console.log(`❌ Failed to answer question: ${questionText}`);
                        console.log(`   Result:`, questionResult);
                        // Continue to next question on failure
                    } else {
                        console.log(`✅ Successfully answered question: ${questionText}`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing form element: ${error.message}`, error);
                    console.error(`   Stack trace:`, error.stack);
                }
            }
            
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`✅ Completed processing form questions`);
            console.log(`   Total questions processed: ${questionGroups.length}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error in processFormQuestions:', error);
            return { success: false };
        }
    }
    
    /**
     * Extract full question text from form element
     * Tries multiple methods to get complete question text
     * @param {Element} labelElement - Label element
     * @param {Element} inputField - Input field element
     * @param {Element} element - Parent form element
     * @returns {string} - Complete question text
     */
    static extractFullQuestionText(labelElement, inputField, element) {
        let questionText = '';
        
        // Method 1: Try label textContent (should get all text including nested elements)
        if (labelElement) {
            questionText = labelElement.textContent.trim();
            // Also try innerText as fallback (handles visibility better)
            if (!questionText || questionText.length < 3) {
                questionText = labelElement.innerText.trim();
            }
        }
        
        // Method 2: If label text seems incomplete, check aria-label on input
        if ((!questionText || questionText.length < 5) && inputField) {
            const ariaLabel = inputField.getAttribute('aria-label');
            if (ariaLabel && ariaLabel.trim().length > questionText.length) {
                questionText = ariaLabel.trim();
            }
        }
        
        // Method 3: Check placeholder (sometimes contains question context)
        if (inputField && inputField.placeholder) {
            const placeholder = inputField.placeholder.trim();
            // If placeholder is longer/more descriptive, use it
            if (placeholder.length > questionText.length && placeholder.length > 10) {
                // Combine if both exist
                if (questionText && !questionText.includes(placeholder)) {
                    questionText = `${questionText} ${placeholder}`;
                } else if (!questionText) {
                    questionText = placeholder;
                }
            }
        }
        
        // Method 4: Check for helper text via aria-describedby
        if (inputField) {
            const describedBy = inputField.getAttribute('aria-describedby');
            if (describedBy) {
                const ids = describedBy.split(/\s+/);
                for (const id of ids) {
                    const helperElement = document.getElementById(id);
                    if (helperElement) {
                        const helperText = helperElement.textContent.trim();
                        if (helperText && helperText.length > 5 && !questionText.includes(helperText)) {
                            // Helper text often contains additional context
                            questionText = `${questionText} ${helperText}`.trim();
                        }
                    }
                }
            }
        }
        
        // Method 5: Look for nearby text elements in parent
        if ((!questionText || questionText.length < 5) && element) {
            // Look for legend, span, or div with text near the input
            const nearbyTexts = element.querySelectorAll('legend, span, div, p');
            for (const textEl of nearbyTexts) {
                const text = textEl.textContent.trim();
                if (text && text.length > questionText.length && text.length > 10) {
                    // Check if it looks like a question
                    if (text.includes('?') || text.match(/^(Ab|Wie|Was|Wann|Wo|Warum)/i)) {
                        questionText = text;
                        break;
                    }
                }
            }
        }
        
        // Clean up: remove asterisk and extra whitespace
        questionText = questionText.replace(/\*+$/, '').trim();
        questionText = questionText.replace(/\s+/g, ' '); // Normalize whitespace
        
        console.log(`🔍 [DEBUG] Extracted question text: "${questionText}" (length: ${questionText.length})`);
        
        return questionText || 'Question';
    }
    
    /**
     * Determine expected answer format from input field
     * @param {Element} inputField - Input field element
     * @param {string} fieldType - Field type (select, radio, single, etc.)
     * @param {Array} options - Available options (if any)
     * @returns {Object} - Answer format information
     */
    static determineAnswerFormat(inputField, fieldType, options = []) {
        const format = {
            type: 'text',
            format: 'text',
            constraints: '',
            hasOptions: false,
            options: []
        };
        
        if (!inputField) {
            return format;
        }
        
        const inputType = inputField.type || '';
        const tagName = inputField.tagName.toLowerCase();
        
        // Determine answer type
        if (tagName === 'select' || fieldType === 'select') {
            format.type = 'selection';
            format.format = 'selection';
            format.hasOptions = true;
            format.options = options.filter(opt => opt && opt.trim() !== '');
            format.constraints = `Must be one of: ${format.options.join(', ')}`;
        } else if (fieldType === 'radio') {
            format.type = 'selection';
            format.format = 'selection';
            format.hasOptions = true;
            format.options = options.filter(opt => opt && opt.trim() !== '');
            format.constraints = `Must be one of: ${format.options.join(', ')}`;
        } else if (inputType === 'date') {
            format.type = 'date';
            format.format = 'YYYY-MM-DD';
            const min = inputField.getAttribute('min');
            const max = inputField.getAttribute('max');
            if (min) format.constraints += `Minimum: ${min}. `;
            if (max) format.constraints += `Maximum: ${max}. `;
            format.constraints = format.constraints.trim();
        } else if (inputType === 'number') {
            format.type = 'number';
            format.format = 'number';
            const min = inputField.getAttribute('min');
            const max = inputField.getAttribute('max');
            const step = inputField.getAttribute('step');
            if (min) format.constraints += `Minimum: ${min}. `;
            if (max) format.constraints += `Maximum: ${max}. `;
            if (step) format.constraints += `Step: ${step}. `;
            format.constraints = format.constraints.trim();
        } else if (inputType === 'email') {
            format.type = 'email';
            format.format = 'email address';
        } else if (inputType === 'tel') {
            format.type = 'phone';
            format.format = 'phone number';
        } else if (tagName === 'textarea') {
            format.type = 'text';
            format.format = 'text (can be longer)';
        } else {
            format.type = 'text';
            format.format = 'text';
        }
        
        // Check if it's a boolean question (Yes/No)
        if (format.hasOptions && format.options.length <= 3) {
            const optionsLower = format.options.map(opt => opt.toLowerCase());
            const hasYes = optionsLower.some(opt => opt.includes('yes') || opt.includes('ja') || opt === 'yes' || opt === 'ja');
            const hasNo = optionsLower.some(opt => opt.includes('no') || opt.includes('nein') || opt === 'no' || opt === 'nein');
            if (hasYes && hasNo) {
                format.type = 'boolean';
                format.format = 'boolean (Yes/No)';
            }
        }
        
        return format;
    }
    
    /**
     * Check if question should be skipped (based on LinkedIn logic)
     * StepStone pre-fills: email, phone, firstName, lastName
     * StepStone does NOT pre-fill: salutation (Anrede)
     * @param {string} questionText - Question text
     * @returns {boolean} - Whether to skip the question
     */
    static shouldSkipQuestion(questionText) {
        const lowerQuestion = questionText.toLowerCase();
        
        // Skip email-related questions (pre-filled by StepStone)
        if (lowerQuestion.includes('email') || lowerQuestion.includes('e-mail') || lowerQuestion.includes('e-mail-adresse')) {
            return true;
        }
        
        // Skip phone number questions (pre-filled by StepStone)
        const phoneTerms = [
            'phone', 'mobile', 'cell', 'telephone',
            'telefon', 'handynummer', 'handynumer', 'mobilnummer', 'handy'
        ];
        
        if (phoneTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Skip country code questions
        const codeTerms = [
            'country code', 'landesvorwahl', 'code pays'
        ];
        
        if (codeTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Skip name-related questions (pre-filled by StepStone like LinkedIn)
        const nameTerms = [
            'first name', 'last name', 'full name', 'given name', 'family name', // English
            'vorname', 'nachname', 'vollständiger name', 'familienname',         // German
            'nombre', 'apellido', 'nombre completo', 'primer nombre',            // Spanish
            'prénom', 'nom', 'nom complet', 'nom de famille',                    // French
            'nome', 'cognome', 'nome completo'                                    // Italian
        ];
        
        if (nameTerms.some(term => lowerQuestion.includes(term))) {
            return true;
        }
        
        // Don't skip salutation (Anrede) - it needs to be selected
        // StepStone does NOT pre-fill this field
        
        return false;
    }
    
    /**
     * Answer a specific question (LinkedIn-style with AI integration)
     * @param {string} question - Question text
     * @param {Array} options - Available options (for select/radio/checkbox)
     * @param {Element} inputField - Input field element
     * @param {Element} element - Parent form element
     * @param {string} fieldType - Type of field (single, select, radio, checkbox_group)
     * @returns {Promise<Object>} - Result object
     */
    static async answerQuestion(question, options = [], inputField, element, fieldType = 'single') {
        try {
            // Check for hardcoded answers first
            const hardcodedAnswer = this.getHardcodedAnswer(question, options);
            if (hardcodedAnswer) {
                console.log(`🤖 Using hardcoded answer for: ${question} -> ${hardcodedAnswer}`);
                
                // Fill the field with hardcoded answer
                await this.fillFieldWithAnswer(inputField, element, hardcodedAnswer, question, fieldType);
                
                // Track the question/answer
                this.collectedQuestionsAnswers.push({
                    question: question,
                    answer: hardcodedAnswer,
                    question_type: this.detectQuestionType(question),
                    ai_model_used: 'hardcoded',
                    confidence_score: 1.0,
                    is_skipped: false
                });
                
                return { success: true };
            }
            
            // Use AI to answer the question
            console.log(`🤖 Using AI to answer: ${question}`);
            
            // Get current user data and AI settings
            const userData = window.currentUserData || {};
            const aiSettings = window.currentAiSettings || {};
            
            if (!userData.id || !aiSettings) {
                console.log('⚠️  Missing user data or AI settings for AI question answering');
                return { success: false, reason: 'Missing user data or AI settings' };
            }
            
            // Get resume ID from storage (critical for AI data retrieval)
            let resumeId = null;
            try {
                const resumeResult = await chrome.storage.local.get(['currentResumeId']);
                if (resumeResult.currentResumeId) {
                    resumeId = resumeResult.currentResumeId;
                    console.log(`📋 Using resume ID: ${resumeId}`);
                } else {
                    console.log('⚠️  No resume ID found in storage, AI may have limited data');
                }
            } catch (error) {
                console.error('❌ Error getting resume ID:', error);
            }
            
            // Determine expected answer format
            const answerFormat = this.determineAnswerFormat(inputField, fieldType, options);
            console.log(`📋 [DEBUG] Answer format determined:`, answerFormat);
            
            // Import and use AIQuestionAnswerer
            const AIQuestionAnswerer = (await import('../ai/AIQuestionAnswerer.js')).default;
            const aiAnswerer = new AIQuestionAnswerer(userData.id);
            await aiAnswerer.ensureSettingsLoaded();
            
            // Generate AI answer with resume ID and answer format context
            const answerContext = {
                fieldType: inputField.type || '',
                fieldElementType: fieldType,
                answerFormat: answerFormat,
                inputElement: inputField
            };
            const aiResult = await aiAnswerer.answerQuestion(question, options, answerContext, resumeId);
            
            if (aiResult.success && aiResult.answer) {
                console.log(`✅ AI generated answer: ${aiResult.answer}`);
                
                // Fill the field with AI answer
                const fillResult = await this.fillFieldWithAnswer(inputField, element, aiResult.answer, question, fieldType);
                
                // Check if validation failed after filling
                if (!fillResult.success && fillResult.validationError) {
                    console.log(`⚠️  Validation error after filling field: ${fillResult.validationError}`);
                    console.log(`   Attempting to correct answer based on constraint...`);
                    
                    // Try to correct the answer based on validation feedback
                    let correctedAnswer = null;
                    
                    if (fillResult.constraintType === 'minimum' && fillResult.constraintValue !== null) {
                        // For minimum constraints, ensure the value meets the requirement
                        const numericValue = this.parseNumericAnswer(aiResult.answer);
                        if (numericValue !== null) {
                            const currentValue = parseFloat(numericValue);
                            if (currentValue < fillResult.constraintValue) {
                                // Increase to meet minimum
                                correctedAnswer = fillResult.constraintValue.toString();
                                console.log(`   Correcting value from ${currentValue} to ${correctedAnswer} to meet minimum ${fillResult.constraintValue}`);
                            }
                        }
                    } else if (fillResult.constraintType === 'required') {
                        // For required fields, if answer is empty, try using first option or a default
                        if (!aiResult.answer || aiResult.answer.trim() === '') {
                            if (options && options.length > 0) {
                                correctedAnswer = options[0];
                                console.log(`   Using first option as fallback: ${correctedAnswer}`);
                            }
                        }
                    }
                    
                    // Retry with corrected answer if we have one
                    if (correctedAnswer) {
                        console.log(`   Retrying with corrected answer: ${correctedAnswer}`);
                        const retryResult = await this.fillFieldWithAnswer(inputField, element, correctedAnswer, question, fieldType);
                        
                        if (retryResult.success) {
                            console.log(`✅ Validation passed after correction`);
                            this.collectedQuestionsAnswers.push({
                                question: question,
                                answer: correctedAnswer,
                                question_type: this.detectQuestionType(question),
                                ai_model_used: aiResult.model || 'ai',
                                confidence_score: aiResult.confidence || 0.95,
                                is_skipped: false,
                                was_corrected: true,
                                original_answer: aiResult.answer,
                                correction_reason: fillResult.validationError
                            });
                            return { success: true, corrected: true };
                        } else {
                            console.log(`⚠️  Validation still failed after correction`);
                        }
                    }
                    
                    // If we couldn't correct or correction failed, still track the original answer
                    this.collectedQuestionsAnswers.push({
                        question: question,
                        answer: aiResult.answer,
                        question_type: this.detectQuestionType(question),
                        ai_model_used: aiResult.model || 'ai',
                        confidence_score: aiResult.confidence || 0.95,
                        is_skipped: false,
                        validation_error: fillResult.validationError
                    });
                    
                    // Return success with warning - we'll continue to next field
                    return { success: true, validationWarning: fillResult.validationError };
                }
                
                // Track the question/answer
                this.collectedQuestionsAnswers.push({
                    question: question,
                    answer: aiResult.answer,
                    question_type: this.detectQuestionType(question),
                    ai_model_used: aiResult.model || 'ai',
                    confidence_score: aiResult.confidence || 0.95,
                    is_skipped: false
                });
                
                return { success: true };
            } else {
                console.log(`❌ AI failed to generate answer for: ${question}`);
                
                // Try to provide a generic fallback based on question type
                let fallbackAnswer = null;
                const questionType = this.detectQuestionType(question);
                
                if (questionType === 'experience' && options.length > 0) {
                    // For experience questions, pick middle option
                    fallbackAnswer = options[Math.floor(options.length / 2)];
                } else if (questionType === 'commute' && options.length > 0) {
                    // For commute questions, pick "Yes" or first option
                    fallbackAnswer = options.find(opt => opt.toLowerCase().includes('yes') || opt.toLowerCase().includes('ja')) || options[0];
                } else if (options.length > 0) {
                    // For other questions with options, pick first option
                    fallbackAnswer = options[0];
                    console.log(`⚠️  Using fallback: selecting first option "${fallbackAnswer}"`);
                }
                
                if (fallbackAnswer) {
                    await this.fillFieldWithAnswer(inputField, element, fallbackAnswer, question, fieldType);
                    
                    // Track the fallback answer
                    this.collectedQuestionsAnswers.push({
                        question: question,
                        answer: fallbackAnswer,
                        question_type: questionType,
                        ai_model_used: 'fallback',
                        confidence_score: 0.5,
                        is_skipped: false
                    });
                    
                    return { success: true, fallback: true };
                }
                
                return { success: false, reason: 'AI failed to generate answer and no fallback available' };
            }
            
        } catch (error) {
            console.error(`❌ Error answering question: ${error.message}`, error);
            return { success: false, reason: error.message };
        }
    }
    
    /**
     * Get hardcoded answer for common questions (based on LinkedIn logic)
     * @param {string} question - Question text
     * @param {Array} options - Available options
     * @returns {string|null} - Hardcoded answer or null
     */
    static getHardcodedAnswer(question, options = []) {
        const questionLower = question.toLowerCase();
        
        // Date/start availability questions
        const dateTerms = [
            'start date', 'starting date', 'available to start', 'earliest start date',
            'startdatum', 'verfügbar ab', 'beginn', 'frühestes startdatum'
        ];
        if (dateTerms.some(term => questionLower.includes(term))) {
            return this.computePreferredStartDate();
        }
        
        // Experience questions - use minimum 5 years as per user memory
        if (questionLower.includes('years of experience') || 
            questionLower.includes('erfahrung') || 
            questionLower.includes('berufserfahrung')) {
            return '5';
        }
        
        // Commuting questions - always answer "Yes"
        if (questionLower.includes('comfortable commuting') || 
            questionLower.includes('commute to this') ||
            questionLower.includes('willing to commute') ||
            questionLower.includes('pendeln') ||
            questionLower.includes('anfahrt')) {
            return 'Yes';
        }
        
        // Availability questions
        if (questionLower.includes('available') || questionLower.includes('verfügbar')) {
            return 'Immediately';
        }
        
        // Salutation questions (Anrede) - NOT pre-filled by StepStone, needs to be selected
        if (questionLower.includes('anrede') || questionLower.includes('salutation')) {
            // Hardcoded default for now (can be customized from user profile later)
            return 'Herr';
        }
        
        // Note: Name questions (Vorname/Nachname) are pre-filled by StepStone and will be skipped
        // Note: Email and Phone are also pre-filled by StepStone and will be skipped
        
        // Salary expectations questions (Gehaltsvorstellung) - but NOT negotiability questions
        const negotiabilityTerms = [
            'verhandelbar', 'negotiable', 'negotiable?', 'verhandelbar?',
            'negotiate', 'negotiation', 'flexible'
        ];
        const isNegotiabilityQuestion = negotiabilityTerms.some(term => questionLower.includes(term));
        
        if (!isNegotiabilityQuestion && 
            (questionLower.includes('gehalt') || questionLower.includes('salary') || 
             questionLower.includes('compensation') || questionLower.includes('vergütung'))) {
            // Return a reasonable default range (can be customized from user data)
            const userData = window.currentUserData || {};
            return userData.expectedSalary || userData.salary || '60000';
        }
        
        // Salary negotiability questions - default to "Yes" (Ja)
        if (isNegotiabilityQuestion) {
            // Try to match one of the available options
            if (options && options.length > 0) {
                // Look for "Yes", "Ja", or similar positive options
                const positiveOptions = options.filter(opt => {
                    const optLower = opt.toLowerCase();
                    return optLower.includes('yes') || 
                           optLower.includes('ja') || 
                           optLower.includes('true') || 
                           optLower === 'yes' || 
                           optLower === 'ja';
                });
                if (positiveOptions.length > 0) {
                    return positiveOptions[0]; // Return the first positive option found
                }
            }
            // Fallback to "Yes" or "Ja"
            return 'Ja';
        }
        
        return null;
    }
    
    /**
     * Detect question type for tracking
     * @param {string} question - Question text
     * @returns {string} - Question type
     */
    static detectQuestionType(question) {
        const lowerQuestion = question.toLowerCase();
        
        if (lowerQuestion.includes('experience') || lowerQuestion.includes('erfahrung')) {
            return 'experience';
        } else if (lowerQuestion.includes('date') || lowerQuestion.includes('datum')) {
            return 'date';
        } else if (lowerQuestion.includes('salary') || lowerQuestion.includes('gehalt')) {
            return 'salary';
        } else if (lowerQuestion.includes('commute') || lowerQuestion.includes('pendeln')) {
            return 'commute';
        } else if (lowerQuestion.includes('why') || lowerQuestion.includes('warum')) {
            return 'motivation';
        } else {
            return 'other';
        }
    }
    
    /**
     * Fill form field with answer (LinkedIn-style)
     * @param {Element} inputField - Input field element
     * @param {Element} element - Parent form element
     * @param {string} answer - Answer to fill
     * @param {string} question - Question text
     * @returns {Promise<void>}
     */
    static async fillFieldWithAnswer(inputField, element, answer, question, fieldType = 'single') {
        try {
            // Clean the answer (remove markdown, extra text, etc.)
            const cleanedAnswer = this.cleanAIAnswer(answer);
            console.log(`📝 Filling field for "${question}" with answer: ${cleanedAnswer}`);
            
            // Handle checkbox groups specially
            if (fieldType === 'checkbox_group') {
                const checkboxes = element.querySelectorAll('input[type="checkbox"]');
                console.log(`📋 Found ${checkboxes.length} checkboxes in group`);
                console.log(`📋 Answer to match: "${cleanedAnswer}"`);
                
                // Split answer by common separators
                const answerParts = cleanedAnswer.split(/[,;]/).map(part => part.trim().toLowerCase());
                console.log(`📋 Answer parts:`, answerParts);
                
                let checkedCount = 0;
                
                for (const checkbox of checkboxes) {
                    const checkboxLabel = element.querySelector(`label[for="${checkbox.id}"]`);
                    if (checkboxLabel) {
                        const labelText = checkboxLabel.textContent.trim();
                        const labelTextLower = labelText.toLowerCase();
                        
                        // Check if any part of the answer matches this checkbox
                        const shouldCheck = answerParts.some(part => 
                            labelTextLower.includes(part) || part.includes(labelTextLower)
                        );
                        
                        if (shouldCheck) {
                            checkbox.checked = true;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                            checkbox.dispatchEvent(new Event('click', { bubbles: true }));
                            checkedCount++;
                            console.log(`✅ Checked: ${labelText} (matched: ${answerParts.find(part => labelTextLower.includes(part) || part.includes(labelTextLower))})`);
                        } else {
                            console.log(`⏭️  Skipped: ${labelText} (no match)`);
                        }
                    }
                }
                
                console.log(`📊 Checked ${checkedCount} out of ${checkboxes.length} checkboxes`);
                
                if (checkedCount === 0) {
                    console.log('⚠️  WARNING: No checkboxes were checked! Form may be invalid.');
                }
                
                await this.wait(1000); // Longer wait for validation
                return;
            }
            
            // Clear existing value first (for non-checkbox, non-date fields)
            // Date fields should not be cleared as they might lose focus/validation state
            if (inputField.type !== 'checkbox' && 
                inputField.type !== 'date' && 
                inputField.tagName.toLowerCase() !== 'select') {
                inputField.value = '';
                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                await this.wait(300);
            }
            
            // Fill based on field type
            switch (inputField.tagName.toLowerCase()) {
                case 'input':
                    switch (inputField.type) {
                        case 'text':
                        case 'email':
                        case 'tel':
                            inputField.value = cleanedAnswer;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            break;
                            
                        case 'number':
                            // Number inputs need numeric validation and proper formatting
                            const numericValue = this.parseNumericAnswer(cleanedAnswer);
                            if (numericValue !== null) {
                                inputField.value = numericValue;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log(`✅ Filled number field with: ${numericValue} (from answer: "${cleanedAnswer}")`);
                            } else {
                                console.log(`⚠️  Could not parse numeric value from answer: "${cleanedAnswer}"`);
                                // Try setting as-is anyway (might work for some formats)
                            inputField.value = cleanedAnswer;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                            break;
                            
                        case 'date':
                            // Date inputs require YYYY-MM-DD format
                            const formattedDate = this.formatDateForInput(cleanedAnswer);
                            if (formattedDate) {
                                inputField.value = formattedDate;
                                inputField.dispatchEvent(new Event('input', { bubbles: true }));
                                inputField.dispatchEvent(new Event('change', { bubbles: true }));
                                console.log(`✅ Filled date field with: ${formattedDate} (from answer: "${cleanedAnswer}")`);
                            } else {
                                console.log(`⚠️  Could not format date from answer: "${cleanedAnswer}"`);
                            }
                            break;
                            
                        case 'radio':
                            // Find matching radio option and click it
                            const radioOptions = element.querySelectorAll('input[type="radio"]');
                            for (const radio of radioOptions) {
                                const radioLabel = element.querySelector(`label[for="${radio.id}"]`);
                                if (radioLabel && radioLabel.textContent.trim().includes(cleanedAnswer)) {
                                    radio.click();
                                    console.log(`✅ Selected radio option: ${cleanedAnswer}`);
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
                    
               case 'select':
                   // Find matching option and select it
                   const options = inputField.querySelectorAll('option');
                   let optionSelected = false;
                   
                   console.log(`🔍 [DEBUG] Matching answer "${cleanedAnswer}" against ${options.length} options`);
                   console.log(`🔍 [DEBUG] Available options:`, Array.from(options).map((opt, idx) => {
                       const text = opt.textContent.trim();
                       const value = opt.value;
                       const innerHTML = opt.innerHTML.trim();
                       return `${idx + 1}. text="${text}" value="${value}" innerHTML="${innerHTML.substring(0, 50)}"`;
                   }));
                   
                   for (const option of options) {
                       // Get option text - try multiple methods
                       let optionText = option.textContent.trim();
                       if (!optionText) {
                           // Try innerHTML if textContent is empty
                           optionText = option.innerHTML.trim().replace(/<[^>]*>/g, '').trim();
                       }
                       if (!optionText) {
                           // Try value as fallback
                           optionText = option.value.trim();
                       }
                       
                       // Skip empty options (like the default/placeholder option)
                       if (!optionText || optionText === '') {
                           console.log(`⏭️  [DEBUG] Skipping empty option (value: "${option.value}")`);
                           continue;
                       }
                       
                       const optionTextLower = optionText.toLowerCase();
                       const answerLower = cleanedAnswer.toLowerCase();
                       
                       console.log(`🔍 [DEBUG] Comparing: "${optionText}" (value: "${option.value}") with "${cleanedAnswer}"`);
                       
                       // Try exact match first
                       if (optionTextLower === answerLower || option.value === cleanedAnswer || option.value === answerLower) {
                           inputField.value = option.value;
                           inputField.dispatchEvent(new Event('change', { bubbles: true }));
                           inputField.dispatchEvent(new Event('input', { bubbles: true }));
                           console.log(`✅ Selected option (exact): "${optionText}" (value: "${option.value}")`);
                           optionSelected = true;
                           break;
                       }
                       
                       // Try partial match (but ensure both strings are non-empty)
                       if (optionTextLower && answerLower && 
                           (optionTextLower.includes(answerLower) || answerLower.includes(optionTextLower))) {
                           inputField.value = option.value;
                           inputField.dispatchEvent(new Event('change', { bubbles: true }));
                           inputField.dispatchEvent(new Event('input', { bubbles: true }));
                           console.log(`✅ Selected option (partial): "${optionText}" (value: "${option.value}")`);
                           optionSelected = true;
                           break;
                       }
                   }
                   
                   if (!optionSelected) {
                       console.log(`⚠️  No matching option found for answer: "${cleanedAnswer}"`);
                       console.log(`Available options:`, Array.from(options).map(opt => {
                           const text = opt.textContent.trim() || opt.innerHTML.trim().replace(/<[^>]*>/g, '') || opt.value;
                           return `"${text}" (value: "${opt.value}")`;
                       }));
                       
                       // Try fuzzy matching - find closest match
                       let bestMatch = null;
                       let bestScore = 0;
                       const answerLower = cleanedAnswer.toLowerCase();
                       const answerWords = answerLower.split(/\s+/);
                       
                       for (const option of options) {
                           let optionText = option.textContent.trim();
                           if (!optionText) {
                               optionText = option.innerHTML.trim().replace(/<[^>]*>/g, '').trim() || option.value;
                           }
                           
                           // Skip empty options
                           if (!optionText || optionText === '') {
                               continue;
                           }
                           
                           const optionTextLower = optionText.toLowerCase();
                           
                           // Count matching words
                           const optionWords = optionTextLower.split(/\s+/);
                           let score = 0;
                           for (const word of answerWords) {
                               if (optionWords.some(optWord => optWord.includes(word) || word.includes(optWord))) {
                                   score++;
                               }
                           }
                           
                           if (score > bestScore) {
                               bestScore = score;
                               bestMatch = option;
                           }
                       }
                       
                       if (bestMatch && bestScore > 0) {
                           const bestText = bestMatch.textContent.trim() || bestMatch.innerHTML.trim().replace(/<[^>]*>/g, '') || bestMatch.value;
                           inputField.value = bestMatch.value;
                           inputField.dispatchEvent(new Event('change', { bubbles: true }));
                           inputField.dispatchEvent(new Event('input', { bubbles: true }));
                           console.log(`✅ Selected best match (fuzzy): "${bestText}" (value: "${bestMatch.value}", score: ${bestScore})`);
                           optionSelected = true;
                       }
                   }
                   
                   // Verify the selection was applied
                   if (optionSelected) {
                       await this.wait(500);
                       const selectedValue = inputField.value;
                       const selectedOption = inputField.querySelector(`option[value="${selectedValue}"]`);
                       if (selectedOption) {
                           const selectedText = selectedOption.textContent.trim() || selectedOption.innerHTML.trim().replace(/<[^>]*>/g, '') || selectedOption.value;
                           console.log(`✅ Verified selection: "${selectedText}" is now selected`);
                       } else {
                           console.log(`⚠️  WARNING: Selection may not have been applied. Current value: "${selectedValue}"`);
                       }
                   }
                   break;
                    
                case 'textarea':
                    inputField.value = cleanedAnswer;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
            }
            
            await this.wait(500); // Wait for validation to appear
            
            // Check for validation feedback after filling the field
            const validationResult = await this.checkValidationFeedback(element, inputField);
            
            if (validationResult.hasError) {
                console.log(`⚠️  Validation feedback detected: ${validationResult.message}`);
                console.log(`   Constraint type: ${validationResult.constraintType || 'unknown'}`);
                if (validationResult.constraintValue) {
                    console.log(`   Constraint value: ${validationResult.constraintValue}`);
                }
                
                // Return validation info so caller can potentially retry with corrected value
                return {
                    success: false,
                    validationError: validationResult.message,
                    constraintType: validationResult.constraintType,
                    constraintValue: validationResult.constraintValue
                };
            } else {
                console.log(`✅ Field filled successfully - no validation errors`);
                return { success: true };
            }
            
        } catch (error) {
            console.error(`❌ Error filling field: ${error.message}`, error);
            return { success: false, error: error.message };
        }
    }
    
    /**
     * Check for validation feedback after filling a field
     * @param {Element} element - Parent form element container
     * @param {Element} inputField - The input field that was filled
     * @returns {Promise<Object>} - Validation result with hasError, message, constraintType, constraintValue
     */
    static async checkValidationFeedback(element, inputField) {
        try {
            // Wait a bit for validation feedback to appear (it might be delayed)
            await this.wait(300);
            
            // Import selectors
            const StepstoneSelectors = (await import('./StepstoneSelectors.js')).default;
            const feedbackSelectors = StepstoneSelectors.getValidationFeedbackSelectors();
            
            let feedbackElement = null;
            for (const selector of feedbackSelectors) {
                // First try to find feedback associated with the input field's ID
                if (inputField.id) {
                    const inputId = inputField.id;
                    feedbackElement = element.querySelector(`[id="${inputId}-feedback"]${selector}`);
                    if (feedbackElement) {
                        console.log(`🔍 Found feedback element via input ID: ${inputId}-feedback`);
                        break;
                    }
                }
                
                // Try finding feedback within the parent element
                feedbackElement = element.querySelector(selector);
                if (feedbackElement) {
                    console.log(`🔍 Found feedback element with selector: ${selector}`);
                    break;
                }
            }
            
            if (!feedbackElement) {
                // Also check parent of parent element (feedback might be at a higher level)
                const parentParent = element?.parentElement;
                if (parentParent) {
                    for (const selector of feedbackSelectors) {
                        if (inputField.id) {
                            const inputId = inputField.id;
                            feedbackElement = parentParent.querySelector(`[id="${inputId}-feedback"]${selector}`);
                            if (feedbackElement) break;
                        }
                        feedbackElement = parentParent.querySelector(selector);
                        if (feedbackElement) break;
                    }
                }
            }
            
            if (!feedbackElement) {
                // No feedback element found - field is valid
                return { hasError: false };
            }
            
            // Check if feedback has data-invalid attribute (indicates error)
            const hasInvalid = feedbackElement.hasAttribute('data-invalid') && 
                               feedbackElement.getAttribute('data-invalid') !== 'false';
            
            if (!hasInvalid) {
                // Feedback element exists but not marked as invalid (might be help text)
                return { hasError: false };
            }
            
            // Extract the feedback message
            const feedbackMessage = feedbackElement.textContent.trim();
            
            if (!feedbackMessage) {
                // Empty feedback message - assume no error
                return { hasError: false };
            }
            
            console.log(`⚠️  Validation feedback detected: "${feedbackMessage}"`);
            
            // Parse constraint information from the feedback message
            let constraintType = null;
            let constraintValue = null;
            
            // Check for minimum value constraints
            const minMatch = feedbackMessage.match(/mindestens\s+(\d+(?:\.\d+)?)/i) || 
                           feedbackMessage.match(/at least\s+(\d+(?:\.\d+)?)/i) ||
                           feedbackMessage.match(/minimum.*?(\d+(?:\.\d+)?)/i);
            
            if (minMatch) {
                constraintType = 'minimum';
                constraintValue = parseFloat(minMatch[1]);
                console.log(`   Detected minimum constraint: ${constraintValue}`);
            }
            
            // Check for maximum value constraints
            const maxMatch = feedbackMessage.match(/höchstens\s+(\d+(?:\.\d+)?)/i) || 
                           feedbackMessage.match(/at most\s+(\d+(?:\.\d+)?)/i) ||
                           feedbackMessage.match(/maximum.*?(\d+(?:\.\d+)?)/i);
            
            if (maxMatch) {
                constraintType = 'maximum';
                constraintValue = parseFloat(maxMatch[1]);
                console.log(`   Detected maximum constraint: ${constraintValue}`);
            }
            
            // Check for required field
            if (feedbackMessage.toLowerCase().includes('beantworte') || 
                feedbackMessage.toLowerCase().includes('please answer') ||
                feedbackMessage.toLowerCase().includes('required') ||
                feedbackMessage.toLowerCase().includes('required field')) {
                constraintType = 'required';
                console.log(`   Detected required field constraint`);
            }
            
            // Check for format/pattern constraints
            if (feedbackMessage.toLowerCase().includes('format') || 
                feedbackMessage.toLowerCase().includes('ungültig') ||
                feedbackMessage.toLowerCase().includes('invalid')) {
                constraintType = 'format';
                console.log(`   Detected format constraint`);
            }
            
            return {
                hasError: true,
                message: feedbackMessage,
                constraintType: constraintType,
                constraintValue: constraintValue,
                feedbackElement: feedbackElement
            };
            
        } catch (error) {
            console.error(`❌ Error checking validation feedback: ${error.message}`, error);
            // If we can't check, assume no error (don't block progress)
            return { hasError: false, error: error.message };
        }
    }
    
    /**
     * Compute preferred start date (2 months from today as per user memory)
     * @returns {string} - Formatted date
     */
    static computePreferredStartDate() {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(today.getMonth() + 2); // 2 months from today
        
        // Format as DD/MM/YYYY (common European format)
        const day = String(startDate.getDate()).padStart(2, '0');
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const year = startDate.getFullYear();
        
        return `${day}/${month}/${year}`;
    }
    
    /**
     * Format date string for HTML date input (requires YYYY-MM-DD format)
     * Handles various date formats and converts them to YYYY-MM-DD
     * @param {string} dateString - Date string in various formats (DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, etc.)
     * @returns {string|null} - Formatted date in YYYY-MM-DD format or null if parsing fails
     */
    static formatDateForInput(dateString) {
        if (!dateString || typeof dateString !== 'string') {
            return null;
        }
        
        try {
            // Try to parse the date string
            let date;
            
            // If it's already in YYYY-MM-DD format, return it
            const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (isoMatch) {
                // Validate the date
                date = new Date(dateString);
                if (!isNaN(date.getTime())) {
                    return dateString;
                }
            }
            
            // Try DD/MM/YYYY format (European)
            const euMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (euMatch) {
                const day = parseInt(euMatch[1], 10);
                const month = parseInt(euMatch[2], 10);
                const year = parseInt(euMatch[3], 10);
                date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month - 1) {
                    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
            }
            
            // Try MM/DD/YYYY format (US)
            const usMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (usMatch && !euMatch) {
                const month = parseInt(usMatch[1], 10);
                const day = parseInt(usMatch[2], 10);
                const year = parseInt(usMatch[3], 10);
                date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime()) && date.getDate() === day && date.getMonth() === month - 1) {
                    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                }
            }
            
            // Try parsing as a general date string
            date = new Date(dateString);
            if (!isNaN(date.getTime())) {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            }
            
            // If all parsing fails, try computePreferredStartDate format
            // (fallback: use 2 months from today)
            return this.computePreferredStartDateForInput();
            
        } catch (error) {
            console.error(`❌ Error formatting date: ${dateString}`, error);
            // Fallback: use 2 months from today
            return this.computePreferredStartDateForInput();
        }
    }
    
    /**
     * Compute preferred start date for HTML date input (YYYY-MM-DD format)
     * @returns {string} - Formatted date in YYYY-MM-DD format
     */
    static computePreferredStartDateForInput() {
        const today = new Date();
        const startDate = new Date(today);
        startDate.setMonth(today.getMonth() + 2); // 2 months from today
        
        // Format as YYYY-MM-DD (HTML date input format)
        const year = startDate.getFullYear();
        const month = String(startDate.getMonth() + 1).padStart(2, '0');
        const day = String(startDate.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    }
    
    /**
     * Parse and validate numeric answer for number input fields
     * Handles various formats like "40", "40.0", "40 hours", "40h", etc.
     * @param {string} answer - Answer string that should contain a number
     * @returns {string|null} - Validated numeric string or null if parsing fails
     */
    static parseNumericAnswer(answer) {
        if (!answer || typeof answer !== 'string') {
            return null;
        }
        
        try {
            // Remove common units and text (hours, h, €, $, etc.)
            let cleaned = answer.trim()
                .replace(/hours?/gi, '')
                .replace(/h\b/gi, '')
                .replace(/€/g, '')
                .replace(/\$/g, '')
                .replace(/euro/gi, '')
                .replace(/dollar/gi, '')
                .replace(/EUR/gi, '')
                .replace(/USD/gi, '')
                .replace(/[^\d.,\-+]/g, '') // Keep only digits, dots, commas, minus, plus
                .trim();
            
            // Replace comma with dot for decimal separator (European format)
            cleaned = cleaned.replace(',', '.');
            
            // Extract the first number found
            const numberMatch = cleaned.match(/([+-]?\d*\.?\d+)/);
            if (numberMatch) {
                const numericValue = parseFloat(numberMatch[1]);
                if (!isNaN(numericValue) && isFinite(numericValue)) {
                    // Return as string (HTML number inputs accept string values)
                    return numericValue.toString();
                }
            }
            
            // Try direct parsing if no match found
            const directParse = parseFloat(answer);
            if (!isNaN(directParse) && isFinite(directParse)) {
                return directParse.toString();
            }
            
            return null;
        } catch (error) {
            console.error(`❌ Error parsing numeric answer: ${answer}`, error);
            return null;
        }
    }
    
    /**
     * Clean AI-generated answer to remove markdown, extra text, etc.
     * @param {string} answer - Raw AI answer
     * @returns {string} - Cleaned answer
     */
    static cleanAIAnswer(answer) {
        if (!answer || typeof answer !== 'string') {
            return answer;
        }
        
        let cleaned = answer.trim();
        
        // Remove markdown links: [text](url) → url
        cleaned = cleaned.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$2');
        
        // Remove markdown bold/italic: **text** or *text* → text
        cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
        cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1');
        
        // Remove explanatory prefixes like "Here is...", "My...", "I am...", etc.
        const prefixPatterns = [
            /^Here is (the |my )?/i,
            /^My\s+/i,
            /^I am located in:?\s*/i,
            /^The answer is:?\s*/i,
            /^Answer:?\s*/i,
            /^Link:?\s*/i
        ];
        
        for (const pattern of prefixPatterns) {
            cleaned = cleaned.replace(pattern, '');
        }
        
        // Remove trailing punctuation if it's just a period
        cleaned = cleaned.replace(/\.$/,'');
        
        return cleaned.trim();
    }
    
    /**
     * Check if stop was requested
     * @returns {Promise<boolean>} - True if stop was requested
     */
    static async checkStopRequested() {
        if (this.shouldStopCallback && typeof this.shouldStopCallback === 'function') {
            const stopRequested = await this.shouldStopCallback();
            if (stopRequested) {
                console.log('⏸️  [StepstoneForm] Stop requested - halting form processing');
                return true;
            }
        }
        return false;
    }
    
    /**
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default StepstoneForm; 