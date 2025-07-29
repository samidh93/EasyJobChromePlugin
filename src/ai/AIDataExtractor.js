import AISettingsManager from './AISettingsManager.js';

class AIDataExtractor {
    constructor(userId = null) {
        this.userId = userId;
        this.aiSettingsManager = new AISettingsManager();
        this.settingsLoadPromise = null;
        
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
            this.settingsLoadPromise = null;
        }
        
        console.log('AIDataExtractor: ensureSettingsLoaded called');
        console.log('AIDataExtractor: Current user ID:', this.userId);
        console.log('AIDataExtractor: Current settings before load:', this.aiSettingsManager.getCurrentSettings());
    }

    /**
     * Extract structured data from resume text using AI
     * @param {string} resumeText - The resume text to extract data from
     * @returns {Promise<Object>} - Structured data object
     */
    async extractStructuredData(resumeText) {
        try {
            // Ensure AI settings are loaded
            await this.ensureSettingsLoaded();
            
            console.log('AIDataExtractor: Extracting structured data from resume text...');
            console.log('AIDataExtractor: Text length:', resumeText.length);
            console.log('AIDataExtractor: Using AI model:', this.aiSettingsManager.getModel());
            console.log('AIDataExtractor: Using AI provider:', this.aiSettingsManager.getProvider());
            console.log('AIDataExtractor: Current settings:', this.aiSettingsManager.getCurrentSettings());
            
            const prompt = `
Extract structured data from the resume text. Return ONLY valid JSON in this exact format:

{
  "name": "Full Name",
  "surname": "Surname", 
  "email": "email@example.com",
  "phone": "+1234567890",
  "phone_prefix": "+1",
  "location": "City, Country",
  "city": "City",
  "country": "Country",
  "citizenship": "Citizenship",
  "visa_required": "yes/no",
  "salary": "Salary expectation",
  "gender": "gender",
  "ethnicity": "ethnicity",
  "years_of_experience": "X years",
  "driver_license": "license type",
  "github": "github url",
  "linkedin": "linkedin url",
  "summary": "Professional summary text",
  "skills": [{"category": "Category", "name": "Skill Name", "level": "Level"}],
  "experience": [{"position": "Job Title", "company": "Company Name", "employment_period": "Duration", "location": "Location", "key_responsibilities": [{"description": "Responsibility"}], "skills_acquired": ["Skill 1", "Skill 2"]}],
  "education": [{"degree": "Degree Name", "university": "Institution Name", "field_of_study": "Field of Study", "graduation_year": "2020"}],
  "languages": [{"language": "English", "proficiency": "Professional"}],
  "certifications": [{"name": "Certification Name", "issuer": "Issuing Organization", "date": "2023", "url": "certification url"}],
  "projects": [{"name": "Project Name", "role": "Role", "description": "Description", "skills": ["Skill 1", "Skill 2"], "link": "project url"}],
  "interests": ["Interest 1", "Interest 2"]
}

CRITICAL: Return ONLY valid JSON. NO trailing commas. ALL property names in double quotes. ALL arrays/objects properly closed.

Resume:
${resumeText}
`;

            console.log('AIDataExtractor: Sending extraction prompt to AI...');
            console.log('AIDataExtractor: Provider being used:', this.aiSettingsManager.getProvider());
            console.log('AIDataExtractor: Model being used:', this.aiSettingsManager.getModel());
            
            // Use the existing AI infrastructure following the app pattern
            const response = await this.aiSettingsManager.callAIWithStop({
                prompt: prompt,
                stream: false,
                temperature: 0, // Use 0 temperature for consistent extraction
                max_tokens: 4000 // Increase token limit to prevent truncation
            });

            if (!response || response.stopped) {
                throw new Error('AI extraction was stopped or failed');
            }

            console.log('AIDataExtractor: AI response received, parsing JSON...');
            console.log('AIDataExtractor: Response type:', typeof response);
            console.log('AIDataExtractor: Response keys:', Object.keys(response));
            
            // Handle different AI provider response formats
            let aiResponse = "";
            if (response?.response) {
                // Ollama format: { response: "text" }
                aiResponse = response.response.trim();
                console.log('AIDataExtractor: Using Ollama response format');
            } else if (response?.choices?.[0]?.message?.content) {
                // OpenAI format: { choices: [{ message: { content: "text" } }] }
                aiResponse = response.choices[0].message.content.trim();
                console.log('AIDataExtractor: Using OpenAI response format');
            } else {
                console.error('AIDataExtractor: Unexpected AI response format:', response);
                throw new Error('Unexpected AI response format');
            }
            
            console.log('AIDataExtractor: Raw AI response:', aiResponse);
            console.log('AIDataExtractor: Response length:', aiResponse.length);
            
            // Extract JSON from the response
            let jsonStr = aiResponse;
            
            // Try to find JSON in the response
            const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            
            console.log('AIDataExtractor: Extracted JSON string length:', jsonStr.length);
            
            // Try to parse the JSON
            try {
                const structuredData = JSON.parse(jsonStr);
                console.log('AIDataExtractor: JSON parsing successful!');
                return structuredData;
            } catch (parseError) {
                console.error('AIDataExtractor: JSON parsing failed:', parseError);
                console.error('AIDataExtractor: Raw JSON string:', jsonStr);
                
                console.log('AIDataExtractor: Attempting to fix JSON...');
                
                // Fix 1: Remove trailing commas
                let fixedJson = jsonStr.replace(/,(\s*[}\]])/g, '$1');
                
                // Fix 2: Fix malformed property names
                fixedJson = fixedJson.replace(/"([a-zA-Z_][a-zA-Z0-9_]*)":\s*"([^"]*)"\s*,?\s*([}\]])/g, '"$1": "$2"$3');
                fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
                fixedJson = fixedJson.replace(/([a-zA-Z_][a-zA-Z0-9_]*):\s*"([^"]*)"/g, '"$1": "$2"');
                
                // Fix 3: Handle truncated responses by detecting incomplete structures
                if (parseError.message.includes('Expected \',\' or \']\' after array element') || 
                    parseError.message.includes('Unexpected end of JSON input')) {
                    console.log('AIDataExtractor: Detected truncated JSON, attempting to close incomplete structures...');
                    
                    // Count open braces and brackets
                    const openBraces = (fixedJson.match(/\{/g) || []).length;
                    const closeBraces = (fixedJson.match(/\}/g) || []).length;
                    const openBrackets = (fixedJson.match(/\[/g) || []).length;
                    const closeBrackets = (fixedJson.match(/\]/g) || []).length;
                    
                    console.log('AIDataExtractor: Brace count - open:', openBraces, 'close:', closeBraces);
                    console.log('AIDataExtractor: Bracket count - open:', openBrackets, 'close:', closeBrackets);
                    
                    // Close incomplete arrays and objects
                    let additionalClosures = '';
                    for (let i = closeBrackets; i < openBrackets; i++) {
                        additionalClosures += ']';
                    }
                    for (let i = closeBraces; i < openBraces; i++) {
                        additionalClosures += '}';
                    }
                    
                    if (additionalClosures) {
                        fixedJson += additionalClosures;
                        console.log('AIDataExtractor: Added closures:', additionalClosures);
                    }
                    
                    // Remove trailing commas before closing brackets/braces
                    fixedJson = fixedJson.replace(/,(\s*[}\]])/g, '$1');
                }
                
                try {
                    const fixedData = JSON.parse(fixedJson);
                    console.log('AIDataExtractor: JSON repair successful!');
                    return fixedData;
                } catch (fixError) {
                    console.error('AIDataExtractor: Failed to fix JSON:', fixError);
                    console.error('AIDataExtractor: Fixed JSON string:', fixedJson);
                    
                    // Fallback: Try to extract partial data
                    console.log('AIDataExtractor: Attempting to extract partial data from failed JSON...');
                    try {
                        const partialData = this.extractPartialData(jsonStr);
                        console.log('AIDataExtractor: Partial data extraction successful');
                        return partialData;
                    } catch (partialError) {
                        console.error('AIDataExtractor: Failed to extract partial data:', partialError);
                        throw new Error('Failed to parse AI response as JSON');
                    }
                }
            }
        } catch (error) {
            console.error('AIDataExtractor: Error extracting structured data:', error);
            throw error;
        }
    }

    /**
     * Extract partial data from failed JSON string
     * @param {string} jsonStr - The failed JSON string
     * @returns {Object} - Partial structured data
     */
    extractPartialData(jsonStr) {
        const partialData = {
            name: null,
            surname: null,
            email: null,
            phone: null,
            phone_prefix: null,
            location: null,
            city: null,
            country: null,
            citizenship: null,
            visa_required: null,
            salary: null,
            gender: null,
            ethnicity: null,
            years_of_experience: null,
            driver_license: null,
            github: null,
            linkedin: null,
            summary: null,
            skills: [],
            experience: [],
            education: [],
            languages: [],
            certifications: [],
            projects: [],
            interests: []
        };

        // Extract basic fields using regex
        const nameMatch = jsonStr.match(/"name":\s*"([^"]+)"/);
        if (nameMatch) partialData.name = nameMatch[1];

        const surnameMatch = jsonStr.match(/"surname":\s*"([^"]+)"/);
        if (surnameMatch) partialData.surname = surnameMatch[1];

        const emailMatch = jsonStr.match(/"email":\s*"([^"]+)"/);
        if (emailMatch) partialData.email = emailMatch[1];

        const phoneMatch = jsonStr.match(/"phone":\s*"([^"]+)"/);
        if (phoneMatch) partialData.phone = phoneMatch[1];

        const phonePrefixMatch = jsonStr.match(/"phone_prefix":\s*"([^"]+)"/);
        if (phonePrefixMatch) partialData.phone_prefix = phonePrefixMatch[1];

        const locationMatch = jsonStr.match(/"location":\s*"([^"]+)"/);
        if (locationMatch) partialData.location = locationMatch[1];

        const cityMatch = jsonStr.match(/"city":\s*"([^"]+)"/);
        if (cityMatch) partialData.city = cityMatch[1];

        const countryMatch = jsonStr.match(/"country":\s*"([^"]+)"/);
        if (countryMatch) partialData.country = countryMatch[1];

        const citizenshipMatch = jsonStr.match(/"citizenship":\s*"([^"]+)"/);
        if (citizenshipMatch) partialData.citizenship = citizenshipMatch[1];

        const visaMatch = jsonStr.match(/"visa_required":\s*"([^"]+)"/);
        if (visaMatch) partialData.visa_required = visaMatch[1];

        const salaryMatch = jsonStr.match(/"salary":\s*"([^"]+)"/);
        if (salaryMatch) partialData.salary = salaryMatch[1];

        const genderMatch = jsonStr.match(/"gender":\s*"([^"]+)"/);
        if (genderMatch) partialData.gender = genderMatch[1];

        const ethnicityMatch = jsonStr.match(/"ethnicity":\s*"([^"]+)"/);
        if (ethnicityMatch) partialData.ethnicity = ethnicityMatch[1];

        const experienceMatch = jsonStr.match(/"years_of_experience":\s*"([^"]+)"/);
        if (experienceMatch) partialData.years_of_experience = experienceMatch[1];

        const licenseMatch = jsonStr.match(/"driver_license":\s*"([^"]+)"/);
        if (licenseMatch) partialData.driver_license = licenseMatch[1];

        const githubMatch = jsonStr.match(/"github":\s*"([^"]+)"/);
        if (githubMatch) partialData.github = githubMatch[1];

        const linkedinMatch = jsonStr.match(/"linkedin":\s*"([^"]+)"/);
        if (linkedinMatch) partialData.linkedin = linkedinMatch[1];

        const summaryMatch = jsonStr.match(/"summary":\s*"([^"]+)"/);
        if (summaryMatch) partialData.summary = summaryMatch[1];

        // Extract skills array (simplified)
        const skillsMatch = jsonStr.match(/"skills":\s*\[([\s\S]*?)\]/);
        if (skillsMatch) {
            const skillsText = skillsMatch[1];
            const skillMatches = skillsText.match(/\{[^}]+\}/g);
            if (skillMatches) {
                partialData.skills = skillMatches.map(skill => {
                    try {
                        return JSON.parse(skill);
                    } catch {
                        return null;
                    }
                }).filter(Boolean);
            }
        }

        return partialData;
    }

    /**
     * Test AI connection
     * @returns {Promise<boolean>} - Whether connection was successful
     */
    async testConnection() {
        try {
            await this.ensureSettingsLoaded();
            const result = await this.aiSettingsManager.testConnection();
            return result.success;
        } catch (error) {
            console.error('AIDataExtractor: Error testing AI connection:', error);
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
        this.userId = null;
        this.aiSettingsManager.clear();
        this.settingsLoadPromise = null;
    }
}

export default AIDataExtractor; 