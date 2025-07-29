class ResumeManager {
    constructor() {
        this.resumes = [];
        this.defaultResume = null;
        this.listeners = [];
        this.loading = false;
        this.uploading = false;
        this.uploadProgress = 0;
        
        // Test ResumeParser on initialization
        setTimeout(() => {
            console.log('ResumeManager: Testing ResumeParser on init...');
            this.testResumeParser();
        }, 1000);
    }

    // Add listener for resume state changes
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of resume state changes
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    resumes: this.resumes,
                    defaultResume: this.defaultResume,
                    loading: this.loading,
                    uploading: this.uploading,
                    uploadProgress: this.uploadProgress
                });
            } catch (error) {
                console.error('Error in resume listener:', error);
            }
        });
    }

    // Get current resume state
    getResumeState() {
        return {
            resumes: this.resumes,
            defaultResume: this.defaultResume,
            loading: this.loading,
            uploading: this.uploading,
            uploadProgress: this.uploadProgress
        };
    }

    // Load resumes for a user
    async loadResumes(userId) {
        if (!userId) {
            console.log('ResumeManager: No user ID provided, skipping resume load');
            this.resumes = [];
            this.defaultResume = null;
            this.notifyListeners();
            return { success: false, error: 'No user ID provided' };
        }

        this.loading = true;
        this.notifyListeners();

        try {
            console.log('ResumeManager: Loading resumes for user:', userId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${userId}/resumes`
            });

            if (response && response.success) {
                console.log('ResumeManager: Successfully loaded resumes:', response.resumes);
                
                this.resumes = response.resumes || [];
                this.defaultResume = this.resumes.find(resume => resume.is_default) || null;
                
                this.loading = false;
                this.notifyListeners();
                return { success: true, resumes: this.resumes, defaultResume: this.defaultResume };
            } else {
                console.error('ResumeManager: Failed to load resumes:', response);
                this.resumes = [];
                this.defaultResume = null;
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to load resumes' };
            }
        } catch (error) {
            console.error('ResumeManager: Error loading resumes:', error);
            this.resumes = [];
            this.defaultResume = null;
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Upload a new resume
    async uploadResume(userId, fileData, formData) {
        if (!userId || !fileData) {
            return { success: false, error: 'No user ID or file data provided' };
        }

        this.uploading = true;
        this.uploadProgress = 0;
        this.notifyListeners();

        try {
            console.log('ResumeManager: Uploading resume for user:', userId);
            
            // Step 1: Parse resume if ResumeParser is available
            let structuredData = null;
            let formattedText = '';
            let fileType = 'unknown';
            
            if (window.ResumeParser) {
                try {
                    console.log('ResumeManager: ResumeParser available, parsing resume...');
                    console.log('ResumeManager: File data:', {
                        name: fileData.name,
                        type: fileData.type,
                        size: fileData.size,
                        hasBuffer: !!fileData.buffer
                    });
                    
                    const parser = new window.ResumeParser();
                    const parsedData = await parser.parseResume(fileData);
                    
                    console.log('ResumeManager: Resume parsing completed');
                    console.log('ResumeManager: Parsed data type:', parsedData.type);
                    console.log('ResumeManager: Has structured data:', !!parsedData.structured);
                    console.log('ResumeManager: Formatted text length:', parsedData.formatted?.length || 0);
                    console.log('ResumeManager: Metadata:', parsedData.metadata);
                    
                    // Check for PDF-specific issues
                    if (parsedData.type === 'pdf' && parsedData.metadata) {
                        console.log('ResumeManager: PDF parsing details:');
                        console.log('ResumeManager: - Pages:', parsedData.metadata.pages);
                        console.log('ResumeManager: - Links found:', parsedData.metadata.links?.length || 0);
                        console.log('ResumeManager: - Links:', parsedData.metadata.links);
                        console.log('ResumeManager: - Page details:', parsedData.metadata.pageDetails);
                        console.log('ResumeManager: - Issues detected:', parsedData.metadata.issues);
                        
                        if (parsedData.metadata.issues && parsedData.metadata.issues.length > 0) {
                            console.warn('ResumeManager: PDF parsing issues detected:', parsedData.metadata.issues);
                        }
                    }
                    
                    structuredData = parsedData.structured;
                    formattedText = parsedData.formatted || '';
                    fileType = parsedData.type || 'unknown';
                    
                    console.log('ResumeManager: Formatted text preview (first 200 chars):', formattedText.substring(0, 200));
                    console.log('ResumeManager: Formatted text preview (last 200 chars):', formattedText.substring(Math.max(0, formattedText.length - 200)));
                    
                    // Check for common content indicators
                    const hasEmail = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(formattedText);
                    const hasPhone = /[\+]?[1-9]?[\d\s\-\(\)]{7,20}/.test(formattedText);
                    const hasLinks = /https?:\/\/[^\s]+/gi.test(formattedText);
                    
                    console.log('ResumeManager: Content analysis:');
                    console.log('ResumeManager: - Contains email:', hasEmail);
                    console.log('ResumeManager: - Contains phone:', hasPhone);
                    console.log('ResumeManager: - Contains links:', hasLinks);
                    
                    if (!hasEmail && !hasPhone) {
                        console.warn('ResumeManager: No email or phone found in parsed text - possible parsing issue');
                    }
                    
                    // Convert to structured format if needed
                    if (structuredData) {
                        console.log('ResumeManager: Converting structured data...');
                        structuredData = this.convertToStructuredFormat(structuredData);
                    } else {
                        console.log('ResumeManager: No structured data, using AI to extract structured data from formatted text...');
                        // For PDF/TXT files, use AI to extract structured data
                        try {
                            const AIDataExtractor = (await import('../../ai/AIDataExtractor.js')).default;
                            const aiExtractor = new AIDataExtractor(userId);
                            console.log('ResumeManager: AI extractor created, extracting structured data...');
                            structuredData = await aiExtractor.extractStructuredData(formattedText);
                            console.log('ResumeManager: AI extraction successful, converting to database format...');
                            structuredData = this.convertToStructuredFormat(structuredData);
                        } catch (aiError) {
                            console.error('ResumeManager: AI extraction failed, falling back to basic extraction:', aiError);
                            // Fallback to basic extraction if AI fails
                            structuredData = this.extractBasicInfo(formattedText, formData);
                        }
                    }
                } catch (error) {
                    console.error('ResumeManager: Error parsing resume:', error);
                    console.error('ResumeManager: Error details:', {
                        message: error.message,
                        stack: error.stack,
                        fileData: {
                            name: fileData.name,
                            type: fileData.type,
                            hasBuffer: !!fileData.buffer
                        }
                    });
                    // Continue with upload even if parsing fails
                }
            } else {
                console.log('ResumeManager: ResumeParser not available, skipping parsing');
            }
            
            // Step 2: Upload with structured data
            const uploadFormData = {
                ...formData,
                structured_data: structuredData ? JSON.stringify(structuredData) : null,
                formatted_text: formattedText,
                file_type: fileType
            };
            
            console.log('ResumeManager: Uploading with form data:', {
                hasStructuredData: !!uploadFormData.structured_data,
                structuredDataLength: uploadFormData.structured_data?.length,
                hasFormattedText: !!uploadFormData.formatted_text,
                formattedTextLength: uploadFormData.formatted_text?.length,
                fileType: uploadFormData.file_type
            });
            
            const response = await chrome.runtime.sendMessage({
                action: 'uploadResume',
                userId: userId,
                fileData: fileData,
                formData: uploadFormData
            });

            if (response && response.success) {
                console.log('ResumeManager: Successfully uploaded resume');
                
                // Reload resumes to get the updated list
                await this.loadResumes(userId);
                return { success: true };
            } else {
                console.error('ResumeManager: Failed to upload resume:', response);
                this.uploading = false;
                this.uploadProgress = 0;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to upload resume' };
            }
        } catch (error) {
            console.error('ResumeManager: Error uploading resume:', error);
            this.uploading = false;
            this.uploadProgress = 0;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Set default resume
    async setDefaultResume(resumeId) {
        this.loading = true;
        this.notifyListeners();

        try {
            console.log('ResumeManager: Setting default resume:', resumeId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'PUT',
                url: `/resumes/${resumeId}/default`
            });

            if (response && response.success) {
                console.log('ResumeManager: Successfully set default resume');
                
                // Update the default resume in the current list
                this.resumes = this.resumes.map(resume => ({
                    ...resume,
                    is_default: resume.id === resumeId
                }));
                this.defaultResume = this.resumes.find(resume => resume.id === resumeId);
                
                this.loading = false;
                this.notifyListeners();
                return { success: true };
            } else {
                console.error('ResumeManager: Failed to set default resume:', response);
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to set default resume' };
            }
        } catch (error) {
            console.error('ResumeManager: Error setting default resume:', error);
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Delete resume
    async deleteResume(resumeId) {
        this.loading = true;
        this.notifyListeners();

        try {
            console.log('ResumeManager: Deleting resume:', resumeId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'DELETE',
                url: `/resumes/${resumeId}`
            });

            if (response && response.success) {
                console.log('ResumeManager: Successfully deleted resume');
                
                // Remove the deleted resume from the list
                this.resumes = this.resumes.filter(resume => resume.id !== resumeId);
                
                // Update default resume if the deleted one was default
                if (this.defaultResume && this.defaultResume.id === resumeId) {
                    this.defaultResume = this.resumes.find(resume => resume.is_default) || null;
                }
                
                this.loading = false;
                this.notifyListeners();
                return { success: true };
            } else {
                console.error('ResumeManager: Failed to delete resume:', response);
                this.loading = false;
                this.notifyListeners();
                return { success: false, error: response?.error || 'Failed to delete resume' };
            }
        } catch (error) {
            console.error('ResumeManager: Error deleting resume:', error);
            this.loading = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Download resume
    async downloadResume(resumeId, fileName) {
        try {
            console.log('ResumeManager: Downloading resume:', resumeId);
            
            const response = await chrome.runtime.sendMessage({
                action: 'downloadResume',
                resumeId: resumeId,
                fileName: fileName
            });

            if (response && response.success) {
                console.log('ResumeManager: Successfully downloaded resume');
                return { success: true };
            } else {
                console.error('ResumeManager: Failed to download resume:', response);
                return { success: false, error: response?.error || 'Failed to download resume' };
            }
        } catch (error) {
            console.error('ResumeManager: Error downloading resume:', error);
            return { success: false, error: error.message };
        }
    }

    // Update upload progress
    updateUploadProgress(progress) {
        this.uploadProgress = progress;
        this.notifyListeners();
    }

    // Check if user has resumes
    hasResumes() {
        return this.resumes.length > 0;
    }

    // Get resume by ID
    getResumeById(resumeId) {
        return this.resumes.find(resume => resume.id === resumeId);
    }

    // Get default resume
    getDefaultResume() {
        return this.defaultResume;
    }

    // Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Get file icon based on extension
    getFileIcon(extension) {
        switch (extension?.toLowerCase()) {
            case 'pdf':
                return '📄';
            case 'doc':
            case 'docx':
                return '📝';
            case 'txt':
                return '📃';
            case 'yaml':
            case 'yml':
                return '⚙️';
            case 'json':
                return '🔧';
            default:
                return '📋';
        }
    }

    // Clear all data
    clear() {
        this.resumes = [];
        this.defaultResume = null;
        this.loading = false;
        this.uploading = false;
        this.uploadProgress = 0;
        this.notifyListeners();
    }

    // Test ResumeParser functionality
    testResumeParser() {
        console.log('ResumeManager: Testing ResumeParser...');
        
        if (!window.ResumeParser) {
            console.error('ResumeManager: ResumeParser not available');
            return false;
        }
        
        try {
            const parser = new window.ResumeParser();
            console.log('ResumeManager: ResumeParser instance created successfully');
            console.log('ResumeManager: ResumeParser methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(parser)));
            
            // Test with a simple YAML string
            const testYaml = `
personal_information:
  name: "Test User"
  email: "test@example.com"
  phone: "1234567890"
summary: "Test summary"
experiences:
  - position: "Test Position"
    company: "Test Company"
`;
            
            const testBlob = new Blob([testYaml], { type: 'text/yaml' });
            const testFile = new File([testBlob], 'test.yaml', { type: 'text/yaml' });
            
            console.log('ResumeManager: Testing with mock YAML file...');
            console.log('ResumeManager: Test file properties:', {
                name: testFile.name,
                type: testFile.type,
                size: testFile.size,
                isFile: testFile instanceof File,
                isBlob: testFile instanceof Blob
            });
            
            parser.parseResume(testFile).then(result => {
                console.log('ResumeManager: Test parsing successful:', result);
                console.log('ResumeManager: Test result structure:', {
                    type: result.type,
                    hasStructured: !!result.structured,
                    structuredKeys: result.structured ? Object.keys(result.structured) : [],
                    formattedLength: result.formatted?.length
                });
            }).catch(error => {
                console.error('ResumeManager: Test parsing failed:', error);
                console.error('ResumeManager: Test error details:', {
                    message: error.message,
                    stack: error.stack
                });
            });
            
            return true;
        } catch (error) {
            console.error('ResumeManager: Error creating ResumeParser instance:', error);
            return false;
        }
    }

    // Convert parsed data to structured format (similar to Python script)
    convertToStructuredFormat(parsedData) {
        console.log('ResumeManager: Converting parsed data to structured format...');
        console.log('ResumeManager: Input parsed data:', parsedData);
        console.log('ResumeManager: Input data keys:', parsedData ? Object.keys(parsedData) : []);
        
        // Handle both flat structure (from AI) and nested structure (from YAML/JSON)
        let personalInfo = {};
        if (parsedData.personal_information || parsedData.personalInfo) {
            // Nested structure (from YAML/JSON files)
            personalInfo = parsedData.personal_information || parsedData.personalInfo || {};
        } else {
            // Flat structure (from AI extraction) - extract personal info from top level
            personalInfo = {
                name: parsedData.name || '',
                surname: parsedData.surname || '',
                email: parsedData.email || '',
                phone: parsedData.phone || '',
                phone_prefix: parsedData.phone_prefix || '',
                location: parsedData.location || '',
                city: parsedData.city || '',
                country: parsedData.country || '',
                citizenship: parsedData.citizenship || '',
                visa_required: parsedData.visa_required || '',
                salary: parsedData.salary || '',
                gender: parsedData.gender || '',
                ethnicity: parsedData.ethnicity || parsedData.ethinicity || '',
                years_of_experience: parsedData.years_of_experience || '',
                driver_license: parsedData.driver_license || '',
                github: parsedData.github || '',
                linkedin: parsedData.linkedin || ''
            };
        }
        
        console.log('ResumeManager: Personal info extracted:', personalInfo);
        
        const result = {
            personal_info: personalInfo,
            summary: {
                text: parsedData.summary || ''
            },
            experiences: parsedData.experiences || parsedData.experience || [],
            educations: parsedData.education || [],
            skills: parsedData.skills || [],
            languages: parsedData.languages || [],
            projects: parsedData.projects || [],
            certifications: parsedData.certifications || [],
            interests: parsedData.interests || []
        };
        
        console.log('ResumeManager: Converted structured data:', result);
        console.log('ResumeManager: Structured data keys:', Object.keys(result));
        console.log('ResumeManager: Personal info keys:', Object.keys(result.personal_info));
        console.log('ResumeManager: Personal info values:', result.personal_info);
        console.log('ResumeManager: Experiences count:', result.experiences.length);
        console.log('ResumeManager: Skills count:', result.skills.length);
        
        return result;
    }

    // Extract basic info from formatted text (fallback for PDF/TXT)
    extractBasicInfo(formattedText, formData) {
        console.log('ResumeManager: Extracting basic info from formatted text...');
        console.log('ResumeManager: Text length:', formattedText?.length);
        console.log('ResumeManager: Form data:', formData);
        
        // Basic extraction for non-structured files
        const emailMatch = formattedText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
        const phoneMatch = formattedText.match(/[\+]?[1-9]?[\d\s\-\(\)]{7,20}/);
        
        // Try to extract name from the beginning of the text
        const lines = formattedText.split('\n').filter(line => line.trim().length > 0);
        const firstLine = lines[0] || '';
        const nameMatch = firstLine.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        
        // Try to extract skills (common programming languages, tools, etc.)
        const skillKeywords = [
            'Python', 'JavaScript', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
            'React', 'Angular', 'Vue', 'Node.js', 'Django', 'Flask', 'Spring',
            'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'Jenkins',
            'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Elasticsearch',
            'HTML', 'CSS', 'Sass', 'Less', 'TypeScript', 'GraphQL', 'REST',
            'Machine Learning', 'AI', 'Data Science', 'DevOps', 'Agile', 'Scrum'
        ];
        
        const foundSkills = skillKeywords.filter(skill => 
            formattedText.toLowerCase().includes(skill.toLowerCase())
        );
        
        console.log('ResumeManager: Extracted info:', {
            email: emailMatch ? emailMatch[0] : 'Not found',
            phone: phoneMatch ? phoneMatch[0].trim() : 'Not found',
            name: nameMatch ? nameMatch[1] : 'Not found',
            skillsFound: foundSkills.length
        });
        
        return {
            personal_info: {
                email: emailMatch ? emailMatch[0] : '',
                phone: phoneMatch ? phoneMatch[0].trim() : '',
                name: nameMatch ? nameMatch[1] : formData.name || '',
                surname: '',
                location: '',
                country: '',
                citizenship: '',
                visa_required: '',
                salary: '',
                gender: '',
                ethnicity: '',
                years_of_experience: '',
                driver_license: '',
                github: '',
                linkedin: ''
            },
            summary: {
                text: formattedText.substring(0, 1000) // First 1000 chars as summary
            },
            experiences: [],
            educations: [],
            skills: foundSkills.map(skill => ({ name: skill, level: 'Intermediate' })),
            languages: [],
            projects: [],
            certifications: [],
            interests: []
        };
    }
}

// Create singleton instance
const resumeManager = new ResumeManager();

export default resumeManager; 