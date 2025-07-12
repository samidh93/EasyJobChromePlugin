class ResumeManager {
    constructor() {
        this.resumes = [];
        this.defaultResume = null;
        this.listeners = [];
        this.loading = false;
        this.uploading = false;
        this.uploadProgress = 0;
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
            
            const response = await chrome.runtime.sendMessage({
                action: 'uploadResume',
                userId: userId,
                fileData: fileData,
                formData: formData
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
}

// Create singleton instance
const resumeManager = new ResumeManager();

export default resumeManager; 