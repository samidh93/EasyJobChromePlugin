/**
 * Resume Manager
 * Handles resume upload and download functionality
 */
class ResumeManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.DATABASE_AVAILABLE = true;
        this.API_BASE_URL = 'http://localhost:3001/api';
    }

    /**
     * Handle resume-related messages
     */
    async handleMessage(request, sendResponse) {
        const { action } = request;
        
        switch (action) {
            case 'uploadResume':
                await this.handleResumeUpload(request, sendResponse);
                break;
            case 'downloadResume':
                await this.handleResumeDownload(request, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown resume action' });
        }
    }

    /**
     * Handle resume upload
     */
    async handleResumeUpload(request, sendResponse) {
        try {
            const { userId, fileData, formData } = request;
            
            if (!this.DATABASE_AVAILABLE) {
                sendResponse({ success: false, error: 'Database not available' });
                return;
            }

            if (!fileData || !fileData.buffer) {
                sendResponse({ success: false, error: 'No file data provided' });
                return;
            }

            // Debug logging
            console.log('Upload debug - fileData.buffer type:', typeof fileData.buffer);
            console.log('Upload debug - fileData.buffer length:', fileData.buffer.length);
            console.log('Upload debug - first 10 bytes:', fileData.buffer.slice(0, 10));

            // Create FormData for file upload
            const uploadData = new FormData();
            
            // Convert array back to Uint8Array and then to Blob/File
            const uint8Array = new Uint8Array(fileData.buffer);
            console.log('Upload debug - uint8Array:', uint8Array.slice(0, 10));
            
            const fileBlob = new Blob([uint8Array], { type: fileData.type });
            console.log('Upload debug - blob size:', fileBlob.size);
            console.log('Upload debug - blob type:', fileBlob.type);
            
            const file = new File([fileBlob], fileData.name, {
                type: fileData.type,
                lastModified: fileData.lastModified
            });
            console.log('Upload debug - file size:', file.size);
            console.log('Upload debug - file type:', file.type);
            
            uploadData.append('resume', file);
            uploadData.append('name', formData.name || '');
            uploadData.append('short_description', formData.short_description || '');
            uploadData.append('is_default', formData.is_default || false);

            const response = await fetch(`${this.API_BASE_URL}/users/${userId}/resumes/upload`, {
                method: 'POST',
                body: uploadData
            });

            const result = await response.json();

            if (!response.ok) {
                sendResponse({ success: false, error: result.error || 'Upload failed' });
                return;
            }

            sendResponse({ success: true, ...result });
        } catch (error) {
            console.error('Resume upload error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle resume download
     */
    async handleResumeDownload(request, sendResponse) {
        try {
            const { resumeId, fileName } = request;
            
            if (!this.DATABASE_AVAILABLE) {
                sendResponse({ success: false, error: 'Database not available' });
                return;
            }

            // First get the resume details to get the proper filename and extension
            const resumeResponse = await fetch(`${this.API_BASE_URL}/resumes/${resumeId}`);
            
            if (!resumeResponse.ok) {
                const result = await resumeResponse.json();
                sendResponse({ success: false, error: result.error || 'Resume not found' });
                return;
            }

            const resumeData = await resumeResponse.json();
            const resume = resumeData.resume;
            
            // Construct proper filename with extension
            const properFileName = `${resume.name}.${resume.extension}`;

            // Now download the file
            const downloadResponse = await fetch(`${this.API_BASE_URL}/resumes/${resumeId}/download`);

            if (!downloadResponse.ok) {
                const result = await downloadResponse.json();
                sendResponse({ success: false, error: result.error || 'Download failed' });
                return;
            }

            // Get the file as blob
            const blob = await downloadResponse.blob();
            
            // Convert blob to data URL (since URL.createObjectURL is not available in service workers)
            const reader = new FileReader();
            reader.onloadend = () => {
                const dataUrl = reader.result;
                
                // Trigger download using data URL with proper filename
                chrome.downloads.download({
                    url: dataUrl,
                    filename: properFileName
                }, (downloadId) => {
                    if (chrome.runtime.lastError) {
                        sendResponse({ success: false, error: chrome.runtime.lastError.message });
                    } else {
                        sendResponse({ success: true, downloadId: downloadId });
                    }
                });
            };
            
            reader.onerror = () => {
                sendResponse({ success: false, error: 'Failed to read file data' });
            };
            
            // Read the blob as data URL
            reader.readAsDataURL(blob);
        } catch (error) {
            console.error('Resume download error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
}

export default ResumeManager; 