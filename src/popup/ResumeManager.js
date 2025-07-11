import React, { useState, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, Star, StarOff, Plus, Check, X, AlertCircle } from 'lucide-react';

const ResumeManager = ({ currentUser, onResumeUpdate }) => {
    const [resumes, setResumes] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadForm, setUploadForm] = useState({
        name: '',
        short_description: '',
        is_default: false
    });
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');
    const [loading, setLoading] = useState(false);

    // Load resumes when component mounts or user changes
    useEffect(() => {
        if (currentUser) {
            loadResumes();
        }
    }, [currentUser]);

    const loadResumes = async () => {
        if (!currentUser) {
            console.log('ResumeManager: No current user, skipping resume load');
            return;
        }
        
        console.log('ResumeManager: Loading resumes for user:', currentUser.id);
        setLoading(true);
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'GET',
                url: `/users/${currentUser.id}/resumes`
            });

            console.log('ResumeManager: API response:', response);

            if (response && response.success) {
                console.log('ResumeManager: Successfully loaded resumes:', response.resumes);
                setResumes(response.resumes || []);
                setStatusMessage(''); // Clear any previous error messages
            } else {
                console.error('ResumeManager: Failed to load resumes:', response);
                setStatusMessage(response?.error || 'Failed to load resumes');
            }
        } catch (error) {
            console.error('ResumeManager: Error loading resumes:', error);
            setStatusMessage('Error loading resumes: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

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

        setIsUploading(true);
        setUploadProgress(0);
        
        try {
            // Convert file to ArrayBuffer since File objects can't be passed through Chrome messages
            const fileBuffer = await selectedFile.arrayBuffer();
            
            // Create file metadata
            const fileData = {
                buffer: fileBuffer,
                name: selectedFile.name,
                type: selectedFile.type,
                size: selectedFile.size,
                lastModified: selectedFile.lastModified
            };

            // Use Chrome runtime to make the upload request
            const response = await chrome.runtime.sendMessage({
                action: 'uploadResume',
                userId: currentUser.id,
                fileData: fileData,
                formData: {
                    name: uploadForm.name || selectedFile.name,
                    short_description: uploadForm.short_description || '',
                    is_default: uploadForm.is_default
                }
            });

            if (response.success) {
                setStatusMessage('Resume uploaded successfully!');
                setSelectedFile(null);
                setUploadForm({ name: '', short_description: '', is_default: false });
                setShowUploadForm(false);
                await loadResumes();
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(response.error || 'Upload failed');
            }
        } catch (error) {
            console.error('Upload error:', error);
            setStatusMessage('Upload failed: ' + error.message);
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
            setTimeout(() => setStatusMessage(''), 3000);
        }
    };

    const handleSetDefault = async (resumeId) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'PUT',
                url: `/resumes/${resumeId}/default`
            });

            if (response.success) {
                setStatusMessage('Default resume updated');
                await loadResumes();
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(response.error || 'Failed to set default');
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
            const response = await chrome.runtime.sendMessage({
                action: 'apiRequest',
                method: 'DELETE',
                url: `/resumes/${resumeId}`
            });

            if (response.success) {
                setStatusMessage('Resume deleted successfully');
                await loadResumes();
                
                if (onResumeUpdate) {
                    onResumeUpdate();
                }
            } else {
                setStatusMessage(response.error || 'Failed to delete resume');
            }
        } catch (error) {
            console.error('Error deleting resume:', error);
            setStatusMessage('Error deleting resume');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const handleDownload = async (resumeId, resumeName) => {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'downloadResume',
                resumeId: resumeId,
                fileName: resumeName
            });

            if (response.success) {
                setStatusMessage('Resume downloaded');
            } else {
                setStatusMessage(response.error || 'Download failed');
            }
        } catch (error) {
            console.error('Error downloading resume:', error);
            setStatusMessage('Error downloading resume');
        }
        
        setTimeout(() => setStatusMessage(''), 3000);
    };

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (extension) => {
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
    };

    if (!currentUser) {
        return (
            <div className="resume-manager">
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
                        <strong>Debug Info:</strong><br />
                        Current User: {currentUser ? 'Available' : 'Not Available'}<br />
                        User Object: {JSON.stringify(currentUser)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="tab-content">
            <div className="resume-section">
                <h2>Resume Management</h2>
                
                <button 
                    onClick={() => setShowUploadForm(!showUploadForm)}
                    className="primary-button"
                    style={{ marginBottom: '20px' }}
                >
                    <Plus size={16} />
                    Upload Resume
                </button>

                {/* Debug Info */}
                <div style={{ 
                    fontSize: '12px', 
                    color: '#666', 
                    marginBottom: '10px', 
                    padding: '8px', 
                    background: '#f5f5f5', 
                    borderRadius: '4px' 
                }}>
                    <strong>Debug Info:</strong><br />
                    Current User: {currentUser ? `${currentUser.username} (${currentUser.id})` : 'None'}<br />
                    Loading: {loading ? 'Yes' : 'No'}<br />
                    Resumes Count: {resumes.length}
                </div>

                {statusMessage && (
                    <div className="status-message">
                        {statusMessage}
                    </div>
                )}

                {showUploadForm && (
                    <div className="upload-form">
                        <h4>Upload New Resume</h4>
                        
                        <div className="form-group">
                            <label htmlFor="resume-file">Select Resume File</label>
                            <div className="file-input-container">
                                <input
                                    id="resume-file"
                                    type="file"
                                    accept=".pdf,.doc,.docx,.txt,.yaml,.yml,.json"
                                    onChange={handleFileSelect}
                                    className="file-input"
                                />
                                <label htmlFor="resume-file" className="file-input-label">
                                    <Upload size={16} />
                                    {selectedFile ? selectedFile.name : 'Choose file...'}
                                </label>
                            </div>
                            <p className="file-help">
                                Supported formats: PDF, DOC, DOCX, TXT, YAML, YML, JSON (max 5MB)
                            </p>
                        </div>

                        {selectedFile && (
                            <>
                                <div className="form-group">
                                    <label htmlFor="resume-name">Resume Name</label>
                                    <input
                                        id="resume-name"
                                        type="text"
                                        value={uploadForm.name}
                                        onChange={(e) => setUploadForm({...uploadForm, name: e.target.value})}
                                        placeholder="Enter resume name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label htmlFor="resume-description">Description (optional)</label>
                                    <textarea
                                        id="resume-description"
                                        value={uploadForm.short_description}
                                        onChange={(e) => setUploadForm({...uploadForm, short_description: e.target.value})}
                                        placeholder="Brief description of this resume"
                                        rows="2"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="checkbox-label">
                                        <input
                                            type="checkbox"
                                            checked={uploadForm.is_default}
                                            onChange={(e) => setUploadForm({...uploadForm, is_default: e.target.checked})}
                                        />
                                        Set as default resume
                                    </label>
                                </div>

                                <div className="form-actions">
                                    <button 
                                        onClick={handleUpload}
                                        disabled={isUploading}
                                        className="primary-button"
                                    >
                                        {isUploading ? 'Uploading...' : 'Upload Resume'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setShowUploadForm(false);
                                            setSelectedFile(null);
                                            setUploadForm({ name: '', short_description: '', is_default: false });
                                        }}
                                        className="secondary-button"
                                    >
                                        Cancel
                                    </button>
                                </div>

                                {isUploading && (
                                    <div className="upload-progress">
                                        <div className="progress-bar">
                                            <div 
                                                className="progress-fill" 
                                                style={{ width: `${uploadProgress}%` }}
                                            />
                                        </div>
                                        <span>{uploadProgress}%</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                <div className="resumes-list">
                    {loading ? (
                        <div className="loading">Loading resumes...</div>
                    ) : resumes.length === 0 ? (
                        <div className="no-resumes">
                            <FileText size={48} />
                            <p>No resumes uploaded yet</p>
                            <p>Upload your first resume to get started</p>
                        </div>
                    ) : (
                        resumes.map((resume) => (
                            <div key={resume.id} className={`resume-item ${resume.is_default ? 'default' : ''}`}>
                                <div className="resume-info">
                                    <div className="resume-header">
                                        <span className="file-icon">{getFileIcon(resume.extension)}</span>
                                        <div className="resume-details">
                                            <h4>{resume.name}</h4>
                                            <p className="resume-meta">
                                                {resume.extension?.toUpperCase()} • 
                                                {new Date(resume.creation_date).toLocaleDateString()}
                                                {resume.is_default && <span className="default-badge">Default</span>}
                                            </p>
                                            {resume.short_description && (
                                                <p className="resume-description">{resume.short_description}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="resume-actions">
                                    <button
                                        onClick={() => handleSetDefault(resume.id)}
                                        className={`action-button ${resume.is_default ? 'default' : ''}`}
                                        title={resume.is_default ? 'Default resume' : 'Set as default'}
                                    >
                                        {resume.is_default ? <Star size={16} /> : <StarOff size={16} />}
                                    </button>
                                    
                                    <button
                                        onClick={() => handleDownload(resume.id, resume.name)}
                                        className="action-button"
                                        title="Download resume"
                                    >
                                        <Download size={16} />
                                    </button>
                                    
                                    <button
                                        onClick={() => handleDelete(resume.id)}
                                        className="action-button danger"
                                        title="Delete resume"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default ResumeManager; 