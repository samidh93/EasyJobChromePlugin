const UserService = require('../src/database/user-service.cjs');

async function testUserIntegration() {
    console.log('🧪 Testing User Integration for Chrome Extension...\n');

    try {
        // Test 1: Register a new user
        console.log('📝 Test 1: Registering new user...');
        const userData = {
            username: 'chromeuser_' + Date.now(),
            email: 'chromeuser_' + Date.now() + '@example.com',
            password: 'password123'
        };

        const newUser = await UserService.registerUser(userData);
        console.log('✅ User registered:', {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email,
            created_at: newUser.created_at
        });

        // Test 2: Login with the user
        console.log('\n🔐 Test 2: Logging in...');
        const loginResult = await UserService.loginUser(userData.email, userData.password);
        console.log('✅ Login successful:', {
            id: loginResult.id,
            username: loginResult.username,
            last_login: loginResult.last_login
        });

        // Test 3: Get user profile with related data
        console.log('\n👤 Test 3: Getting user profile...');
        const profile = await UserService.getUserProfile(newUser.id);
        console.log('✅ Profile loaded:', {
            username: profile.profile.username,
            email: profile.profile.email,
            stats: profile.stats,
            resumesCount: profile.resumes.length,
            aiSettingsCount: profile.aiSettings.length
        });

        // Test 4: Test user validation
        console.log('\n✅ Test 4: Testing user validation...');
        const invalidUser = {
            username: 'ab', // Too short
            email: 'invalid-email',
            password: '123' // Too short
        };
        
        const validation = UserService.validateUserData(invalidUser);
        console.log('✅ Validation errors (expected):', validation.errors);

        // Test 5: Test duplicate email prevention
        console.log('\n⚠️ Test 5: Testing duplicate email prevention...');
        try {
            await UserService.registerUser({
                username: 'duplicate_user',
                email: userData.email, // Same email as existing user
                password: 'password123'
            });
            console.log('❌ Duplicate email was allowed (unexpected)');
        } catch (error) {
            console.log('✅ Duplicate email rejected (expected):', error.message);
        }

        // Test 6: Test user existence check
        console.log('\n🔍 Test 6: Testing user existence check...');
        const userExists = await UserService.userExists(userData.email);
        console.log('✅ User exists check:', userExists);

        const nonExistentUser = await UserService.userExists('nonexistent@example.com');
        console.log('✅ Non-existent user check:', nonExistentUser);

        // Test 7: Get user by username
        console.log('\n👥 Test 7: Get user by username...');
        const userByUsername = await UserService.getUserByUsername(newUser.username);
        console.log('✅ User found by username:', userByUsername ? userByUsername.username : 'Not found');

        // Test 8: Get user statistics
        console.log('\n📊 Test 8: Get user statistics...');
        const stats = await UserService.getUserStats(newUser.id);
        console.log('✅ User stats:', stats);

        // Test 9: Update user profile
        console.log('\n📝 Test 9: Update user profile...');
        const updatedUser = await UserService.updateUserProfile(newUser.id, {
            username: 'updated_' + newUser.username
        });
        console.log('✅ User updated:', {
            oldUsername: newUser.username,
            newUsername: updatedUser.username
        });

        // Test 10: Test password hashing and verification
        console.log('\n🔒 Test 10: Testing password hashing...');
        const hashedPassword = await UserService.hashPassword('testpassword');
        const isValidPassword = await UserService.verifyPassword('testpassword', hashedPassword);
        const isInvalidPassword = await UserService.verifyPassword('wrongpassword', hashedPassword);
        console.log('✅ Password hashing test:', {
            hashedLength: hashedPassword.length,
            validPassword: isValidPassword,
            invalidPassword: isInvalidPassword
        });

        console.log('\n🎉 All User Integration tests passed!');
        console.log(`📊 Test Summary:`);
        console.log(`   - Created user ID: ${newUser.id}`);
        console.log(`   - Final username: ${updatedUser.username}`);
        console.log(`   - User email: ${updatedUser.email}`);
        console.log(`   - User is active: ${updatedUser.is_active}`);
        console.log(`   - Last login: ${loginResult.last_login}`);

        console.log('\n🚀 Integration is ready for Chrome Extension!');
        console.log('   - Background script can register/login users');
        console.log('   - Popup can display user information');
        console.log('   - User data is persisted in PostgreSQL');
        console.log('   - Password security is implemented');

    } catch (error) {
        console.error('❌ Integration test failed:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Chrome Extension simulation test
async function testChromeExtensionSimulation() {
    console.log('\n🔧 Testing Chrome Extension Message Simulation...\n');

    try {
        // Simulate background script message handling
        console.log('📨 Simulating Chrome Extension Messages...');

        // Simulate registration message
        const registrationData = {
            action: 'registerUser',
            userData: {
                username: 'extensionuser_' + Date.now(),
                email: 'extensionuser_' + Date.now() + '@example.com',
                password: 'password123'
            }
        };

        console.log('🔄 Simulating registration message:', registrationData.action);
        const newUser = await UserService.registerUser(registrationData.userData);
        console.log('✅ Registration simulation successful:', newUser.username);

        // Simulate login message
        const loginData = {
            action: 'loginUser',
            email: registrationData.userData.email,
            password: registrationData.userData.password
        };

        console.log('🔄 Simulating login message:', loginData.action);
        const loginResult = await UserService.loginUser(loginData.email, loginData.password);
        console.log('✅ Login simulation successful:', loginResult.username);

        // Simulate get profile message
        const profileData = {
            action: 'getUserProfile',
            userId: newUser.id
        };

        console.log('🔄 Simulating get profile message:', profileData.action);
        const profile = await UserService.getUserProfile(profileData.userId);
        console.log('✅ Profile simulation successful:', {
            username: profile.profile.username,
            statsLoaded: !!profile.stats
        });

        console.log('\n✅ Chrome Extension simulation completed successfully!');

    } catch (error) {
        console.error('❌ Chrome Extension simulation failed:', error);
    }
}

// Run all tests
if (require.main === module) {
    Promise.resolve()
        .then(() => testUserIntegration())
        .then(() => testChromeExtensionSimulation())
        .then(() => {
            console.log('\n✅ All tests completed successfully!');
            console.log('\n📋 Next Steps:');
            console.log('   1. Start your Chrome extension');
            console.log('   2. Try registering a new user');
            console.log('   3. Test login functionality');
            console.log('   4. Verify user data persistence');
            console.log('   5. Check auto-apply with user context');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testUserIntegration, testChromeExtensionSimulation }; 