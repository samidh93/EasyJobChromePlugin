/**
 * AI Manager
 * Handles all AI-related operations including Ollama API calls, testing, and AI provider management
 */
class AIManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.OLLAMA_BASE_URL = 'http://localhost:11434';
    }

    /**
     * Handle AI-related messages
     */
    async handleMessage(request, sendResponse) {
        const { action } = request;
        
        switch (action) {
            case 'callOllama':
                await this.handleCallOllama(request, sendResponse);
                break;
            case 'testOllama':
            case 'testOllamaConnection':
                await this.handleTestOllama(request, sendResponse);
                break;
            case 'ollamaRequest':
                await this.handleOllamaRequest(request, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown AI action' });
        }
    }

    /**
     * Handle generic Ollama API requests (for simple operations like getting models)
     */
    async handleOllamaRequest(request, sendResponse) {
        try {
            const { method, url, data } = request;
            
            const ollamaUrl = `${this.OLLAMA_BASE_URL}${url}`;
            const options = {
                method: method || 'GET',
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            const response = await fetch(ollamaUrl, options);
            
            if (!response.ok) {
                sendResponse({ 
                    success: false, 
                    error: `Ollama request failed: ${response.status} ${response.statusText}` 
                });
                return;
            }

            const result = await response.json();
            sendResponse({ success: true, ...result });
        } catch (error) {
            console.error('Ollama request error:', error);
            sendResponse({ 
                success: false, 
                error: 'Error connecting to Ollama. Make sure it\'s running on localhost:11434.' 
            });
        }
    }

    /**
     * Handle Ollama API calls (for complex AI operations like chat/generate)
     */
    async handleCallOllama(request, sendResponse) {
        try {
            const endpoint = request.endpoint || 'generate';
            const data = request.data || {};
            
            const result = await this.callOllamaAPI(endpoint, data);
            sendResponse(result);
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Handle Ollama connection testing
     */
    async handleTestOllama(request, sendResponse) {
        try {
            const result = await this.testOllamaConnection();
            sendResponse(result);
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }
    }

    /**
     * Test AI connection based on provider
     */
    async testAiConnection(aiSettings) {
        console.log('Testing AI connection:', aiSettings);
        
        if (aiSettings.provider === 'ollama') {
            const result = await this.testOllamaConnection();
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

    /**
     * Test Ollama connection
     */
    async testOllamaConnection() {
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
            const result = await this.callOllamaAPI('chat', testMessage);
            
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

    /**
     * Make Ollama API calls (for complex AI operations)
     */
    async callOllamaAPI(endpoint, data) {
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
}

export default AIManager; 