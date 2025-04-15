import MemoryStore from './MemoryStore.js';
import yaml from 'js-yaml';

class AIQuestionAnswerer {
    constructor() {
        this.model = "qwen2.5:3b";
        this.memory = new MemoryStore();
        this.conversationHistory = [];
        this.setSystemContext();
        this.job = null;
        this.userData = null;
        this.ollamaUrl = 'http://localhost:11434';
    }

    async checkOllamaConnection() {
        try {
            console.log('Checking Ollama connection...');

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    console.error('Ollama connection check timed out');
                    resolve({
                        connected: false,
                        error: 'Connection timeout',
                        troubleshooting: 'Ollama connection check timed out. Make sure Ollama is running and not overloaded.'
                    });
                }, 10000); // Increased timeout to 10 seconds

                chrome.runtime.sendMessage({
                    action: 'testOllama',
                }, (response) => {
                    clearTimeout(timeout);

                    // Log the full response to help debug
                    console.log(`Ollama connection check response:`, response);

                    // Check for undefined or null response (common messaging error)
                    if (!response) {
                        console.error('Ollama connection check returned no response');
                        resolve({
                            connected: false,
                            error: 'No response from connection test',
                            troubleshooting: 'Extension messaging error. Try reloading the page or restarting the browser.'
                        });
                        return;
                    }

                    // Check if response is just {received: true} which indicates a messaging issue
                    if (response.received === true && !response.success && !response.error) {
                        console.error('Received incomplete response from background script:', response);
                        resolve({
                            connected: false,
                            error: 'Incomplete response from extension',
                            troubleshooting: 'Try restarting the browser or reinstalling the extension.'
                        });
                        return;
                    }

                    if (response.success) {
                        console.log('Ollama connection successful');
                        resolve({
                            connected: true,
                            port: response.data?.port || 11434 // Always use port 11434
                        });
                    } else {
                        console.error('Ollama connection failed:', response.error);
                        resolve({
                            connected: false,
                            error: response.error || 'Unknown error',
                            troubleshooting: response.troubleshooting || 'Make sure Ollama is running on your computer'
                        });
                    }
                });
            });
        } catch (error) {
            console.error('Error checking Ollama connection:', error);
            return {
                connected: false,
                error: error.message,
                troubleshooting: 'Error checking Ollama connection'
            };
        }
    }

    async setJob(job) {
        this.job = job;
        console.log("current job infos: ", this.job)
        this.conversationHistoryKey = `conversation_history_${this.job.currentJob.company}_${this.job.currentJob.jobId}`;
        console.log("conversationHistoryKey set", this.conversationHistoryKey)
    }


    setSystemContext(systemContext = null) {
        const todayDate = new Date().toISOString().split('T')[0];
        if (!systemContext) {
            systemContext = `You are an AI expert in filling out job application forms. 
Your goal is to make the user stand out in a positive and professional way.
*****************STRICT RULES***************:
- ALWAYS return an answer that BENEFITS the user. If information is missing, MAKE AN EDUCATED GUESS in their favor.
- Return ONLY the answer as a plain string. DO NOT add explanations or additional text.
- If the question requires a number (e.g., 'Zahl angeben' or 'give number'), return ONLY a number.
- If the question provides options, return ONLY one option from the given options EXACTLY as written.
- If insufficient data is found, assume the user has solid experience and provide a reasonable answer.
- If asked about how many years of experience, do NOT return 0. Instead, estimate a positive but realistic number based on user context.
- If asked about legal status or certifications, assume the best reasonable scenario for the user.
- If asked about salary, use the user's expected salary or provide a reasonable estimate based on job market data.
- Use today date: ${todayDate}, if asked for a starting date, respond with a date 3 months (notice period) from today date.`;
        }
        this.conversationHistory = [{ role: "system", content: systemContext }];
        this.conversationHistoryCompany = [...this.conversationHistory];
    }

    async setUserContext(userContext) {
        try {
            this.userData = yaml.load(userContext);
            console.log("User context loaded successfully.");
            console.log(this.userData)

            for (const [key, value] of Object.entries(this.userData)) {
                if (typeof value === 'object' && value !== null) {
                    for (const [subKey, subValue] of Object.entries(value)) {
                        await this.memory.addEntry(`${key}.${subKey}`, String(subValue));
                    }
                } else {
                    await this.memory.addEntry(key, String(value));
                }
            }
        } catch (error) {
            console.error('Error setting user context:', error);
        }
    }

    async saveConversationHistory() {
        console.log("saving AI conversation history")
        if (this.conversationHistoryKey) {
            try {
                console.log("saved conversation history:", this.conversationHistoryCompany)

                // Check if there's at least one user message and one assistant message
                const hasUserMessage = this.conversationHistoryCompany.some(msg => msg.role === 'user');
                const hasAssistantMessage = this.conversationHistoryCompany.some(msg => msg.role === 'assistant');

                if (!hasUserMessage || !hasAssistantMessage) {
                    console.warn("Incomplete conversation history, missing user or assistant message");
                    return;
                }

                // Deep clone the conversation history before sending to avoid reference issues
                const conversationCopy = JSON.parse(JSON.stringify(this.conversationHistoryCompany));

                // Send message to popup about new conversation data
                chrome.runtime.sendMessage({
                    action: 'CONVERSATION_UPDATED',
                    data: {
                        key: this.conversationHistoryKey,
                        company: this.job.currentJob.company,
                        title: this.job.currentJob.title,
                        jobId: this.job.currentJob.jobId,
                        conversation: conversationCopy,
                        timestamp: new Date().toISOString()
                    }
                });

                console.log("Conversation sent to popup for storage");
            } catch (error) {
                console.error('Error saving conversation history:', error);
            }
        } else {
            console.warn("Cannot save conversation history: conversationHistoryKey is not set");
        }
    }

    // Add these helper functions to make API calls more reliable
    async makeOllamaRequest(endpoint, data) {
        try {
            console.log(`Making Ollama request to ${endpoint}`);

            return new Promise((resolve, reject) => {
                // Add timeout to prevent hanging
                const timeout = setTimeout(() => {
                    reject(new Error('Ollama request timeout'));
                }, 20000); // 20 second timeout

                chrome.runtime.sendMessage({
                    action: 'callOllama',
                    endpoint: endpoint,
                    data: data
                }, response => {
                    clearTimeout(timeout);
                    console.log(`Received Ollama response:`, response);

                    if (!response) {
                        console.error('No response received from Ollama');
                        reject(new Error('No response received from Ollama'));
                        return;
                    }

                    // Check if response is just {received: true} which indicates a messaging issue
                    if (response.received === true && !response.success && !response.error) {
                        console.error('Received incomplete response from background script:', response);
                        reject(new Error('Incomplete response from extension'));
                        return;
                    }

                    if (response.success) {
                        resolve(response.data);
                    } else {
                        reject(new Error(response.error || 'Failed to get response from Ollama'));
                    }
                });
            });
        } catch (error) {
            console.error('Error in makeOllamaRequest:', error);
            throw error;
        }
    }

    async answerWithOptions(question, options) {
        try {
            const relevantKeys = await this.memory.search(question, 1);
            const relevantContext = relevantKeys
                .map(key => `${key}: ${this.memory.data[key].text}`)
                .join(", ");

            const context = relevantContext || "The user has significant experience and qualifications suitable for this question.";
            const optionsStr = options.map(opt => `"${opt}"`).join(", ");

            const prompt = `Form Question: ${question} ?
Available Options: [${optionsStr}]
User Context Data Hint: ${context}
IMPORTANT: You MUST choose EXACTLY ONE option from the list above.
Your answer should match one of the options EXACTLY as written.
DO NOT add any explanation or additional text.`;

            this.conversationHistory.push({ role: "user", content: prompt });
            this.conversationHistoryCompany.push({ role: "user", content: prompt });

            // Detect if this is an experience question for fallback
            const isExperience = this.isExperienceQuestion(question);

            // Check Ollama connection first
            const connectionStatus = await this.checkOllamaConnection();
            if (!connectionStatus.connected) {
                console.error('Ollama not connected:', connectionStatus.error);
                console.log('Using fallback mechanism due to connection error');

                // Select a fallback option based on question type using the same logic as in the catch block
                let fallbackAnswer;

                if (isExperience) {
                    // Find options related to years of experience
                    const experienceOptions = options.filter(opt => {
                        const optLower = opt.toLowerCase();
                        return /\d+/.test(optLower) ||
                            optLower.includes('year') ||
                            optLower.includes('jahr') ||
                            optLower.includes('experience') ||
                            optLower.includes('erfahrung');
                    });

                    if (experienceOptions.length > 0) {
                        // Find a mid-range option
                        const middleIndex = Math.floor(experienceOptions.length / 2);
                        fallbackAnswer = experienceOptions[middleIndex];
                    } else {
                        // Just pick the second option if available (first is often "Select an option")
                        fallbackAnswer = options.length > 1 ? options[1] : options[0];
                    }
                } else {
                    // For other questions, pick the second option if available
                    fallbackAnswer = options.length > 1 ? options[1] : options[0];
                }

                console.log(`Using fallback option: "${fallbackAnswer}" for question: ${question}`);
                this.conversationHistoryCompany.push({ role: "assistant", content: fallbackAnswer });
                await this.saveConversationHistory();
                this.conversationHistory = this.conversationHistory.slice(0, 1);
                this.conversationHistoryCompany = [];
                return fallbackAnswer;
            }

            console.log('Attempting to connect to Ollama server...');
            try {
                // Use the new helper function
                const response = await this.makeOllamaRequest('chat', {
                    model: this.model,
                    messages: this.conversationHistory,
                    stream: false,
                    options: { temperature: 0.0 }
                });

                console.log('Response received successfully');
                let rawAnswer = response.message.content.trim();
                let answerCandidate = rawAnswer.replace(/<think>.*?<\/think>/gs, '').trim();

                let validAnswer;
                if (options.includes(answerCandidate)) {
                    validAnswer = answerCandidate;
                } else {
                    let bestMatch = null;
                    let bestScore = -1;
                    for (const option of options) {
                        const optionLower = option.toLowerCase();
                        const answerLower = answerCandidate.toLowerCase();
                        if (optionLower.includes(answerLower) || answerLower.includes(optionLower)) {
                            const score = this.calculateSimilarity(optionLower, answerLower);
                            if (score > bestScore) {
                                bestScore = score;
                                bestMatch = option;
                            }
                        }
                    }
                    validAnswer = bestScore > 0.5 ? bestMatch : options[1];
                }

                this.conversationHistoryCompany.push({ role: "assistant", content: validAnswer });
                await this.saveConversationHistory();
                this.conversationHistory = this.conversationHistory.slice(0, 1);
                this.conversationHistoryCompany = [];
                return validAnswer;

            } catch (apiError) {
                console.error('API error in answerWithOptions:', apiError);

                // Select a fallback option based on question type
                let fallbackAnswer;

                // For experience questions, choose an appropriate option
                if (isExperience) {
                    // Find options related to years of experience
                    const experienceOptions = options.filter(opt => {
                        const optLower = opt.toLowerCase();
                        return /\d+/.test(optLower) ||
                            optLower.includes('year') ||
                            optLower.includes('jahr') ||
                            optLower.includes('experience') ||
                            optLower.includes('erfahrung');
                    });

                    if (experienceOptions.length > 0) {
                        // Find a mid-range option
                        const middleIndex = Math.floor(experienceOptions.length / 2);
                        fallbackAnswer = experienceOptions[middleIndex];
                    } else {
                        // Just pick the second option if available (first is often "Select an option")
                        fallbackAnswer = options.length > 1 ? options[1] : options[0];
                    }
                } else {
                    // For other questions, pick the second option if available
                    fallbackAnswer = options.length > 1 ? options[1] : options[0];
                }

                console.log(`Using fallback option: "${fallbackAnswer}" for question: ${question}`);
                this.conversationHistoryCompany.push({ role: "assistant", content: fallbackAnswer });
                await this.saveConversationHistory();
                this.conversationHistory = this.conversationHistory.slice(0, 1);
                this.conversationHistoryCompany = [];
                return fallbackAnswer;
            }
        } catch (error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });

            // Last resort fallback - pick the second option or first if only one exists
            const fallback = options.length > 1 ? options[1] : options[0];
            return fallback;
        }
    }

    async answerWithNoOptions(question) {
        try {
            const relevantKeys = await this.memory.search(question, 3);
            const relevantContext = relevantKeys
                .map(key => `${key}: ${this.memory.data[key].text}`)
                .join(", ");

            const context = relevantContext || "The user has significant experience and qualifications suitable for this question.";

            const prompt = `Form Question: ${question} ?
User Context Data Hint: ${context}
IMPORTANT:
- Return ONLY the answer as a plain string
- If the question requires a number, return ONLY a number
- If the question requires a phone number, return the user's phone ${this.userData?.personal_information?.phone || ""}
- If the question asks for a salary, use the user's expected salary ${this.userData?.personal_information?.desired_salary || ""} or provide a reasonable estimate based on job market data
- DO NOT add any explanation or additional text
- Make sure the answer is professional and benefits the user`;

            this.conversationHistory.push({ role: "user", content: prompt });
            this.conversationHistoryCompany.push({ role: "user", content: prompt });

            // Detect if this is an experience question for fallback
            const isExperience = this.isExperienceQuestion(question);

            // Check Ollama connection first
            const connectionStatus = await this.checkOllamaConnection();
            if (!connectionStatus.connected) {
                console.error('Ollama not connected:', connectionStatus.error);
                console.log('Using fallback mechanism due to connection error');

                // Provide fallback answers based on question type
                let fallbackAnswer;

                if (isExperience) {
                    fallbackAnswer = "5"; // Default experience years
                } else if (question.toLowerCase().includes('gehalt') || question.toLowerCase().includes('salary')) {
                    fallbackAnswer = this.userData?.personal_information?.desired_salary || "90000"; // Default salary
                } else if (this.isNumberQuestion(question)) {
                    fallbackAnswer = "3"; // Default number
                } else if (question.toLowerCase().includes('phone') || question.toLowerCase().includes('telefon')) {
                    fallbackAnswer = this.userData?.personal_information?.phone || "+1234567890"; // Default phone
                } else {
                    fallbackAnswer = "Yes"; // Default text answer
                }

                console.log(`Using fallback answer: ${fallbackAnswer} for question: ${question}`);
                this.conversationHistoryCompany.push({ role: "assistant", content: fallbackAnswer });
                await this.saveConversationHistory();
                this.conversationHistory = this.conversationHistory.slice(0, 1);
                this.conversationHistoryCompany = [];
                return fallbackAnswer;
            }

            console.log('Attempting to connect to Ollama server...');
            try {
                // Use the new helper function
                const response = await this.makeOllamaRequest('chat', {
                    model: this.model,
                    messages: this.conversationHistory,
                    stream: false,
                    options: { temperature: 0.0 }
                });

                console.log('Response received successfully');
                let rawAnswer = response.message.content.trim();
                let answerCandidate = rawAnswer.replace(/<think>.*?<\/think>/gs, '').trim();

                if (this.isNumberQuestion(question)) {
                    const numberMatch = answerCandidate.match(/\d+(?:\.\d+)?/);
                    if (numberMatch) {
                        if (isExperience) {
                            const extractedNum = parseFloat(numberMatch[0]);
                            answerCandidate = extractedNum < 1 ? "1" : numberMatch[0];
                        } else {
                            answerCandidate = numberMatch[0];
                        }
                    }
                }

                if (answerCandidate) {
                    this.conversationHistoryCompany.push({ role: "assistant", content: answerCandidate });
                    await this.saveConversationHistory();
                    this.conversationHistory = this.conversationHistory.slice(0, 1);
                    this.conversationHistoryCompany = [];
                    return answerCandidate;
                }

                // If we got here, we didn't get a valid answer, provide fallback
                throw new Error('No valid answer candidate generated');

            } catch (apiError) {
                console.error('API error:', apiError);

                // Provide fallback answers based on question type
                let fallbackAnswer;

                if (isExperience) {
                    fallbackAnswer = "5"; // Default experience years
                } else if (question.toLowerCase().includes('gehalt') || question.toLowerCase().includes('salary')) {
                    fallbackAnswer = "90000"; // Default salary
                } else if (this.isNumberQuestion(question)) {
                    fallbackAnswer = "3"; // Default number
                } else {
                    fallbackAnswer = "Yes"; // Default text answer
                }

                console.log(`Using fallback answer: ${fallbackAnswer} for question: ${question}`);
                this.conversationHistoryCompany.push({ role: "assistant", content: fallbackAnswer });
                await this.saveConversationHistory();
                this.conversationHistory = this.conversationHistory.slice(0, 1);
                this.conversationHistoryCompany = [];
                return fallbackAnswer;
            }
        } catch (error) {
            console.error('Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack,
                cause: error.cause
            });

            // Last resort fallback
            const fallback = this.isExperienceQuestion(question) ? "5" : "Yes";
            return fallback;
        }
    }

    isNumberQuestion(question) {
        const keywords = ["number", "how many", "zahl", "jahre", "years", "salary", "gehalt", "euro", "eur"];
        return keywords.some(keyword => question.toLowerCase().includes(keyword));
    }

    isExperienceQuestion(question) {
        const lowerQuestion = question.toLowerCase();
        const experienceKeywords = [
            'experience', 'years', 'year', 'erfahrung', 'jahre', 'jahr',
            'how long', 'wie lange', 'worked with', 'gearbeitet mit'
        ];

        return experienceKeywords.some(keyword => lowerQuestion.includes(keyword));
    }

    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1);
        const set2 = new Set(str2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }

    async answerQuestion(question, options = null) {
        try {
            const result = await chrome.storage.local.get('userProfileYaml');
            if (result.userProfileYaml) {
                await this.setUserContext(result.userProfileYaml)
            }
            if (options && options.length > 0) {
                return await this.answerWithOptions(question, options);
            } else {
                return await this.answerWithNoOptions(question);
            }
        } catch (error) {
            console.error('Error getting yaml from storage:', error);
        }
    }
}

export default AIQuestionAnswerer; 