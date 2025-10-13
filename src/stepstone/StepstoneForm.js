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
    
    /**
     * Complete application flow handler - Main entry point
     * Handles the entire multi-step StepStone application process
     * @param {Object} jobInfo - Job information
     * @param {Object} userData - User data
     * @returns {Promise<Object>} - Result object with status and message
     */
    static async handleCompleteApplicationFlow(jobInfo, userData) {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🚀 [StepstoneForm] Starting complete application flow');
            console.log('   Job:', jobInfo.title);
            console.log('   Company:', jobInfo.company);
            console.log('   URL:', window.location.href);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            // Store job info and user data
            this.jobInfo = jobInfo;
            this.userData = userData;
            
            // Check if we're on the initial job page or already in the application
            if (window.location.href.includes('/application/')) {
                console.log('📍 Already in application flow, processing form...');
                return await this.processApplicationForm();
            } else {
                console.log('📍 On job page, looking for initial apply button...');
                return await this.startApplicationProcess();
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
    static async autoStartApplicationProcess() {
        try {
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
                await this.wait(3000);
                
                // Wait for navigation to application form
                const navigated = await this.waitForNavigation();
                if (navigated) {
                    console.log('✅ Navigated to application form');
                    return await this.processApplicationForm();
                } else {
                    return { result: 'error', reason: 'Failed to navigate to application form' };
                }
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
                console.log(`🔄 Processing step ${currentStep}/${maxSteps}`);
                
                // Wait for page to load
                await this.waitForPageLoad();
                
                // Process form questions on current step (LinkedIn-style)
                const questionResult = await this.processFormQuestions();
                if (questionResult.success) {
                    console.log(`✅ Step ${currentStep} questions processed successfully`);
                } else {
                    console.log(`⚠️  Step ${currentStep} questions processing had issues`);
                }
                
                // Check for validation errors
                const hasErrors = await this.hasValidationErrors();
                if (hasErrors) {
                    return { result: 'error', reason: `Validation errors in step ${currentStep}` };
                }
                
                // Look for next/continue button
                const nextButton = await this.findNextButton();
                if (nextButton) {
                    console.log(`➡️  Clicking next button for step ${currentStep}`);
                    nextButton.click();
                    await this.wait(3000);
                    currentStep++;
                } else {
                    // Check if we're on the final submission step
                    const submitButton = await this.findSubmitButton();
                    if (submitButton) {
                        console.log('🎯 Final submission step reached');
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
     * Find the "Bewerbung fortsetzen" (Continue application) button
     * @returns {Promise<Element|null>} - Button element or null
     */
    static async findContinueApplicationButton() {
        try {
            console.log('🔍 [StepstoneForm] Searching for "Bewerbung fortsetzen" button...');
            
            const selectors = [
                'button[data-testid="sectionSubmit"]',
                'button[aria-label*="Bewerbung fortsetzen"]',
                'button[class*="continue"]',
                'button[class*="bewerbung"]'
            ];
            
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
            
            const selectors = [
                'button[type="submit"]',
                'button[class*="next"]',
                'button[class*="continue"]',
                'button[data-testid*="next"]'
            ];
            
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
            
            const selectors = [
                'button[type="submit"]',
                'button[data-testid*="submit"]',
                'button[class*="submit"]'
            ];
            
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
    static async submitApplication() {
        try {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log('🎯 [StepstoneForm] Submitting application...');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            const submitButton = await this.findSubmitButton();
            if (!submitButton) {
                return { result: 'error', reason: 'No submit button found' };
            }
            
            console.log('⚠️  SUBMISSION DISABLED FOR SAFETY');
            console.log('   Submit button found and ready');
            console.log('   Would click submit button here');
            
            // TODO: Enable when ready for production
            // submitButton.click();
            // await this.wait(3000);
            
            return { 
                result: 'success', 
                message: `Application ready for submission for ${this.jobInfo?.title}`,
                jobInfo: this.jobInfo
            };
            
        } catch (error) {
            console.error('❌ [StepstoneForm] Error submitting application:', error);
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
     * Wait for navigation to application form
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
            console.log('🔍 [StepstoneForm] Processing form questions');
            
            // Find all form elements using StepStone's selector with role="group"
            const formElements = document.querySelectorAll('div[class*="apply-application-process-renderer"][role="group"]');
            console.log(`📋 Found ${formElements.length} form elements`);
            
            for (const element of formElements) {
                try {
                    // Find the label element containing the question
                    const labelElement = element.querySelector('label');
                    if (!labelElement) {
                        console.log('⚠️  No label found for form element');
                        continue;
                    }
                    
                    // Extract question text
                    let questionText = labelElement.textContent.trim();
                    // Remove the asterisk (*) and other formatting
                    questionText = questionText.replace(/\*$/, '').trim();
                    console.log(`❓ Processing question: ${questionText}`);
                    
                    // Check if this question should be skipped
                    if (this.shouldSkipQuestion(questionText)) {
                        console.log(`⏭️  Skipping question: ${questionText}`);
                        continue;
                    }
                    
                    // Find the input field(s)
                    const inputField = element.querySelector('input, textarea, select');
                    if (!inputField) {
                        console.log('⚠️  No input field found for question');
                        continue;
                    }
                    
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
                    }
                    
                    // Answer the question
                    const questionResult = await this.answerQuestion(questionText, options, inputField, element, fieldType);
                    
                    if (!questionResult.success) {
                        console.log(`❌ Failed to answer question: ${questionText}`);
                        // Continue to next question on failure
                    }
                    
                } catch (error) {
                    console.error(`❌ Error processing form element: ${error.message}`, error);
                }
            }
            
            console.log('✅ Completed processing form questions');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Error in processFormQuestions:', error);
            return { success: false };
        }
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
            
            // Import and use AIQuestionAnswerer
            const AIQuestionAnswerer = (await import('../ai/AIQuestionAnswerer.js')).default;
            const aiAnswerer = new AIQuestionAnswerer(userData.id);
            await aiAnswerer.ensureSettingsLoaded();
            
            // Generate AI answer with resume ID
            const aiResult = await aiAnswerer.answerQuestion(question, options, null, resumeId);
            
            if (aiResult.success && aiResult.answer) {
                console.log(`✅ AI generated answer: ${aiResult.answer}`);
                
                // Fill the field with AI answer
                await this.fillFieldWithAnswer(inputField, element, aiResult.answer, question, fieldType);
                
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
        
        // Salary expectations questions (Gehaltsvorstellung)
        if (questionLower.includes('gehalt') || questionLower.includes('salary') || 
            questionLower.includes('compensation') || questionLower.includes('vergütung')) {
            // Return a reasonable default range (can be customized from user data)
            const userData = window.currentUserData || {};
            return userData.expectedSalary || userData.salary || '60000';
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
                
                // Split answer by common separators
                const answerParts = cleanedAnswer.split(/[,;]/).map(part => part.trim().toLowerCase());
                
                for (const checkbox of checkboxes) {
                    const checkboxLabel = element.querySelector(`label[for="${checkbox.id}"]`);
                    if (checkboxLabel) {
                        const labelText = checkboxLabel.textContent.trim().toLowerCase();
                        // Check if any part of the answer matches this checkbox
                        const shouldCheck = answerParts.some(part => 
                            labelText.includes(part) || part.includes(labelText)
                        );
                        
                        if (shouldCheck) {
                            checkbox.checked = true;
                            checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                            console.log(`✅ Checked: ${checkboxLabel.textContent.trim()}`);
                        }
                    }
                }
                
                await this.wait(500);
                return;
            }
            
            // Clear existing value first (for non-checkbox fields)
            if (inputField.type !== 'checkbox' && inputField.tagName.toLowerCase() !== 'select') {
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
                        case 'number':
                            inputField.value = cleanedAnswer;
                            inputField.dispatchEvent(new Event('input', { bubbles: true }));
                            inputField.dispatchEvent(new Event('change', { bubbles: true }));
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
                   
                   for (const option of options) {
                       const optionText = option.textContent.trim().toLowerCase();
                       const answerLower = cleanedAnswer.toLowerCase();
                       
                       // Try exact match first
                       if (optionText === answerLower || option.value === cleanedAnswer) {
                           inputField.value = option.value;
                           inputField.dispatchEvent(new Event('change', { bubbles: true }));
                           console.log(`✅ Selected option (exact): ${option.textContent.trim()}`);
                           optionSelected = true;
                           break;
                       }
                       
                       // Try partial match
                       if (optionText.includes(answerLower) || answerLower.includes(optionText)) {
                           inputField.value = option.value;
                           inputField.dispatchEvent(new Event('change', { bubbles: true }));
                           console.log(`✅ Selected option (partial): ${option.textContent.trim()}`);
                           optionSelected = true;
                           break;
                       }
                   }
                   
                   if (!optionSelected) {
                       console.log(`⚠️  No matching option found for answer: ${cleanedAnswer}`);
                       console.log(`Available options:`, Array.from(options).map(opt => opt.textContent.trim()));
                   }
                   break;
                    
                case 'textarea':
                    inputField.value = cleanedAnswer;
                    inputField.dispatchEvent(new Event('input', { bubbles: true }));
                    inputField.dispatchEvent(new Event('change', { bubbles: true }));
                    break;
            }
            
            await this.wait(500); // Wait for validation
            
        } catch (error) {
            console.error(`❌ Error filling field: ${error.message}`, error);
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
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default StepstoneForm; 