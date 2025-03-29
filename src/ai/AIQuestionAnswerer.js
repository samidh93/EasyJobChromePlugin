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
    }

    async setJob(job) {
        this.job = job;
        this.conversationHistoryKey = `conversation_history_${this.job.companyName}_${this.job.jobId}`;
    }

    async loadUserData(yamlContent) {
        try {
            const userData = yaml.load(yamlContent);
            await this.setUserContext(yaml.dump(userData));
            return userData;
        } catch (error) {
            console.error('Error loading YAML data:', error);
            throw error;
        }
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
        if (this.conversationHistoryKey) {
            try {
                localStorage.setItem(
                    this.conversationHistoryKey,
                    JSON.stringify(this.conversationHistoryCompany)
                );
            } catch (error) {
                console.error('Error saving conversation history:', error);
            }
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

            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.conversationHistory,
                    stream: false,
                    options: { temperature: 0.0 }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            let rawAnswer = result.message.content.trim();
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
        } catch (error) {
            console.error('Unexpected error:', error);
            return options[1];
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

            const response = await fetch('http://localhost:11434/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: this.conversationHistory,
                    stream: false,
                    options: { temperature: 0.0 }
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            let rawAnswer = result.message.content.trim();
            let answerCandidate = rawAnswer.replace(/<think>.*?<\/think>/gs, '').trim();

            if (this.isNumberQuestion(question)) {
                const numberMatch = answerCandidate.match(/\d+(?:\.\d+)?/);
                if (numberMatch) {
                    if (this.isExperienceQuestion(question)) {
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
        } catch (error) {
            console.error('Unexpected error:', error);
        }
    }

    isNumberQuestion(question) {
        const keywords = ["number", "how many", "zahl", "jahre", "years", "salary", "gehalt", "euro", "eur"];
        return keywords.some(keyword => question.toLowerCase().includes(keyword));
    }

    isExperienceQuestion(question) {
        const keywords = ["experience", "erfahrung", "jahre", "years"];
        return keywords.some(keyword => question.toLowerCase().includes(keyword));
    }

    calculateSimilarity(str1, str2) {
        const set1 = new Set(str1);
        const set2 = new Set(str2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        return intersection.size / Math.max(set1.size, set2.size);
    }

    async answerQuestion(question, options = null) {
        if (options && options.length > 0) {
            return await this.answerWithOptions(question, options);
        } else {
            return await this.answerWithNoOptions(question);
        }
    }
}

export default AIQuestionAnswerer; 