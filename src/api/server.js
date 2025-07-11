const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3001;

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

        const profile = {
            profile: user,
            stats: stats,
            resumes: [], // TODO: Implement resume fetching
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

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
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