// Function to make Ollama API calls
async function callOllamaAPI(endpoint, data) {
    try {
        console.log(`Making Ollama API call to ${endpoint}:`, data);
        
        const port = 11434; // Always use port 11434
        console.log(`Using Ollama port: ${port}`);
        
        // Ensure stream is set to false to prevent streaming responses
        const requestData = {
            ...data,
            stream: false // Always disable streaming to get a single complete response
        };
        
        console.log(`Request with stream disabled:`, requestData);
        
        const response = await fetch(`http://localhost:${port}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(requestData),
            signal: AbortSignal.timeout(15000), // 15 second timeout,
            mode: 'cors' // Ensure CORS is enabled
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ollama API error response:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        // Get the response text first to sanitize if needed
        const responseText = await response.text();
        
        // Try to parse the response as JSON, with sanitization if needed
        let result;
        try {
            // First attempt: direct JSON parse
            result = JSON.parse(responseText);
        } catch (parseError) {
            console.warn("JSON parse error:", parseError.message);
            console.log("Response text:", responseText.substring(0, 200) + "...");
            
            // Second attempt: Try to extract a valid JSON object
            try {
                // Look for a pattern that might be a complete JSON object
                const jsonMatch = responseText.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    result = JSON.parse(jsonMatch[0]);
                    console.log("Successfully extracted JSON from response");
                } else {
                    throw new Error("Couldn't find valid JSON object in response");
                }
            } catch (extractError) {
                console.error("Failed to extract JSON:", extractError);
                throw new Error(`Invalid JSON response from Ollama: ${parseError.message}`);
            }
        }
        
        console.log(`Ollama API call successful:`, result);
        
        // Validate response based on endpoint type
        if (endpoint === 'chat') {
            // Chat endpoint should have a message with content
            if (!result || !result.message || !result.message.content) {
                console.error(`Unexpected chat response structure from Ollama:`, result);
                
                // Try to construct a valid response if we have partial data
                if (result && typeof result === 'object') {
                    // If we have any text property, use that as content
                    const possibleContent = result.message?.content || result.content || result.text || result.response || "";
                    
                    // Construct a minimal valid response
                    result = {
                        message: {
                            content: possibleContent || "No content found in response"
                        },
                        model: result.model || "unknown"
                    };
                    
                    console.log("Constructed fallback response:", result);
                } else {
                    throw new Error('Invalid chat response format from Ollama');
                }
            }
        } else if (endpoint === 'embeddings') {
            // Embeddings endpoint should have an embedding array
            if (!result || !result.embedding || !Array.isArray(result.embedding)) {
                console.error(`Unexpected embeddings response structure from Ollama:`, result);
                throw new Error('Invalid embeddings response format from Ollama');
            }
        } else {
            // Generic validation for other endpoints - just ensure we have a result
            if (!result) {
                console.error(`Empty response from Ollama for endpoint ${endpoint}:`, result);
                throw new Error(`Invalid response format from Ollama for ${endpoint}`);
            }
        }
        
        return { success: true, data: result };
    } catch (error) {
        console.error(`Ollama API call failed (${endpoint}):`, error);
        
        // Provide helpful troubleshooting info
        let troubleshooting = "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal.";
        
        if (error.name === 'AbortError') {
            troubleshooting += " The request timed out - your model might be too large or your computer too slow.";
        } else if (error.message.includes('Failed to fetch')) {
            troubleshooting += " Your computer cannot connect to Ollama. Make sure it's running and not blocked by a firewall.";
        } else if (error.message.includes('Invalid response format') || error.message.includes('JSON')) {
            troubleshooting += " Ollama returned an unexpected response format. You might need to update Ollama to a newer version.";
        }
        
        return { 
            success: false, 
            error: error.message,
            details: error.stack,
            troubleshooting: troubleshooting
        };
    }
}

// Test function for direct chat endpoint testing
async function testChatEndpoint() {
    console.log('Testing chat endpoint...');
    
    // Test 1: Simple country code selection
    console.log('\n===== TEST 1: Direct country selection =====');
    
    const countryOptions = [
        "Option auswählen", 
        "Afghanistan (+93)",
        "Ägypten (+20)",
        "Albanien (+355)",
        "Algerien (+213)",
        "Andorra (+376)",
        "Angola (+244)",
        "Argentinien (+54)",
        "Armenien (+374)",
        "Australien (+61)",
        "Belgien (+32)",
        "Brasilien (+55)",
        "Bulgarien (+359)",
        "China (+86)",
        "Dänemark (+45)",
        "Deutschland (+49)",
        "Estland (+372)",
        "Finnland (+358)",
        "Frankreich (+33)",
        "Griechenland (+30)",
        "Großbritannien (+44)",
        "Indien (+91)",
        "Indonesien (+62)",
        "Irland (+353)",
        "Island (+354)",
        "Israel (+972)",
        "Italien (+39)",
        "Japan (+81)",
        "Kanada (+1)",
        "Luxemburg (+352)",
        "Marokko (+212)",
        "Niederlande (+31)",
        "Norwegen (+47)",
        "Österreich (+43)",
        "Polen (+48)",
        "Portugal (+351)",
        "Rumänien (+40)",
        "Russland (+7)",
        "Schweden (+46)",
        "Schweiz (+41)",
        "Spanien (+34)",
        "Südafrika (+27)",
        "Südkorea (+82)",
        "Tunesien (+216)",
        "Türkei (+90)",
        "Ukraine (+380)",
        "Ungarn (+36)",
        "Vereinigte Staaten (+1)",
        "Vietnam (+84)"
    ];
    
    // First level request - simulates answerWithOptions
    const firstRequest = {
        model: 'qwen2.5:3b',
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that fills job application forms."
            },
            {
                role: "user",
                content: `Form Question: Landesvorwahl ?
Available Options: ${JSON.stringify(countryOptions)}
User Context Data Hint: personal_information.country: Germany, personal_information.city: Berlin, personal_information.citizenship: German/Tunisian Citizenship
IMPORTANT: You MUST choose EXACTLY ONE option from the list above.
Your answer should match one of the options EXACTLY as written.
DO NOT add any explanation or additional text.`
            }
        ],
        options: { temperature: 0.0 }
    };
    
    try {
        console.log('Making first request to get country...');
        const firstResponse = await callOllamaAPI('chat', firstRequest);
        
        if (firstResponse.success) {
            const initialAnswer = firstResponse.data.message.content.trim();
            console.log(`Initial answer: "${initialAnswer}"`);
            
            // Check if it's in the list
            const isExactMatch = countryOptions.includes(initialAnswer);
            console.log(`Is exact match: ${isExactMatch}`);
            
            // If not exact match, simulate refinement
            if (!isExactMatch) {
                console.log('\n===== TEST 2: Answer refinement =====');
                
                // Create refinement prompt
                const refinementRequest = {
                    model: 'qwen2.5:3b',
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that selects the most appropriate option from a list."
                        },
                        {
                            role: "user",
                            content: `
Original answer: ${initialAnswer}
Available options: ${JSON.stringify(countryOptions)}

Which option from the list above most closely matches "${initialAnswer}"?
You MUST select EXACTLY one option from the list as written.
Do not add any explanation. Return only the option text exactly as it appears in the list.`
                        }
                    ],
                    options: { temperature: 0.0 }
                };
                
                console.log('Making second request to refine answer...');
                const refinementResponse = await callOllamaAPI('chat', refinementRequest);
                
                if (refinementResponse.success) {
                    const refinedAnswer = refinementResponse.data.message.content.trim();
                    console.log(`Refined answer: "${refinedAnswer}"`);
                    console.log(`Is in options: ${countryOptions.includes(refinedAnswer)}`);
                    
                    // Show expected vs actual
                    console.log('\nExpected: "Deutschland (+49)"');
                    console.log(`Actual: "${refinedAnswer}"`);
                    console.log(`Test passed: ${refinedAnswer === "Deutschland (+49)"}`);
                } else {
                    console.error('Refinement request failed:', refinementResponse.error);
                }
            }
        } else {
            console.error('First request failed:', firstResponse.error);
        }
    } catch (error) {
        console.error('Test failed with error:', error);
    }
    
    // Test 3: Phone prefix extraction
    console.log('\n===== TEST 3: Phone prefix extraction =====');
    
    const phoneQuestion = {
        model: 'qwen2.5:3b',
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that extracts information from text."
            },
            {
                role: "user",
                content: `
Extract the phone country code from this information:
- Country: Germany
- Phone prefix: +49
- Example phone numbers with this prefix: +49 30 1234567, +49-176-12345678

Return just the country code in this format: "+XX" (e.g. "+1" for USA, "+44" for UK, etc.)
`
            }
        ],
        options: { temperature: 0.0 }
    };
    
    try {
        console.log('Testing phone prefix extraction...');
        const phoneResponse = await callOllamaAPI('chat', phoneQuestion);
        
        if (phoneResponse.success) {
            const phonePrefix = phoneResponse.data.message.content.trim();
            console.log(`Extracted phone prefix: "${phonePrefix}"`);
            
            // Remove any quotes around the prefix if present
            const cleanedPrefix = phonePrefix.replace(/^["'](.+)["']$/, "$1");
            console.log(`Cleaned prefix: "${cleanedPrefix}"`);
            
            console.log(`Test passed: ${cleanedPrefix === "+49"}`);
        } else {
            console.error('Phone prefix extraction failed:', phoneResponse.error);
        }
    } catch (error) {
        console.error('Phone prefix test failed with error:', error);
    }
}

// Run the test
testChatEndpoint().then(() => {
    console.log('Tests completed');
    
    // Add a forced refinement test
    console.log('\n\n===== TEST 4: FORCED REFINEMENT =====');
    return testForcedRefinement();
}).then(() => {
    console.log('All tests completed');
}).catch(error => {
    console.error('Error running tests:', error);
});

// Test function that forces the refinement process
async function testForcedRefinement() {
    console.log('Testing forced refinement scenario...');
    
    const countryOptions = [
        "Option auswählen", 
        "Afghanistan (+93)",
        "Ägypten (+20)",
        "Albanien (+355)",
        "Algerien (+213)",
        "Andorra (+376)",
        "Angola (+244)",
        "Argentinien (+54)",
        "Armenien (+374)",
        "Australien (+61)",
        "Belgien (+32)",
        "Brasilien (+55)",
        "Bulgarien (+359)",
        "China (+86)",
        "Dänemark (+45)",
        "Deutschland (+49)",
        "Estland (+372)",
        "Finnland (+358)",
        "Frankreich (+33)",
        "Griechenland (+30)",
        "Großbritannien (+44)",
        "Indien (+91)",
        "Indonesien (+62)",
        "Irland (+353)",
        "Island (+354)",
        "Israel (+972)",
        "Italien (+39)",
        "Japan (+81)",
        "Kanada (+1)",
        "Luxemburg (+352)",
        "Marokko (+212)",
        "Niederlande (+31)",
        "Norwegen (+47)",
        "Österreich (+43)",
        "Polen (+48)",
        "Portugal (+351)",
        "Rumänien (+40)",
        "Russland (+7)",
        "Schweden (+46)",
        "Schweiz (+41)",
        "Spanien (+34)",
        "Südafrika (+27)",
        "Südkorea (+82)",
        "Tunesien (+216)",
        "Türkei (+90)",
        "Ukraine (+380)",
        "Ungarn (+36)",
        "Vereinigte Staaten (+1)",
        "Vietnam (+84)"
    ];
    
    // First level request with context that will likely return "Germany" instead of "Deutschland"
    const forcedRequest = {
        model: 'qwen2.5:3b',
        messages: [
            {
                role: "system",
                content: "You are a helpful assistant that answers questions accurately."
            },
            {
                role: "user",
                content: `What is the country name and calling code for the following information?
Country: Germany, City: Berlin

Available options: ${JSON.stringify(countryOptions)}
`
            }
        ],
        options: { temperature: 0.7 } // Using higher temperature to encourage variation
    };
    
    try {
        console.log('Making initial request with likely non-matching response...');
        const response = await callOllamaAPI('chat', forcedRequest);
        
        if (response.success) {
            const initialAnswer = response.data.message.content.trim();
            console.log(`Initial answer: "${initialAnswer}"`);
            
            // Check if the answer contains "Germany" but isn't in the options list
            const containsGermany = initialAnswer.includes("Germany");
            const isExactMatch = countryOptions.includes(initialAnswer);
            
            console.log(`Contains "Germany": ${containsGermany}`);
            console.log(`Is exact match: ${isExactMatch}`);
            
            // If we have a non-matching answer, try refinement
            if (!isExactMatch) {
                console.log('Answer is not an exact match, attempting refinement...');
                
                // Create refinement prompt
                const refinementRequest = {
                    model: 'qwen2.5:3b',
                    messages: [
                        {
                            role: "system",
                            content: "You are a helpful assistant that selects the most appropriate option from a list."
                        },
                        {
                            role: "user",
                            content: `
The user needs to select Germany's country code from this list:
${JSON.stringify(countryOptions)}

Based on the information that the country is Germany, which option from the list should be selected?
Return only the exact text of the option without any explanation.`
                        }
                    ],
                    options: { temperature: 0.0 }
                };
                
                console.log('Making refinement request...');
                const refinementResponse = await callOllamaAPI('chat', refinementRequest);
                
                if (refinementResponse.success) {
                    const refinedAnswer = refinementResponse.data.message.content.trim();
                    console.log(`Refined answer: "${refinedAnswer}"`);
                    console.log(`Is valid option: ${countryOptions.includes(refinedAnswer)}`);
                    
                    // Show expected vs actual
                    console.log('\nExpected: "Deutschland (+49)"');
                    console.log(`Actual: "${refinedAnswer}"`);
                    console.log(`Test passed: ${refinedAnswer === "Deutschland (+49)" || refinedAnswer.includes("Deutschland")}`);
                } else {
                    console.error('Refinement request failed:', refinementResponse.error);
                }
            } else {
                console.log('Answer is already an exact match, no refinement needed.');
            }
        } else {
            console.error('Initial request failed:', response.error);
        }
    } catch (error) {
        console.error('Forced refinement test failed with error:', error);
    }
}