import AIQuestionAnswerer from '../src/AIQuestionAnswerer.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testAIQuestionAnswerer() {
    try {
        // Initialize AIQuestionAnswerer
        const questionAnswerer = new AIQuestionAnswerer();

        // Load user data from YAML file
        const yamlPath = path.join(__dirname, '../input/sami_dhiab_resume.yaml');
        const context = await questionAnswerer.loadFromYaml(yamlPath);
        await questionAnswerer.setUserContext(context);

        // Set a mock job for testing
        const mockJob = {
            companyName: "TestCompany",
            jobId: "12345"
        };
        await questionAnswerer.setJob(mockJob);

        // Test questions with options
        console.log("\nTesting questions with options:");
        const questionsWithOptions = [
            {
                question: "What is your level of proficiency in German?",
                options: ["Select an option", "None", "Conversational", "Professional", "Native or bilingual"]
            },
            {
                question: "What is your language proficiency (written/spoken) on an A1-C2 scale in German?",
                options: [
                    "A1 (Basic user - very basic communication skills / working knowledge)",
                    "A2 (Basic user - basic communication skills / working knowledge)",
                    "B1 (Independent user - intermediate communication skills / professional working knowledge)",
                    "B2 (Independent user - upper intermediate communication skills / professional working knowledge)",
                    "C1 (Proficient user - advanced communication skills / full professional working knowledge)",
                    "C2 (Proficient user - full professional working knowledge)"
                ]
            },
            {
                question: "Sind Sie rechtlich befugt, in diesem Land zu arbeiten: Deutschland?",
                options: ["Ja", "Nein"]
            }
        ];

        for (const q of questionsWithOptions) {
            console.log(`\nQuestion: ${q.question}`);
            const answer = await questionAnswerer.answerQuestion(q.question, q.options);
            console.log(`Answer: ${answer}`);
        }

        // Test questions without options
        console.log("\nTesting questions without options:");
        const questionsWithoutOptions = [
            "How many years do you have in hardware manufacturing?",
            "By which date (1. of the month) would you want to join Nagarro?",
            "What are your salary expectations? (EUR)",
            "Your message to the hiring manager",
            "What experience do you have in managing Jenkins and DevOps Tools?",
            "Wie viele Jahre Berufserfahrung als Frontend Web Entwickler:in bringst Du mit?",
            "Wie viele Jahre Erfahrung haben Sie mit: Vue.js?",
            "Wie viele Jahre Erfahrung im Bereich Projektmanagement haben Sie?"
        ];

        for (const question of questionsWithoutOptions) {
            console.log(`\nQuestion: ${question}`);
            const answer = await questionAnswerer.answerQuestion(question);
            console.log(`Answer: ${answer}`);
        }

    } catch (error) {
        console.error('Error during testing:', error);
    }
}

// Run the tests
console.log("Starting AIQuestionAnswerer tests...");
testAIQuestionAnswerer().then(() => {
    console.log("\nAIQuestionAnswerer tests completed.");
}).catch(error => {
    console.error("Test execution failed:", error);
}); 