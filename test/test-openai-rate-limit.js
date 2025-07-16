/**
 * OpenAI Rate Limit Test
 * This script tests the current rate limits for OpenAI API calls
 */

// Configuration
const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your actual API key
const MODEL = 'gpt-4o-mini';
const TEST_PROMPT = 'Hello, this is a rate limit test. Please respond with "Test successful" and nothing else.';
const MAX_REQUESTS = 10; // Number of requests to test
const DELAY_BETWEEN_REQUESTS = 1000; // 1 second delay between requests

// Test results
let successfulRequests = 0;
let rateLimitErrors = 0;
let otherErrors = 0;
let startTime = null;
let endTime = null;

/**
 * Make a single OpenAI API call
 */
async function makeOpenAICall(requestNumber) {
    try {
        console.log(`Making request ${requestNumber}/${MAX_REQUESTS}...`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: 'user',
                        content: TEST_PROMPT
                    }
                ],
                max_tokens: 50,
                temperature: 0.7
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 429) {
                rateLimitErrors++;
                console.log(`❌ Rate limit error on request ${requestNumber}:`, data.error?.message || 'Rate limit exceeded');
                return false;
            } else {
                otherErrors++;
                console.log(`❌ Error on request ${requestNumber}:`, data.error?.message || 'Unknown error');
                return false;
            }
        }

        successfulRequests++;
        console.log(`✅ Request ${requestNumber} successful:`, data.choices[0]?.message?.content?.trim());
        return true;
        
    } catch (error) {
        otherErrors++;
        console.log(`❌ Network error on request ${requestNumber}:`, error.message);
        return false;
    }
}

/**
 * Run the rate limit test
 */
async function runRateLimitTest() {
    console.log('🚀 Starting OpenAI Rate Limit Test');
    console.log('=====================================');
    console.log(`Model: ${MODEL}`);
    console.log(`Max requests: ${MAX_REQUESTS}`);
    console.log(`Delay between requests: ${DELAY_BETWEEN_REQUESTS}ms`);
    console.log('');

    startTime = Date.now();

    for (let i = 1; i <= MAX_REQUESTS; i++) {
        const success = await makeOpenAICall(i);
        
        // Add delay between requests (except for the last one)
        if (i < MAX_REQUESTS) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS));
        }
    }

    endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // Convert to seconds

    // Print results
    console.log('');
    console.log('📊 Test Results');
    console.log('===============');
    console.log(`Total time: ${totalTime.toFixed(2)} seconds`);
    console.log(`Successful requests: ${successfulRequests}`);
    console.log(`Rate limit errors: ${rateLimitErrors}`);
    console.log(`Other errors: ${otherErrors}`);
    console.log(`Success rate: ${((successfulRequests / MAX_REQUESTS) * 100).toFixed(1)}%`);
    
    // Calculate requests per minute
    const requestsPerMinute = (successfulRequests / totalTime) * 60;
    console.log(`Effective rate: ${requestsPerMinute.toFixed(1)} requests per minute`);

    // Analyze results
    console.log('');
    console.log('🔍 Analysis');
    console.log('===========');
    
    if (rateLimitErrors === 0) {
        console.log('✅ No rate limit errors detected!');
        if (successfulRequests === MAX_REQUESTS) {
            console.log('🎉 All requests succeeded - your rate limit appears to be sufficient');
        } else {
            console.log('⚠️ Some requests failed, but not due to rate limits');
        }
    } else {
        console.log('⚠️ Rate limit errors detected');
        console.log(`   - ${rateLimitErrors} out of ${MAX_REQUESTS} requests hit rate limits`);
        console.log('   - Consider upgrading your OpenAI plan or using a different model');
    }

    if (requestsPerMinute > 0) {
        console.log(`📈 Your effective rate limit: ~${Math.floor(requestsPerMinute)} requests per minute`);
    }
}

/**
 * Test different models to compare rate limits
 */
async function testMultipleModels() {
    const models = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o'];
    const testPrompts = 3; // Test 3 requests per model
    
    console.log('🔬 Testing Multiple Models');
    console.log('==========================');
    
    for (const model of models) {
        console.log(`\n📋 Testing model: ${model}`);
        console.log('─'.repeat(30));
        
        let modelSuccess = 0;
        let modelRateLimit = 0;
        
        for (let i = 1; i <= testPrompts; i++) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: 'user',
                                content: `Test ${i} for ${model}: Hello`
                            }
                        ],
                        max_tokens: 20,
                        temperature: 0.7
                    })
                });

                const data = await response.json();
                
                if (response.ok) {
                    modelSuccess++;
                    console.log(`  ✅ Request ${i}: Success`);
                } else if (response.status === 429) {
                    modelRateLimit++;
                    console.log(`  ❌ Request ${i}: Rate limit`);
                } else {
                    console.log(`  ❌ Request ${i}: ${data.error?.message || 'Error'}`);
                }
                
                // Small delay between requests
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`  ❌ Request ${i}: Network error`);
            }
        }
        
        console.log(`  📊 ${model}: ${modelSuccess}/${testPrompts} successful, ${modelRateLimit} rate limited`);
    }
}

/**
 * Check account usage and limits
 */
async function checkAccountInfo() {
    console.log('\n📊 Checking Account Information');
    console.log('===============================');
    
    try {
        const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            console.log('✅ API key is valid');
            console.log(`📋 Available models: ${data.data.length}`);
            
            // Check for specific models
            const availableModels = data.data.map(model => model.id);
            const testModels = ['gpt-4o-mini', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4'];
            
            console.log('\n🔍 Model Availability:');
            testModels.forEach(model => {
                const available = availableModels.includes(model);
                console.log(`  ${available ? '✅' : '❌'} ${model}`);
            });
            
        } else {
            console.log('❌ Failed to check account info:', response.status);
        }
    } catch (error) {
        console.log('❌ Error checking account info:', error.message);
    }
}

// Main execution
async function main() {
    if (OPENAI_API_KEY === 'your-api-key-here') {
        console.log('❌ Please set your OpenAI API key in the script');
        console.log('   Replace "your-api-key-here" with your actual API key');
        return;
    }

    try {
        // Check account info first
        await checkAccountInfo();
        
        // Run the main rate limit test
        await runRateLimitTest();
        
        // Test multiple models
        await testMultipleModels();
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

// Run the test
main(); 