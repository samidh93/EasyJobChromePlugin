/**
 * AI Smart Data Retriever
 * Retrieves only relevant resume data based on question classification
 */
class AISmartDataRetriever {
    constructor() {
        this.dataCache = new Map(); // Cache retrieved data
    }

    /**
     * Get relevant data based on question classification
     * @param {Object} classification - Question classification result
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object|null>} Relevant data or null
     */
    async getRelevantData(classification, resumeId) {
        if (!classification || !resumeId) {
            console.log('AISmartDataRetriever: Missing classification or resumeId');
            return null;
        }

        const cacheKey = `${resumeId}_${classification.question_type}_${classification.keywords.join(',')}`;
        
        // Check cache first
        if (this.dataCache.has(cacheKey)) {
            console.log('AISmartDataRetriever: Using cached data');
            return this.dataCache.get(cacheKey);
        }

        try {
            console.log(`AISmartDataRetriever: Retrieving data for type: ${classification.question_type}, keywords: ${classification.keywords.join(', ')}`);
            
            let relevantData = null;
            
            // Get data based on question type
            console.log(`AISmartDataRetriever: Switch statement with question_type: "${classification.question_type}"`);
            switch (classification.question_type) {
                case 'language_proficiency':
                    console.log('AISmartDataRetriever: Matched language_proficiency case');
                    relevantData = await this.getLanguageData(resumeId, classification.keywords);
                    console.log('AISmartDataRetriever: getLanguageData returned:', relevantData ? Object.keys(relevantData) : 'null');
                    break;
                    
                case 'skill_level':
                case 'years_experience':
                    relevantData = await this.getSkillExperienceData(resumeId, classification.keywords);
                    break;
                    
                case 'education':
                    relevantData = await this.getEducationData(resumeId, classification.keywords);
                    break;
                    
                case 'personal':
                case 'visa_status':
                    relevantData = await this.getPersonalData(resumeId);
                    break;
                    
                case 'salary':
                case 'availability':
                case 'notice_period':
                    relevantData = await this.getEmploymentData(resumeId);
                    break;
                    
                default:
                    console.log(`AISmartDataRetriever: Hit default case for question_type: "${classification.question_type}"`);
                    // For general questions, get a minimal relevant dataset
                    relevantData = await this.getGeneralData(resumeId, classification.keywords);
            }

            // Cache the result
            if (relevantData) {
                this.dataCache.set(cacheKey, relevantData);
            }

            console.log('AISmartDataRetriever: Retrieved data:', relevantData ? Object.keys(relevantData) : 'null');
            return relevantData;
            
        } catch (error) {
            console.error('AISmartDataRetriever: Error retrieving relevant data:', error);
            return null;
        }
    }

    /**
     * Get language-specific data
     * @param {string} resumeId - Resume ID
     * @param {Array} keywords - Language keywords
     * @returns {Promise<Object|null>} Language data
     */
    async getLanguageData(resumeId, keywords) {
        try {
            console.log('AISmartDataRetriever: getLanguageData called with keywords:', keywords);
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=language_proficiency`
            });
            
            console.log('AISmartDataRetriever: API response:', response);

            if (response && response.success && response.relevantData) {
                const languageData = response.relevantData;
                console.log('AISmartDataRetriever: languageData received:', languageData);
                
                // Filter to specific languages if keywords provided
                if (keywords.length > 0 && languageData.languages) {
                    const filteredLanguages = languageData.languages.filter(lang => {
                        const langName = lang.language?.toLowerCase() || '';
                        return keywords.some(keyword => 
                            langName.includes(keyword.toLowerCase()) ||
                            keyword.toLowerCase().includes(langName)
                        );
                    });
                    
                    if (filteredLanguages.length > 0) {
                        return { languages: filteredLanguages };
                    }
                }
                
                return languageData;
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting language data:', error);
            return null;
        }
    }

    /**
     * Get skill and experience data
     * @param {string} resumeId - Resume ID
     * @param {Array} keywords - Skill keywords
     * @returns {Promise<Object|null>} Skill and experience data
     */
    async getSkillExperienceData(resumeId, keywords) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=skills`
            });

            if (response && response.success && response.relevantData) {
                const data = response.relevantData;
                let filteredData = {};

                // Filter skills based on keywords
                if (keywords.length > 0 && data.skills) {
                    const filteredSkills = data.skills.filter(skill => {
                        const skillName = skill.name?.toLowerCase() || '';
                        const skillCategory = skill.category?.toLowerCase() || '';
                        return keywords.some(keyword => 
                            skillName.includes(keyword.toLowerCase()) ||
                            skillCategory.includes(keyword.toLowerCase()) ||
                            keyword.toLowerCase().includes(skillName)
                        );
                    });
                    
                    if (filteredSkills.length > 0) {
                        filteredData.skills = filteredSkills;
                    }
                }

                // Filter experiences based on keywords
                if (keywords.length > 0 && data.experiences) {
                    const filteredExperiences = data.experiences.filter(exp => {
                        const expText = JSON.stringify(exp).toLowerCase();
                        return keywords.some(keyword => 
                            expText.includes(keyword.toLowerCase())
                        );
                    });
                    
                    if (filteredExperiences.length > 0) {
                        // Only include relevant parts of experience
                        filteredData.experiences = filteredExperiences.map(exp => ({
                            company: exp.company,
                            position: exp.position,
                            employment_period: exp.employment_period,
                            skills_acquired: exp.skills_acquired || [],
                            key_responsibilities: exp.key_responsibilities?.filter(resp => {
                                const respText = resp.description?.toLowerCase() || '';
                                return keywords.some(keyword => 
                                    respText.includes(keyword.toLowerCase())
                                );
                            }) || []
                        }));
                    }
                }

                // Include basic personal info for context
                if (data.personal_info) {
                    filteredData.personal_info = {
                        years_of_experience: data.personal_info.years_of_experience
                    };
                }

                return Object.keys(filteredData).length > 0 ? filteredData : data;
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting skill/experience data:', error);
            return null;
        }
    }

    /**
     * Get education data
     * @param {string} resumeId - Resume ID
     * @param {Array} keywords - Education keywords
     * @returns {Promise<Object|null>} Education data
     */
    async getEducationData(resumeId, keywords) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=education`
            });

            if (response && response.success && response.relevantData) {
                return response.relevantData;
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting education data:', error);
            return null;
        }
    }

    /**
     * Get personal data
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object|null>} Personal data
     */
    async getPersonalData(resumeId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=personal`
            });

            if (response && response.success && response.relevantData) {
                return response.relevantData;
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting personal data:', error);
            return null;
        }
    }

    /**
     * Get employment-related data (salary, availability, notice period)
     * @param {string} resumeId - Resume ID
     * @returns {Promise<Object|null>} Employment data
     */
    async getEmploymentData(resumeId) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=personal`
            });

            if (response && response.success && response.relevantData) {
                // Return only employment-related personal info
                const personalInfo = response.relevantData.personal_info || {};
                return {
                    personal_info: {
                        salary: personalInfo.salary,
                        location: personalInfo.location,
                        visa_required: personalInfo.visa_required,
                        years_of_experience: personalInfo.years_of_experience
                    }
                };
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting employment data:', error);
            return null;
        }
    }

    /**
     * Get general data for unclassified questions
     * @param {string} resumeId - Resume ID
     * @param {Array} keywords - Keywords to search for
     * @returns {Promise<Object|null>} General data
     */
    async getGeneralData(resumeId, keywords) {
        try {
            // For general questions, get a minimal but comprehensive dataset
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/resumes/${resumeId}/relevant-data?questionType=general`
            });

            if (response && response.success && response.relevantData) {
                const data = response.relevantData;
                
                // Return a minimal dataset with essential info
                return {
                    personal_info: {
                        name: data.personal_info?.name,
                        years_of_experience: data.personal_info?.years_of_experience,
                        location: data.personal_info?.location
                    },
                    summary: data.summary,
                    // Only include top skills
                    skills: data.skills?.slice(0, 5) || [],
                    // Only include recent experience
                    experiences: data.experiences?.slice(0, 2) || []
                };
            }
            
            return null;
        } catch (error) {
            console.error('AISmartDataRetriever: Error getting general data:', error);
            return null;
        }
    }

    /**
     * Generate intelligent fallback response when no data is found
     * @param {Object} classification - Question classification
     * @param {Array} options - Available answer options
     * @returns {string|null} Fallback answer
     */
    generateFallbackResponse(classification, options = null) {
        if (!options || !Array.isArray(options) || options.length === 0) {
            return null;
        }

        console.log('AISmartDataRetriever: Generating fallback response for:', classification.question_type);

        switch (classification.question_type) {
            case 'language_proficiency':
                // Choose a favorable but realistic language level
                if (options.includes('Gut')) return 'Gut';
                if (options.includes('Verhandlungssicher')) return 'Verhandlungssicher';
                if (options.includes('Good')) return 'Good';
                if (options.includes('Intermediate')) return 'Intermediate';
                break;
                
            case 'years_experience':
                // Always return at least 5 years as per user preference
                return '5';
                
            case 'skill_level':
                // Choose intermediate level for unknown skills
                if (options.includes('Intermediate')) return 'Intermediate';
                if (options.includes('Good')) return 'Good';
                if (options.includes('Mittel')) return 'Mittel';
                break;
                
            case 'visa_status':
                // Assume no visa required for better job prospects
                if (options.includes('No')) return 'No';
                if (options.includes('Nein')) return 'Nein';
                break;
        }

        // Default to second option if available (often a safe middle choice)
        return options.length > 1 ? options[1] : options[0];
    }

    /**
     * Clear data cache
     */
    clearCache() {
        this.dataCache.clear();
        console.log('AISmartDataRetriever: Cache cleared');
    }

    /**
     * Get cache statistics
     * @returns {Object} Cache stats
     */
    getCacheStats() {
        return {
            size: this.dataCache.size,
            keys: Array.from(this.dataCache.keys())
        };
    }
}

export default AISmartDataRetriever; 