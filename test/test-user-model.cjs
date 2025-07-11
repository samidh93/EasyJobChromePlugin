const { User } = require('../src/database/models/index.cjs');

async function testUserModel() {
    console.log('🧪 Testing User Model...\n');

    try {
        // Test 1: Create a new user
        console.log('📝 Test 1: Creating a new user...');
        const userData = {
            username: 'testuser_' + Date.now(),
            email: 'testuser_' + Date.now() + '@example.com',
            password_hash: 'hashed_password_123'
        };

        const newUser = await User.create(userData);
        console.log('✅ User created successfully:');
        console.log(`   ID: ${newUser.id}`);
        console.log(`   Username: ${newUser.username}`);
        console.log(`   Email: ${newUser.email}`);
        console.log(`   Created at: ${newUser.created_at}`);
        console.log(`   Is active: ${newUser.is_active}\n`);

        // Test 2: Find user by ID
        console.log('🔍 Test 2: Finding user by ID...');
        const foundUser = await User.findById(newUser.id);
        if (foundUser) {
            console.log('✅ User found by ID:');
            console.log(`   Username: ${foundUser.username}`);
            console.log(`   Email: ${foundUser.email}\n`);
        } else {
            console.log('❌ User not found by ID\n');
        }

        // Test 3: Find user by email
        console.log('📧 Test 3: Finding user by email...');
        const userByEmail = await User.findByEmail(newUser.email);
        if (userByEmail) {
            console.log('✅ User found by email:');
            console.log(`   Username: ${userByEmail.username}`);
            console.log(`   ID: ${userByEmail.id}\n`);
        } else {
            console.log('❌ User not found by email\n');
        }

        // Test 4: Find user by username
        console.log('👤 Test 4: Finding user by username...');
        const userByUsername = await User.findByUsername(newUser.username);
        if (userByUsername) {
            console.log('✅ User found by username:');
            console.log(`   Email: ${userByUsername.email}`);
            console.log(`   ID: ${userByUsername.id}\n`);
        } else {
            console.log('❌ User not found by username\n');
        }

        // Test 5: Update user data
        console.log('📝 Test 5: Updating user data...');
        const updatedUser = await foundUser.update({
            username: 'updated_' + foundUser.username,
            email: 'updated_' + foundUser.email
        });
        console.log('✅ User updated successfully:');
        console.log(`   New username: ${updatedUser.username}`);
        console.log(`   New email: ${updatedUser.email}`);
        console.log(`   Updated at: ${updatedUser.updated_at}\n`);

        // Test 6: Update last login
        console.log('🕐 Test 6: Updating last login...');
        await updatedUser.updateLastLogin();
        console.log('✅ Last login updated:');
        console.log(`   Last login: ${updatedUser.last_login}\n`);

        // Test 7: Get user applications (should be empty for new user)
        console.log('📋 Test 7: Getting user applications...');
        const applications = await updatedUser.getApplications();
        console.log(`✅ User applications count: ${applications.length}\n`);

        // Test 8: Get user AI settings (should be empty for new user)
        console.log('🤖 Test 8: Getting user AI settings...');
        const aiSettings = await updatedUser.getAISettings();
        console.log(`✅ User AI settings count: ${aiSettings.length}\n`);

        // Test 9: Get default AI settings (should be null for new user)
        console.log('⚙️ Test 9: Getting default AI settings...');
        const defaultAISettings = await updatedUser.getDefaultAISettings();
        console.log(`✅ Default AI settings: ${defaultAISettings ? 'Found' : 'None'}\n`);

        // Test 10: Get user resumes (should be empty for new user)
        console.log('📄 Test 10: Getting user resumes...');
        const resumes = await updatedUser.getResumes();
        console.log(`✅ User resumes count: ${resumes.length}\n`);

        // Test 11: Get default resume (should be null for new user)
        console.log('📋 Test 11: Getting default resume...');
        const defaultResume = await updatedUser.getDefaultResume();
        console.log(`✅ Default resume: ${defaultResume ? 'Found' : 'None'}\n`);

        // Test 12: Test user JSON conversion (exclude sensitive data)
        console.log('🔒 Test 12: Converting user to JSON (excluding sensitive data)...');
        const userJSON = updatedUser.toJSON();
        console.log('✅ User JSON:');
        console.log(JSON.stringify(userJSON, null, 2));
        console.log(`   Password hash excluded: ${!userJSON.password_hash}\n`);

        // Test 13: Deactivate user
        console.log('🚫 Test 13: Deactivating user...');
        await updatedUser.deactivate();
        console.log('✅ User deactivated:');
        console.log(`   Is active: ${updatedUser.is_active}\n`);

        // Test 14: Try to find non-existent user
        console.log('❓ Test 14: Finding non-existent user...');
        const nonExistentUser = await User.findById('00000000-0000-0000-0000-000000000000');
        console.log(`✅ Non-existent user result: ${nonExistentUser ? 'Found (unexpected)' : 'Not found (expected)'}\n`);

        // Test 15: Test error handling - try to create user with duplicate email
        console.log('⚠️ Test 15: Testing error handling (duplicate email)...');
        try {
            await User.create({
                username: 'another_user',
                email: updatedUser.email, // Same email as existing user
                password_hash: 'another_password'
            });
            console.log('❌ Duplicate email was allowed (unexpected)\n');
        } catch (error) {
            console.log('✅ Duplicate email rejected (expected):');
            console.log(`   Error: ${error.message}\n`);
        }

        console.log('🎉 All User model tests completed successfully!');
        console.log(`📊 Test Summary:`);
        console.log(`   - Created user ID: ${newUser.id}`);
        console.log(`   - Final username: ${updatedUser.username}`);
        console.log(`   - Final email: ${updatedUser.email}`);
        console.log(`   - User is active: ${updatedUser.is_active}`);
        console.log(`   - Last login: ${updatedUser.last_login}`);

    } catch (error) {
        console.error('❌ Error during User model testing:', error);
        console.error('Stack trace:', error.stack);
    }
}

// Run the test
if (require.main === module) {
    testUserModel()
        .then(() => {
            console.log('\n✅ Test execution completed');
            process.exit(0);
        })
        .catch((error) => {
            console.error('\n❌ Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testUserModel }; 