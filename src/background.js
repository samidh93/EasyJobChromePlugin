// background.js

import memoryStore from './ai/MemoryStore.js';
import { MemoryStore } from './ai/MemoryStore.js';
import profileLoader from './ai/profileLoader.js';

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

// Function to send progress updates to popup
function sendProgressUpdate(progress, total, status) {
  chrome.runtime.sendMessage({
    type: 'EMBEDDING_PROGRESS',
    data: {
      progress,
      total,
      percent: Math.round((progress / total) * 100),
      status
    }
  });
}

// Function to get embeddings from Ollama API
export async function getEmbeddings(text) {
    try {
        // Trim text and limit length
        const maxLength = 1500;
        const trimmedText = text.substring(0, maxLength);
        
        console.log(`Getting embeddings in background script (${trimmedText.length} chars): ${trimmedText.substring(0, 50)}${trimmedText.length > 50 ? '...' : ''}`);
        
        const port = 11434;
        const data = {
            model: "nomic-embed-text",
            prompt: trimmedText,
            stream: false
        };
        
        // Log the request details
        console.log('Ollama embedding request:', {
            url: `http://localhost:${port}/api/embeddings`,
            model: data.model,
            textLength: trimmedText.length,
            timestamp: new Date().toISOString()
        });
        
        const requestStartTime = performance.now();
        
        // Create a more robust fetch with retry capability
        const fetchWithRetry = async (url, options, maxRetries = 2, retryDelay = 2000) => {
            let lastError;
            
            for (let attempt = 0; attempt <= maxRetries; attempt++) {
                try {
                    console.log(`Embedding API attempt ${attempt + 1}/${maxRetries + 1}`);
                    
                    // Add increasing timeout for each retry
                    const timeout = 10000 + (attempt * 5000); // 10s, 15s, 20s
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), timeout);
                    
                    console.log(`Request timeout set to ${timeout}ms`);
                    const fetchStartTime = performance.now();
                    
                    const response = await fetch(url, {
                        ...options,
                        signal: controller.signal
                    });
                    
                    const fetchEndTime = performance.now();
                    console.log(`Fetch completed in ${(fetchEndTime - fetchStartTime).toFixed(2)}ms with status ${response.status}`);
                    
                    clearTimeout(timeoutId);
                    
                    if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
                    }
                    
                    const jsonStartTime = performance.now();
                    const result = await response.json();
                    const jsonEndTime = performance.now();
                    
                    console.log(`JSON parsing completed in ${(jsonEndTime - jsonStartTime).toFixed(2)}ms`);
                    
                    return result;
                } catch (error) {
                    lastError = error;
                    console.warn(`Embedding fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`, error.message);
                    
                    if (attempt < maxRetries) {
                        console.log(`Retrying in ${retryDelay}ms...`);
                        await new Promise(resolve => setTimeout(resolve, retryDelay));
                    }
                }
            }
            
            throw lastError;
        };
        
        // Execute the fetch with retry
        const result = await fetchWithRetry(
            `http://localhost:${port}/api/embeddings`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(data)
            }
        );
        
        const requestEndTime = performance.now();
        const totalTime = requestEndTime - requestStartTime;
        
        // Check if we have valid embeddings in the response
        if (!result.embedding || !Array.isArray(result.embedding)) {
            console.error('Invalid embedding format in API response:', result);
            throw new Error('Invalid embedding format returned from API');
        }
        
        // Log detailed response info
        console.log(`Embeddings generated successfully in ${totalTime.toFixed(2)}ms`);
        console.log(`Embedding dimensions: ${result.embedding.length}`);
        console.log(`Embedding sample: [${result.embedding.slice(0, 3).map(v => v.toFixed(5)).join(', ')}...]`);
        
        // Convert embeddings to lower precision to save storage space
        const optimizedEmbedding = result.embedding.map(val => parseFloat(val.toFixed(5)));
        
        // Compare size before and after optimization
        const originalSize = JSON.stringify(result.embedding).length;
        const optimizedSize = JSON.stringify(optimizedEmbedding).length;
        const reduction = (100 - (optimizedSize / originalSize * 100)).toFixed(2);
        
        console.log(`Embedding size reduction: ${originalSize} → ${optimizedSize} bytes (${reduction}% reduction)`);
        
        // Return optimized embeddings
        return { 
            success: true, 
            data: {
                ...result,
                embedding: optimizedEmbedding
            },
            timing: {
                totalMs: totalTime,
                timestamp: new Date().toISOString()
            }
        };
    } catch (error) {
        console.error(`Embeddings API call failed:`, error);
        
        // Provide helpful troubleshooting info
        let troubleshooting = "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal.";
        
        if (error.name === 'AbortError') {
            troubleshooting += " The request timed out - your model might be too large or your computer too slow.";
        } else if (error.message && error.message.includes('Failed to fetch')) {
            troubleshooting += " Your computer cannot connect to Ollama. Make sure it's running and not blocked by a firewall.";
        } else if (error.message && error.message.includes('invalid format')) {
            troubleshooting += " The embedding model returned data in an unexpected format. You may need to update Ollama or try a different embedding model.";
        }
        
        return { 
            success: false, 
            error: error.message,
            details: error.stack,
            troubleshooting: troubleshooting,
            timestamp: new Date().toISOString()
        };
    }
}

// Initialize memory store with the direct embedding function
const directMemoryStore = new MemoryStore(getEmbeddings);
// Replace the imported singleton with our direct-access version
Object.assign(memoryStore, directMemoryStore);

// Helper functions for hash-based embedding caching
async function calculateHash(content) {
  // Create a simple hash from content
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = ((hash << 5) - hash) + content.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString();
}

async function getStoredEmbeddingHash() {
  return new Promise(resolve => {
    chrome.storage.local.get('embeddingHash', result => {
      resolve(result.embeddingHash || '');
    });
  });
}

async function storeEmbeddingHash(hash) {
  return new Promise(resolve => {
    chrome.storage.local.set({ 'embeddingHash': hash }, () => {
      resolve();
    });
  });
}

async function storeEmbeddings(data) {
  return new Promise((resolve, reject) => {
    if (!data || Object.keys(data).length === 0) {
      console.warn('No embeddings to save to storage');
      resolve(false);
      return;
    }
    
    console.log(`Saving ${Object.keys(data).length} embeddings to Chrome storage`);
    
    // Flatten the data to reduce storage size
    const flattened = {};
    
    for (const [key, entry] of Object.entries(data)) {
      // Ensure embedding is an array and convert to shorter precision format
      if (entry.embedding && Array.isArray(entry.embedding)) {
        // Convert to lower precision (5 decimal places) to save space
        const preciseEmbedding = entry.embedding.map(val => 
          parseFloat(val.toFixed(5))
        );
        
        flattened[key] = {
          text: entry.text,
          embedding: preciseEmbedding
        };
      } else {
        // Keep as is if there's no valid embedding
        flattened[key] = entry;
      }
    }
    
    // Log size reduction
    const originalSize = JSON.stringify(data).length;
    const newSize = JSON.stringify(flattened).length;
    const reduction = (100 - (newSize / originalSize * 100)).toFixed(2);
    
    console.log(`Flattened embeddings for storage: ${originalSize} bytes → ${newSize} bytes (${reduction}% reduction)`);
    console.log(`Storage payload size: ${newSize} bytes (${(newSize / (1024 * 1024)).toFixed(2)} MB)`);
    
    chrome.storage.local.set({ 'storedEmbeddings': flattened }, () => {
      if (chrome.runtime.lastError) {
        const error = chrome.runtime.lastError;
        console.error('Error saving embeddings to storage:', error);
        
        // Check for specific quota error messages
        if (error.message && (
          error.message.includes('quota') || 
          error.message.includes('QUOTA') || 
          error.message.includes('limit') ||
          error.message.includes('space')
        )) {
          console.error(`Storage quota exceeded. Data size: ${newSize} bytes.`);
          console.error('Consider reducing the amount of data or implementing chunking.');
        }
        
        reject(error);
      } else {
        console.log(`Successfully saved ${Object.keys(flattened).length} embeddings to storage`);
        resolve(true);
      }
    });
  });
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received message in background script:', message);
    
    // Handle YAML upload and immediate embedding generation
    if (message.action === 'setUserData') {
        console.log('Processing uploaded YAML data and generating embeddings immediately');
        
        // Handle asynchronously via an immediately-invoked async function
        (async () => {
            try {
                const yamlContent = message.yamlContent;
                
                // Calculate hash for content
                const contentHash = await calculateHash(yamlContent);
                
                // First store the raw YAML content for quick access
                chrome.storage.local.set({ 
                    'userProfile': yamlContent, 
                    'profileHash': contentHash,
                    'yamlLastUploaded': Date.now(),
                    'yamlFileName': message.fileName || 'profile.yaml'
                }, () => {
                    // Let the user know we've saved their profile
                    sendResponse({ 
                        success: true, 
                        message: "Profile saved, generating embeddings in background..." 
                    });
                    
                    console.log('Profile saved, starting embedding generation');
                });
                
                // Check if we already have embeddings for this hash
                const storedHash = await getStoredEmbeddingHash();
                
                if (contentHash === storedHash) {
                    // Embeddings already exist, no need to regenerate
                    console.log('Embeddings already exist for this profile, skipping generation');
                    sendProgressUpdate(100, 100, 'Embeddings already up to date');
                    return;
                }
                
                // Create a progress adapter for the profileLoader
                const progressAdapter = (data) => {
                    if (data && typeof data.progress !== 'undefined') {
                        // Convert from profileLoader progress format to the format used by sendProgressUpdate
                        const progress = data.progress;
                        const total = 100; // profileLoader uses percentage internally
                        const status = data.message || 'Processing...';
                        
                        // Send progress update to popup
                        sendProgressUpdate(progress, total, status);
                    }
                };
                
                // Start embedding generation immediately
                try {
                    // Show initial progress in the popup
                    sendProgressUpdate(0, 100, 'Starting embedding generation...');
                    
                    const result = await profileLoader.processUserContext(yamlContent, progressAdapter);
                    console.log('Embedding generation complete:', result);
                    
                    if (result.success) {
                        // Store the hash of this YAML content
                        await storeEmbeddingHash(contentHash);
                        
                        // Store the embeddings data for future use
                        await storeEmbeddings(memoryStore.data);
                        
                        // Send final success notification
                        sendProgressUpdate(100, 100, 'Embeddings generated successfully!');
                        chrome.runtime.sendMessage({
                            type: 'EMBEDDING_COMPLETE',
                            success: true,
                            message: 'Embeddings generated successfully!'
                        });
                        
                        console.log('Stored embeddings and hash for future use');
                    } else {
                        // Send error notification
                        sendProgressUpdate(0, 100, `Error: ${result.error || 'Unknown error'}`);
                        chrome.runtime.sendMessage({
                            type: 'EMBEDDING_COMPLETE',
                            success: false,
                            error: result.error || 'Unknown error'
                        });
                    }
                } catch (processError) {
                    console.error('Error generating embeddings:', processError);
                    sendProgressUpdate(0, 100, `Error: ${processError.message}`);
                }
            } catch (error) {
                console.error('Error in YAML processing:', error);
                sendResponse({
                    success: false,
                    error: 'Error processing YAML: ' + error.message
                });
            }
        })();
        
        // Return true to indicate we'll respond asynchronously
        return true;
    }
    
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

    // Handle conversation updates from content scripts
    if (message.action === 'CONVERSATION_UPDATED') {
        console.log(`Background: Received conversation update at ${new Date().toISOString()} for ${message.data?.company} / ${message.data?.title} - Question: "${message.data?.questionId || 'unknown'}"`);
        
        // Store conversation data directly in Chrome storage
        chrome.storage.local.get(['dropdownData', 'conversationData'], function(result) {
            let dropdownData = result.dropdownData || { companies: [], jobs: [], companyJobMap: {} };
            let conversationData = result.conversationData || {};
            
            const data = message.data;
            
            // Only proceed if we have the required data
            if (!data || !data.company || !data.title || !data.conversation) {
                console.log('Background: Missing required data in conversation update');
                return;
            }
            
            // Check if company already exists
            if (!dropdownData.companies.some(c => c.value === data.company)) {
                dropdownData.companies.push({
                    value: data.company,
                    text: data.company
                });
                console.log(`Background: Added new company: ${data.company}`);
            }
            
            // Check if job already exists
            if (!dropdownData.jobs.some(j => j.value === data.title)) {
                dropdownData.jobs.push({
                    value: data.title,
                    text: data.title,
                    company: data.company
                });
                console.log(`Background: Added new job: ${data.title}`);
            }
            
            // Update company-job mapping
            if (!dropdownData.companyJobMap[data.company]) {
                dropdownData.companyJobMap[data.company] = [];
            }
            
            if (!dropdownData.companyJobMap[data.company].some(j => j.value === data.title)) {
                dropdownData.companyJobMap[data.company].push({
                    value: data.title,
                    text: data.title
                });
            }
            
            // Save conversation data
            if (data.conversation && Array.isArray(data.conversation) && data.conversation.length > 0) {
                if (!conversationData[data.title]) {
                    conversationData[data.title] = [];
                    console.log(`Background: Created new conversation array for ${data.title}`);
                }
                
                // Find the user question message and assistant answer for comparison
                const newUserMsg = data.conversation.find(msg => msg.role === 'user');
                const newAssistantMsg = data.conversation.find(msg => msg.role === 'assistant');
                
                if (!newUserMsg || !newAssistantMsg) {
                    console.log('Background: Incomplete conversation (missing user or assistant message)');
                    return;
                }
                
                // Extract just the question part for better comparison
                const questionText = extractQuestionPart(newUserMsg.content);
                
                // Better duplicate detection with logging
                let isExisting = false;
                let existingIndex = -1;
                
                conversationData[data.title].forEach((existingConv, index) => {
                    const existingUserMsg = existingConv.find(msg => msg.role === 'user');
                    if (existingUserMsg) {
                        const existingQuestionText = extractQuestionPart(existingUserMsg.content);
                        if (questionText === existingQuestionText) {
                            isExisting = true;
                            existingIndex = index;
                        }
                    }
                });
                
                if (!isExisting) {
                    console.log(`Background: Adding new conversation for "${questionText}"`);
                    conversationData[data.title].push(data.conversation);
                    
                    // Save all data to storage
                    chrome.storage.local.set({
                        dropdownData: dropdownData,
                        conversationData: conversationData
                    }, function() {
                        console.log(`Background: Saved conversation data. Total for ${data.title}: ${conversationData[data.title].length}`);
                    });
                } else {
                    console.log(`Background: Skipping duplicate conversation for "${questionText}" (index: ${existingIndex})`);
                }
            }
        });
        
        // No need to wait for a response
        if (sendResponse) sendResponse({received: true});
        return false;
    }
    
    // Helper function to extract just the question part
    function extractQuestionPart(content) {
        // Extract the form question if present
        const questionMatch = content.match(/Form Question:\s*([^?]+)\s*\?/);
        if (questionMatch && questionMatch[1]) {
            return questionMatch[1].trim();
        }
        return content.substring(0, 50); // Fallback to first 50 chars
    }
    
    // Restore the getEmbeddings handler
    if (message.action === 'getEmbeddings') {
        const { text } = message;
        console.log('Getting embeddings for text');
        
        getEmbeddings(text)
            .then(result => {
                console.log('Sending embeddings response from background script');
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



  