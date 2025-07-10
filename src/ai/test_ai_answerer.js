#!/usr/bin/env node

/**
 * Node.js test script for AIQuestionAnswerer
 * Run with: node test_ai_answerer.js
 */

// Mock Chrome API for Node.js environment
global.chrome = {
    runtime: {
        sendMessage: function(message, callback) {
            console.log('🔧 Mock Chrome API call:', message.action);
            
            // Simulate async response
            setTimeout(() => {
                if (message.action === 'testOllama') {
                    callback({ success: true });
                } else if (message.action === 'callOllama') {
                    // Mock Ollama response
                    const mockResponse = {
                        response: generateMockResponse(message.data)
                    };
                    callback({ success: true, data: mockResponse });
                } else {
                    callback({ success: false, error: 'Unknown action' });
                }
            }, 100);
        },
        lastError: null
    }
};

function generateMockResponse(requestData) {
    const prompt = requestData.prompt || '';
    console.log('🤖 Mock Ollama prompt preview:', prompt.substring(0, 100) + '...');
    
    // Simple mock responses based on question content
    if (prompt.includes('email')) {
        return 'john.doe@example.com';
    } else if (prompt.includes('phone')) {
        return '+491234567890';
    } else if (prompt.includes('name') && prompt.includes('first')) {
        return 'John';
    } else if (prompt.includes('name') && prompt.includes('last')) {
        return 'Doe';
    } else if (prompt.includes('programming languages') || prompt.includes('skills')) {
        return 'JavaScript, React, Node.js, Python, Docker';
    } else if (prompt.includes('experience') && prompt.includes('years')) {
        return '8';
    } else if (prompt.includes('Available Options')) {
        // Extract options from prompt
        const optionsMatch = prompt.match(/Available Options: \[(.*?)\]/);
        if (optionsMatch) {
            const options = optionsMatch[1].split(', ').map(opt => opt.replace(/"/g, ''));
            return options[0]; // Return first option as mock response
        }
    }
    
    return 'This is a mock response from the AI system.';
}

// Import the AIQuestionAnswerer class
import('./AIQuestionAnswerer.js').then(async (module) => {
    const AIQuestionAnswerer = module.default;
    
    console.log('🚀 Starting AIQuestionAnswerer Tests\n');
    
    // Initialize the AI answerer
    const aiAnswerer = new AIQuestionAnswerer();
    
    // Sample user data
    const userData = {
        personal_information: {
            name: "John",
            surname: "Doe",
            email: "john.doe@example.com",
            phone: "1234567890",
            phone_prefix: "+49",
            country: "Germany",
            salary: "75000"
        },
        work_experience: [
            {
                company: "Tech Corp",
                position: "Software Engineer",
                duration: "2020-2023",
                description: "Developed web applications using React and Node.js"
            }
        ],
        skills: ["JavaScript", "React", "Node.js", "Python", "Docker"],
        education: [
            {
                degree: "Bachelor of Computer Science",
                institution: "University of Technology",
                year: "2020"
            }
        ]
    };
    
    try {
        // Test 1: Load user data
        console.log('📋 Test 1: Loading user data...');
        const loadResult = await aiAnswerer.setUserContext(userData);
        console.log('✅ Result:', loadResult);
        console.log('');
        
        // Test 2: Direct answers (personal info)
        console.log('👤 Test 2: Direct answers (personal info)...');
        const directQuestions = [
            'What is your email address?',
            'What is your phone number?',
            'What is your first name?',
            'What is your last name?',
            'What country are you from?'
        ];
        
        for (const question of directQuestions) {
            try {
                const answer = await aiAnswerer.answerQuestion(question);
                console.log(`Q: ${question}`);
                console.log(`A: ${answer}`);
                console.log('');
            } catch (error) {
                console.error(`❌ Error for "${question}": ${error.message}`);
            }
        }
        
        // Test 3: Questions with options
        console.log('🎯 Test 3: Questions with options...');
        const optionTests = [
            {
                question: 'What is your country?',
                options: ['Deutschland (+49)', 'United States (+1)', 'United Kingdom (+44)']
            },
            {
                question: 'What is your experience level?',
                options: ['Junior (0-2 years)', 'Mid-level (3-5 years)', 'Senior (5+ years)']
            },
            {
                question: 'What is your preferred work arrangement?',
                options: ['Remote', 'On-site', 'Hybrid']
            }
        ];
        
        for (const test of optionTests) {
            try {
                const answer = await aiAnswerer.answerQuestion(test.question, test.options);
                console.log(`Q: ${test.question}`);
                console.log(`Options: [${test.options.join(', ')}]`);
                console.log(`A: ${answer}`);
                console.log('');
            } catch (error) {
                console.error(`❌ Error for "${test.question}": ${error.message}`);
            }
        }
        
        // Test 4: AI-based questions (will use mock responses)
        console.log('🤖 Test 4: AI-based questions...');
        const aiQuestions = [
            'What programming languages do you know?',
            'How many years of experience do you have?',
            'What was your last job title?',
            'What is your educational background?'
        ];
        
        for (const question of aiQuestions) {
            try {
                const answer = await aiAnswerer.answerQuestion(question);
                console.log(`Q: ${question}`);
                console.log(`A: ${answer}`);
                console.log('');
            } catch (error) {
                console.error(`❌ Error for "${question}": ${error.message}`);
            }
        }
        
        // Test 5: Test connection check
        console.log('🔗 Test 5: Connection check...');
        try {
            const connected = await aiAnswerer.checkOllamaConnection();
            console.log('✅ Connection check result:', connected);
        } catch (error) {
            console.error('❌ Connection check failed:', error.message);
        }
        
        console.log('\n🎉 All tests completed!');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    }
    
}).catch(error => {
    console.error('❌ Failed to import AIQuestionAnswerer:', error);
    process.exit(1);
}); 