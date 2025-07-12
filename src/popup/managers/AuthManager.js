class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isLoggedIn = false;
        this.listeners = [];
    }

    // Add listener for auth state changes
    addListener(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(listener => listener !== callback);
        };
    }

    // Notify all listeners of auth state changes
    notifyListeners() {
        this.listeners.forEach(listener => {
            try {
                listener({
                    currentUser: this.currentUser,
                    isLoggedIn: this.isLoggedIn
                });
            } catch (error) {
                console.error('Error in auth listener:', error);
            }
        });
    }

    // Get current auth state
    getAuthState() {
        return {
            currentUser: this.currentUser,
            isLoggedIn: this.isLoggedIn
        };
    }

    // Load current user from storage/background
    async loadCurrentUser() {
        try {
            console.log('AuthManager: Loading current user...');
            const response = await chrome.runtime.sendMessage({
                action: 'getCurrentUser'
            });

            console.log('AuthManager: getCurrentUser response:', response);

            if (response.success && response.user) {
                this.currentUser = response.user;
                this.isLoggedIn = response.isLoggedIn;
                console.log('AuthManager: Current user loaded:', response.user.username, response.user.id);
                this.notifyListeners();
                return { success: true, user: response.user, isLoggedIn: true };
            } else {
                this.currentUser = null;
                this.isLoggedIn = false;
                console.log('AuthManager: No current user found');
                this.notifyListeners();
                return { success: true, user: null, isLoggedIn: false };
            }
        } catch (error) {
            console.error('AuthManager: Error loading current user:', error);
            this.currentUser = null;
            this.isLoggedIn = false;
            this.notifyListeners();
            return { success: false, error: error.message };
        }
    }

    // Login user
    async login(email, password) {
        try {
            console.log('AuthManager: Logging in user:', email);
            
            const response = await chrome.runtime.sendMessage({
                action: 'loginUser',
                email: email,
                password: password
            });

            if (response.success) {
                this.currentUser = response.user;
                this.isLoggedIn = true;
                console.log('AuthManager: User logged in successfully:', response.user.username);
                this.notifyListeners();
                return { success: true, user: response.user };
            } else {
                console.error('AuthManager: Login failed:', response.error);
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('AuthManager: Error during login:', error);
            return { success: false, error: error.message };
        }
    }

    // Register user
    async register(userData) {
        try {
            console.log('AuthManager: Registering user:', userData.email);
            
            const response = await chrome.runtime.sendMessage({
                action: 'registerUser',
                userData: userData
            });

            if (response.success) {
                this.currentUser = response.user;
                this.isLoggedIn = true;
                console.log('AuthManager: User registered successfully:', response.user.username);
                this.notifyListeners();
                return { success: true, user: response.user };
            } else {
                console.error('AuthManager: Registration failed:', response.error);
                return { success: false, error: response.error };
            }
        } catch (error) {
            console.error('AuthManager: Error during registration:', error);
            return { success: false, error: error.message };
        }
    }

    // Logout user
    async logout() {
        try {
            console.log('AuthManager: Logging out user');
            
            // Try database logout first
            try {
                await chrome.runtime.sendMessage({ action: 'logoutUser' });
            } catch (dbError) {
                console.warn('AuthManager: Database logout failed, continuing with local logout:', dbError);
            }

            // Clear local storage
            await chrome.storage.local.set({
                isLoggedIn: false,
                loginData: { username: '', password: '' }
            });
            
            this.currentUser = null;
            this.isLoggedIn = false;
            console.log('AuthManager: User logged out successfully');
            this.notifyListeners();
            return { success: true };
        } catch (error) {
            console.error('AuthManager: Error during logout:', error);
            return { success: false, error: error.message };
        }
    }

    // Load user data from local storage (for backward compatibility)
    async loadUserData() {
        try {
            const result = await chrome.storage.local.get(['isLoggedIn', 'loginData']);
            if (result.isLoggedIn) {
                return { success: true, isLoggedIn: true, loginData: result.loginData || { username: '', password: '' } };
            } else {
                return { success: true, isLoggedIn: false, loginData: { username: '', password: '' } };
            }
        } catch (error) {
            console.error('AuthManager: Error loading user data:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create singleton instance
const authManager = new AuthManager();

export default authManager; 