const { User } = require('./models/index.cjs');
const bcrypt = require('bcrypt');

class UserService {
    /**
     * Create a new user account
     * @param {Object} userData - User registration data
     * @param {string} userData.username - Username
     * @param {string} userData.email - Email address
     * @param {string} userData.password - Plain text password (will be hashed)
     * @returns {Promise<User>} Created user object
     */
    static async registerUser(userData) {
        try {
            // Validate user data
            const validation = this.validateUserData(userData);
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            // Check if user already exists
            const existingUser = await User.findByEmail(userData.email);
            if (existingUser) {
                throw new Error('User with this email already exists');
            }

            // Hash the password before storing
            const hashedPassword = await this.hashPassword(userData.password);
            
            const newUser = await User.create({
                username: userData.username,
                email: userData.email,
                password_hash: hashedPassword
            });

            console.log('User registered successfully:', newUser.id);
            return newUser.toJSON();
        } catch (error) {
            console.error('Error registering user:', error);
            throw error;
        }
    }

    /**
     * Authenticate user login
     * @param {string} email - User email
     * @param {string} password - Plain text password
     * @returns {Promise<Object>} User data if authentication successful
     */
    static async loginUser(email, password) {
        try {
            // Find user by email
            const user = await User.findByEmail(email);
            if (!user) {
                throw new Error('Invalid email or password');
            }

            // Check if user is active
            if (!user.is_active) {
                throw new Error('Account is deactivated');
            }

            // Verify password
            const isValidPassword = await this.verifyPassword(password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid email or password');
            }

            // Update last login
            await user.updateLastLogin();

            // Return user data (excluding password hash)
            return user.toJSON();
        } catch (error) {
            console.error('Error during login:', error);
            throw error;
        }
    }

    /**
     * Get user profile by ID
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User profile data
     */
    static async getUserProfile(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Get user statistics
            const stats = await user.getStats();
            
            // Get user's resumes
            const resumes = await user.getResumes();
            
            // Get user's AI settings
            const aiSettings = await user.getAISettings();

            return {
                profile: user.toJSON(),
                stats,
                resumes,
                aiSettings
            };
        } catch (error) {
            console.error('Error getting user profile:', error);
            throw error;
        }
    }

    /**
     * Update user profile
     * @param {string} userId - User ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<User>} Updated user object
     */
    static async updateUserProfile(userId, updateData) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Remove sensitive fields from update data
            const { password_hash, id, created_at, ...safeUpdateData } = updateData;

            const updatedUser = await user.update(safeUpdateData);
            return updatedUser.toJSON();
        } catch (error) {
            console.error('Error updating user profile:', error);
            throw error;
        }
    }

    /**
     * Change user password
     * @param {string} userId - User ID
     * @param {string} currentPassword - Current password
     * @param {string} newPassword - New password
     * @returns {Promise<boolean>} Success status
     */
    static async changePassword(userId, currentPassword, newPassword) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            // Verify current password
            const isValidCurrentPassword = await this.verifyPassword(currentPassword, user.password_hash);
            if (!isValidCurrentPassword) {
                throw new Error('Current password is incorrect');
            }

            // Hash new password
            const hashedNewPassword = await this.hashPassword(newPassword);

            // Update password
            await user.update({ password_hash: hashedNewPassword });

            console.log('Password changed successfully');
            return true;
        } catch (error) {
            console.error('Error changing password:', error);
            throw error;
        }
    }

    /**
     * Deactivate user account
     * @param {string} userId - User ID
     * @returns {Promise<boolean>} Success status
     */
    static async deactivateUser(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            await user.deactivate();
            console.log('User deactivated successfully');
            return true;
        } catch (error) {
            console.error('Error deactivating user:', error);
            throw error;
        }
    }

    /**
     * Get user's application history
     * @param {string} userId - User ID
     * @param {Object} options - Query options
     * @param {number} options.limit - Number of applications to return
     * @param {string} options.status - Filter by application status
     * @returns {Promise<Array>} Application history
     */
    static async getUserApplications(userId, options = {}) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            const applications = await user.getApplications();
            
            // Apply filters if provided
            let filteredApplications = applications;
            
            if (options.status) {
                filteredApplications = applications.filter(app => app.status === options.status);
            }
            
            if (options.limit) {
                filteredApplications = filteredApplications.slice(0, options.limit);
            }

            return filteredApplications;
        } catch (error) {
            console.error('Error getting user applications:', error);
            throw error;
        }
    }

    /**
     * Get user's default resume
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Default resume or null
     */
    static async getUserDefaultResume(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return await user.getDefaultResume();
        } catch (error) {
            console.error('Error getting user default resume:', error);
            throw error;
        }
    }

    /**
     * Get user's default AI settings
     * @param {string} userId - User ID
     * @returns {Promise<Object|null>} Default AI settings or null
     */
    static async getUserDefaultAISettings(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return await user.getDefaultAISettings();
        } catch (error) {
            console.error('Error getting user default AI settings:', error);
            throw error;
        }
    }

    /**
     * Check if user exists by email
     * @param {string} email - Email address
     * @returns {Promise<boolean>} True if user exists
     */
    static async userExists(email) {
        try {
            const user = await User.findByEmail(email);
            return !!user;
        } catch (error) {
            console.error('Error checking if user exists:', error);
            return false;
        }
    }

    /**
     * Hash password using bcrypt
     * @param {string} password - Plain text password
     * @returns {Promise<string>} Hashed password
     */
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt.hash(password, saltRounds);
    }

    /**
     * Verify password against hash using bcrypt
     * @param {string} password - Plain text password
     * @param {string} hash - Hashed password
     * @returns {Promise<boolean>} True if password matches
     */
    static async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    /**
     * Validate user data
     * @param {Object} userData - User data to validate
     * @returns {Object} Validation result
     */
    static validateUserData(userData) {
        const errors = [];

        if (!userData.username || userData.username.length < 3) {
            errors.push('Username must be at least 3 characters long');
        }

        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Please provide a valid email address');
        }

        if (!userData.password || userData.password.length < 6) {
            errors.push('Password must be at least 6 characters long');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }

    /**
     * Validate email format
     * @param {string} email - Email to validate
     * @returns {boolean} True if email is valid
     */
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Get user by username
     * @param {string} username - Username
     * @returns {Promise<Object|null>} User object or null
     */
    static async getUserByUsername(username) {
        try {
            const user = await User.findByUsername(username);
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error getting user by username:', error);
            throw error;
        }
    }

    /**
     * Get user statistics
     * @param {string} userId - User ID
     * @returns {Promise<Object>} User statistics
     */
    static async getUserStats(userId) {
        try {
            const user = await User.findById(userId);
            if (!user) {
                throw new Error('User not found');
            }

            return await user.getStats();
        } catch (error) {
            console.error('Error getting user stats:', error);
            throw error;
        }
    }

    /**
     * Find user by ID
     * @param {string} userId - User ID
     * @returns {Promise<User|null>} User object or null
     */
    static async findById(userId) {
        try {
            const user = await User.findById(userId);
            return user ? user.toJSON() : null;
        } catch (error) {
            console.error('Error finding user by ID:', error);
            throw error;
        }
    }
}

module.exports = UserService; 