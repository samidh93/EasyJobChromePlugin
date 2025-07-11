const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import the UserService, ResumeService, AISettingsService, ApplicationService and models
const UserService = require('./database/user-service.cjs');
const ResumeService = require('./database/resume-service.cjs');
const AISettingsService = require('./database/ai-settings-service.cjs');
const ApplicationService = require('./database/application-service.cjs');
const { User } = require('./database/models/index.cjs');

const app = express();
const PORT = process.env.PORT || 3001;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename: userId_timestamp_originalname
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const userId = req.params.userId || 'unknown';
        cb(null, `${userId}_${uniqueSuffix}_${file.originalname}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Allow only specific file types
    const allowedTypes = ['.pdf', '.doc', '.docx', '.txt', '.yaml', '.yml', '.json'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (allowedTypes.includes(fileExtension)) {
        cb(null, true);
    } else {
        cb(new Error('Invalid file type. Only PDF, DOC, DOCX, TXT, YAML, YML, and JSON files are allowed.'), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Database configuration
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'easyjob_db',
    user: process.env.DB_USER || 'easyjob_user',
    password: process.env.DB_PASSWORD || 'easyjob_password',
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Middleware
app.use(cors({
    origin: ['chrome-extension://*', 'http://localhost:*'],
    credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'EasyJob API Server is running' });
});

// User registration endpoint
app.post('/api/users/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Username, email, and password are required' 
            });
        }

        // Use UserService for registration
        const newUser = await UserService.registerUser({
            username,
            email,
            password
        });

        res.json({ success: true, user: newUser });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// User login endpoint
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        // Use UserService for login
        const user = await UserService.loginUser(email, password);
        res.json({ success: true, user });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ success: false, error: error.message });
    }
});

// Get user profile endpoint
app.get('/api/users/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Use UserService for getting profile
        const profile = await UserService.getUserProfile(userId);
        res.json({ success: true, profile });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(404).json({ success: false, error: error.message });
    }
});

// Update user profile endpoint
app.put('/api/users/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        
        // Use UserService for updating profile
        const updatedUser = await UserService.updateUserProfile(userId, updateData);
        res.json({ success: true, user: updatedUser });
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get user statistics endpoint
app.get('/api/users/:userId/stats', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const stats = await UserService.getUserStats(userId);

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(404).json({ success: false, error: error.message });
    }
});

// Check if user exists endpoint
app.get('/api/users/exists/:email', async (req, res) => {
    try {
        const { email } = req.params;
        
        const exists = await UserService.userExists(email);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('User exists check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== RESUME ENDPOINTS =====

// Get all resumes for a user
app.get('/api/users/:userId/resumes', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const resumes = await ResumeService.getResumesByUserId(userId);

        res.json({ success: true, resumes: resumes });
    } catch (error) {
        console.error('Get resumes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume statistics (must be before the individual resume route)
app.get('/api/resumes/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        // Use ResumeService for getting stats
        const stats = userId ? 
            await ResumeService.getResumeStats(userId) : 
            await ResumeService.getGlobalResumeStats();
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get resume stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific resume by ID
app.get('/api/resumes/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        const resume = await ResumeService.getResumeById(resumeId);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        res.json({ success: true, resume: resume });
    } catch (error) {
        console.error('Get resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create a new resume
app.post('/api/users/:userId/resumes', async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, extension, path, short_description, is_default } = req.body;
        
        if (!name || !extension || !path) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, extension, and path are required' 
            });
        }

        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // If this is being set as default, unset other defaults first
        if (is_default) {
            await ResumeService.unsetOtherResumesAsDefault(userId);
        }

        const newResume = await ResumeService.createResume({
            name: name,
            extension: extension,
            path: path,
            short_description: short_description,
            user_id: userId,
            is_default: is_default || false
        });

        res.status(201).json({ success: true, resume: newResume });
    } catch (error) {
        console.error('Create resume error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update a resume
app.put('/api/resumes/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        const updateData = req.body;
        
        // Check if resume exists
        const resume = await ResumeService.getResumeById(resumeId);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        // If setting as default, unset other defaults for this user
        if (updateData.is_default) {
            await ResumeService.unsetOtherResumesAsDefault(resume.user_id);
        }

        const updatedResume = await ResumeService.updateResume(resumeId, updateData);

        res.json({ success: true, resume: updatedResume });
    } catch (error) {
        console.error('Update resume error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Set resume as default
app.put('/api/resumes/:resumeId/default', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Use ResumeService to set as default
        const updatedResume = await ResumeService.setResumeAsDefault(resumeId);

        res.json({ success: true, resume: updatedResume });
    } catch (error) {
        console.error('Set default resume error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete a resume
app.delete('/api/resumes/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Check if resume can be deleted
        const canDelete = await ResumeService.canDeleteResume(resumeId);

        if (!canDelete) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete resume: it is referenced by existing applications' 
            });
        }

        await ResumeService.deleteResume(resumeId);

        res.json({ success: true, message: 'Resume deleted successfully' });
    } catch (error) {
        console.error('Delete resume error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get applications that used a specific resume
app.get('/api/resumes/:resumeId/applications', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        const applications = await ApplicationService.getResumeApplications(resumeId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get resume applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== AI SETTINGS ENDPOINTS =====

// Get all AI settings for a user
app.get('/api/users/:userId/ai-settings', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const settings = await AISettingsService.getAISettingsByUserId(userId);

        res.json({ success: true, ai_settings: settings });
    } catch (error) {
        console.error('Get AI settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get AI settings statistics
app.get('/api/ai-settings/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        // Use AISettingsService for getting stats
        const stats = userId ? 
            await AISettingsService.getAISettingsStats(userId) : 
            await AISettingsService.getGlobalAISettingsStats();
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get AI settings stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available AI providers
app.get('/api/ai-settings/providers', async (req, res) => {
    try {
        const { userId } = req.query;
        
        const providers = await AISettingsService.getAIProviders(userId);

        res.json({ success: true, providers });
    } catch (error) {
        console.error('Get AI providers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available AI models for a provider
app.get('/api/ai-settings/providers/:provider/models', async (req, res) => {
    try {
        const { provider } = req.params;
        const { userId } = req.query;
        
        const models = await AISettingsService.getAIModelsByProvider(provider, userId);

        res.json({ success: true, models });
    } catch (error) {
        console.error('Get AI models error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific AI settings by ID
app.get('/api/ai-settings/:settingsId', async (req, res) => {
    try {
        const { settingsId } = req.params;
        
        const settings = await AISettingsService.getAISettingsById(settingsId);

        if (!settings) {
            return res.status(404).json({ 
                success: false, 
                error: 'AI settings not found' 
            });
        }

        res.json({ success: true, ai_settings: settings });
    } catch (error) {
        console.error('Get AI settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get applications that used specific AI settings
app.get('/api/ai-settings/:settingsId/applications', async (req, res) => {
    try {
        const { settingsId } = req.params;
        
        const applications = await ApplicationService.getAISettingsApplications(settingsId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get AI settings applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new AI settings
app.post('/api/users/:userId/ai-settings', async (req, res) => {
    try {
        const { userId } = req.params;
        const { ai_provider, ai_model, api_key, is_default } = req.body;
        
        if (!ai_provider || !ai_model || !api_key) {
            return res.status(400).json({ 
                success: false, 
                error: 'AI provider, model, and API key are required' 
            });
        }

        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Encrypt API key
        const encryptedApiKey = await AISettingsService.encryptAPIKey(api_key);

        // If this is being set as default, unset other defaults first
        if (is_default === 'true' || is_default === true) {
            await AISettingsService.unsetOtherAISettingsAsDefault(userId);
        }

        const newSettings = await AISettingsService.createAISettings({
            user_id: userId,
            ai_provider: ai_provider,
            ai_model: ai_model,
            api_key_encrypted: encryptedApiKey,
            is_default: is_default === 'true' || is_default === true
        });

        res.status(201).json({ success: true, ai_settings: newSettings });
    } catch (error) {
        console.error('Create AI settings error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update AI settings
app.put('/api/ai-settings/:settingsId', async (req, res) => {
    try {
        const { settingsId } = req.params;
        const updateData = req.body;
        
        // Check if AI settings exist
        const settings = await AISettingsService.getAISettingsById(settingsId);

        if (!settings) {
            return res.status(404).json({ 
                success: false, 
                error: 'AI settings not found' 
            });
        }

        // If updating API key, encrypt it
        if (updateData.api_key) {
            updateData.api_key_encrypted = await AISettingsService.encryptAPIKey(updateData.api_key);
            delete updateData.api_key; // Remove plain text key
        }

        // If setting as default, unset other defaults for this user
        if (updateData.is_default) {
            await AISettingsService.unsetOtherAISettingsAsDefault(settings.user_id);
        }

        const updatedSettings = await AISettingsService.updateAISettings(settingsId, updateData);

        res.json({ success: true, ai_settings: updatedSettings });
    } catch (error) {
        console.error('Update AI settings error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Set AI settings as default
app.put('/api/ai-settings/:settingsId/default', async (req, res) => {
    try {
        const { settingsId } = req.params;
        
        // Use AISettingsService to set as default
        const updatedSettings = await AISettingsService.setAISettingsAsDefault(settingsId);

        res.json({ success: true, ai_settings: updatedSettings });
    } catch (error) {
        console.error('Set default AI settings error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete AI settings
app.delete('/api/ai-settings/:settingsId', async (req, res) => {
    try {
        const { settingsId } = req.params;
        
        // Check if AI settings can be deleted
        const canDelete = await AISettingsService.canDeleteAISettings(settingsId);

        if (!canDelete) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete AI settings: they are referenced by existing applications' 
            });
        }

        await AISettingsService.deleteAISettings(settingsId);

        res.json({ success: true, message: 'AI settings deleted successfully' });
    } catch (error) {
        console.error('Delete AI settings error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get default AI settings for a user
app.get('/api/users/:userId/ai-settings/default', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const defaultSettings = await AISettingsService.getDefaultAISettingsByUserId(userId);

        if (!defaultSettings) {
            return res.status(404).json({ 
                success: false, 
                error: 'No default AI settings found for user' 
            });
        }

        res.json({ success: true, ai_settings: defaultSettings });
    } catch (error) {
        console.error('Get default AI settings error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== FILE UPLOAD ENDPOINTS =====

// Upload resume file
app.post('/api/users/:userId/resumes/upload', upload.single('resume'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, short_description, is_default } = req.body;
        
        console.log('=== UPLOAD DEBUG ===');
        console.log('userId:', userId);
        console.log('req.file:', req.file ? {
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            path: req.file.path
        } : 'No file');
        console.log('req.body:', req.body);
        
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                error: 'No file uploaded' 
            });
        }
        
        // Check first few bytes of the uploaded file
        if (fs.existsSync(req.file.path)) {
            const buffer = fs.readFileSync(req.file.path);
            console.log('File first 20 bytes:', buffer.slice(0, 20));
            console.log('File as string (first 50 chars):', buffer.toString().substring(0, 50));
        }
        
        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Get file info
        const fileExtension = path.extname(req.file.originalname).toLowerCase().substring(1);
        const fileName = name || path.basename(req.file.originalname, path.extname(req.file.originalname));
        const filePath = req.file.path;
        const relativePath = path.relative(path.join(__dirname, '..', '..'), filePath);

        // If this is being set as default, unset other defaults first
        if (is_default === 'true' || is_default === true) {
            await ResumeService.unsetOtherResumesAsDefault(userId);
        }

        // Create resume record in database
        const newResume = await ResumeService.createResume({
            name: fileName,
            extension: fileExtension,
            path: relativePath,
            short_description: short_description,
            user_id: userId,
            is_default: is_default === 'true' || is_default === true
        });

        // Return resume info with file details
        res.status(201).json({ 
            success: true, 
            resume: {
                ...newResume,
                file_size: req.file.size,
                original_name: req.file.originalname,
                mime_type: req.file.mimetype
            }
        });
    } catch (error) {
        console.error('Upload resume error:', error);
        
        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        
        // Check if it's a multer error (file validation)
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
        }
        
        if (error.message && error.message.includes('Invalid file type')) {
            return res.status(400).json({ success: false, error: error.message });
        }
        
        res.status(400).json({ success: false, error: error.message });
    }
});

// Download resume file
app.get('/api/resumes/:resumeId/download', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Get resume info from database
        const resume = await ResumeService.getResumeById(resumeId);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const filePath = path.resolve(path.join(__dirname, '..', '..', resume.path));

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume file not found on disk' 
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${resume.name}.${resume.extension}"`);
        res.setHeader('Content-Type', 'application/octet-stream');

        // Send file
        res.sendFile(filePath);
    } catch (error) {
        console.error('Download resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume file info
app.get('/api/resumes/:resumeId/file-info', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Get resume info from database
        const resume = await ResumeService.getResumeById(resumeId);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const filePath = path.resolve(path.join(__dirname, '..', '..', resume.path));

        // Check if file exists and get stats
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            res.json({ 
                success: true, 
                file_info: {
                    exists: true,
                    size: stats.size,
                    created: stats.birthtime,
                    modified: stats.mtime,
                    path: resume.path
                }
            });
        } else {
            res.json({ 
                success: true, 
                file_info: {
                    exists: false,
                    path: resume.path
                }
            });
        }
    } catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== APPLICATION ENDPOINTS =====

// Get all applications for a user
app.get('/api/users/:userId/applications', async (req, res) => {
    try {
        const { userId } = req.params;
        
        // Verify user exists
        const user = await UserService.findById(userId);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const applications = await ApplicationService.getApplicationsByUserId(userId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get application statistics
app.get('/api/applications/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        // Use ApplicationService for getting stats
        const stats = userId ? 
            await ApplicationService.getApplicationStats(userId) : 
            await ApplicationService.getApplicationStats();
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get application stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get applications by status
app.get('/api/applications/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const { userId } = req.query;
        
        const applications = await ApplicationService.getApplicationsByStatus(status, userId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get applications by status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent applications
app.get('/api/applications/recent', async (req, res) => {
    try {
        const { limit = 10, userId } = req.query;
        
        const applications = await ApplicationService.getRecentApplications(parseInt(limit), userId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get recent applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific application by ID
app.get('/api/applications/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const application = await ApplicationService.getApplicationById(applicationId);

        if (!application) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found' 
            });
        }

        res.json({ success: true, application });
    } catch (error) {
        console.error('Get application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get application with full details
app.get('/api/applications/:applicationId/details', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const details = await ApplicationService.getApplicationWithDetails(applicationId);

        if (!details) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found' 
            });
        }

        res.json({ success: true, application: details });
    } catch (error) {
        console.error('Get application details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get application by user and job
app.get('/api/users/:userId/jobs/:jobId/application', async (req, res) => {
    try {
        const { userId, jobId } = req.params;
        
        const application = await ApplicationService.getApplicationByUserAndJob(userId, jobId);

        if (!application) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found' 
            });
        }

        res.json({ success: true, application });
    } catch (error) {
        console.error('Get application by user and job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new application
app.post('/api/applications', async (req, res) => {
    try {
        const { user_id, job_id, ai_settings_id, resume_id, status, notes } = req.body;
        
        if (!user_id || !job_id || !resume_id) {
            return res.status(400).json({ 
                success: false, 
                error: 'User ID, job ID, and resume ID are required' 
            });
        }

        // Verify user exists
        const user = await UserService.findById(user_id);

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Verify resume exists
        const resume = await ResumeService.getResumeById(resume_id);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        // Verify AI settings exist if provided
        if (ai_settings_id) {
            const aiSettings = await AISettingsService.getAISettingsById(ai_settings_id);

            if (!aiSettings) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'AI settings not found' 
                });
            }
        }

        const newApplication = await ApplicationService.createApplication({
            user_id,
            job_id,
            ai_settings_id,
            resume_id,
            status: status || 'applied',
            notes
        });

        res.status(201).json({ success: true, application: newApplication });
    } catch (error) {
        console.error('Create application error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update application status
app.put('/api/applications/:applicationId/status', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { status, notes } = req.body;
        
        if (!status) {
            return res.status(400).json({ 
                success: false, 
                error: 'Status is required' 
            });
        }

        const updatedApplication = await ApplicationService.updateApplicationStatus(applicationId, status, notes);

        res.json({ success: true, application: updatedApplication });
    } catch (error) {
        console.error('Update application status error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark response received
app.put('/api/applications/:applicationId/response-received', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const updatedApplication = await ApplicationService.markResponseReceived(applicationId);

        res.json({ success: true, application: updatedApplication });
    } catch (error) {
        console.error('Mark response received error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get questions and answers for an application
app.get('/api/applications/:applicationId/questions-answers', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const questionsAnswers = await ApplicationService.getApplicationQuestionsAnswers(applicationId);

        res.json({ success: true, questions_answers: questionsAnswers });
    } catch (error) {
        console.error('Get application questions answers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add question and answer to an application
app.post('/api/applications/:applicationId/questions-answers', async (req, res) => {
    try {
        const { applicationId } = req.params;
        const { question, answer, question_type, ai_model_used, confidence_score, is_skipped } = req.body;
        
        if (!question || !answer) {
            return res.status(400).json({ 
                success: false, 
                error: 'Question and answer are required' 
            });
        }

        const questionAnswer = await ApplicationService.addQuestionAnswer(applicationId, {
            question,
            answer,
            question_type,
            ai_model_used,
            confidence_score,
            is_skipped
        });

        res.status(201).json({ success: true, question_answer: questionAnswer });
    } catch (error) {
        console.error('Add question answer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Get the resume used for an application
app.get('/api/applications/:applicationId/resume', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const resume = await ApplicationService.getApplicationResume(applicationId);

        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        res.json({ success: true, resume });
    } catch (error) {
        console.error('Get application resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete an application
app.delete('/api/applications/:applicationId', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const deleted = await ApplicationService.deleteApplication(applicationId);

        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found' 
            });
        }

        res.json({ success: true, message: 'Application deleted successfully' });
    } catch (error) {
        console.error('Delete application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if application exists
app.get('/api/applications/:applicationId/exists', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const exists = await ApplicationService.applicationExists(applicationId);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Application exists check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    
    // Handle multer errors
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ success: false, error: 'File too large. Maximum size is 5MB.' });
        }
        return res.status(400).json({ success: false, error: error.message });
    }
    
    // Handle file type validation errors
    if (error.message && error.message.includes('Invalid file type')) {
        return res.status(400).json({ success: false, error: error.message });
    }
    
    res.status(500).json({ 
        success: false, 
        error: 'Internal server error' 
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ 
        success: false, 
        error: 'Endpoint not found' 
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 EasyJob API Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`💾 Database: PostgreSQL`);
    console.log(`🔧 CORS enabled for Chrome extensions`);
});

module.exports = app; 