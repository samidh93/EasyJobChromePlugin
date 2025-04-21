class MemoryStore {
    constructor(directEmbeddingFunction = null) {
        /**
         * Initialize an object to store text and corresponding embeddings.
         * This mirrors the Python implementation's self.data = {}
         */
        this.data = {};
        // Store the direct embedding function if provided
        this.directEmbeddingFunction = directEmbeddingFunction;
        // Flag to track if we've tried to load stored embeddings
        this.hasTriedLoading = false;
        
        // Automatically preload embeddings when created
        this.preloadEmbeddings();
    }

    /**
     * Generate and store embeddings for fast retrieval.
     * @param {string} key - The identifier for this entry
     * @param {string} text - The text to embed
     * @returns {Promise<boolean>} - Success status
     */
    async addEntry(key, text) {
        if (!text) return false;
        
        try {
            console.log(`Adding entry for key: ${key}`);
            // Get embedding using the direct function or via messaging
            const response = await this.getEmbedding(text);
            
            if (response && response.success && response.data && response.data.embedding) {
                // Store key, text, and embedding
                this.data[key] = {
                    text: text,
                    embedding: response.data.embedding
                };
                console.log(`Successfully added embedding for key: ${key} (Store size: ${Object.keys(this.data).length})`);
                return true;
            }
            console.warn(`Failed to generate embedding for key: ${key}`);
            return false;
        } catch (error) {
            console.error('Error adding entry to memory store:', error);
            return false;
        }
    }

    /**
     * Load embeddings from storage if available
     * @returns {Promise<boolean>} - Success status
     */
    async loadStoredEmbeddings() {
        if (this.hasTriedLoading) {
            console.log(`Already tried loading embeddings. Current size: ${Object.keys(this.data).length}`);
            return Object.keys(this.data).length > 0;
        }
        
        console.log('Attempting to load stored embeddings from Chrome storage...');
        
        return new Promise(resolve => {
            chrome.storage.local.get('storedEmbeddings', result => {
                if (result.storedEmbeddings && Object.keys(result.storedEmbeddings).length > 0) {
                    this.data = result.storedEmbeddings;
                    console.log('Loaded embeddings from storage, found', Object.keys(this.data).length, 'entries');
                    this.hasTriedLoading = true;
                    resolve(true);
                } else {
                    console.log('No stored embeddings found in Chrome storage');
                    this.hasTriedLoading = true;
                    
                    // Don't try to generate embeddings automatically
                    // This should now be handled during YAML upload
                    resolve(false);
                }
            });
        });
    }

    /**
     * Flatten the embedding data to reduce storage size
     * @param {Object} data - The data to flatten
     * @returns {Object} - Flattened data
     */
    flattenEmbeddingData(data) {
        const flattened = {};
        
        for (const [key, entry] of Object.entries(data)) {
            // Ensure embedding is an array and convert to shorter precision format
            if (entry.embedding && Array.isArray(entry.embedding)) {
                // Create a typed array with a smaller data type (Float32 instead of Float64)
                // and reduce precision to 5 decimal places to save space
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
        
        console.log(`Flattened embeddings: ${originalSize} bytes → ${newSize} bytes (${reduction}% reduction)`);
        
        return flattened;
    }

    /**
     * Save all embeddings to storage
     * @returns {Promise<boolean>} - Success status
     */
    async saveAllEmbeddings() {
        return new Promise((resolve, reject) => {
            if (Object.keys(this.data).length === 0) {
                console.warn('No embeddings to save to storage');
                resolve(false);
                return;
            }
            
            console.log(`Saving ${Object.keys(this.data).length} embeddings to Chrome storage`);
            
            // Flatten the data to reduce storage size
            const flattenedData = this.flattenEmbeddingData(this.data);
            
            // Get the size of the data in bytes before saving
            const dataSize = JSON.stringify(flattenedData).length;
            console.log(`Storage payload size: ${dataSize} bytes (${(dataSize / (1024 * 1024)).toFixed(2)} MB)`);
            
            chrome.storage.local.set({ 'storedEmbeddings': flattenedData }, () => {
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
                        console.error(`Storage quota exceeded. Data size: ${dataSize} bytes.`);
                        console.error('Consider reducing the amount of data or implementing chunking.');
                    }
                    
                    reject(error);
                } else {
                    console.log(`Successfully saved ${Object.keys(flattenedData).length} embeddings to storage`);
                    resolve(true);
                }
            });
        });
    }

    /**
     * Retrieve the most relevant stored entries using cosine similarity.
     * Enhanced with direct key matching for specific queries.
     * @param {string} query - The query to find related entries for
     * @param {number} topK - Number of top results to return (default: 3)
     * @returns {Promise<Array>} - Array of matching keys
     */
    async search(query, topK = 3) {
        console.log(`Searching for related info: "${query}" (top ${topK} results)`);
        
        // Debug check for empty store
        if (Object.keys(this.data).length === 0) {
            console.warn('Memory store is empty before loading attempt, checking storage...');
        }
        
        // Try to load stored embeddings if the data is empty
        if (Object.keys(this.data).length === 0) {
            const loaded = await this.loadStoredEmbeddings();
            if (!loaded) {
                console.warn('Memory store is empty, no data to search. Check if YAML was properly loaded.');
                
                // Additional debug: check if the embeddings might be saved under a different key
                chrome.storage.local.get(null, function(items) {
                    console.log('All chrome storage items:', Object.keys(items));
                    console.log('Storage size:', JSON.stringify(items).length, 'bytes');
                    
                    // Check if we have profile data at least
                    if (items.userProfile) {
                        console.log('User profile exists in storage but no embeddings found');
                    }
                });
                
                return [];
            }
        }

        // Special case handling for common queries
        const lowerQuery = query.toLowerCase();
        
        // Direct key matching for salary-related queries
        if (lowerQuery.includes('salary') || 
            lowerQuery.includes('compensation') || 
            lowerQuery.includes('earn') || 
            lowerQuery.includes('pay')) {
            
            // Look for salary_information field first (our enhanced field)
            if (this.data['salary_information']) {
                console.log('Found direct match for salary query');
                return ['salary_information'];
            }
            
            // Try to find any keys related to salary as fallback
            const salaryKeys = Object.keys(this.data).filter(key => 
                key.toLowerCase().includes('salary') || 
                (this.data[key].text && this.data[key].text.toLowerCase().includes('salary'))
            );
            
            if (salaryKeys.length > 0) {
                console.log(`Found ${salaryKeys.length} direct salary-related keys`);
                return salaryKeys.slice(0, topK);
            }
            
            // No direct matches, will fall through to semantic search
        }
        
        // Direct key matching for phone-related queries
        if (lowerQuery.includes('phone') || lowerQuery.includes('contact') || lowerQuery.includes('call')) {
            if (this.data['contact_information']) {
                console.log('Found direct match for contact query');
                return ['contact_information'];
            }
            
            const contactKeys = Object.keys(this.data).filter(key => 
                key.toLowerCase().includes('phone') || 
                key.toLowerCase().includes('contact') ||
                key.toLowerCase().includes('email')
            );
            
            if (contactKeys.length > 0) {
                console.log(`Found ${contactKeys.length} direct contact-related keys`);
                return contactKeys.slice(0, topK);
            }
        }
        
        // Direct key matching for location-related queries
        if (lowerQuery.includes('location') || lowerQuery.includes('where') || 
            lowerQuery.includes('city') || lowerQuery.includes('country')) {
            
            if (this.data['location_information']) {
                console.log('Found direct match for location query');
                return ['location_information'];
            }
        }
        
        // Experience-related queries
        if (lowerQuery.includes('experience') || lowerQuery.includes('years') || 
            lowerQuery.includes('work history') || lowerQuery.includes('background')) {
            
            if (this.data['experience_summary']) {
                console.log('Found direct match for experience query');
                return ['experience_summary'];
            }
        }

        try {
            // Get embedding for query
            const response = await this.getEmbedding(query);
            
            if (!response || !response.success || !response.data || !response.data.embedding) {
                console.error('Failed to generate embedding for search query');
                return [];
            }
            
            const queryEmbedding = response.data.embedding;
            const similarities = {};
            
            // Calculate cosine similarity for each entry - exactly like Python implementation
            for (const [key, entry] of Object.entries(this.data)) {
                const similarity = this.cosineSimilarity(entry.embedding, queryEmbedding);
                similarities[key] = similarity;
            }
            
            // Sort by similarity and return top K keys (just like Python implementation)
            const topKeys = Object.keys(similarities)
                .sort((a, b) => similarities[b] - similarities[a])
                .slice(0, topK);
            
            console.log(`Found ${topKeys.length} relevant keys: ${topKeys.join(', ')}`);
            return topKeys;
        } catch (error) {
            console.error('Error searching memory store:', error);
            return [];
        }
    }

    /**
     * Calculate cosine similarity between two vectors
     * @param {Array} vecA - First vector
     * @param {Array} vecB - Second vector
     * @returns {number} - Similarity score
     */
    cosineSimilarity(vecA, vecB) {
        if (!vecA || !vecB || vecA.length !== vecB.length) {
            return 0;
        }

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);

        if (normA === 0 || normB === 0) {
            return 0;
        }

        return dotProduct / (normA * normB);
    }

    /**
     * Clear all embeddings from memory and optionally from storage
     * @param {boolean} clearStorage - Whether to also clear from Chrome storage
     * @returns {Promise<boolean>} - Success status
     */
    async clearAllData(clearStorage = true) {
        console.log('Clearing memory store data');
        
        // Clear in-memory data
        const previousSize = Object.keys(this.data).length;
        this.data = {};
        
        // Reset loading flag
        this.hasTriedLoading = false;
        
        if (clearStorage) {
            console.log('Also clearing embeddings from Chrome storage');
            return new Promise((resolve) => {
                chrome.storage.local.remove('storedEmbeddings', () => {
                    if (chrome.runtime.lastError) {
                        console.error('Error clearing embeddings from storage:', chrome.runtime.lastError);
                        resolve(false);
                    } else {
                        console.log(`Successfully cleared ${previousSize} embeddings from memory and storage`);
                        resolve(true);
                    }
                });
            });
        }
        
        console.log(`Successfully cleared ${previousSize} embeddings from memory only`);
        return true;
    }
    
    /**
     * Get the count of embeddings stored in Chrome storage
     * @returns {Promise<number>} - Number of stored embeddings
     */
    async getStoredEmbeddingsCount() {
        return new Promise((resolve) => {
            chrome.storage.local.get('storedEmbeddings', (result) => {
                if (chrome.runtime.lastError) {
                    console.error('Error getting stored embeddings count:', chrome.runtime.lastError);
                    resolve(0);
                } else if (result.storedEmbeddings) {
                    const count = Object.keys(result.storedEmbeddings).length;
                    console.log(`Found ${count} embeddings in Chrome storage`);
                    resolve(count);
                } else {
                    console.log('No embeddings found in Chrome storage');
                    resolve(0);
                }
            });
        });
    }

    /**
     * Helper function to get embeddings via background script or directly
     * @param {string} text - Text to get embedding for
     * @returns {Promise<Object>} - API response
     */
    async getEmbedding(text) {
        // If a direct embedding function was provided, use it
        if (this.directEmbeddingFunction) {
            console.log('Using direct embedding function');
            try {
                const startTime = performance.now();
                const result = await this.directEmbeddingFunction(text);
                const endTime = performance.now();
                
                console.log(`Embedding generated in ${(endTime - startTime).toFixed(2)}ms`);
                
                // Log detailed information about the embedding
                if (result && result.success && result.data && result.data.embedding) {
                    const embedding = result.data.embedding;
                    console.log(`Embedding dimensions: ${embedding.length}`);
                    console.log(`Embedding sample: [${embedding.slice(0, 3).map(v => v.toFixed(5)).join(', ')}...]`);
                }
                
                return result;
            } catch (error) {
                console.error('Error using direct embedding function:', error);
                throw error;
            }
        }

        // Otherwise use Chrome messaging
        return new Promise((resolve, reject) => {
            console.log(`Requesting embedding from background script for text (length: ${text.length}): "${text.substring(0, 50)}..."`);
            const startTime = performance.now();
            
            chrome.runtime.sendMessage(
                {
                    action: 'getEmbeddings',
                    text: text
                },
                response => {
                    const endTime = performance.now();
                    
                    if (chrome.runtime.lastError) {
                        console.error(`Embedding request failed after ${(endTime - startTime).toFixed(2)}ms:`, chrome.runtime.lastError);
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        console.log(`Embedding received from API in ${(endTime - startTime).toFixed(2)}ms`);
                        
                        // Log detailed response info
                        if (response && response.success && response.data && response.data.embedding) {
                            const embedding = response.data.embedding;
                            console.log(`Embedding dimensions: ${embedding.length}`);
                            console.log(`Embedding sample: [${embedding.slice(0, 3).map(v => v.toFixed(5)).join(', ')}...]`);
                        } else {
                            console.warn('Received invalid embedding response:', response);
                        }
                        
                        resolve(response);
                    }
                }
            );
        });
    }

    /**
     * Preload embeddings from storage to memory
     * This can be called at extension startup to eagerly load data
     * @returns {Promise<boolean>} - Success status
     */
    async preloadEmbeddings() {
        console.log('Preloading embeddings from storage into memory...');
        
        try {
            const result = await this.loadStoredEmbeddings();
            if (result) {
                console.log(`Successfully preloaded ${Object.keys(this.data).length} embeddings into memory`);
            } else {
                console.log('No embeddings found to preload');
            }
            return result;
        } catch (error) {
            console.error('Error preloading embeddings:', error);
            return false;
        }
    }
}

// Export a singleton instance by default
const memoryStore = new MemoryStore();
export default memoryStore;

// Also export the class for testing
export { MemoryStore }; 