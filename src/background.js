// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Tracker Extension Installed');
});

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
            stream: false
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

// Function to get embeddings from Ollama API
async function getEmbeddings(text) {
    try {
        console.log(`Getting embeddings for text: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
        
        const port = 11434;
        const data = {
            model: "nomic-embed-text",
            prompt: text,
            stream: false
        };
        
        const response = await fetch(`http://localhost:${port}/api/embeddings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ollama embeddings API error:`, {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }

        const result = await response.json();
        console.log(`Embeddings generated successfully`);
        
        return { success: true, data: result };
    } catch (error) {
        console.error(`Embeddings API call failed:`, error);
        
        // Provide helpful troubleshooting info
        let troubleshooting = "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal.";
        
        if (error.name === 'AbortError') {
            troubleshooting += " The request timed out - your model might be too large or your computer too slow.";
        } else if (error.message.includes('Failed to fetch')) {
            troubleshooting += " Your computer cannot connect to Ollama. Make sure it's running and not blocked by a firewall.";
        }
        
        return { 
            success: false, 
            error: error.message,
            details: error.stack,
            troubleshooting: troubleshooting
        };
    }
}

// Function to make Ollama API calls
async function callOllamaAPI(endpoint, data) {
    try {
        console.log(`Making Ollama API call to ${endpoint}:`, data);
        
        const port = 11434; // Always use port 11434
        console.log(`Using Ollama port: ${port}`);
        
        const response = await fetch(`http://localhost:${port}/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(data),
            signal: AbortSignal.timeout(15000) // 15 second timeout
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

        const result = await response.json();
        console.log(`Ollama API call successful:`, result);
        
        // Check if result has the expected structure
        if (!result || !result.message || !result.message.content) {
            console.error(`Unexpected response structure from Ollama:`, result);
            throw new Error('Invalid response format from Ollama');
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
        } else if (error.message.includes('Invalid response format')) {
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

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in background script:', message);
    
    if (message.action === 'testOllama') {
        // Properly handle the Promise chain with explicit send of response
        testOllamaConnection()
            .then(result => {
                console.log('Sending test Ollama response:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Error in test Ollama:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Unknown error',
                    troubleshooting: "Error in background script" 
                });
            });
        return true; // Will respond asynchronously
    }

    if (message.action === 'callOllama') {
        const { endpoint, data } = message;
        console.log('Making Ollama API call:', { endpoint, data });
        
        // Properly handle the Promise chain with explicit send of response
        callOllamaAPI(endpoint, data)
            .then(result => {
                console.log('Sending Ollama API response:', result);
                sendResponse(result);
            })
            .catch(error => {
                console.error('Error in call Ollama API:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Unknown error',
                    troubleshooting: "Error in background script"
                });
            });
        return true; // Will respond asynchronously
    }

    if (message.action === 'getEmbeddings') {
        const { text } = message;
        console.log('Getting embeddings for text');
        
        getEmbeddings(text)
            .then(result => {
                console.log('Sending embeddings response');
                sendResponse(result);
            })
            .catch(error => {
                console.error('Error getting embeddings:', error);
                sendResponse({ 
                    success: false, 
                    error: error.message || 'Unknown error',
                    troubleshooting: "Error generating embeddings"
                });
            });
        return true; // Will respond asynchronously
    }
});



  