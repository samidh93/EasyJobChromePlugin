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

        const response = await fetch('http://localhost:11434/api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(testMessage)
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Ollama chat test failed:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Ollama chat test successful:', data);
        return { 
            success: true, 
            data: {
                version: data.model,
                response: data.message.content
            }
        };
    } catch (error) {
        console.error('Ollama connection failed:', error);
        return { 
            success: false, 
            error: error.message,
            details: error.stack
        };
    }
}

// Function to make Ollama API calls
async function callOllamaAPI(endpoint, data) {
    try {
        console.log(`Making Ollama API call to ${endpoint}:`, data);
        
        const response = await fetch(`http://localhost:11434/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Access-Control-Allow-Origin': '*'  // Try allowing CORS

            },
            body: JSON.stringify(data)
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
        return { success: true, data: result };
    } catch (error) {
        console.error(`Ollama API call failed (${endpoint}):`, error);
        return { 
            success: false, 
            error: error.message,
            details: error.stack
        };
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in background script:', message);
    
    if (message.action === 'testOllama') {
        testOllamaConnection().then(sendResponse);
        return true; // Will respond asynchronously
    }

    if (message.action === 'callOllama') {
        const { endpoint, data } = message;
        console.log('Making Ollama API call:', { endpoint, data });
        callOllamaAPI(endpoint, data).then(sendResponse);
        return true; // Will respond asynchronously
    }
});



  