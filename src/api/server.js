const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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

        // Check if user already exists
        const existingUser = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );
        
        if (existingUser.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'User already exists' 
            });
        }

        // Hash password
        const saltRounds = 10;
        const password_hash = await bcrypt.hash(password, saltRounds);

        // Create user
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash, created_at, updated_at, is_active) VALUES ($1, $2, $3, NOW(), NOW(), TRUE) RETURNING id, username, email, created_at, updated_at, is_active',
            [username, email, password_hash]
        );

        const newUser = result.rows[0];
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

        // Find user by email
        const result = await pool.query(
            'SELECT id, username, email, password_hash, is_active FROM users WHERE email = $1',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        const user = result.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ 
                success: false, 
                error: 'Account is disabled' 
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid email or password' 
            });
        }

        // Update last login
        await pool.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        // Return user data (without password)
        const { password_hash, ...userWithoutPassword } = user;
        res.json({ success: true, user: userWithoutPassword });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ success: false, error: error.message });
    }
});

// Get user profile endpoint
app.get('/api/users/:userId/profile', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const result = await pool.query(
            'SELECT id, username, email, created_at, updated_at, last_login, is_active FROM users WHERE id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const user = result.rows[0];
        
        // Get user statistics
        const statsResult = await pool.query(`
            SELECT 
                COUNT(DISTINCT a.id) as total_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'applied' THEN a.id END) as pending_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'interviewed' THEN a.id END) as interviews,
                COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as offers,
                COUNT(DISTINCT j.company_id) as companies_applied_to,
                COUNT(DISTINCT qa.id) as questions_answered
            FROM users u
            LEFT JOIN applications a ON u.id = a.user_id
            LEFT JOIN jobs j ON a.job_id = j.id
            LEFT JOIN questions_answers qa ON a.id = qa.application_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [userId]);

        const stats = statsResult.rows[0] || {
            total_applications: 0,
            pending_applications: 0,
            interviews: 0,
            offers: 0,
            companies_applied_to: 0,
            questions_answered: 0
        };

        // Get user resumes
        const resumeResult = await pool.query(
            'SELECT id, name, extension, path, short_description, creation_date, updated_date, is_default FROM resume WHERE user_id = $1 ORDER BY is_default DESC, creation_date DESC',
            [userId]
        );

        const profile = {
            profile: user,
            stats: stats,
            resumes: resumeResult.rows,
            aiSettings: [] // TODO: Implement AI settings fetching
        };

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
        
        // Check if user exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        if (updateData.username) {
            updateFields.push(`username = $${paramCount}`);
            values.push(updateData.username);
            paramCount++;
        }

        if (updateData.email) {
            updateFields.push(`email = $${paramCount}`);
            values.push(updateData.email);
            paramCount++;
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No update data provided' 
            });
        }

        updateFields.push('updated_at = NOW()');
        values.push(userId);

        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, username, email, created_at, updated_at, is_active`;
        
        const result = await pool.query(query, values);
        const updatedUser = result.rows[0];

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
        
        const result = await pool.query(`
            SELECT 
                COUNT(DISTINCT a.id) as total_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'applied' THEN a.id END) as pending_applications,
                COUNT(DISTINCT CASE WHEN a.status = 'interviewed' THEN a.id END) as interviews,
                COUNT(DISTINCT CASE WHEN a.status = 'accepted' THEN a.id END) as offers,
                COUNT(DISTINCT j.company_id) as companies_applied_to,
                COUNT(DISTINCT qa.id) as questions_answered
            FROM users u
            LEFT JOIN applications a ON u.id = a.user_id
            LEFT JOIN jobs j ON a.job_id = j.id
            LEFT JOIN questions_answers qa ON a.id = qa.application_id
            WHERE u.id = $1
            GROUP BY u.id
        `, [userId]);

        const stats = result.rows[0] || {
            total_applications: 0,
            pending_applications: 0,
            interviews: 0,
            offers: 0,
            companies_applied_to: 0,
            questions_answered: 0
        };

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
        
        const result = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        res.json({ success: true, exists: result.rows.length > 0 });
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
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        const result = await pool.query(
            'SELECT id, name, extension, path, short_description, creation_date, updated_date, is_default FROM resume WHERE user_id = $1 ORDER BY is_default DESC, creation_date DESC',
            [userId]
        );

        res.json({ success: true, resumes: result.rows });
    } catch (error) {
        console.error('Get resumes error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get resume statistics (must be before the individual resume route)
app.get('/api/resumes/stats', async (req, res) => {
    try {
        const { userId } = req.query;
        
        let query = `
            SELECT 
                COUNT(*) as total_resumes,
                COUNT(DISTINCT user_id) as total_users_with_resumes,
                array_agg(DISTINCT extension) as file_types
            FROM resume
        `;
        const values = [];

        if (userId) {
            query += ' WHERE user_id = $1';
            values.push(userId);
        }

        const result = await pool.query(query, values);
        const stats = result.rows[0];
        
        // Convert string numbers to integers
        const formattedStats = {
            total_resumes: parseInt(stats.total_resumes) || 0,
            total_users_with_resumes: parseInt(stats.total_users_with_resumes) || 0,
            file_types: stats.file_types || []
        };
        
        res.json({ success: true, stats: formattedStats });
    } catch (error) {
        console.error('Get resume stats error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get a specific resume by ID
app.get('/api/resumes/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        const result = await pool.query(
            'SELECT id, name, extension, path, short_description, creation_date, updated_date, user_id, is_default FROM resume WHERE id = $1',
            [resumeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        res.json({ success: true, resume: result.rows[0] });
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
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        // If this is being set as default, unset other defaults first
        if (is_default) {
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        const result = await pool.query(
            'INSERT INTO resume (name, extension, path, short_description, user_id, is_default) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, extension, path, short_description, creation_date, updated_date, user_id, is_default',
            [name, extension, path, short_description, userId, is_default || false]
        );

        const newResume = result.rows[0];
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
        const resumeCheck = await pool.query(
            'SELECT id, user_id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (resumeCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const resume = resumeCheck.rows[0];

        // If setting as default, unset other defaults for this user
        if (updateData.is_default) {
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [resume.user_id]
            );
        }

        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 1;

        const allowedFields = ['name', 'extension', 'path', 'short_description', 'is_default'];
        
        for (const field of allowedFields) {
            if (updateData[field] !== undefined) {
                updateFields.push(`${field} = $${paramCount}`);
                values.push(updateData[field]);
                paramCount++;
            }
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'No update data provided' 
            });
        }

        updateFields.push('updated_date = NOW()');
        values.push(resumeId);

        const query = `UPDATE resume SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING id, name, extension, path, short_description, creation_date, updated_date, user_id, is_default`;
        
        const result = await pool.query(query, values);
        const updatedResume = result.rows[0];

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
        
        // Check if resume exists
        const resumeCheck = await pool.query(
            'SELECT id, user_id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (resumeCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const resume = resumeCheck.rows[0];

        // Start transaction
        await pool.query('BEGIN');

        try {
            // Unset all defaults for this user
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [resume.user_id]
            );

            // Set this resume as default
            const result = await pool.query(
                'UPDATE resume SET is_default = true WHERE id = $1 RETURNING id, name, extension, path, short_description, creation_date, updated_date, user_id, is_default',
                [resumeId]
            );

            await pool.query('COMMIT');

            res.json({ success: true, resume: result.rows[0] });
        } catch (error) {
            await pool.query('ROLLBACK');
            throw error;
        }
    } catch (error) {
        console.error('Set default resume error:', error);
        res.status(400).json({ success: false, error: error.message });
    }
});

// Delete a resume
app.delete('/api/resumes/:resumeId', async (req, res) => {
    try {
        const { resumeId } = req.params;
        
        // Check if resume exists
        const resumeCheck = await pool.query(
            'SELECT id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (resumeCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        // Check if resume is used in applications
        const applicationCheck = await pool.query(
            'SELECT COUNT(*) as count FROM applications WHERE resume_id = $1',
            [resumeId]
        );

        if (parseInt(applicationCheck.rows[0].count) > 0) {
            return res.status(400).json({ 
                success: false, 
                error: 'Cannot delete resume: it is referenced by existing applications' 
            });
        }

        await pool.query('DELETE FROM resume WHERE id = $1', [resumeId]);

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
        
        // Check if resume exists
        const resumeCheck = await pool.query(
            'SELECT id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (resumeCheck.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const result = await pool.query(`
            SELECT 
                a.id, a.status, a.applied_at, a.response_received_at, a.notes,
                j.title as job_title, j.location as job_location, j.job_url,
                c.name as company_name, c.website as company_website
            FROM applications a
            JOIN jobs j ON a.job_id = j.id
            JOIN companies c ON j.company_id = c.id
            WHERE a.resume_id = $1
            ORDER BY a.applied_at DESC
        `, [resumeId]);

        res.json({ success: true, applications: result.rows });
    } catch (error) {
        console.error('Get resume applications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

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
        
        // Verify user exists
        const userCheck = await pool.query(
            'SELECT id FROM users WHERE id = $1',
            [userId]
        );

        if (userCheck.rows.length === 0) {
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
            await pool.query(
                'UPDATE resume SET is_default = false WHERE user_id = $1',
                [userId]
            );
        }

        // Create resume record in database
        const result = await pool.query(
            'INSERT INTO resume (name, extension, path, short_description, user_id, is_default) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, extension, path, short_description, creation_date, updated_date, user_id, is_default',
            [fileName, fileExtension, relativePath, short_description, userId, is_default === 'true' || is_default === true]
        );

        const newResume = result.rows[0];
        
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
        const result = await pool.query(
            'SELECT id, name, extension, path, user_id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const resume = result.rows[0];
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
        const result = await pool.query(
            'SELECT id, name, extension, path, user_id FROM resume WHERE id = $1',
            [resumeId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'Resume not found' 
            });
        }

        const resume = result.rows[0];
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