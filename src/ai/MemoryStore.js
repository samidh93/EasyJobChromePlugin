class MemoryStore {
    constructor() {
        this.data = {};
    }

    async addEntry(key, text) {
        if (text) {
            try {
                // Send message to background script to get embeddings
                const response = await new Promise((resolve, reject) => {
                    chrome.runtime.sendMessage(
                        { action: 'getEmbeddings', text },
                        (response) => {
                            if (chrome.runtime.lastError) {
                                reject(new Error(chrome.runtime.lastError.message));
                            } else {
                                resolve(response);
                            }
                        }
                    );
                });

                if (!response.success) {
                    throw new Error(response.error || 'Unknown error generating embedding');
                }

                this.data[key] = {
                    text: text,
                    embedding: response.data.embedding
                };
            } catch (error) {
                console.error('Error generating embedding:', error);
            }
        }
    }

    async search(query, topK = 3) {
        if (!this.data || Object.keys(this.data).length === 0) {
            return [];
        }

        try {
            // Send message to background script to get embeddings for search query
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage(
                    { action: 'getEmbeddings', text: query },
                    (response) => {
                        if (chrome.runtime.lastError) {
                            reject(new Error(chrome.runtime.lastError.message));
                        } else {
                            resolve(response);
                        }
                    }
                );
            });

            if (!response.success) {
                throw new Error(response.error || 'Unknown error generating embedding for search');
            }

            const queryEmbedding = response.data.embedding;

            const similarities = {};
            for (const [key, entry] of Object.entries(this.data)) {
                const similarity = this.cosineSimilarity(entry.embedding, queryEmbedding);
                similarities[key] = similarity;
            }

            return Object.entries(similarities)
                .sort(([, a], [, b]) => b - a)
                .slice(0, topK)
                .map(([key]) => key);
        } catch (error) {
            console.error('Error in search:', error);
            return [];
        }
    }

    cosineSimilarity(vec1, vec2) {
        const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
        const norm1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
        const norm2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
        return dotProduct / (norm1 * norm2);
    }
}

export default MemoryStore; 