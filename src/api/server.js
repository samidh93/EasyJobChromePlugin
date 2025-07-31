const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Import the UserService, ResumeService, AISettingsService, ApplicationService, CompanyService, JobService, QuestionsAnswersService and models
const UserService = require('./database/user-service.cjs');
const ResumeService = require('./database/resume-service.cjs');
const ResumeStructureService = require('./database/resume-structure-service.cjs');
const AISettingsService = require('./database/ai-settings-service.cjs');
const ApplicationService = require('./database/application-service.cjs');
const CompanyService = require('./database/company-service.cjs');
const JobService = require('./database/job-service.cjs');
const QuestionsAnswersService = require('./database/questionsAnswers-service.cjs');
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
        
        if (!ai_provider || !ai_model) {
            return res.status(400).json({ 
                success: false, 
                error: 'AI provider and model are required' 
            });
        }

        // Only require API key for non-Ollama providers
        if (ai_provider !== 'ollama' && !api_key) {
            return res.status(400).json({ 
                success: false, 
                error: 'API key is required for this provider' 
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

        // Encrypt API key if provided
        let encryptedApiKey = null;
        if (api_key) {
            encryptedApiKey = await AISettingsService.encryptAPIKey(api_key);
        }

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

// Get encrypted API key for decryption (internal use only)
app.get('/api/ai-settings/:settingsId/encrypted-key', async (req, res) => {
    try {
        const { settingsId } = req.params;
        
        // Get the raw settings object without toJSON() to access api_key_encrypted
        const { AISettings } = require('./database/models/index.cjs');
        const settings = await AISettings.findById(settingsId);

        if (!settings) {
            return res.status(404).json({ 
                success: false, 
                error: 'AI settings not found' 
            });
        }

        // Return only the encrypted key for decryption
        res.json({ 
            success: true, 
            api_key_encrypted: settings.api_key_encrypted 
        });
    } catch (error) {
        console.error('Get encrypted API key error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Decrypt API key endpoint
app.post('/api/ai-settings/decrypt-api-key', async (req, res) => {
    try {
        const { encryptedApiKey } = req.body;
        
        if (!encryptedApiKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'Encrypted API key is required' 
            });
        }

        const decryptedApiKey = await AISettingsService.decryptAPIKey(encryptedApiKey);

        res.json({ success: true, decryptedApiKey });
    } catch (error) {
        console.error('Decrypt API key error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// ===== FILE UPLOAD ENDPOINTS =====

// Upload resume file
app.post('/api/users/:userId/resumes/upload', upload.single('resume'), async (req, res) => {
    try {
        const { userId } = req.params;
        const { name, short_description, is_default } = req.body;
        

        
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

        // Process structured data if provided
        let structuredData = null;
        console.log('=== STRUCTURED DATA DEBUG ===');
        console.log('req.body.structured_data:', req.body.structured_data ? 'Present' : 'Not present');
        console.log('req.body.formatted_text:', req.body.formatted_text ? 'Present' : 'Not present');
        console.log('req.body.file_type:', req.body.file_type);
        console.log('File extension:', fileExtension);
        
        if (req.body.structured_data) {
            try {
                structuredData = JSON.parse(req.body.structured_data);

                
                // Save structured data to resume_structure table
                await ResumeStructureService.saveResumeStructure(newResume.id, structuredData);
                console.log('Structured data saved successfully');
            } catch (error) {
                console.error('Error processing structured data:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack
                });
                // Don't fail the upload, just log the error
            }
        } else {
            console.log('No structured data provided in request body');
        }

        // Return resume info with file details and structured data status
        res.status(201).json({ 
            success: true, 
            resume: {
                ...newResume,
                file_size: req.file.size,
                original_name: req.file.originalname,
                mime_type: req.file.mimetype,
                has_structured_data: !!structuredData
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

// Get resume structure data
app.get('/api/resumes/:resumeId/structure', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Get resume structure from database
        const structure = await ResumeStructureService.getResumeStructure(resumeId);
        
        if (!structure) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume structure not found' 
            });
        }
        
        res.json({ 
            success: true, 
            structure: structure
        });
    } catch (error) {
        console.error('Get resume structure error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get default resume for a user
app.get('/api/users/:userId/resumes/default', async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('=== DEFAULT RESUME API DEBUG ===');
        console.log('Requested user ID:', userId);
        
        // Verify user exists
        const user = await UserService.findById(userId);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }
        
        // Get default resume
        const resume = await ResumeService.getDefaultResumeByUserId(userId);
        
        if (!resume) {
            return res.status(404).json({ 
                success: false, 
                error: 'No default resume found for user' 
            });
        }
        
        console.log('Returning successful response with resume');
        res.json({ 
            success: true, 
            resume: resume
        });
    } catch (error) {
        console.error('Get default resume error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get relevant data for AI questions
app.get('/api/resumes/:resumeId/relevant-data', async (req, res) => {
    try {
        const { resumeId } = req.params;
        const { questionType } = req.query;
        
        if (!questionType) {
            return res.status(400).json({ 
                success: false, 
                error: 'Question type is required' 
            });
        }
        
        // Get relevant data based on question type
        const relevantData = await ResumeStructureService.getRelevantData(resumeId, questionType);
        
        if (!relevantData) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume structure not found' 
            });
        }
        
        res.json({ 
            success: true, 
            relevantData: relevantData
        });
    } catch (error) {
        console.error('Get relevant data error:', error);
        res.status(500).json({ success: false, error: error.message });
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

// ===== QUESTIONS-ANSWERS ENDPOINTS =====

// Get all questions-answers for an application
app.get('/api/applications/:applicationId/questions-answers', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const qas = await QuestionsAnswersService.getQuestionAnswersByApplicationId(applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get questions-answers by application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get questions-answers by question type
app.get('/api/questions-answers/type/:questionType', async (req, res) => {
    try {
        const { questionType } = req.params;
        const { applicationId } = req.query;
        
        const qas = await QuestionsAnswersService.getQuestionAnswersByType(questionType, applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get questions-answers by type error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get skipped questions
app.get('/api/questions-answers/skipped', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const qas = await QuestionsAnswersService.getSkippedQuestions(applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get skipped questions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get questions-answers by AI model
app.get('/api/questions-answers/ai-model/:aiModel', async (req, res) => {
    try {
        const { aiModel } = req.params;
        const { applicationId } = req.query;
        
        const qas = await QuestionsAnswersService.getQuestionAnswersByAIModel(aiModel, applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get questions-answers by AI model error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get low confidence questions
app.get('/api/questions-answers/low-confidence', async (req, res) => {
    try {
        const { threshold = 0.5, applicationId } = req.query;
        
        const qas = await QuestionsAnswersService.getLowConfidenceQuestions(parseFloat(threshold), applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get low confidence questions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent questions-answers
app.get('/api/questions-answers/recent', async (req, res) => {
    try {
        const { limit = 10, applicationId } = req.query;
        
        const qas = await QuestionsAnswersService.getRecentQuestionAnswers(parseInt(limit), applicationId);
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Get recent questions-answers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search questions by text
app.get('/api/questions-answers/search/questions', async (req, res) => {
    try {
        const { q: searchTerm, applicationId, limit = 20 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search term is required' 
            });
        }

        const qas = await QuestionsAnswersService.searchQuestions(searchTerm, applicationId, parseInt(limit));
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Search questions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search answers by text
app.get('/api/questions-answers/search/answers', async (req, res) => {
    try {
        const { q: searchTerm, applicationId, limit = 20 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search term is required' 
            });
        }

        const qas = await QuestionsAnswersService.searchAnswers(searchTerm, applicationId, parseInt(limit));
        res.json({ success: true, questions_answers: qas });
    } catch (error) {
        console.error('Search answers error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get questions-answers statistics
app.get('/api/questions-answers/stats', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const stats = await QuestionsAnswersService.getStats(applicationId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get questions-answers stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get question types statistics
app.get('/api/questions-answers/stats/question-types', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const stats = await QuestionsAnswersService.getQuestionTypesStats(applicationId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get question types stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get AI model performance statistics
app.get('/api/questions-answers/stats/ai-models', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const stats = await QuestionsAnswersService.getAIModelStats(applicationId);
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get AI model stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unique question types
app.get('/api/questions-answers/types', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const types = await QuestionsAnswersService.getUniqueQuestionTypes(applicationId);
        res.json({ success: true, question_types: types });
    } catch (error) {
        console.error('Get unique question types error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get unique AI models
app.get('/api/questions-answers/ai-models', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const models = await QuestionsAnswersService.getUniqueAIModels(applicationId);
        res.json({ success: true, ai_models: models });
    } catch (error) {
        console.error('Get unique AI models error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get questions-answers count
app.get('/api/questions-answers/count', async (req, res) => {
    try {
        const { applicationId } = req.query;
        
        const count = await QuestionsAnswersService.getQuestionAnswersCount(applicationId);
        res.json({ success: true, count });
    } catch (error) {
        console.error('Get questions-answers count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if question-answer exists
app.get('/api/questions-answers/:qaId/exists', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const exists = await QuestionsAnswersService.questionAnswerExists(qaId);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Question-answer exists check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get application for question-answer
app.get('/api/questions-answers/:qaId/application', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const application = await QuestionsAnswersService.getApplicationForQuestionAnswer(qaId);
        
        if (!application) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found for this question-answer' 
            });
        }

        res.json({ success: true, application });
    } catch (error) {
        console.error('Get application for question-answer error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get question-answer by ID - MUST BE LAST AMONG GET ROUTES
app.get('/api/questions-answers/:qaId', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const qa = await QuestionsAnswersService.getQuestionAnswerById(qaId);
        
        if (!qa) {
            return res.status(404).json({ 
                success: false, 
                error: 'Question-answer not found' 
            });
        }

        res.json({ success: true, question_answer: qa });
    } catch (error) {
        console.error('Get question-answer by ID error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new question-answer
app.post('/api/questions-answers', async (req, res) => {
    try {
        const { application_id, question, answer, question_type, ai_model_used, confidence_score, is_skipped } = req.body;
        
        if (!application_id || !question) {
            return res.status(400).json({ 
                success: false, 
                error: 'Application ID and question are required' 
            });
        }

        // Verify application exists
        const application = await ApplicationService.getApplicationById(application_id);
        if (!application) {
            return res.status(404).json({ 
                success: false, 
                error: 'Application not found' 
            });
        }

        const newQA = await QuestionsAnswersService.createQuestionAnswer({
            application_id,
            question,
            answer,
            question_type,
            ai_model_used,
            confidence_score,
            is_skipped
        });

        res.status(201).json({ success: true, question_answer: newQA });
    } catch (error) {
        console.error('Create question-answer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update question-answer
app.put('/api/questions-answers/:qaId', async (req, res) => {
    try {
        const { qaId } = req.params;
        const updateData = req.body;
        
        const updatedQA = await QuestionsAnswersService.updateQuestionAnswer(qaId, updateData);

        res.json({ success: true, question_answer: updatedQA });
    } catch (error) {
        console.error('Update question-answer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update answer only
app.put('/api/questions-answers/:qaId/answer', async (req, res) => {
    try {
        const { qaId } = req.params;
        const { answer, confidence_score } = req.body;
        
        if (!answer) {
            return res.status(400).json({ 
                success: false, 
                error: 'Answer is required' 
            });
        }

        const updatedQA = await QuestionsAnswersService.updateAnswer(qaId, answer, confidence_score);

        res.json({ success: true, question_answer: updatedQA });
    } catch (error) {
        console.error('Update answer error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark question as skipped
app.put('/api/questions-answers/:qaId/skip', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const updatedQA = await QuestionsAnswersService.markQuestionSkipped(qaId);

        res.json({ success: true, question_answer: updatedQA });
    } catch (error) {
        console.error('Mark question skipped error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark question as not skipped
app.put('/api/questions-answers/:qaId/unskip', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const updatedQA = await QuestionsAnswersService.markQuestionNotSkipped(qaId);

        res.json({ success: true, question_answer: updatedQA });
    } catch (error) {
        console.error('Mark question not skipped error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete question-answer
app.delete('/api/questions-answers/:qaId', async (req, res) => {
    try {
        const { qaId } = req.params;
        
        const result = await QuestionsAnswersService.deleteQuestionAnswer(qaId);

        res.json({ success: true, message: result.message });
    } catch (error) {
        console.error('Delete question-answer error:', error);
        
        if (error.message.includes('not found')) {
            return res.status(404).json({ 
                success: false, 
                error: 'Question-answer not found' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Delete all questions-answers for an application
app.delete('/api/applications/:applicationId/questions-answers', async (req, res) => {
    try {
        const { applicationId } = req.params;
        
        const result = await QuestionsAnswersService.deleteQuestionAnswersByApplicationId(applicationId);

        res.json({ success: true, message: result.message, deleted_count: result.deleted_count });
    } catch (error) {
        console.error('Delete questions-answers by application error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== COMPANY ENDPOINTS =====

// Get all companies (with pagination)
app.get('/api/companies', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const companies = await CompanyService.getAllCompanies(parseInt(limit), parseInt(offset));

        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get companies error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get companies count
app.get('/api/companies/count', async (req, res) => {
    try {
        const count = await CompanyService.getCompaniesCount();

        res.json({ success: true, count });
    } catch (error) {
        console.error('Get companies count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company statistics
app.get('/api/companies/stats', async (req, res) => {
    try {
        const stats = await CompanyService.getGlobalCompanyStats();
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all industries
app.get('/api/companies/industries', async (req, res) => {
    try {
        const industries = await CompanyService.getIndustries();

        res.json({ success: true, industries });
    } catch (error) {
        console.error('Get industries error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search companies
app.get('/api/companies/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 20 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search term is required' 
            });
        }

        const companies = await CompanyService.searchCompanies(searchTerm, parseInt(limit));

        res.json({ success: true, companies });
    } catch (error) {
        console.error('Search companies error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get companies by industry
app.get('/api/companies/industry/:industry', async (req, res) => {
    try {
        const { industry } = req.params;
        
        const companies = await CompanyService.getCompaniesByIndustry(industry);

        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get companies by industry error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get companies by size
app.get('/api/companies/size/:size', async (req, res) => {
    try {
        const { size } = req.params;
        
        const companies = await CompanyService.getCompaniesBySize(size);

        res.json({ success: true, companies });
    } catch (error) {
        console.error('Get companies by size error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific company by ID
app.get('/api/companies/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const company = await CompanyService.getCompanyById(companyId);

        if (!company) {
            return res.status(404).json({ 
                success: false, 
                error: 'Company not found' 
            });
        }

        res.json({ success: true, company });
    } catch (error) {
        console.error('Get company error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company by name
app.get('/api/companies/name/:name', async (req, res) => {
    try {
        const { name } = req.params;
        
        const company = await CompanyService.getCompanyByName(name);

        if (!company) {
            return res.status(404).json({ 
                success: false, 
                error: 'Company not found' 
            });
        }

        res.json({ success: true, company });
    } catch (error) {
        console.error('Get company by name error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company statistics
app.get('/api/companies/:companyId/stats', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const stats = await CompanyService.getCompanyStats(companyId);

        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get company stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company jobs
app.get('/api/companies/:companyId/jobs', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const jobs = await CompanyService.getCompanyJobs(companyId);

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get company jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company active jobs
app.get('/api/companies/:companyId/jobs/active', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const jobs = await CompanyService.getCompanyActiveJobs(companyId);

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get company active jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get company applications
app.get('/api/companies/:companyId/applications', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const applications = await CompanyService.getCompanyApplications(companyId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get company applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new company
app.post('/api/companies', async (req, res) => {
    try {
        const { name, industry, size, location, website, linkedin_url } = req.body;
        
        if (!name) {
            return res.status(400).json({ 
                success: false, 
                error: 'Company name is required' 
            });
        }

        // Check if company already exists
        const existingCompany = await CompanyService.getCompanyByName(name);
        if (existingCompany) {
            return res.status(409).json({ 
                success: false, 
                error: 'Company with this name already exists' 
            });
        }

        const newCompany = await CompanyService.createCompany({
            name,
            industry,
            size,
            location,
            website,
            linkedin_url
        });

        res.status(201).json({ success: true, company: newCompany });
    } catch (error) {
        console.error('Create company error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update company
app.put('/api/companies/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        const updateData = req.body;
        
        // If updating name, check for duplicates
        if (updateData.name) {
            const existingCompany = await CompanyService.getCompanyByName(updateData.name);
            if (existingCompany && existingCompany.id !== companyId) {
                return res.status(409).json({ 
                    success: false, 
                    error: 'Company with this name already exists' 
                });
            }
        }

        const updatedCompany = await CompanyService.updateCompany(companyId, updateData);

        res.json({ success: true, company: updatedCompany });
    } catch (error) {
        console.error('Update company error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete company
app.delete('/api/companies/:companyId', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const deleted = await CompanyService.deleteCompany(companyId);

        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Company not found' 
            });
        }

        res.json({ success: true, message: 'Company deleted successfully' });
    } catch (error) {
        console.error('Delete company error:', error);
        
        if (error.message.includes('has associated jobs')) {
            return res.status(409).json({ 
                success: false, 
                error: 'Cannot delete company: it has associated jobs' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if company exists
app.get('/api/companies/:companyId/exists', async (req, res) => {
    try {
        const { companyId } = req.params;
        
        const exists = await CompanyService.companyExists(companyId);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Company exists check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if company exists by name
app.get('/api/companies/name/:name/exists', async (req, res) => {
    try {
        const { name } = req.params;
        
        const exists = await CompanyService.companyExistsByName(name);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Company exists by name check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ===== JOB ENDPOINTS =====

// Get all jobs (with pagination)
app.get('/api/jobs', async (req, res) => {
    try {
        const { limit = 50, offset = 0 } = req.query;
        
        const jobs = await JobService.getAllJobs(parseInt(limit), parseInt(offset));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs count
app.get('/api/jobs/count', async (req, res) => {
    try {
        const count = await JobService.getJobsCount();

        res.json({ success: true, count });
    } catch (error) {
        console.error('Get jobs count error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job statistics
app.get('/api/jobs/stats', async (req, res) => {
    try {
        const stats = await JobService.getJobStats();
        
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Get job stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get recent jobs
app.get('/api/jobs/recent', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const jobs = await JobService.getRecentJobs(parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get recent jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get remote jobs
app.get('/api/jobs/remote', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const jobs = await JobService.getRemoteJobs(parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get remote jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Search jobs
app.get('/api/jobs/search', async (req, res) => {
    try {
        const { q: searchTerm, limit = 20 } = req.query;
        
        if (!searchTerm) {
            return res.status(400).json({ 
                success: false, 
                error: 'Search term is required' 
            });
        }

        const jobs = await JobService.searchJobs(searchTerm, parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Search jobs error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by status
app.get('/api/jobs/status/:status', async (req, res) => {
    try {
        const { status } = req.params;
        const { limit = 50 } = req.query;
        
        const jobs = await JobService.getJobsByStatus(status, parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get jobs by status error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by type
app.get('/api/jobs/type/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const { limit = 50 } = req.query;
        
        const jobs = await JobService.getJobsByType(type, parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get jobs by type error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by platform
app.get('/api/jobs/platform/:platform', async (req, res) => {
    try {
        const { platform } = req.params;
        const { limit = 50 } = req.query;
        
        const jobs = await JobService.getJobsByPlatform(platform, parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get jobs by platform error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get jobs by location
app.get('/api/jobs/location/:location', async (req, res) => {
    try {
        const { location } = req.params;
        const { limit = 50 } = req.query;
        
        const jobs = await JobService.getJobsByLocation(location, parseInt(limit));

        res.json({ success: true, jobs });
    } catch (error) {
        console.error('Get jobs by location error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all platforms
app.get('/api/jobs/platforms', async (req, res) => {
    try {
        const platforms = await JobService.getPlatforms();

        res.json({ success: true, platforms });
    } catch (error) {
        console.error('Get platforms error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all job types
app.get('/api/jobs/types', async (req, res) => {
    try {
        const types = await JobService.getJobTypes();

        res.json({ success: true, types });
    } catch (error) {
        console.error('Get job types error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all locations
app.get('/api/jobs/locations', async (req, res) => {
    try {
        const locations = await JobService.getLocations();

        res.json({ success: true, locations });
    } catch (error) {
        console.error('Get locations error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific job by ID
app.get('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const job = await JobService.getJobById(jobId);

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }

        res.json({ success: true, job });
    } catch (error) {
        console.error('Get job error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job with company details
app.get('/api/jobs/:jobId/details', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const jobDetails = await JobService.getJobWithCompany(jobId);

        if (!jobDetails) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }

        res.json({ success: true, job: jobDetails });
    } catch (error) {
        console.error('Get job details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job by platform and platform job ID
app.get('/api/jobs/platform/:platform/:platformJobId', async (req, res) => {
    try {
        const { platform, platformJobId } = req.params;
        
        const job = await JobService.getJobByPlatformId(platform, platformJobId);

        if (!job) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }

        res.json({ success: true, job });
    } catch (error) {
        console.error('Get job by platform ID error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get job applications
app.get('/api/jobs/:jobId/applications', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const applications = await JobService.getJobApplications(jobId);

        res.json({ success: true, applications });
    } catch (error) {
        console.error('Get job applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create new job
app.post('/api/jobs', async (req, res) => {
    try {
        const { company_id, title, location, is_remote, job_type, platform, platform_job_id, job_url, job_description, applicant_count, posted_date, status } = req.body;
        
        if (!company_id || !title) {
            return res.status(400).json({ 
                success: false, 
                error: 'Company ID and title are required' 
            });
        }

        // Verify company exists
        const company = await CompanyService.getCompanyById(company_id);
        if (!company) {
            return res.status(404).json({ 
                success: false, 
                error: 'Company not found' 
            });
        }

        // Check if job already exists by platform ID
        if (platform && platform_job_id) {
            const existingJob = await JobService.getJobByPlatformId(platform, platform_job_id);
            if (existingJob) {
                return res.status(409).json({ 
                    success: false, 
                    error: 'Job with this platform ID already exists' 
                });
            }
        }

        const newJob = await JobService.createJob({
            company_id,
            title,
            location,
            is_remote,
            job_type,
            platform,
            platform_job_id,
            job_url,
            job_description,
            applicant_count,
            posted_date,
            status
        });

        res.status(201).json({ success: true, job: newJob });
    } catch (error) {
        console.error('Create job error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Update job
app.put('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        const updateData = req.body;
        
        // If updating company_id, verify company exists
        if (updateData.company_id) {
            const company = await CompanyService.getCompanyById(updateData.company_id);
            if (!company) {
                return res.status(404).json({ 
                    success: false, 
                    error: 'Company not found' 
                });
            }
        }

        const updatedJob = await JobService.updateJob(jobId, updateData);

        res.json({ success: true, job: updatedJob });
    } catch (error) {
        console.error('Update job error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Mark job as closed
app.put('/api/jobs/:jobId/close', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const closedJob = await JobService.markJobClosed(jobId);

        res.json({ success: true, job: closedJob });
    } catch (error) {
        console.error('Mark job closed error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete job
app.delete('/api/jobs/:jobId', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const deleted = await JobService.deleteJob(jobId);

        if (!deleted) {
            return res.status(404).json({ 
                success: false, 
                error: 'Job not found' 
            });
        }

        res.json({ success: true, message: 'Job deleted successfully' });
    } catch (error) {
        console.error('Delete job error:', error);
        
        if (error.message.includes('has associated applications')) {
            return res.status(409).json({ 
                success: false, 
                error: 'Cannot delete job: it has associated applications' 
            });
        }
        
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if job exists
app.get('/api/jobs/:jobId/exists', async (req, res) => {
    try {
        const { jobId } = req.params;
        
        const exists = await JobService.jobExists(jobId);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Job exists check error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if job exists by platform ID
app.get('/api/jobs/platform/:platform/:platformJobId/exists', async (req, res) => {
    try {
        const { platform, platformJobId } = req.params;
        
        const exists = await JobService.jobExistsByPlatformId(platform, platformJobId);
        res.json({ success: true, exists });
    } catch (error) {
        console.error('Job exists by platform ID check error:', error);
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