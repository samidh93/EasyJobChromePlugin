import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Star, StarOff, Plus, Check, X, AlertCircle } from 'lucide-react';
import { resumeManager } from './index.js';
import { formatLocalTime } from '../utils/timezone.js';

const ResumeManagerComponent = ({ currentUser, onResumeUpdate }) => {
    const [resumes, setResumes] = useState([]);
    const [defaultResume, setDefaultResume] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        short_description: '',
        is_default: false
    });
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    // Listen to resume manager state changes
    useEffect(() => {
        const unsubscribe = resumeManager.addListener((state) => {
            setResumes(state.resumes);
            setDefaultResume(state.defaultResume);
            setLoading(state.loading);
            setUploading(state.uploading);
            setUploadProgress(state.uploadProgress);
        });

        return unsubscribe;
    }, []);

    // Load resumes when component mounts or user changes
    useEffect(() => {
        if (currentUser) {
            resumeManager.loadResumes(currentUser.id);
        }
    }, [currentUser]);

    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (file) {
            setSelectedFile(file);
            
            // Auto-fill form with file name
            const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
            setUploadForm({
                ...uploadForm,
                name: fileName
            });
        }
    };

    const handleUpload = async () => {
        if (!selectedFile || !currentUser) {
            setStatusMessage('Please select a file');
            return;
        }

        try {
            // Convert file to ArrayBuffer since File objects can't be passed through Chrome messages
            const fileBuffer = await selectedFile.arrayBuffer();
            
            // Convert ArrayBuffer to Uint8Array for serialization
            const uint8Array = new Uint8Array(fileBuffer);
            
            // Create file metadata
            const fileData = {
                buffer: Array.from(uint8Array), // Convert to regular array for serialization
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                lastModified: selectedFile.lastModified
            };

            const result = await resumeManager.uploadResume(currentUser.id, fileData, {
                name: uploadForm.name || selectedFile.name,
                short_description: uploadForm.short_description || '',
                is_default: uploadForm.is_default
            });

            if (result.success) {
                setStatusMessage('Resume uploaded successfully!');
                setSelectedFile(null);
                setUploadForm({ name: '', short_description: '', is_default: false });
                setShowUploadForm(false);
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(result.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatusMessage('Upload failed: ' + error.message);
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleSetDefault = async (resumeId) => {
        try {
            const result = await resumeManager.setDefaultResume(resumeId);
            if (result.success) {
                setStatusMessage('Default resume updated');
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(result.error || 'Failed to set default');
            }
        } catch (error) {
            console.error('Error setting default:', error);
            setStatusMessage('Error setting default resume');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleDelete = async (resumeId) => {
        if (!confirm('Are you sure you want to delete this resume?')) {
            return;
        }

        try {
            const result = await resumeManager.deleteResume(resumeId);
            if (result.success) {
                setStatusMessage('Resume deleted successfully');
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(result.error || 'Failed to delete resume');
            }
        } catch (error) {
            console.error('Error deleting resume:', error);
            setStatusMessage('Error deleting resume');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleDownload = async (resumeId, resumeName) => {
        try {
            const result = await resumeManager.downloadResume(resumeId, resumeName);
            if (result.success) {
                setStatusMessage('Resume downloaded');
            } else {
                setStatusMessage(result.error || 'Download failed');
            }
        } catch (error) {
            console.error('Error downloading resume:', error);
            setStatusMessage('Error downloading resume');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const formatFileSize = (bytes) => {
        return resumeManager.formatFileSize(bytes);
    };

    const getFileIcon = (extension) => {
        return resumeManager.getFileIcon(extension);
    };

    if (!currentUser) {
        return (
            <div className="tab-content">
                <div className="no-user">
                    <AlertCircle size={24} />
                    <p>Please log in to manage resumes</p>
                    <div style={{ 
                        fontSize: '12px', 
                        color: '#666', 
                        marginTop: '10px', 
                        padding: '8px', 
                        background: '#f5f5f5', 
                        borderRadius: '4px' 
                    }}>
                        <strong>Note:</strong> Resume management requires user authentication.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <div className="resume-section">
                <div className="section-header">
                    <h2>Resume Management</h2>
                    <button 
                        className="primary-button"
                        onClick={() => setShowUploadForm(true)}
                        disabled={loading || uploading}
                    >
                        <Plus size={16} />
                        Upload Resume
                    </button>
                </div>

            {statusMessage && (
                <div className={`status-message ${statusMessage.includes('Error') || statusMessage.includes('Failed') ? 'error' : 'success'}`}>
                    {statusMessage}
                </div>
            )}

            {showUploadForm && (
                <div className="upload-form">
                    <h4>Upload Resume</h4>
                    
                    <div className="form-group">
                        <label>Select File</label>
                        <input
                            type="file"
                            accept=".pdf,.doc,.docx,.txt,.yaml,.yml,.json"
                            onChange={handleFileSelect}
                            disabled={uploading}
                        />
                        {selectedFile && (
                            <div className="file-info">
                                <span>Selected: {selectedFile.name}</span>
                                <span>Size: {formatFileSize(selectedFile.size)}</span>
                            </div>
                        )}
                    </div>

                    <div className="form-group">
                        <label>Resume Name</label>
                        <input
                            type="text"
                            value={uploadForm.name}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                            placeholder="Enter a name for this resume"
                            disabled={uploading}
                        />
                    </div>

                    <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea
                            value={uploadForm.short_description}
                            onChange={(e) => setUploadForm(prev => ({ ...prev, short_description: e.target.value }))}
                            placeholder="Brief description of this resume"
                            rows={3}
                            disabled={uploading}
                        />
                    </div>

                    <div className="form-group">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={uploadForm.is_default}
                                onChange={(e) => setUploadForm(prev => ({ ...prev, is_default: e.target.checked }))}
                                disabled={uploading}
                            />
                            Set as default resume
                        </label>
                    </div>

                    {uploading && (
                        <div className="upload-progress">
                            <div className="progress-bar">
                                <div 
                                    className="progress-fill" 
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <span>Uploading... {uploadProgress}%</span>
                        </div>
                    )}

                    <div className="form-actions">
                        <button 
                            className="primary-button"
                            onClick={handleUpload}
                            disabled={!selectedFile || uploading}
                        >
                            {uploading ? 'Uploading...' : 'Upload Resume'}
                        </button>
                        <button 
                            className="secondary-button"
                            onClick={() => {
                                setShowUploadForm(false);
                                setSelectedFile(null);
                                setUploadForm({ name: '', short_description: '', is_default: false });
                            }}
                            disabled={uploading}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            <div className="resumes-list">
                {loading ? (
                    <div className="loading-state">Loading resumes...</div>
                ) : resumes.length === 0 ? (
                    <div className="empty-state">
                        <FileText size={48} />
                        <p>No resumes uploaded</p>
                        <p>Upload your first resume to get started</p>
                    </div>
                ) : (
                    resumes.map(resume => (
                        <div key={resume.id} className={`resume-item ${resume.is_default ? 'default' : ''}`}>
                            <div className="resume-info">
                                <span className="file-icon">
                                    {getFileIcon(resume.extension)}
                                </span>
                                <div className="resume-details">
                                    <h4>
                                        {resume.name}
                                        {resume.has_structured_data && (
                                            <Check className="parsed-icon" size={16} title="Resume parsed successfully" />
                                        )}
                                    </h4>
                                    {resume.short_description && (
                                        <p className="resume-description">{resume.short_description}</p>
                                    )}
                                    <div className="resume-meta">
                                        <span>Type: {resume.extension.toUpperCase()}</span>
                                        <span>Uploaded: {formatLocalTime(resume.creation_date, 'date')}</span>
                                        {resume.updated_date !== resume.creation_date && (
                                            <span>Updated: {formatLocalTime(resume.updated_date, 'date')}</span>
                                        )}
                                        {resume.has_structured_data && (
                                            <span className="parsed-status">✓ Parsed</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="resume-actions">
                                {resume.is_default && (
                                    <span className="default-badge">
                                        <Star size={16} />
                                        Default
                                    </span>
                                )}
                                {!resume.is_default && (
                                    <button 
                                        className="action-button"
                                        onClick={() => handleSetDefault(resume.id)}
                                        disabled={loading}
                                        title="Set as default"
                                    >
                                        <StarOff size={16} />
                                    </button>
                                )}
                                <button 
                                    className="action-button"
                                    onClick={() => handleDownload(resume.id, resume.name)}
                                    disabled={loading}
                                    title="Download resume"
                                >
                                    <Download size={16} />
                                </button>
                                <button 
                                    className="action-button danger"
                                    onClick={() => handleDelete(resume.id)}
                                    disabled={loading}
                                    title="Delete resume"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            {/* Show parsed information if available */}
                            {resume.has_structured_data && (
                                <div className="resume-preview">
                                    <div className="preview-section">
                                        <strong>Contact:</strong> {resume.structured_data?.personal_info?.email || 'Not available'}
                                    </div>
                                    <div className="preview-section">
                                        <strong>Skills:</strong> {resume.structured_data?.skills?.length || 0} skills
                                    </div>
                                    <div className="preview-section">
                                        <strong>Experience:</strong> {resume.structured_data?.experiences?.length || 0} positions
                                    </div>
                                    <div className="preview-section">
                                        <strong>Languages:</strong> {resume.structured_data?.languages?.length || 0} languages
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
            </div>
        </div>
    );
};

export default ResumeManagerComponent; 