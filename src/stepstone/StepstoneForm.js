/**
 * StepstoneForm - Handles StepStone application form interactions
 * Manages form filling, submission, and validation
 */
class StepstoneForm {
    
    /**
     * Check if application form is available on current page
     * @returns {Promise<boolean>} - Whether form is available
     */
    static async isApplicationFormAvailable() {
        try {
            const formSelectors = [
                'form[class*="application"]',
                'form[class*="bewerbung"]',
                '[data-testid="application-form"]',
                '.application-form',
                'form[action*="apply"]',
                'form[action*="bewerbung"]',
                '.quick-apply',
                '[class*="quick-apply"]'
            ];
            
            for (const selector of formSelectors) {
                const form = document.querySelector(selector);
                if (form) {
                    console.log(`[StepstoneForm] Application form found with selector: ${selector}`);
                    return true;
                }
            }
            
            // Look for apply buttons that might trigger forms
            const applyButtonSelectors = [
                'button[class*="apply"]',
                'button[class*="bewerbung"]',
                '[data-testid*="apply"]',
                'a[class*="apply"]',
                '.apply-button',
                '.bewerbung-button'
            ];
            
            for (const selector of applyButtonSelectors) {
                const button = document.querySelector(selector);
                if (button) {
                    console.log(`[StepstoneForm] Apply button found with selector: ${selector}`);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error checking form availability:', error);
            return false;
        }
    }
    
    /**
     * Fill application form with user data
     * @param {Object} jobData - Job information
     * @param {Object} userData - User profile and resume data
     * @returns {Promise<boolean>} - Success status
     */
    static async fillApplicationForm(jobData, userData) {
        try {
            console.log('[StepstoneForm] Starting form fill process');
            
            // First, try to find and click apply button to open form
            const formOpened = await this.openApplicationForm();
            if (!formOpened) {
                console.log('[StepstoneForm] Could not open application form');
                return false;
            }
            
            // Wait for form to load
            await this.wait(2000);
            
            // Fill form fields
            const formFilled = await this.fillFormFields(userData);
            if (!formFilled) {
                console.log('[StepstoneForm] Could not fill form fields');
                return false;
            }
            
            // Handle file upload if resume is available
            if (userData.resume) {
                await this.handleResumeUpload(userData.resume);
            }
            
            // Fill additional fields like cover letter
            if (userData.coverLetter) {
                await this.fillCoverLetter(userData.coverLetter);
            }
            
            console.log('[StepstoneForm] Form filling completed successfully');
            return true;
            
        } catch (error) {
            console.error('[StepstoneForm] Error filling application form:', error);
            return false;
        }
    }
    
    /**
     * Open application form by clicking apply button
     * @returns {Promise<boolean>} - Success status
     */
    static async openApplicationForm() {
        try {
            const applyButtonSelectors = [
                'button[class*="apply"]:not([disabled])',
                'button[class*="bewerbung"]:not([disabled])',
                '[data-testid*="apply"]:not([disabled])',
                'a[class*="apply"]',
                '.apply-button:not([disabled])',
                '.bewerbung-button:not([disabled])',
                '[role="button"][class*="apply"]'
            ];
            
            for (const selector of applyButtonSelectors) {
                const button = document.querySelector(selector);
                if (button && button.offsetParent !== null) { // Check if visible
                    console.log(`[StepstoneForm] Clicking apply button: ${selector}`);
                    button.click();
                    await this.wait(3000); // Wait for form to appear
                    return true;
                }
            }
            
            console.log('[StepstoneForm] No clickable apply button found');
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error opening application form:', error);
            return false;
        }
    }
    
    /**
     * Fill basic form fields with user data
     * @param {Object} userData - User profile data
     * @returns {Promise<boolean>} - Success status
     */
    static async fillFormFields(userData) {
        try {
            let fieldsFound = 0;
            
            // Common form field mappings
            const fieldMappings = {
                // Personal information
                firstName: ['input[name*="firstname"]', 'input[name*="vorname"]', 'input[placeholder*="Vorname"]'],
                lastName: ['input[name*="lastname"]', 'input[name*="nachname"]', 'input[placeholder*="Nachname"]'],
                email: ['input[type="email"]', 'input[name*="email"]', 'input[placeholder*="E-Mail"]'],
                phone: ['input[type="tel"]', 'input[name*="phone"]', 'input[name*="telefon"]', 'input[placeholder*="Telefon"]'],
                
                // Address information
                address: ['input[name*="address"]', 'input[name*="adresse"]', 'input[placeholder*="Adresse"]'],
                city: ['input[name*="city"]', 'input[name*="stadt"]', 'input[placeholder*="Stadt"]'],
                zipCode: ['input[name*="zip"]', 'input[name*="plz"]', 'input[placeholder*="PLZ"]'],
                country: ['select[name*="country"]', 'select[name*="land"]', 'input[name*="country"]'],
                
                // Professional information
                currentPosition: ['input[name*="position"]', 'input[name*="stelle"]', 'input[placeholder*="Position"]'],
                experience: ['input[name*="experience"]', 'input[name*="erfahrung"]', 'select[name*="experience"]'],
                salary: ['input[name*="salary"]', 'input[name*="gehalt"]', 'input[placeholder*="Gehalt"]'],
                availability: ['input[name*="availability"]', 'input[name*="verfügbar"]', 'select[name*="start"]']
            };
            
            // Fill fields based on available user data
            for (const [field, selectors] of Object.entries(fieldMappings)) {
                if (userData[field]) {
                    for (const selector of selectors) {
                        const element = document.querySelector(selector);
                        if (element && element.offsetParent !== null) {
                            await this.fillField(element, userData[field]);
                            fieldsFound++;
                            console.log(`[StepstoneForm] Filled ${field}: ${userData[field]}`);
                            break;
                        }
                    }
                }
            }
            
            console.log(`[StepstoneForm] Filled ${fieldsFound} form fields`);
            return fieldsFound > 0;
            
        } catch (error) {
            console.error('[StepstoneForm] Error filling form fields:', error);
            return false;
        }
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
            
            // Focus the element
            element.focus();
            await this.wait(200);
            
            if (element.tagName.toLowerCase() === 'select') {
                // Handle select dropdown
                const options = element.querySelectorAll('option');
                for (const option of options) {
                    if (option.textContent.toLowerCase().includes(value.toLowerCase())) {
                        element.value = option.value;
                        element.dispatchEvent(new Event('change', { bubbles: true }));
                        break;
                    }
                }
            } else {
                // Handle text input
                element.value = value;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new Event('change', { bubbles: true }));
            }
            
            await this.wait(200);
            
        } catch (error) {
            console.error('[StepstoneForm] Error filling field:', error);
        }
    }
    
    /**
     * Handle resume file upload
     * @param {Object} resumeData - Resume file data
     * @returns {Promise<boolean>} - Success status
     */
    static async handleResumeUpload(resumeData) {
        try {
            console.log('[StepstoneForm] Handling resume upload');
            
            const uploadSelectors = [
                'input[type="file"][accept*="pdf"]',
                'input[type="file"][name*="resume"]',
                'input[type="file"][name*="cv"]',
                'input[type="file"][name*="lebenslauf"]',
                '.file-upload input[type="file"]',
                '[data-testid*="upload"] input[type="file"]'
            ];
            
            for (const selector of uploadSelectors) {
                const uploadInput = document.querySelector(selector);
                if (uploadInput) {
                    console.log(`[StepstoneForm] Found file upload input: ${selector}`);
                    
                    // Create file object if we have resume data
                    if (resumeData.file) {
                        // Handle file upload logic here
                        // Note: File upload implementation depends on how resume data is stored
                        console.log('[StepstoneForm] Resume upload would be triggered here');
                        return true;
                    }
                    break;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error handling resume upload:', error);
            return false;
        }
    }
    
    /**
     * Fill cover letter field
     * @param {string} coverLetter - Cover letter text
     * @returns {Promise<boolean>} - Success status
     */
    static async fillCoverLetter(coverLetter) {
        try {
            console.log('[StepstoneForm] Filling cover letter');
            
            const coverLetterSelectors = [
                'textarea[name*="cover"]',
                'textarea[name*="anschreiben"]',
                'textarea[name*="motivation"]',
                'textarea[placeholder*="Anschreiben"]',
                'textarea[placeholder*="Motivation"]',
                '.cover-letter textarea',
                '[data-testid*="cover"] textarea'
            ];
            
            for (const selector of coverLetterSelectors) {
                const textArea = document.querySelector(selector);
                if (textArea && textArea.offsetParent !== null) {
                    await this.fillField(textArea, coverLetter);
                    console.log('[StepstoneForm] Cover letter filled successfully');
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error filling cover letter:', error);
            return false;
        }
    }
    
    /**
     * Submit application form
     * @returns {Promise<boolean>} - Success status
     */
    static async submitApplication() {
        try {
            console.log('[StepstoneForm] Attempting to submit application');
            
            const submitSelectors = [
                'button[type="submit"]',
                'button[class*="submit"]',
                'button[class*="send"]',
                'button[class*="senden"]',
                'input[type="submit"]',
                '.submit-button',
                '[data-testid*="submit"]'
            ];
            
            for (const selector of submitSelectors) {
                const submitButton = document.querySelector(selector);
                if (submitButton && !submitButton.disabled) {
                    console.log(`[StepstoneForm] Clicking submit button: ${selector}`);
                    submitButton.click();
                    await this.wait(3000);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error submitting application:', error);
            return false;
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
                '[aria-invalid="true"]'
            ];
            
            for (const selector of errorSelectors) {
                const errorElement = document.querySelector(selector);
                if (errorElement && errorElement.offsetParent !== null) {
                    console.log(`[StepstoneForm] Validation error found: ${errorElement.textContent}`);
                    return true;
                }
            }
            
            return false;
            
        } catch (error) {
            console.error('[StepstoneForm] Error checking validation errors:', error);
            return false;
        }
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