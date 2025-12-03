/**
 * StepStone Form Selectors
 * Centralized selector definitions for form element detection
 */

export default {
    // Main question container selectors (ordered by specificity/preference)
    questionContainer: [
        // Primary: BASE element with apply-application-process-renderer class AND role="group"
        'div[class*="apply-application-process-renderer"][data-genesis-element="BASE"][role="group"]',
        // Fallback: BASE element with apply-application-process-renderer class (without role check)
        'div[class*="apply-application-process-renderer"][data-genesis-element="BASE"]',
        // Fallback: Any div with role="group" inside renderer
        'div[class*="apply-application-process-renderer"] div[role="group"]',
        // Fallback: Direct role="group" elements with BASE
        'div[role="group"][data-genesis-element="BASE"]',
        // Generic fallbacks
        'div[role="group"]',
        'form',
        '[class*="form"]',
        '[class*="question"]',
        '[class*="field"]',
        '[class*="input-group"]'
    ],
    
    // Label selectors
    label: [
        'label[data-genesis-element="TEXT"]',
        'label[for]',
        'label'
    ],
    
    // Input field selectors
    input: [
        'input[data-genesis-element="FORM_INPUT"]',
        'select[data-genesis-element="FORM_SELECT"]',
        'textarea[data-genesis-element="FORM_TEXTAREA"]',
        'input',
        'textarea',
        'select'
    ],
    
    // Validation feedback selectors
    validationFeedback: [
        '[data-genesis-element="FORM_FEEDBACK_TEXT"]',
        '[id*="-feedback"][data-invalid]',
        '[data-invalid][aria-live]',
        '.apply-application-process-renderer-129douh[data-genesis-element="FORM_FEEDBACK_TEXT"]'
    ],
    
    // Button selectors
    buttons: {
        continueApplication: [
            'button[data-testid="sectionSubmit"]',
            'button[aria-label*="Bewerbung fortsetzen"]',
            'button[class*="continue"]',
            'button[class*="bewerbung"]'
        ],
        next: [
            'button[type="submit"]',
            'button[class*="next"]',
            'button[class*="continue"]',
            'button[data-testid*="next"]'
        ],
        submit: [
            'button[type="submit"]',
            'button[data-testid*="submit"]',
            'button[class*="submit"]'
        ]
    },
    
    // Navigation indicators
    navigation: {
        successPage: '/application/confirmation/success',
        applicationPage: '/application/'
    },
    
    // Form detection indicators (for waitForFormToAppear)
    formIndicators: [
        // StepStone-specific selectors
        'div[class*="apply-application-process-renderer"]',
        'div[class*="apply-application-process-renderer"][role="group"]',
        // Generic form indicators
        'form',
        'input[type="text"]',
        'input[type="email"]',
        'select',
        'textarea',
        // Labels with input fields
        'label:has(+ input), label:has(+ select), label:has(+ textarea)'
    ],
    
    // Job page apply button selectors
    jobPage: {
        applyButton: [
            'button[data-testid="harmonised-apply-button"]',
            'button[class*="apply"]:not([disabled])',
            'button[class*="bewerbung"]:not([disabled])',
            'a[class*="apply"]',
            'a[href*="apply"]',
            '[data-testid*="apply"]:not([disabled])'
        ]
    },
    
    // Helper methods to get selectors as array (for compatibility)
    getQuestionContainerSelectors() {
        return this.questionContainer;
    },
    
    getLabelSelectors() {
        return this.label;
    },
    
    getInputSelectors() {
        return this.input;
    },
    
    getValidationFeedbackSelectors() {
        return this.validationFeedback;
    },
    
    // Check if element matches question container structure
    isQuestionContainer(element) {
        if (!element) return false;
        
        // Check if it has the required attributes
        const hasBaseAttr = element.getAttribute('data-genesis-element') === 'BASE';
        const hasRoleGroup = element.getAttribute('role') === 'group';
        const hasRendererClass = element.className && 
                                 typeof element.className === 'string' && 
                                 element.className.includes('apply-application-process-renderer');
        
        // Must have BASE attribute, role="group", and renderer class (no label/input requirement)
        return hasBaseAttr && hasRoleGroup && hasRendererClass;
    },
    
    // Find question containers using optimized selector
    findQuestionContainers(rootElement = document) {
        // First try the primary selector: BASE element with apply-application-process-renderer class AND role="group"
        const primaryMatches = rootElement.querySelectorAll(
            'div[class*="apply-application-process-renderer"][data-genesis-element="BASE"][role="group"]'
        );
        
        // Filter to only those that match the structure (check attributes only, no label/input requirement)
        const validContainers = Array.from(primaryMatches).filter(el => {
            // Must have role="group" attribute
            const hasRoleGroup = el.getAttribute('role') === 'group';
            // Must have BASE data attribute
            const hasBaseAttr = el.getAttribute('data-genesis-element') === 'BASE';
            // Must have renderer class
            const hasRendererClass = el.className && 
                                   typeof el.className === 'string' && 
                                   el.className.includes('apply-application-process-renderer');
            
            return hasRoleGroup && hasBaseAttr && hasRendererClass;
        });
        
        if (validContainers.length > 0) {
            return validContainers;
        }
        
        // Fallback to other selectors
        for (let i = 1; i < this.questionContainer.length; i++) {
            const matches = rootElement.querySelectorAll(this.questionContainer[i]);
            if (matches.length > 0) {
                // Return all matches without filtering for label/input
                return Array.from(matches);
            }
        }
        
        return [];
    }
};
