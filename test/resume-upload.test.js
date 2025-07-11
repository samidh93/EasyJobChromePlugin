const { expect } = require('chai');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

describe('Resume Upload API', () => {
    const API_BASE_URL = 'http://localhost:3001/api';
    let testUserId;
    let testResumeId;
    
    // Create a test user before running resume tests
    before(async () => {
        try {
            const timestamp = Date.now();
            const userData = {
                username: `resumetestuser${timestamp}`,
                email: `resume.test${timestamp}@example.com`,
                password: 'testpassword123'
            };

            const response = await axios.post(`${API_BASE_URL}/users/register`, userData);
            expect(response.status).to.equal(200);
            expect(response.data.success).to.be.true;
            
            testUserId = response.data.user.id;
            console.log(`Created test user with ID: ${testUserId}`);
        } catch (error) {
            console.error('Failed to create test user:', error.response?.data || error.message);
            throw error;
        }
    });

    // Clean up test data after all tests
    after(async () => {
        try {
            if (testUserId) {
                // Note: There's no DELETE user endpoint in the API, so we'll leave the test user
                console.log(`Test user ${testUserId} left in database for cleanup`);
            }
        } catch (error) {
            console.error('Failed to clean up test user:', error.response?.data || error.message);
        }
    });

    describe('File Upload Tests', () => {
        it('should upload a PDF resume successfully', async () => {
            try {
                // Create a test PDF file
                const testPdfPath = path.join(__dirname, 'test-resume.pdf');
                const testPdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n185\n%%EOF';
                fs.writeFileSync(testPdfPath, testPdfContent);

                const formData = new FormData();
                formData.append('resume', fs.createReadStream(testPdfPath));
                formData.append('name', 'Test PDF Resume');
                formData.append('short_description', 'Test PDF resume for upload testing');
                formData.append('is_default', 'true');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                    }
                );

                expect(response.status).to.equal(201);
                expect(response.data.success).to.be.true;
                expect(response.data.resume).to.exist;
                expect(response.data.resume.name).to.equal('Test PDF Resume');
                expect(response.data.resume.extension).to.equal('pdf');
                expect(response.data.resume.is_default).to.be.true;
                expect(response.data.resume.user_id).to.equal(testUserId);

                testResumeId = response.data.resume.id;

                // Clean up test file
                fs.unlinkSync(testPdfPath);
            } catch (error) {
                console.error('PDF upload test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should upload a DOCX resume successfully', async () => {
            try {
                // Create a minimal DOCX file (ZIP format)
                const testDocxPath = path.join(__dirname, 'test-resume.docx');
                const testDocxContent = Buffer.from([
                    0x50, 0x4B, 0x03, 0x04, 0x14, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x50, 0x4B, 0x05, 0x06,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
                    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
                ]);
                fs.writeFileSync(testDocxPath, testDocxContent);

                const formData = new FormData();
                formData.append('resume', fs.createReadStream(testDocxPath));
                formData.append('name', 'Test DOCX Resume');
                formData.append('short_description', 'Test DOCX resume for upload testing');
                formData.append('is_default', 'false');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                    }
                );

                expect(response.status).to.equal(201);
                expect(response.data.success).to.be.true;
                expect(response.data.resume).to.exist;
                expect(response.data.resume.name).to.equal('Test DOCX Resume');
                expect(response.data.resume.extension).to.equal('docx');
                expect(response.data.resume.is_default).to.be.false;

                // Clean up test file
                fs.unlinkSync(testDocxPath);
            } catch (error) {
                console.error('DOCX upload test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should upload a TXT resume successfully', async () => {
            try {
                const testTxtPath = path.join(__dirname, 'test-resume.txt');
                const testTxtContent = 'John Doe\nSoftware Engineer\n\nExperience:\n- 5 years in web development\n- Expert in JavaScript and React\n\nEducation:\n- BS Computer Science';
                fs.writeFileSync(testTxtPath, testTxtContent);

                const formData = new FormData();
                formData.append('resume', fs.createReadStream(testTxtPath));
                formData.append('name', 'Test TXT Resume');
                formData.append('short_description', 'Test TXT resume for upload testing');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                    }
                );

                expect(response.status).to.equal(201);
                expect(response.data.success).to.be.true;
                expect(response.data.resume).to.exist;
                expect(response.data.resume.name).to.equal('Test TXT Resume');
                expect(response.data.resume.extension).to.equal('txt');

                // Clean up test file
                fs.unlinkSync(testTxtPath);
            } catch (error) {
                console.error('TXT upload test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should upload a YAML resume successfully', async () => {
            try {
                const testYamlPath = path.join(__dirname, 'test-resume.yaml');
                const testYamlContent = `
name: John Doe
title: Software Engineer
experience:
  - company: Tech Corp
    position: Senior Developer
    years: 3
  - company: StartupCo
    position: Full Stack Developer
    years: 2
skills:
  - JavaScript
  - React
  - Node.js
education:
  degree: BS Computer Science
  university: Tech University
`;
                fs.writeFileSync(testYamlPath, testYamlContent);

                const formData = new FormData();
                formData.append('resume', fs.createReadStream(testYamlPath));
                formData.append('name', 'Test YAML Resume');
                formData.append('short_description', 'Test YAML resume for upload testing');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                    }
                );

                expect(response.status).to.equal(201);
                expect(response.data.success).to.be.true;
                expect(response.data.resume).to.exist;
                expect(response.data.resume.name).to.equal('Test YAML Resume');
                expect(response.data.resume.extension).to.equal('yaml');

                // Clean up test file
                fs.unlinkSync(testYamlPath);
            } catch (error) {
                console.error('YAML upload test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should reject invalid file types', async () => {
            try {
                const testInvalidPath = path.join(__dirname, 'test-resume.exe');
                const testInvalidContent = 'Invalid file content';
                fs.writeFileSync(testInvalidPath, testInvalidContent);

                const formData = new FormData();
                formData.append('resume', fs.createReadStream(testInvalidPath));
                formData.append('name', 'Test Invalid Resume');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        validateStatus: () => true // Don't throw on 4xx/5xx
                    }
                );

                expect(response.status).to.equal(400);
                expect(response.data.success).to.be.false;
                expect(response.data.error).to.contain('Invalid file type');

                // Clean up test file
                fs.unlinkSync(testInvalidPath);
            } catch (error) {
                console.error('Invalid file type test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should reject upload without file', async () => {
            try {
                const formData = new FormData();
                formData.append('name', 'Test No File Resume');

                const response = await axios.post(
                    `${API_BASE_URL}/users/${testUserId}/resumes/upload`,
                    formData,
                    {
                        headers: {
                            ...formData.getHeaders(),
                        },
                        validateStatus: () => true // Don't throw on 4xx/5xx
                    }
                );

                expect(response.status).to.equal(400);
                expect(response.data.success).to.be.false;
                expect(response.data.error).to.contain('No file uploaded');
            } catch (error) {
                console.error('No file upload test failed:', error.response?.data || error.message);
                throw error;
            }
        });
    });

    describe('Resume Management Tests', () => {
        it('should list user resumes', async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/users/${testUserId}/resumes`);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.resumes).to.be.an('array');
                expect(response.data.resumes.length).to.be.greaterThan(0);
                
                // Check that we have the uploaded resumes
                const resumeNames = response.data.resumes.map(r => r.name);
                expect(resumeNames).to.include('Test PDF Resume');
                expect(resumeNames).to.include('Test DOCX Resume');
                expect(resumeNames).to.include('Test TXT Resume');
                expect(resumeNames).to.include('Test YAML Resume');
            } catch (error) {
                console.error('List resumes test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should get resume file info', async () => {
            try {
                if (!testResumeId) {
                    throw new Error('Test resume ID not available');
                }

                const response = await axios.get(`${API_BASE_URL}/resumes/${testResumeId}/file-info`);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.file_info).to.exist;
                expect(response.data.file_info.exists).to.be.true;
                expect(response.data.file_info.size).to.be.greaterThan(0);
                expect(response.data.file_info.path).to.exist;
            } catch (error) {
                console.error('Get file info test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should download resume file', async () => {
            try {
                if (!testResumeId) {
                    throw new Error('Test resume ID not available');
                }

                const response = await axios.get(`${API_BASE_URL}/resumes/${testResumeId}/download`, {
                    responseType: 'arraybuffer'
                });
                
                expect(response.status).to.equal(200);
                expect(response.data).to.exist;
                expect(response.data.byteLength).to.be.greaterThan(0);
                
                // Check content type header
                const contentDisposition = response.headers['content-disposition'];
                expect(contentDisposition).to.contain('attachment');
                expect(contentDisposition).to.contain('Test PDF Resume.pdf');
            } catch (error) {
                console.error('Download resume test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should set resume as default', async () => {
            try {
                if (!testResumeId) {
                    throw new Error('Test resume ID not available');
                }

                const response = await axios.put(`${API_BASE_URL}/resumes/${testResumeId}/default`);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.resume.is_default).to.be.true;
            } catch (error) {
                console.error('Set default resume test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should update resume details', async () => {
            try {
                if (!testResumeId) {
                    throw new Error('Test resume ID not available');
                }

                const updateData = {
                    name: 'Updated Test Resume',
                    short_description: 'Updated description for testing'
                };

                const response = await axios.put(`${API_BASE_URL}/resumes/${testResumeId}`, updateData);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.resume.name).to.equal('Updated Test Resume');
                expect(response.data.resume.short_description).to.equal('Updated description for testing');
            } catch (error) {
                console.error('Update resume test failed:', error.response?.data || error.message);
                throw error;
            }
        });

        it('should delete resume', async () => {
            try {
                if (!testResumeId) {
                    throw new Error('Test resume ID not available');
                }

                const response = await axios.delete(`${API_BASE_URL}/resumes/${testResumeId}`);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.message).to.contain('deleted');

                // Verify resume is deleted
                const getResponse = await axios.get(`${API_BASE_URL}/resumes/${testResumeId}`, {
                    validateStatus: () => true
                });
                expect(getResponse.status).to.equal(404);
            } catch (error) {
                console.error('Delete resume test failed:', error.response?.data || error.message);
                throw error;
            }
        });
    });

    describe('Resume Statistics Tests', () => {
        it('should get resume statistics', async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/resumes/stats`);
                
                expect(response.status).to.equal(200);
                expect(response.data.success).to.be.true;
                expect(response.data.stats).to.exist;
                expect(response.data.stats.total_resumes).to.be.a('number');
                expect(response.data.stats.total_users_with_resumes).to.be.a('number');
                expect(response.data.stats.file_types).to.be.an('array');
            } catch (error) {
                console.error('Resume statistics test failed:', error.response?.data || error.message);
                throw error;
            }
        });
    });
}); 