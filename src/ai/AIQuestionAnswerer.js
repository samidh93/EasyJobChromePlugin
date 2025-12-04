import AISettingsManager from './AISettingsManager.js';
import AIQuestionClassifier from './AIQuestionClassifier.js';
import AISmartDataRetriever from './AISmartDataRetriever.js';

/**
 * AI Question Answerer
 * Handles answering job application questions using AI
 */
class AIQuestionAnswerer {
    constructor(userId = null) {
        this.userId = userId;
        this.user_data = null;
        this.formatted_text = null;
        this.aiSettingsManager = new AISettingsManager();
        this.settingsLoadPromise = null;
        
        // Initialize new AI components
        this.questionClassifier = new AIQuestionClassifier(this.aiSettingsManager);
        this.smartDataRetriever = new AISmartDataRetriever();
        
        // Load AI settings if userId is provided
        if (userId) {
            this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
        }
    }

    /**
     * Set the user ID and load AI settings
     * @param {string} userId - User ID to load settings for
     */
    async setUserId(userId) {
        this.userId = userId;
        if (userId) {
            this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
            await this.settingsLoadPromise;
        }
    }

    /**
     * Ensure AI settings are loaded before making API calls
     * @returns {Promise<void>}
     */
    async ensureSettingsLoaded() {
        if (this.settingsLoadPromise) {
            await this.settingsLoadPromise;
            this.settingsLoadPromise = null; // Clear the promise after loading
        }
    }

    /**
     * Set the AI model to use (overrides settings)
     * @param {string} model - The model name to use
     */
    setModel(model) {
        if (model && typeof model === 'string') {
            // Create a temporary settings override
            const currentSettings = this.aiSettingsManager.getCurrentSettings();
            const overrideSettings = { ...currentSettings, model: model };
            this.aiSettingsManager.setSettings(overrideSettings);
            console.log(`AIQuestionAnswerer: Model overridden to: ${model}`);
        }
    }

    /**
     * Set user data from structured data and formatted text
     * @param {Object|string} userData - Structured user data or formatted text
     * @param {string} formattedText - Optional formatted text for AI prompts
     * @returns {Promise<Object>} - Success status
     */
    async setUserContext(userData, formattedText = null) {
        try {
            if (typeof userData === 'object' && userData !== null) {
                // We have structured data - use it for direct answers
                this.user_data = userData;
                this.formatted_text = formattedText || this.formatUserDataAsText();
                console.log('User context set with structured data');
            } else if (typeof userData === 'string') {
                // We only have formatted text - use it for both
                this.user_data = null;
                this.formatted_text = userData;
                console.log('User context set with formatted text only');
            } else {
                throw new Error('Invalid user data format');
            }
            
            console.log('User context set successfully');
            return { success: true };
        } catch (error) {
            console.error('Error in setUserContext:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Answer a question with or without options using AI
     * @param {string} question - The question to answer
     * @param {Array} options - Optional list of choices
     * @param {Function} shouldStop - Optional function to check if should stop
     * @param {string} resumeId - Optional resume ID for structured data
     * @returns {Promise<Object>} - Result object with status and answer
     */
    async answerQuestion(question, options = null, answerContextOrShouldStop = null, resumeId = null) {
        // Handle both new (answerContext object) and legacy (shouldStop function) call patterns
        let shouldStop = null;
        let answerContext = null;
        
        if (typeof answerContextOrShouldStop === 'function') {
            // Legacy pattern: third param is shouldStop function
            shouldStop = answerContextOrShouldStop;
        } else if (answerContextOrShouldStop && typeof answerContextOrShouldStop === 'object') {
            // New pattern: third param is answerContext object
            answerContext = answerContextOrShouldStop;
        } else if (answerContextOrShouldStop !== null) {
            // Could be a boolean or other value for shouldStop
            shouldStop = answerContextOrShouldStop;
        }
        try {
            // Ensure AI settings are loaded
            await this.ensureSettingsLoaded();
            
            console.log(`AIQuestionAnswerer: Processing question: ${question}`);
            
            // Step 1: Use AI to classify the question and extract keywords
            let classification = null;
            let relevantData = null;
            
            try {
                classification = await this.questionClassifier.classifyQuestion(question);
                console.log('AIQuestionAnswerer: Question classified as:', classification);
            } catch (error) {
                console.error('AIQuestionAnswerer: Classification failed, using fallback:', error);
                classification = { question_type: 'general', keywords: [], confidence: 0.3 };
            }
            
            // Step 2: Get relevant data based on classification (if resumeId provided)
            if (resumeId && classification) {
                try {
                    relevantData = await this.smartDataRetriever.getRelevantData(classification, resumeId);
                    //console.log('AIQuestionAnswerer: Retrieved relevant data:', relevantData ? Object.keys(relevantData) : 'null');
                } catch (error) {
                    console.error('AIQuestionAnswerer: Smart data retrieval failed:', error);
                }
            }
            
            // Step 3: Check for direct answers from relevant data
            const directAnswer = this.getDirectAnswer(question, relevantData);
            if (directAnswer) {
                console.log('AIQuestionAnswerer: Found direct answer:', directAnswer);
                // If we have options, try to match the direct answer to one of them
                if (options && Array.isArray(options) && options.length > 0) {
                    const matchedOption = this.matchToOption(directAnswer, options);
                    return { success: true, answer: matchedOption };
                }
                return { success: true, answer: directAnswer };
            }
            
            // Step 4: If no relevant data found, try intelligent fallback
            if (!relevantData || Object.keys(relevantData).length === 0) {
                console.log('AIQuestionAnswerer: No relevant data found, trying intelligent fallback');
                const fallbackAnswer = this.smartDataRetriever.generateFallbackResponse(classification, options);
                if (fallbackAnswer) {
                    console.log('AIQuestionAnswerer: Using intelligent fallback answer:', fallbackAnswer);
                    return { success: true, answer: fallbackAnswer };
                }
            }
            
            // Step 5: Check if we should stop before AI processing
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
                    console.log("AIQuestionAnswerer: Stop requested before AI processing");
                    return { success: false, stopped: true };
                }
            }
            
            // Step 6: Build smart prompt with minimal relevant data (with answer format context)
            const prompt = this.buildSmartPrompt(question, options, relevantData, classification, answerContext);
            
            // Debug the full prompt
            console.log("=== SMART PROMPT BEING SENT ===");
            //console.log(prompt);
            console.log("=== END SMART PROMPT ===");
            
            // Get token analysis
            const tokenAnalysis = this.aiSettingsManager.getTokenAnalysis({ prompt });
            //console.log("Token Analysis:", tokenAnalysis);
            
            // Step 7: Get AI response using AISettingsManager
            const response = await this.aiSettingsManager.callAIWithStop({
                prompt: prompt,
                stream: false
            }, shouldStop);
            
            // Check if the response indicates stopping
            if (response && response.stopped) {
                return { success: false, stopped: true };
            }
            
            // Handle different AI provider response formats
            let answer = "";
            if (response?.response) {
                // Ollama format: { response: "text" }
                answer = response.response.trim();
            } else if (response?.choices?.[0]?.message?.content) {
                // OpenAI format: { choices: [{ message: { content: "text" } }] }
                answer = response.choices[0].message.content.trim();
            } else {
                console.warn('AIQuestionAnswerer: Unexpected AI response format:', response);
                answer = "";
            }

            console.log("AIQuestionAnswerer: Raw AI response:", answer);

            // Post-process answer to enforce minimum 5 years for experience questions
            if (classification.question_type === 'years_experience' && /^\d+$/.test(answer)) {
                const num = parseInt(answer);
                if (num < 5) {
                    answer = "5";
                    console.log(`AIQuestionAnswerer: Enforced minimum 5 years for experience question, was: ${num}`);
                }
            }

            // If we have options, ensure answer matches one of them
            if (options && Array.isArray(options) && options.length > 0) {
                answer = this.matchToOption(answer, options);
            }

            return { 
                success: true, 
                answer: answer || "Information not available" 
            };
            
        } catch (error) {
            console.error('AIQuestionAnswerer: Error in answerQuestion:', error);
            
            // Smart fallback using classification if available
            let fallbackAnswer = "Information not available";
            if (classification && options) {
                fallbackAnswer = this.smartDataRetriever.generateFallbackResponse(classification, options);
            }
            
            if (!fallbackAnswer && options && Array.isArray(options) && options.length > 0) {
                fallbackAnswer = options.length > 1 ? options[1] : options[0];
            }
            
            console.log('AIQuestionAnswerer: Using fallback answer:', fallbackAnswer);
            
            return { success: false, answer: fallbackAnswer, error: error.message };
        }
    }

    /**
     * Detect question type for optimized data retrieval
     * @param {string} question - The question to analyze
     * @returns {string} - Question type
     */
    detectQuestionType(question) {
        const questionLower = question.toLowerCase();
        
        // Check for language level questions first
        if (questionLower.includes('level of') || questionLower.includes('proficiency in') || questionLower.includes('fluent in')) {
            return 'language_level';
        } else if (questionLower.includes('skill') || questionLower.includes('experience') || questionLower.includes('years') || questionLower.includes('technology') || questionLower.includes('programming') || questionLower.includes('language') || questionLower.includes('c++') || questionLower.includes('python') || questionLower.includes('java')) {
            return 'skills';
        } else if (questionLower.includes('education') || questionLower.includes('degree') || questionLower.includes('study') || questionLower.includes('university') || questionLower.includes('college')) {
            return 'education';
        } else if (questionLower.includes('language') || questionLower.includes('speak') || questionLower.includes('fluent')) {
            return 'languages';
        } else if (questionLower.includes('certification') || questionLower.includes('certified')) {
            return 'certifications';
        } else if (questionLower.includes('name') || questionLower.includes('email') || questionLower.includes('phone') || questionLower.includes('contact') || questionLower.includes('location')) {
            return 'personal';
        } else if (questionLower.includes('visa') || questionLower.includes('sponsorship') || questionLower.includes('work permit')) {
            return 'visa';
        } else if (questionLower.includes('salary') || questionLower.includes('compensation') || questionLower.includes('pay') || questionLower.includes('expectation')) {
            return 'salary';
        } else if (questionLower.includes('notice') || questionLower.includes('period') || questionLower.includes('availability') || questionLower.includes('start date')) {
            return 'notice';
        } else {
            return 'general';
        }
    }

    /**
     * Check for direct answers from user data (email, phone, name, etc.)
     * @param {string} question - The question to check
     * @param {Object} relevantData - Optional structured data from database
     * @returns {string|null} - Direct answer if found, null otherwise
     */
    getDirectAnswer(question, relevantData = null) {
        // Try structured data first if available
        if (relevantData) {
            const questionLower = question.toLowerCase();
            
            // Language level questions
            if (relevantData.languages && (questionLower.includes('level of') || questionLower.includes('proficiency'))) {
                for (const lang of ['german', 'english', 'french', 'arabic', 'spanish']) {
                    if (questionLower.includes(lang)) {
                        const language = relevantData.languages.find(l => l.language?.toLowerCase() === lang);
                        if (language) {
                            return language.proficiency || 'Unknown';
                        }
                    }
                }
            }
            
            // Personal information questions
            if (relevantData.personal_info) {
                if (questionLower.includes('email') || questionLower.includes('e-mail')) {
                    return relevantData.personal_info.email || null;
                }
                if (questionLower.includes('phone') || questionLower.includes('telephone') || questionLower.includes('mobile')) {
                    return relevantData.personal_info.phone || null;
                }
                if (questionLower.includes('name')) {
                    return relevantData.personal_info.name || null;
                }
                if (questionLower.includes('location') || questionLower.includes('address')) {
                    return relevantData.personal_info.location || null;
                }
                if (questionLower.includes('citizenship')) {
                    return relevantData.personal_info.citizenship || null;
                }
                if (questionLower.includes('visa') || questionLower.includes('sponsorship')) {
                    return relevantData.personal_info.visa_required || null;
                }
                if (questionLower.includes('salary') || questionLower.includes('compensation') || questionLower.includes('pay')) {
                    return relevantData.personal_info.salary || null;
                }
            }
        }
        
        // Fallback to user context data
        if (!this.user_data?.personal_information) {
            return null;
        }
        
        const info = this.user_data.personal_information;
        const q = question.toLowerCase();
        
        // Email
        if (q.includes("email") || q.includes("e-mail")) {
            return info.email || null;
        }
        
        // Phone
        if (q.includes("phone") || q.includes("mobile") || q.includes("telefon")) {
            const phone = info.phone_prefix ? `${info.phone_prefix}${info.phone}` : info.phone;
            return phone || null;
        }
        
        // First name
        if (q.includes("first name") || q.includes("vorname")) {
            return info.name || null;
        }
        
        // Last name  
        if (q.includes("last name") || q.includes("surname") || q.includes("nachname")) {
            return info.surname || null;
        }
        
        // Country
        if (q.includes("country") && !q.includes("code")) {
            return info.country || null;
        }
        
        // Notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(question)) {
            if (q.includes("notice period") || q.includes("kündigungsfrist") || q.includes("kuendigungsfrist")) {
                // Return notice period in appropriate language
                if (q.includes("monate") || q.includes("deutsch")) {
                    return "2 Monate";
                } else {
                    return "2 months";
                }
            } else {
                // Return starting date
                return this.calculateDateTwoMonthsFromNow();
            }
        }
        
        return null;
    }
    
    /**
     * Build smart prompt with minimal relevant data
     * @param {string} question - The question
     * @param {Array} options - Available options (if any)
     * @param {Object} relevantData - Relevant data from smart retriever
     * @param {Object} classification - Question classification
     * @returns {string} - Formatted smart prompt
     */
    buildSmartPrompt(question, options, relevantData, classification, answerContext = null) {
        // Use relevant data if available, otherwise indicate no data
        let contextData;
        if (relevantData && Object.keys(relevantData).length > 0) {
            contextData = this.formatRelevantDataAsText(relevantData);
            console.log("AIQuestionAnswerer: Using focused relevant data for prompt");
        } else {
            contextData = "No specific relevant data available in resume.";
            console.log("AIQuestionAnswerer: No relevant data - using fallback prompt");
        }
        
        let prompt = `You are a job applicant filling out a job application form. Answer questions based on your resume information in first person (as "I" not "he/she").

RELEVANT RESUME DATA:
${contextData}

QUESTION: ${question}

IMPORTANT GENERAL RULES:
- Answer as the job applicant (use "I", "my", "me" - NOT "he", "she", "Sami", or third person)
- Be concise and direct
- Only provide the specific information requested
- Do not mention your name unless explicitly asked`;

        // Add question type specific rules
        switch (classification.question_type) {
            case 'years_experience':
                prompt += `

IMPORTANT RULES FOR YEARS OF EXPERIENCE:
- If asked for years of experience, provide ONLY a number between 5-99
- MINIMUM is always 5 years - never return 0, 1, 2, 3, or 4
- Do NOT include words like "years", "Jahre", or descriptions
- Calculate based on work experience and skill level
- If no specific experience found, default to 5 years minimum
- Example: "5" not "5 years" or "5 Jahre"`;
                break;
                
            case 'language_proficiency':
                prompt += `

IMPORTANT RULES FOR LANGUAGE PROFICIENCY:
- Choose the most accurate proficiency level based on resume data
- If no specific language data available, choose a realistic favorable level
- Common levels: Beginner, Intermediate, Advanced, Professional, Native`;
                break;
                
            case 'skill_level':
                prompt += `

IMPORTANT RULES FOR SKILL LEVELS:
- Base skill level on experience with the technology/tool
- If no specific experience found, choose a moderate favorable level
- Consider years of experience and project involvement`;
                break;
        }

        // Add answer format information if available
        if (answerContext && answerContext.answerFormat) {
            const format = answerContext.answerFormat;
            
            if (format.hasOptions && format.options && format.options.length > 0) {
                prompt += `

IMPORTANT: This is a selection question. You MUST choose EXACTLY ONE option from the following list. Return ONLY the option text, nothing else.
Available Options: ${JSON.stringify(format.options)}

Example: If the options are ["Beginner", "Intermediate", "Advanced"] and you choose Intermediate, respond with only: Intermediate`;
            } else if (format.type === 'date') {
                // Check if this is a start date ("Ab"/"from") or end date ("Bis"/"until") question
                const questionLower = question.toLowerCase();
                const isEndDate = questionLower.includes('bis') || questionLower.includes('until') || 
                                 questionLower.includes('to ') || questionLower.includes('end date') ||
                                 questionLower === 'bis' || questionLower.startsWith('bis ');
                const isStartDate = questionLower.includes('ab') || questionLower.includes('from') || 
                                   questionLower.includes('start date') || questionLower.includes('available') ||
                                   questionLower === 'ab' || questionLower.startsWith('ab ');
                
                if (isEndDate) {
                    // Calculate a date at least 2 years from now for end date
                    const today = new Date();
                    const minEndDate = new Date(today);
                    minEndDate.setFullYear(today.getFullYear() + 2); // Minimum 2 years from today
                    const minEndDateStr = minEndDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    
                    // Try to parse constraint from question (e.g., "Ein Datum am 4.12.2025 oder danach")
                    let constraintDate = null;
                    const dateMatch = question.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
                    if (dateMatch) {
                        const [, day, month, year] = dateMatch;
                        constraintDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
                    }
                    
                    // Use the later of: constraint date or 2 years from today
                    let finalEndDate = minEndDate;
                    if (constraintDate && constraintDate > minEndDate) {
                        finalEndDate = constraintDate;
                    }
                    const finalEndDateStr = finalEndDate.toISOString().split('T')[0];
                    
                    prompt += `

IMPORTANT: This is asking for an END DATE ("Bis"/"Until" - latest available date). Return ONLY a date in YYYY-MM-DD format.
- The date must be at least 2 YEARS from today (minimum requirement)
- Minimum date: ${minEndDateStr} (exactly 2 years from today)
- You MUST use a date that is at least 2 years in the future
- Suggested date: ${finalEndDateStr}
- This represents when your availability ends
- Do not include any other text or explanation`;
                } else if (isStartDate) {
                    // Calculate 2 months from now for start date (based on notice period)
                    const startDate = new Date();
                    startDate.setMonth(startDate.getMonth() + 2);
                    const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
                    
                    prompt += `

IMPORTANT: This is asking for a START DATE ("Ab"/"From" - earliest available date). Return ONLY a date in YYYY-MM-DD format.
- This should be your earliest available start date (typically 2 months from today to allow for notice period)
- Suggested date: ${startDateStr} (2 months from today)
- Do not include any other text or explanation`;
                } else {
                    prompt += `

IMPORTANT: Return ONLY a date in YYYY-MM-DD format (e.g., 2025-02-15). Do not include any other text.`;
                }
            } else if (format.type === 'number') {
                // Check if this is a range question (Von/Bis = From/To for numbers)
                const questionLower = question.toLowerCase();
                const isMaxValue = questionLower.includes('bis') || questionLower.includes('until') || 
                                  questionLower.includes('to ') || questionLower.includes('maximum') ||
                                  questionLower === 'bis' || questionLower.startsWith('bis ') ||
                                  questionLower.includes('(bis)');
                const isMinValue = questionLower.includes('von') || questionLower.includes('from') || 
                                  questionLower.includes('minimum') ||
                                  questionLower === 'von' || questionLower.startsWith('von ') ||
                                  questionLower.includes('(von)');
                
                // Check if question is about hours per week - check both in question text and in full context
                let isHoursPerWeek = question.toLowerCase().includes('stunden') || 
                                     question.toLowerCase().includes('hours') ||
                                     question.toLowerCase().includes('stunde pro woche') ||
                                     question.toLowerCase().includes('hours per week') ||
                                     question.toLowerCase().includes('woche') ||
                                     question.toLowerCase().includes('week');
                
                // Fallback: If question is just "Von" or "Bis" and it's a number field,
                // check if there are sibling fields that might indicate hours/week context
                // OR assume it's likely hours-related if it's a simple Von/Bis number range
                if (!isHoursPerWeek && (isMinValue || isMaxValue) && format.inputElement) {
                    // Check if there's a sibling field (indicates it's a range question)
                    const parent = format.inputElement.parentElement;
                    if (parent) {
                        const siblingInputs = parent.querySelectorAll('input[type="number"]');
                        // If there are multiple number inputs, it's likely a range (min/max)
                        // Common range questions: hours per week, salary range, etc.
                        // For job applications, "Von/Bis" with numbers often means hours
                        if (siblingInputs.length >= 2) {
                            console.log('🔍 [DEBUG] Detected range question (multiple number inputs), assuming hours-per-week context');
                            isHoursPerWeek = true; // Assume hours-per-week for Von/Bis number ranges
                        }
                    }
                }
                
                if (isHoursPerWeek && isMaxValue) {
                    // Maximum hours per week (full-time is typically 40 hours)
                    prompt += `

IMPORTANT: This is asking for the MAXIMUM hours per week you can work ("Bis"/"To"/"Up to").
- For full-time employment, you MUST return: 40
- DO NOT return 15, 20, 30, or any number less than 40
- This represents the upper limit of your availability for full-time work
- Return ONLY the number 40. Do not include any other text or explanation.`;
                } else if (isHoursPerWeek && isMinValue) {
                    // Minimum hours per week - for full-time positions, use 40
                    prompt += `

IMPORTANT: This is asking for the MINIMUM hours per week you can work ("Von"/"From"/"At least").
- For full-time positions and availability, you MUST return: 40
- DO NOT return 15, 20, 30, or any number less than 40
- This represents the minimum hours you're available to work per week (full-time)
- Both "Von" and "Bis" should be 40 for full-time availability
- Return ONLY the number 40. Do not include any other text or explanation.`;
                } else if (isMaxValue) {
                    prompt += `

IMPORTANT: This is asking for a MAXIMUM value ("Bis"/"To"/"Up to"). Return ONLY a number.
- Provide a reasonable maximum value based on the question context
${format.constraints ? `- Constraints: ${format.constraints}` : ''}
- Do not include any other text or explanation.`;
                } else if (isMinValue) {
                    prompt += `

IMPORTANT: This is asking for a MINIMUM value ("Von"/"From"/"At least"). Return ONLY a number.
- Provide a reasonable minimum value based on the question context
${format.constraints ? `- Constraints: ${format.constraints}` : ''}
- Do not include any other text or explanation.`;
                } else {
                    prompt += `

IMPORTANT: Return ONLY a number${format.constraints ? ` (${format.constraints})` : ''}. Do not include any other text or explanation.`;
                }
            } else if (format.type === 'email') {
                prompt += `

IMPORTANT: Return ONLY a valid email address. Do not include any other text.`;
            } else if (format.type === 'phone') {
                prompt += `

IMPORTANT: Return ONLY a valid phone number. Do not include any other text.`;
            } else {
                // Generic format guidance
                if (format.constraints) {
                    prompt += `

IMPORTANT: ${format.constraints}. Return ONLY the answer, no additional text.`;
                }
            }
        } else if (options && Array.isArray(options) && options.length > 0) {
            // Fallback: Add option selection rules if options are provided but no format context
            prompt += `

IMPORTANT: This is a selection question. You MUST choose EXACTLY ONE option from the following list. Return ONLY the option text, nothing else.
Available Options: ${JSON.stringify(options)}

Example: If the options are ["Yes", "No"] and you choose Yes, respond with only: Yes`;
        }

        prompt += `

Return ONLY your answer with no additional text, explanations, or formatting:`;

        return prompt;
    }
    
    /**
     * Build enhanced prompt with special handling for different question types (Legacy method)
     * @param {string} question - The question
     * @param {Array} options - Available options (if any)
     * @param {Object} relevantData - Optional structured data for context
     * @returns {string} - Formatted prompt
     */
    buildEnhancedPrompt(question, options, relevantData = null) {
        // Use relevant data if available, otherwise fall back to full resume
        let userData;
        if (relevantData && Object.keys(relevantData).length > 0) {
            // Format relevant data for the prompt
            userData = this.formatRelevantDataAsText(relevantData);
            console.log("Using relevant data sections for prompt");
        } else {
            // Fall back to full resume
            userData = this.formatUserDataAsText();
            console.log("Using full resume for prompt (no relevant data available)");
        }
        
        let prompt = `You are a job applicant filling out a job application form. Answer questions based on your resume information in first person (as "I" not "he/she").

MY RESUME:
${userData}

QUESTION: ${question}

IMPORTANT GENERAL RULES:
- Answer as the job applicant (use "I", "my", "me" - NOT "he", "she", "Sami", or third person)
- Be concise and direct
- Only provide the specific information requested
- Do not mention your name unless explicitly asked`;

        // Special handling for decimal number questions
        if (this.isDecimalNumberQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR DECIMAL NUMBERS:
- If asked for a decimal number, provide ONLY a decimal number (e.g., "3.5", "2.0", "1.2")
- Do NOT include explanations, descriptions, or additional text
- The number should be greater than 0.0 as requested
- Example: "3.0" not "3.0 years" or explanations`;
        }

        // Special handling for years of experience questions
        if (this.isYearsOfExperienceQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR YEARS OF EXPERIENCE:
- If asked for years of experience, provide ONLY a number between 5-99
- MINIMUM is always 5 years - never return 0, 1, 2, 3, or 4
- Do NOT include words like "years", "Jahre", or descriptions
- For skill levels: Beginner=5, Intermediate=7, Advanced=10+ years
- Calculate based on work experience and skill level
- If no specific experience found, default to 5 years minimum
- If unclear or no data, always answer at least 5 years to maximize job prospects
- Example: "5" not "5 years" or "5 Jahre"
- Better to overestimate than underestimate for better interview chances`;
        }

        // Special handling for degree questions
        if (this.isDegreeQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR DEGREE QUESTIONS:
- Check education section carefully for exact degree matches
- "Bachelor" = "Bachelor of Engineering" or "Bachelor of Science"
- "Master" = "Master of Engineering" or "Master of Science"
- Answer "Ja" for German forms, "Yes" for English forms
- If degree is found, answer positively
- Look for exact degree names in education section`;
        }

        // Special handling for skill level questions
        if (this.isSkillLevelQuestion(question)) {
            prompt += `

IMPORTANT RULES FOR SKILL LEVEL QUESTIONS:
- Check the skills section for exact skill matches
- Look for the skill name and its level (Beginner/Intermediate/Advanced)
- Be precise about the level mentioned in the resume
- Do not guess or estimate levels`;
        }

        // Special handling for notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(question)) {
            const twoMonthsFromNow = this.calculateDateTwoMonthsFromNow();
            prompt += `

IMPORTANT RULES FOR NOTICE PERIOD AND START DATE:
- For notice period questions, answer "2 months" or "2 Monate"
- For starting date questions, provide the exact date: ${twoMonthsFromNow}
- Use the format DD.MM.YYYY for German forms (e.g., "15.03.2024")
- Use the format MM/DD/YYYY for English forms (e.g., "03/15/2024")
- Current calculated start date (2 months from today): ${twoMonthsFromNow}
- Be consistent with the date format expected by the form`;
        }

        if (options && Array.isArray(options) && options.length > 0) {
            const optionsStr = options.map(opt => `"${opt}"`).join(", ");
            prompt += `

Available Options: [${optionsStr}]

IMPORTANT: You MUST choose EXACTLY ONE option from the list above. Your answer should match one of the options EXACTLY as written.`;
        }

        prompt += `

ANSWER:`;

        return prompt;
    }

    /**
     * Check if question is asking for a decimal number
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for decimal number
     */
    isDecimalNumberQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('decimal') || 
               lowerQ.includes('dezimal') || 
               lowerQ.includes('größer als 0.0') ||
               lowerQ.includes('greater than 0.0') ||
               lowerQ.includes('decimal zahl') ||
               lowerQ.includes('decimal number');
    }

    /**
     * Check if question is asking for years of experience
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for years
     */
    isYearsOfExperienceQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('jahre') || 
               lowerQ.includes('years') || 
               lowerQ.includes('experience') || 
               lowerQ.includes('erfahrung') ||
               lowerQ.includes('how many') ||
               lowerQ.includes('wie viele');
    }

    /**
     * Check if question is asking about degrees/education
     * @param {string} question - The question text
     * @returns {boolean} - True if asking about degrees
     */
    isDegreeQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('bachelor') || 
               lowerQ.includes('master') || 
               lowerQ.includes('degree') || 
               lowerQ.includes('abschluss') ||
               lowerQ.includes('bildung') ||
               lowerQ.includes('education');
    }

    /**
     * Check if question is asking about skill levels
     * @param {string} question - The question text
     * @returns {boolean} - True if asking about skill levels
     */
    isSkillLevelQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('level') || 
               lowerQ.includes('niveau') || 
               lowerQ.includes('skill') || 
               lowerQ.includes('fähigkeit') ||
               lowerQ.includes('experience with') ||
               lowerQ.includes('erfahrung mit');
    }

    /**
     * Check if question is asking for notice period or starting date
     * @param {string} question - The question text
     * @returns {boolean} - True if asking for notice period or starting date
     */
    isNoticePeriodOrStartDateQuestion(question) {
        const lowerQ = question.toLowerCase();
        return lowerQ.includes('notice period') || 
               lowerQ.includes('starting date') || 
               lowerQ.includes('start date') ||
               lowerQ.includes('startdatum') ||
               lowerQ.includes('beginn') || 
               lowerQ.includes('beginnen') ||
               lowerQ.includes('kündigungsfrist') ||
               lowerQ.includes('kuendigungsfrist') ||
               lowerQ.includes('verfügbar') ||
               lowerQ.includes('verfuegbar') ||
               lowerQ.includes('available') ||
               lowerQ.includes('wann können sie') ||
               lowerQ.includes('when can you') ||
               lowerQ.includes('earliest start') ||
               lowerQ.includes('frühester beginn') ||
               lowerQ.includes('fruehester beginn');
    }

    /**
     * Calculate the date two months from now
     * @returns {string} - Date in DD.MM.YYYY format
     */
    calculateDateTwoMonthsFromNow() {
        const now = new Date();
        now.setMonth(now.getMonth() + 2); // Add 2 months
        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const year = now.getFullYear();
        return `${day}.${month}.${year}`;
    }
    
    /**
     * Format user data as readable text (like YAML formatting in Python)
     * @returns {string} - Formatted user data
     */
    formatUserDataAsText() {
        // Use pre-formatted text if available
        if (this.formatted_text) {
            return this.formatted_text;
        }
        
        if (!this.user_data) {
            return "No user data available.";
        }
        
        // If it's already a string, return it
        if (typeof this.user_data === 'string') {
            return this.user_data;
        }
        
        // Format object as readable text
        return this.formatObject(this.user_data, 0);
    }

    /**
     * Format relevant data sections for the prompt
     * @param {Object} relevantData - Structured data from database
     * @returns {string} - Formatted relevant data
     */
    formatRelevantDataAsText(relevantData) {
        let result = "";
        for (const sectionName in relevantData) {
            if (Object.prototype.hasOwnProperty.call(relevantData, sectionName)) {
                const sectionData = relevantData[sectionName];
                if (sectionData && Object.keys(sectionData).length > 0) {
                    result += `\n${sectionName.toUpperCase().replace(/_/g, ' ')}:\n`;
                    result += this.formatObject(sectionData, 1);
                }
            }
        }
        return result || "No relevant data available.";
    }
    
    /**
     * Recursively format object as indented text
     * @param {*} obj - Object to format
     * @param {number} indent - Indentation level
     * @returns {string} - Formatted text
     */
    formatObject(obj, indent = 0) {
        const indentStr = "  ".repeat(indent);
        let result = "";
        
        if (typeof obj === 'object' && obj !== null) {
            if (Array.isArray(obj)) {
                for (const item of obj) {
                    if (typeof item === 'object' && item !== null) {
                        result += `${indentStr}- ${this.formatObject(item, indent + 1)}`;
                    } else {
                        result += `${indentStr}- ${item}\n`;
                    }
                }
            } else {
                for (const [key, value] of Object.entries(obj)) {
                    const formattedKey = key.toUpperCase().replace(/_/g, ' ');
                    result += `${indentStr}${formattedKey}:\n`;
                    if (typeof value === 'object' && value !== null) {
                        result += this.formatObject(value, indent + 1);
                    } else {
                        result += `${indentStr}  ${value}\n`;
                    }
                }
            }
        } else {
            result += `${indentStr}${obj}\n`;
        }
        
        return result;
    }
     
    /**
     * Match AI answer to one of the available options
     * @param {string} answer - AI generated answer
     * @param {Array} options - Available options
     * @returns {string} - Matched option
     */
    matchToOption(answer, options) {
        if (!answer || !options || options.length === 0) {
            return options?.length > 0 ? options[0] : "Not available";
        }
        
        // Extract decimal numbers from answer for decimal questions
        if (this.isDecimalNumberQuestion(answer) || /^\d+\.\d+$/.test(answer.trim())) {
            const decimalMatch = answer.match(/\d+\.\d+/);
            if (decimalMatch) {
                const decimal = decimalMatch[0];
                // Find matching option with the same decimal
                for (const option of options) {
                    if (option.includes(decimal)) {
                        return option;
                    }
                }
                // If no exact match, return the decimal itself
                return decimal;
            }
        }
        
        // Extract whole numbers from answer for years of experience
        if (this.isYearsOfExperienceQuestion(answer) || /^\d+$/.test(answer.trim())) {
            const numberMatch = answer.match(/\d+/);
            if (numberMatch) {
                let number = parseInt(numberMatch[0]);
                
                // Enforce minimum 5 years for experience questions
                if (this.isYearsOfExperienceQuestion(answer) && number < 5) {
                    number = 5;
                }
                
                const numberStr = number.toString();
                
                // Find matching option with the same number
                for (const option of options) {
                    if (option.includes(numberStr)) {
                        return option;
                    }
                }
                // If no exact match, return the number itself
                return numberStr;
            }
        }
        
        // Special handling for notice period and starting date questions
        if (this.isNoticePeriodOrStartDateQuestion(answer)) {
            // Check if answer contains "2 months" or "2 Monate"
            if (answer.toLowerCase().includes("2 months") || answer.toLowerCase().includes("2 monate")) {
                for (const option of options) {
                    if (option.toLowerCase().includes("2 months") || 
                        option.toLowerCase().includes("2 monate") ||
                        option.toLowerCase().includes("2 month")) {
                        return option;
                    }
                }
                return answer; // Return the answer as-is if no matching option
            }
            
            // Check if answer contains a date (DD.MM.YYYY or MM/DD/YYYY format)
            const dateMatch = answer.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}/);
            if (dateMatch) {
                const dateStr = dateMatch[0];
                for (const option of options) {
                    if (option.includes(dateStr)) {
                        return option;
                    }
                }
                return dateStr; // Return the date as-is if no matching option
            }
        }
        
        // Exact match (case insensitive)
        for (const option of options) {
            if (option.toLowerCase() === answer.toLowerCase()) {
                return option;
            }
        }
        
        // Partial match
        for (const option of options) {
            if (option.toLowerCase().includes(answer.toLowerCase()) || 
                answer.toLowerCase().includes(option.toLowerCase())) {
                return option;
            }
        }
        
        // Country code special handling
        if (answer.toLowerCase().includes("germany") || answer.toLowerCase().includes("deutsch")) {
            for (const option of options) {
                if (option.toLowerCase().includes("deutsch") || 
                    option.toLowerCase().includes("germany") ||
                    option.includes("+49")) {
                    return option;
                }
            }
        }
        
        // Fallback
        return options.length > 1 ? options[1] : options[0];
    }

    /**
     * Test AI connection using AISettingsManager
     * @returns {Promise<boolean>} - Whether connection was successful
     */
    async testConnection() {
        try {
            await this.ensureSettingsLoaded();
            const result = await this.aiSettingsManager.testConnection();
            return result.success;
        } catch (error) {
            console.error('Error testing AI connection:', error);
            return false;
        }
    }

    /**
     * Get current AI settings
     * @returns {Object} - Current AI settings
     */
    getAISettings() {
        return this.aiSettingsManager.getCurrentSettings();
    }

    /**
     * Clear all data
     */
    clear() {
        this.user_data = null;
        this.formatted_text = null;
        this.aiSettingsManager.clear();
        this.settingsLoadPromise = null;
    }
}

export default AIQuestionAnswerer; 