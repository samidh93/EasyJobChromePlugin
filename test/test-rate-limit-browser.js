/**
 * Browser Console Rate Limit Test
 * Run this in your browser console to test OpenAI rate limits
 */

// Configuration - UPDATE THESE VALUES
const OPENAI_API_KEY = 'your-api-key-here'; // Replace with your actual API key
const MODEL = 'gpt-4o-mini';
const TEST_REQUESTS = 5; // Number of requests to test

// Test function
async function testRateLimit() {
    console.log('🚀 Starting OpenAI Rate Limit Test');
    console.log(`Model: ${MODEL}`);
    console.log(`Requests: ${TEST_REQUESTS}`);
    console.log('─'.repeat(50));

    let successCount = 0;
    let rateLimitCount = 0;
    let errorCount = 0;
    const startTime = Date.now();

    for (let i = 1; i <= TEST_REQUESTS; i++) {
        try {
            console.log(`📤 Request ${i}/${TEST_REQUESTS}...`);
            
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
                            content: `Test request ${i}: Say "Success ${i}"`
                        }
                    ],
                    max_tokens: 20,
                    temperature: 0.7
                })
            });

            const data = await response.json();

            if (response.ok) {
                successCount++;
                console.log(`✅ Request ${i}: Success - "${data.choices[0]?.message?.content?.trim()}"`);
            } else if (response.status === 429) {
                rateLimitCount++;
                console.log(`❌ Request ${i}: Rate limit - ${data.error?.message || 'Rate limit exceeded'}`);
            } else {
                errorCount++;
                console.log(`❌ Request ${i}: Error - ${data.error?.message || 'Unknown error'}`);
            }

            // Wait 1 second between requests
            if (i < TEST_REQUESTS) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

        } catch (error) {
            errorCount++;
            console.log(`❌ Request ${i}: Network error - ${error.message}`);
        }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const requestsPerMinute = (successCount / totalTime) * 60;

    console.log('\n📊 Results');
    console.log('─'.repeat(50));
    console.log(`Total time: ${totalTime.toFixed(1)} seconds`);
    console.log(`Successful: ${successCount}/${TEST_REQUESTS}`);
    console.log(`Rate limited: ${rateLimitCount}`);
    console.log(`Errors: ${errorCount}`);
    console.log(`Success rate: ${((successCount / TEST_REQUESTS) * 100).toFixed(1)}%`);
    console.log(`Effective rate: ${requestsPerMinute.toFixed(1)} requests/minute`);

    // Analysis
    console.log('\n🔍 Analysis');
    console.log('─'.repeat(50));
    
    if (rateLimitCount === 0) {
        if (successCount === TEST_REQUESTS) {
            console.log('🎉 All requests succeeded! Your rate limit is sufficient.');
        } else {
            console.log('⚠️ Some requests failed, but not due to rate limits.');
        }
    } else {
        console.log('⚠️ Rate limit errors detected.');
        console.log(`   ${rateLimitCount} out of ${TEST_REQUESTS} requests hit rate limits.`);
        console.log('   Consider upgrading your OpenAI plan or using a different model.');
    }

    if (requestsPerMinute > 0) {
        console.log(`📈 Your effective rate limit: ~${Math.floor(requestsPerMinute)} requests/minute`);
    }

    return {
        successCount,
        rateLimitCount,
        errorCount,
        requestsPerMinute,
        totalTime
    };
}

// Quick test function for different models
async function testModels() {
    const models = ['gpt-4o-mini', 'gpt-3.5-turbo'];
    const results = {};

    console.log('🔬 Testing Different Models');
    console.log('─'.repeat(50));

    for (const model of models) {
        console.log(`\n📋 Testing ${model}:`);
        
        // Test 2 requests per model
        let success = 0;
        let rateLimit = 0;
        
        for (let i = 1; i <= 2; i++) {
            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${OPENAI_API_KEY}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [{ role: 'user', content: 'Hello' }],
                        max_tokens: 10
                    })
                });

                if (response.ok) {
                    success++;
                    console.log(`  ✅ Request ${i}: Success`);
                } else if (response.status === 429) {
                    rateLimit++;
                    console.log(`  ❌ Request ${i}: Rate limit`);
                } else {
                    console.log(`  ❌ Request ${i}: Error`);
                }

                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`  ❌ Request ${i}: Network error`);
            }
        }
        
        results[model] = { success, rateLimit };
        console.log(`  📊 ${model}: ${success}/2 successful, ${rateLimit} rate limited`);
    }

    return results;
}

// Instructions
console.log('📋 OpenAI Rate Limit Test Instructions');
console.log('─'.repeat(50));
console.log('1. Replace "your-api-key-here" with your actual OpenAI API key');
console.log('2. Run: testRateLimit()');
console.log('3. For model comparison, run: testModels()');
console.log('4. Check the results to see if your rate limit has been upgraded');
console.log('');

// Export functions for console use
window.testRateLimit = testRateLimit;
window.testModels = testModels;

console.log('✅ Test functions loaded. Run testRateLimit() to start testing.'); 