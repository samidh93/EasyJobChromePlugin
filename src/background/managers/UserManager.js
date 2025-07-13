/**
 * User Manager
 * Handles user registration, login, logout, and profile management
 */
class UserManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.DATABASE_AVAILABLE = true;
        this.API_BASE_URL = 'http://localhost:3001/api';
    }

    /**
     * Handle user-related messages
     */
    async handleMessage(request, sendResponse) {
        const { action } = request;
        
        switch (action) {
            case 'registerUser':
                await this.handleUserRegistration(request, sendResponse);
                break;
            case 'loginUser':
                await this.handleUserLogin(request, sendResponse);
                break;
            case 'logoutUser':
                await this.handleUserLogout(request, sendResponse);
                break;
            case 'getUserProfile':
                await this.handleGetUserProfile(request, sendResponse);
                break;
            case 'updateUserProfile':
                await this.handleUpdateUserProfile(request, sendResponse);
                break;
            case 'getCurrentUser':
                await this.handleGetCurrentUser(request, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown user action' });
        }
    }

    /**
     * Handle user registration
     */
    async handleUserRegistration(request, sendResponse) {
        try {
            if (!this.DATABASE_AVAILABLE) {
                // Fallback to local storage for demo purposes
                console.log('Database not available, using local storage fallback');
                
                const userData = request.userData;
                if (!userData || !userData.username || !userData.email || !userData.password) {
                    throw new Error('Missing required user data (username, email, password)');
                }

                // Check if user already exists in local storage
                const existingUsers = await chrome.storage.local.get(['users']) || { users: {} };
                if (existingUsers.users && existingUsers.users[userData.email]) {
                    throw new Error('User with this email already exists');
                }

                // Create user object
                const newUser = {
                    id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                    username: userData.username,
                    email: userData.email,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    last_login: null,
                    is_active: true
                };

                // Store user in local storage
                const users = existingUsers.users || {};
                users[userData.email] = {
                    ...newUser,
                    password_hash: 'local_' + userData.password // Simple hash for demo
                };

                await chrome.storage.local.set({ users });
                
                // Store user session
                this.backgroundManager.setAutoApplyState({ user: newUser });
                await chrome.storage.local.set({
                    currentUser: newUser,
                    isLoggedIn: true,
                    userId: newUser.id
                });

                console.log('User registered successfully (local):', newUser.id);
                sendResponse({ success: true, user: newUser });
                return;
            }

            // Make API call to register user
            const response = await fetch(`${this.API_BASE_URL}/users/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request.userData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Registration failed');
            }

            // Store user session
            this.backgroundManager.setAutoApplyState({ user: result.user });
            await chrome.storage.local.set({
                currentUser: result.user,
                isLoggedIn: true,
                userId: result.user.id
            });

            console.log('User registered successfully (database):', result.user.id);
            sendResponse({ success: true, user: result.user });
        } catch (error) {
            console.error('Error registering user:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle user login
     */
    async handleUserLogin(request, sendResponse) {
        try {
            if (!this.DATABASE_AVAILABLE) {
                // Fallback to local storage for demo purposes
                console.log('Database not available, using local storage fallback');
                
                const { email, password } = request;
                if (!email || !password) {
                    throw new Error('Email and password are required');
                }

                // Get users from local storage
                const result = await chrome.storage.local.get(['users']);
                const users = result.users || {};
                
                const userData = users[email];
                if (!userData) {
                    throw new Error('Invalid email or password');
                }

                // Simple password verification for demo
                if (userData.password_hash !== 'local_' + password) {
                    throw new Error('Invalid email or password');
                }

                // Update last login
                const user = {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    created_at: userData.created_at,
                    updated_at: new Date().toISOString(),
                    last_login: new Date().toISOString(),
                    is_active: userData.is_active
                };

                // Update user in storage
                users[email] = { ...userData, last_login: user.last_login };
                await chrome.storage.local.set({ users });
                
                // Store user session
                this.backgroundManager.setAutoApplyState({ user });
                await chrome.storage.local.set({
                    currentUser: user,
                    isLoggedIn: true,
                    userId: user.id
                });

                console.log('User logged in successfully (local):', user.id);
                sendResponse({ success: true, user });
                return;
            }

            // Make API call to login user
            const response = await fetch(`${this.API_BASE_URL}/users/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: request.email, password: request.password })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Login failed');
            }

            // Store user session
            this.backgroundManager.setAutoApplyState({ user: result.user });
            await chrome.storage.local.set({
                currentUser: result.user,
                isLoggedIn: true,
                userId: result.user.id
            });

            console.log('User logged in successfully (database):', result.user.id);
            sendResponse({ success: true, user: result.user });
        } catch (error) {
            console.error('Error logging in user:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle user logout
     */
    async handleUserLogout(request, sendResponse) {
        try {
            console.log('User logout');
            
            // Clear user session
            this.backgroundManager.setAutoApplyState({ user: null });
            await chrome.storage.local.remove(['currentUser', 'isLoggedIn', 'userId']);

            console.log('User logged out successfully');
            sendResponse({ success: true });
        } catch (error) {
            console.error('Error logging out user:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle get user profile
     */
    async handleGetUserProfile(request, sendResponse) {
        try {
            if (!this.DATABASE_AVAILABLE) {
                // Fallback to local storage
                const { userId } = request;
                if (!userId) {
                    throw new Error('User ID is required');
                }

                // Get current user from storage
                const result = await chrome.storage.local.get(['currentUser']);
                if (!result.currentUser || result.currentUser.id !== userId) {
                    throw new Error('User not found');
                }

                const profile = {
                    profile: result.currentUser,
                    stats: {
                        total_applications: '0',
                        pending_applications: '0',
                        interviews: '0',
                        offers: '0',
                        companies_applied_to: '0',
                        questions_answered: '0'
                    },
                    resumes: [],
                    aiSettings: []
                };

                sendResponse({ success: true, profile });
                return;
            }

            // Make API call to get user profile
            const { userId } = request;
            if (!userId) {
                throw new Error('User ID is required');
            }

            const response = await fetch(`${this.API_BASE_URL}/users/${userId}/profile`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to get user profile');
            }

            sendResponse({ success: true, profile: result.profile });
        } catch (error) {
            console.error('Error getting user profile:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle update user profile
     */
    async handleUpdateUserProfile(request, sendResponse) {
        try {
            if (!this.DATABASE_AVAILABLE) {
                // Fallback to local storage
                const { userId, updateData } = request;
                if (!userId || !updateData) {
                    throw new Error('User ID and update data are required');
                }

                // Get current user from storage
                const result = await chrome.storage.local.get(['currentUser']);
                if (!result.currentUser || result.currentUser.id !== userId) {
                    throw new Error('User not found');
                }

                // Update user data
                const updatedUser = {
                    ...result.currentUser,
                    ...updateData,
                    updated_at: new Date().toISOString()
                };

                // Update current user if it's the same user
                this.backgroundManager.setAutoApplyState({ user: updatedUser });
                await chrome.storage.local.set({ currentUser: updatedUser });

                sendResponse({ success: true, user: updatedUser });
                return;
            }

            // Make API call to update user profile
            const { userId, updateData } = request;
            if (!userId || !updateData) {
                throw new Error('User ID and update data are required');
            }

            const response = await fetch(`${this.API_BASE_URL}/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData)
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to update user profile');
            }

            // Update current user if it's the same user
            const currentState = this.backgroundManager.getAutoApplyState();
            if (currentState.user && currentState.user.id === userId) {
                this.backgroundManager.setAutoApplyState({ user: result.user });
                await chrome.storage.local.set({ currentUser: result.user });
            }

            sendResponse({ success: true, user: result.user });
        } catch (error) {
            console.error('Error updating user profile:', error);
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle get current user
     */
    async handleGetCurrentUser(request, sendResponse) {
        try {
            // First check memory
            const state = this.backgroundManager.getAutoApplyState();
            if (state.user) {
                sendResponse({ success: true, user: state.user, isLoggedIn: true });
                return;
            }

            // Then check storage
            const result = await chrome.storage.local.get(['currentUser', 'isLoggedIn']);
            if (result.currentUser && result.isLoggedIn) {
                this.backgroundManager.setAutoApplyState({ user: result.currentUser });
                sendResponse({ success: true, user: result.currentUser, isLoggedIn: true });
            } else {
                sendResponse({ success: true, user: null, isLoggedIn: false });
            }
        } catch (error) {
            console.error('Error getting current user:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
}

export default UserManager; 