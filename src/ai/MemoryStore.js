class MemoryStore {
    constructor() {
        this.data = {};
    }

    async addEntry(key, text) {
        if (text) {
            try {
                const response = await fetch('http://localhost:11434/api/embeddings', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        model: "nomic-embed-text",
                        prompt: text,
                        stream: false
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const result = await response.json();
                this.data[key] = {
                    text: text,
                    embedding: result.embedding
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
            const response = await fetch('http://localhost:11434/api/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: "nomic-embed-text",
                    prompt: query,
                    stream: false
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            const queryEmbedding = result.embedding;

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