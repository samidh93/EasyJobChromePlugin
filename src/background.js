// background.js


chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Tracker Extension Installed');
});

// Global variables to track auto apply state
let isAutoApplyRunning = false;
let currentUserData = null;
let currentAiSettings = null;

// Message handler for popup communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Background received message:', request);
    
    if (request.action === 'startAutoApply') {
        handleStartAutoApply(request, sendResponse);
        return true; // Keep the message channel open for async response
    } else if (request.action === 'stopAutoApply') {
        handleStopAutoApply(request, sendResponse);
        return true;
    } else if (request.action === 'testOllamaConnection') {
        testOllamaConnection().then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.action === 'callOllama') {
        // Handle AI question answering calls
        const endpoint = request.endpoint || 'generate';
        const data = request.data || {};
        
        callOllamaAPI(endpoint, data).then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.action === 'testOllama') {
        // Handle simple test calls (for compatibility)
        testOllamaConnection().then(result => {
            sendResponse(result);
        }).catch(error => {
            sendResponse({ success: false, error: error.message });
        });
        return true;
    } else if (request.action === 'getAutoApplyState') {
        // Return current auto apply state
        sendResponse({ 
            success: true, 
            isRunning: isAutoApplyRunning 
        });
        return true;
    }
    
    // For other actions, respond immediately
    sendResponse({ success: false, error: 'Unknown action' });
});

// Handle start auto apply
async function handleStartAutoApply(request, sendResponse) {
    try {
        console.log('Starting auto apply with data:', request);
        
        // Validate required data
        if (!request.loginData || !request.loginData.username) {
            throw new Error('Login data required');
        }
        
        if (!request.aiSettings || !request.aiSettings.provider || !request.aiSettings.model) {
            throw new Error('AI settings required');
        }
        
        // Store the current session data
        currentUserData = request.loginData;
        currentAiSettings = request.aiSettings;
        isAutoApplyRunning = true;
        
        // Test AI connection first
        await testAiConnection(request.aiSettings);
        
        // Send message to content script to start auto apply
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            
            // Check if we're on LinkedIn
            if (!tabs[0].url.includes('linkedin.com')) {
                throw new Error('Please navigate to LinkedIn jobs page first');
            }
            
            // Send message to content script
            chrome.tabs.sendMessage(tabId, {
                action: 'startAutoApply',
                userData: currentUserData,
                aiSettings: currentAiSettings
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending message to content script:', chrome.runtime.lastError);
                    sendResponse({ 
                        success: false, 
                        error: 'Failed to communicate with LinkedIn page. Please refresh the page and try again.' 
                    });
                } else {
                    console.log('Content script response:', response);
                    sendResponse({ success: true, message: 'Auto apply started successfully' });
                }
            });
        } else {
            throw new Error('No active tab found');
        }
    } catch (error) {
        console.error('Error starting auto apply:', error);
        isAutoApplyRunning = false;
        sendResponse({ success: false, error: error.message });
    }
}

// Handle stop auto apply
async function handleStopAutoApply(request, sendResponse) {
    try {
        console.log('Stopping auto apply');
        
        // Send message to content script to stop auto apply
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs.length > 0) {
            const tabId = tabs[0].id;
            
            chrome.tabs.sendMessage(tabId, {
                action: 'stopAutoApply'
            }, (response) => {
                if (chrome.runtime.lastError) {
                    console.error('Error sending stop message to content script:', chrome.runtime.lastError);
                    // Still update state even if there's an error communicating with content script
                    isAutoApplyRunning = false;
                    sendResponse({ success: true, message: 'Auto apply stopped (content script communication error)' });
                } else if (response && response.success) {
                    console.log('Auto apply stopped successfully');
                    isAutoApplyRunning = false;
                    sendResponse({ success: true, message: 'Auto apply stopped' });
                } else {
                    console.error('Content script failed to stop auto apply:', response?.error);
                    // Still update state if content script reports an error
                    isAutoApplyRunning = false;
                    sendResponse({ success: true, message: 'Auto apply stopped (with content script error)' });
                }
            });
        } else {
            // No active tab, but still update state
            isAutoApplyRunning = false;
            sendResponse({ success: true, message: 'Auto apply stopped (no active tab)' });
        }
    } catch (error) {
        console.error('Error stopping auto apply:', error);
        // Update state even if there's an error
        isAutoApplyRunning = false;
        sendResponse({ success: false, error: error.message });
    }
}

// Test AI connection based on provider
async function testAiConnection(aiSettings) {
    console.log('Testing AI connection:', aiSettings);
    
    if (aiSettings.provider === 'ollama') {
        const result = await testOllamaConnection();
        if (!result.success) {
            throw new Error(`Ollama connection failed: ${result.error}`);
        }
        console.log('Ollama connection successful');
    } else {
        // For external providers, just check if API key is present
        if (!aiSettings.apiKey) {
            throw new Error(`API key required for ${aiSettings.provider}`);
        }
        console.log(`AI settings validated for ${aiSettings.provider}`);
    }
}

// Function to test Ollama connection
async function testOllamaConnection() {
    try {
        console.log('Testing Ollama connection...');
        const testMessage = {
            model: "qwen2.5:3b",
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant."
                },
                {
                    role: "user",
                    content: "Hello, are you working?"
                }
            ],
            stream: false // Explicitly disable streaming
        };

        // Reuse the callOllamaAPI function
        const result = await callOllamaAPI('chat', testMessage);
        
        if (result.success) {
            console.log('Ollama chat test successful:', result.data);
            
            return { 
                success: true, 
                data: {
                    version: result.data.model,
                    response: result.data.message.content,
                    port: 11434
                }
            };
        } else {
            // If callOllamaAPI returned an error
            throw new Error(result.error || 'Unknown error from Ollama');
        }
    } catch (error) {
        console.error('Ollama connection failed:', error);
        return { 
            success: false, 
            error: error.message,
            details: error.stack,
            troubleshooting: "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal."
        };
    }
}

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
        
        
        const response = await fetch(`http://localhost:${port}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(requestData),
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
        } else if (endpoint === 'generate') {
            // Generate endpoint should have a response field
            if (!result || typeof result.response !== 'string') {
                console.error(`Unexpected generate response structure from Ollama:`, result);
                
                // Try to construct a valid response if we have partial data
                if (result && typeof result === 'object') {
                    // If we have any text property, use that as response
                    const possibleResponse = result.response || result.content || result.text || result.message?.content || "";
                    
                    // Construct a minimal valid response
                    result = {
                        response: possibleResponse || "No response found in result",
                        model: result.model || "unknown"
                    };
                    
                    console.log("Constructed fallback generate response:", result);
                } else {
                    throw new Error('Invalid generate response format from Ollama');
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