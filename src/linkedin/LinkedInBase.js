class LinkedInBase {
    static async wait(ms = 1000) {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }

    static debugLog(message) {
        console.log(`[${this.constructor.name}] ${message}`);
    }

    static errorLog(message, error) {
        console.error(`[${this.constructor.name}] ${message}:`, error);
    }
}

export default LinkedInBase; 