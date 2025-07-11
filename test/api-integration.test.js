const axios = require('axios');
const { expect } = require('chai');

// Test configuration
const API_BASE_URL = 'http://localhost:3001';
const TEST_TIMEOUT = 30000; // 30 seconds

describe('EasyJob API Integration Tests', function() {
    this.timeout(TEST_TIMEOUT);
    
    let testUser = null;
    let testResume = null;
    
    // Test data
    const testUserData = {
        username: 'testuser_' + Date.now(),
        email: 'test_' + Date.now() + '@example.com',
        password: 'testpassword123'
    };
    
    const testResumeData = {
        name: 'Test Resume',
        extension: 'pdf',
        path: '/uploads/test-resume.pdf',
        short_description: 'Test resume for integration testing',
        is_default: true
    };
    
    before(async function() {
        // Wait for API server to be ready
        let retries = 10;
        while (retries > 0) {
            try {
                await axios.get(`${API_BASE_URL}/health`);
                console.log('✅ API server is ready');
                break;
            } catch (error) {
                retries--;
                if (retries === 0) {
                    throw new Error('API server is not responding');
                }
                console.log(`⏳ Waiting for API server... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    });
    
    describe('Health Check', function() {
        it('should return healthy status', async function() {
            const response = await axios.get(`${API_BASE_URL}/health`);
            expect(response.status).to.equal(200);
            expect(response.data).to.have.property('status', 'OK');
            expect(response.data).to.have.property('message', 'EasyJob API Server is running');
        });
    });
    
    describe('User Management', function() {
        describe('User Registration', function() {
            it('should register a new user successfully', async function() {
                const response = await axios.post(`${API_BASE_URL}/api/users/register`, testUserData);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('user');
                expect(response.data.user).to.have.property('id');
                expect(response.data.user).to.have.property('username', testUserData.username);
                expect(response.data.user).to.have.property('email', testUserData.email);
                expect(response.data.user).to.not.have.property('password_hash');
                
                testUser = response.data.user;
                console.log(`✅ User registered: ${testUser.id}`);
            });
            
            it('should not register duplicate user', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/register`, testUserData);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'User already exists');
                }
            });
            
            it('should validate required fields', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/register`, {
                        username: 'testuser',
                        // missing email and password
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data.error).to.include('required');
                }
            });
        });
        
        describe('User Login', function() {
            it('should login successfully with correct credentials', async function() {
                const response = await axios.post(`${API_BASE_URL}/api/users/login`, {
                    email: testUserData.email,
                    password: testUserData.password
                });
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('user');
                expect(response.data.user).to.have.property('id', testUser.id);
                expect(response.data.user).to.have.property('email', testUserData.email);
                expect(response.data.user).to.not.have.property('password_hash');
            });
            
            it('should reject invalid credentials', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/login`, {
                        email: testUserData.email,
                        password: 'wrongpassword'
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(401);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'Invalid email or password');
                }
            });
            
            it('should reject non-existent user', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/login`, {
                        email: 'nonexistent@example.com',
                        password: 'password'
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(401);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'Invalid email or password');
                }
            });
        });
        
        describe('User Profile', function() {
            it('should get user profile successfully', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/users/${testUser.id}/profile`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('profile');
                expect(response.data.profile).to.have.property('profile');
                expect(response.data.profile).to.have.property('stats');
                expect(response.data.profile).to.have.property('resumes');
                expect(response.data.profile.profile).to.have.property('id', testUser.id);
                expect(response.data.profile.resumes).to.be.an('array');
            });
            
            it('should return 404 for non-existent user profile', async function() {
                try {
                    await axios.get(`${API_BASE_URL}/api/users/00000000-0000-0000-0000-000000000000/profile`);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'User not found');
                }
            });
        });
        
        describe('User Update', function() {
            it('should update user profile successfully', async function() {
                const updateData = {
                    username: 'updated_' + testUserData.username
                };
                
                const response = await axios.put(`${API_BASE_URL}/api/users/${testUser.id}`, updateData);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('user');
                expect(response.data.user).to.have.property('username', updateData.username);
                
                // Update our test user data
                testUser.username = updateData.username;
            });
            
            it('should return 404 for non-existent user update', async function() {
                try {
                    await axios.put(`${API_BASE_URL}/api/users/00000000-0000-0000-0000-000000000000`, {
                        username: 'newusername'
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'User not found');
                }
            });
        });
        
        describe('User Existence Check', function() {
            it('should check if user exists', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/users/exists/${testUserData.email}`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('exists', true);
            });
            
            it('should return false for non-existent user', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/users/exists/nonexistent@example.com`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('exists', false);
            });
        });
    });
    
    describe('Resume Management', function() {
        describe('Resume Creation', function() {
            it('should create a new resume successfully', async function() {
                const response = await axios.post(`${API_BASE_URL}/api/users/${testUser.id}/resumes`, testResumeData);
                expect(response.status).to.equal(201);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('resume');
                expect(response.data.resume).to.have.property('id');
                expect(response.data.resume).to.have.property('name', testResumeData.name);
                expect(response.data.resume).to.have.property('extension', testResumeData.extension);
                expect(response.data.resume).to.have.property('path', testResumeData.path);
                expect(response.data.resume).to.have.property('is_default', testResumeData.is_default);
                expect(response.data.resume).to.have.property('user_id', testUser.id);
                
                testResume = response.data.resume;
                console.log(`✅ Resume created: ${testResume.id}`);
            });
            
            it('should validate required fields for resume creation', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/${testUser.id}/resumes`, {
                        name: 'Test Resume',
                        // missing extension and path
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(400);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data.error).to.include('required');
                }
            });
            
            it('should return 404 for non-existent user', async function() {
                try {
                    await axios.post(`${API_BASE_URL}/api/users/00000000-0000-0000-0000-000000000000/resumes`, testResumeData);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'User not found');
                }
            });
        });
        
        describe('Resume Retrieval', function() {
            it('should get all resumes for a user', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/users/${testUser.id}/resumes`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('resumes');
                expect(response.data.resumes).to.be.an('array');
                expect(response.data.resumes).to.have.length.greaterThan(0);
                
                const resume = response.data.resumes.find(r => r.id === testResume.id);
                expect(resume).to.exist;
                expect(resume).to.have.property('name', testResumeData.name);
            });
            
            it('should get a specific resume by ID', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/resumes/${testResume.id}`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('resume');
                expect(response.data.resume).to.have.property('id', testResume.id);
                expect(response.data.resume).to.have.property('name', testResumeData.name);
                expect(response.data.resume).to.have.property('user_id', testUser.id);
            });
            
            it('should return 404 for non-existent resume', async function() {
                try {
                    await axios.get(`${API_BASE_URL}/api/resumes/00000000-0000-0000-0000-000000000000`);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'Resume not found');
                }
            });
        });
        
        describe('Resume Updates', function() {
            it('should update resume successfully', async function() {
                const updateData = {
                    name: 'Updated Test Resume',
                    short_description: 'Updated description'
                };
                
                const response = await axios.put(`${API_BASE_URL}/api/resumes/${testResume.id}`, updateData);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('resume');
                expect(response.data.resume).to.have.property('name', updateData.name);
                expect(response.data.resume).to.have.property('short_description', updateData.short_description);
                
                // Update our test resume data
                testResume.name = updateData.name;
                testResume.short_description = updateData.short_description;
            });
            
            it('should set resume as default', async function() {
                // First create another resume
                const secondResumeData = {
                    name: 'Second Resume',
                    extension: 'docx',
                    path: '/uploads/second-resume.docx',
                    is_default: false
                };
                
                const createResponse = await axios.post(`${API_BASE_URL}/api/users/${testUser.id}/resumes`, secondResumeData);
                const secondResume = createResponse.data.resume;
                
                // Now set the second resume as default
                const response = await axios.put(`${API_BASE_URL}/api/resumes/${secondResume.id}/default`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('resume');
                expect(response.data.resume).to.have.property('is_default', true);
                
                // Verify the first resume is no longer default
                const firstResumeResponse = await axios.get(`${API_BASE_URL}/api/resumes/${testResume.id}`);
                expect(firstResumeResponse.data.resume).to.have.property('is_default', false);
            });
            
            it('should return 404 for non-existent resume update', async function() {
                try {
                    await axios.put(`${API_BASE_URL}/api/resumes/00000000-0000-0000-0000-000000000000`, {
                        name: 'Updated Name'
                    });
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'Resume not found');
                }
            });
        });
        
        describe('Resume Applications', function() {
            it('should get applications for a resume', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/resumes/${testResume.id}/applications`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('applications');
                expect(response.data.applications).to.be.an('array');
                // Should be empty since we haven't created any applications yet
            });
        });
        
        describe('Resume Statistics', function() {
            it('should get resume statistics', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/resumes/stats`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('stats');
                expect(response.data.stats).to.have.property('total_resumes');
                expect(response.data.stats).to.have.property('default_resumes');
                expect(response.data.stats).to.have.property('unique_extensions');
                expect(response.data.stats).to.have.property('unique_users');
            });
            
            it('should get resume statistics for specific user', async function() {
                const response = await axios.get(`${API_BASE_URL}/api/resumes/stats?userId=${testUser.id}`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('stats');
                expect(parseInt(response.data.stats.total_resumes)).to.be.greaterThan(0);
            });
        });
        
        describe('Resume Deletion', function() {
            it('should delete resume successfully', async function() {
                // Create a resume specifically for deletion
                const deleteResumeData = {
                    name: 'Resume to Delete',
                    extension: 'txt',
                    path: '/uploads/delete-resume.txt',
                    is_default: false
                };
                
                const createResponse = await axios.post(`${API_BASE_URL}/api/users/${testUser.id}/resumes`, deleteResumeData);
                const resumeToDelete = createResponse.data.resume;
                
                // Delete the resume
                const response = await axios.delete(`${API_BASE_URL}/api/resumes/${resumeToDelete.id}`);
                expect(response.status).to.equal(200);
                expect(response.data).to.have.property('success', true);
                expect(response.data).to.have.property('message', 'Resume deleted successfully');
                
                // Verify it's deleted
                try {
                    await axios.get(`${API_BASE_URL}/api/resumes/${resumeToDelete.id}`);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                }
            });
            
            it('should return 404 for non-existent resume deletion', async function() {
                try {
                    await axios.delete(`${API_BASE_URL}/api/resumes/00000000-0000-0000-0000-000000000000`);
                    throw new Error('Should have thrown an error');
                } catch (error) {
                    expect(error.response.status).to.equal(404);
                    expect(error.response.data).to.have.property('success', false);
                    expect(error.response.data).to.have.property('error', 'Resume not found');
                }
            });
        });
    });
    
    describe('Error Handling', function() {
        it('should return 404 for unknown endpoints', async function() {
            try {
                await axios.get(`${API_BASE_URL}/api/unknown/endpoint`);
                throw new Error('Should have thrown an error');
            } catch (error) {
                expect(error.response.status).to.equal(404);
                expect(error.response.data).to.have.property('success', false);
                expect(error.response.data).to.have.property('error', 'Endpoint not found');
            }
        });
    });
    
    after(async function() {
        // Clean up test data
        if (testUser) {
            console.log(`🧹 Cleaning up test user: ${testUser.id}`);
            // Note: In a real scenario, you might want to clean up test data
            // For now, we'll leave it as the database will be reset between test runs
        }
    });
}); 