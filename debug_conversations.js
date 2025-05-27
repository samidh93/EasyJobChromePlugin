#!/usr/bin/env node
/**
 * EasyJob Conversation Data Analyzer
 * 
 * This script analyzes conversation data from the EasyJob extension
 * to identify issues with duplicate questions and missing responses.
 */

console.log('=== EasyJob Conversation Data Debug Utility ===');
console.log('Starting analysis...\n');

import fs from 'fs';

// Helper function to extract question part from user messages
function extractQuestionPart(content) {
    if (!content) return "Unknown question";
    
    // Extract the form question if present
    const questionMatch = content.match(/Form Question:\s*([^?]+)\s*\?/);
    if (questionMatch && questionMatch[1]) {
        return questionMatch[1].trim();
    }
    
    // Try other question formats if the first pattern fails
    const altQuestionMatch = content.match(/Question:\s*([^?]+)\s*\?/i);
    if (altQuestionMatch && altQuestionMatch[1]) {
        return altQuestionMatch[1].trim();
    }
    
    // Look for any question-like text
    const anyQuestionMatch = content.match(/([^.!?]+\?)/);
    if (anyQuestionMatch && anyQuestionMatch[1]) {
        return anyQuestionMatch[1].trim();
    }
    
    // Fallback to first 50 chars
    return content.substring(0, 50);
}

// Helper function to clean and extract question text
function extractQuestionText(content) {
    if (!content) return "Unknown question";
    
    // Remove context data and other boilerplate
    let cleanContent = content.replace(/Context data:[\s\S]*?(?=Form Question:|Question:|$)/i, '');
    cleanContent = cleanContent.replace(/User profile data:[\s\S]*?(?=Form Question:|Question:|$)/i, '');
    
    // Extract the form question if present
    const questionMatch = cleanContent.match(/Form Question:\s*([^?]+)\s*\?/);
    if (questionMatch && questionMatch[1]) {
        return questionMatch[1].trim();
    }
    
    // Try other question formats
    const altQuestionMatch = cleanContent.match(/Question:\s*([^?]+)\s*\?/i);
    if (altQuestionMatch && altQuestionMatch[1]) {
        return altQuestionMatch[1].trim();
    }
    
    // Fallback to first line or first 50 chars
    const firstLine = cleanContent.split('\n')[0].trim();
    return firstLine || content.substring(0, 50);
}

// Main analysis function
function analyzeConversationData(data) {
    console.log('📊 CONVERSATION DATA ANALYSIS');
    console.log('================================\n');
    
    if (!data || typeof data !== 'object') {
        console.log('❌ No conversation data found or invalid format');
        return;
    }
    
    const jobTitles = Object.keys(data);
    console.log(`📋 Total job titles: ${jobTitles.length}`);
    
    let totalConversations = 0;
    let uniqueQuestions = new Set();
    let duplicateQuestions = [];
    
    jobTitles.forEach(jobTitle => {
        const conversations = data[jobTitle];
        console.log(`\n🏢 Job: "${jobTitle}"`);
        
        if (!Array.isArray(conversations)) {
            console.log('  ❌ Conversations is not an array');
            return;
        }
        
        console.log(`  💬 Total conversations: ${conversations.length}`);
        totalConversations += conversations.length;
        
        conversations.forEach((conversation, index) => {
            console.log(`\n  📝 Conversation ${index + 1}:`);
            
            if (!Array.isArray(conversation)) {
                console.log('    ❌ Conversation is not an array');
                return;
            }
            
            console.log(`    📨 Messages: ${conversation.length}`);
            console.log(`    🕒 Timestamp: ${conversation.timestamp || 'Not set'}`);
            console.log(`    🆔 Question ID: ${conversation.questionId || 'Not set'}`);
            
            // Find user and assistant messages
            const userMsg = conversation.find(msg => msg && msg.role === 'user');
            const assistantMsg = conversation.find(msg => msg && msg.role === 'assistant');
            
            if (!userMsg) {
                console.log('    ❌ Missing user message');
            } else {
                const questionText = extractQuestionText(userMsg.content);
                console.log(`    ❓ Question: "${questionText}"`);
                
                // Check for duplicates
                if (uniqueQuestions.has(questionText)) {
                    duplicateQuestions.push({
                        jobTitle,
                        conversationIndex: index,
                        question: questionText
                    });
                    console.log('    ⚠️  DUPLICATE QUESTION DETECTED!');
                } else {
                    uniqueQuestions.add(questionText);
                }
            }
            
            if (!assistantMsg) {
                console.log('    ❌ Missing assistant message');
            } else {
                console.log(`    ✅ Answer: "${assistantMsg.content}"`);
            }
        });
    });
    
    console.log('\n📈 SUMMARY');
    console.log('===========');
    console.log(`Total job titles: ${jobTitles.length}`);
    console.log(`Total conversations: ${totalConversations}`);
    console.log(`Unique questions: ${uniqueQuestions.size}`);
    console.log(`Duplicate questions: ${duplicateQuestions.length}`);
    
    if (duplicateQuestions.length > 0) {
        console.log('\n🔍 DUPLICATE QUESTIONS FOUND:');
        duplicateQuestions.forEach((dup, index) => {
            console.log(`${index + 1}. Job: "${dup.jobTitle}", Conversation: ${dup.conversationIndex + 1}`);
            console.log(`   Question: "${dup.question}"`);
        });
    }
}

// Mock chrome.storage for testing
const storage = {
    get: function(keys, callback) {
        console.log('🔍 Attempting to retrieve conversation data...');
        
        // Try to read from a debug file first
        try {
            const debugData = fs.readFileSync('conversation_data_debug.json', 'utf8');
            const parsedData = JSON.parse(debugData);
            console.log('✅ Loaded conversation data from debug file\n');
            callback({ conversationData: parsedData });
            return;
        } catch (error) {
            console.log('ℹ️  No debug file found, creating mock data for testing\n');
        }
        
        // Create mock data for testing
        const mockData = {
            "Software Engineer": [
                [
                    {
                        role: "user",
                        content: "Form Question: How many years of experience do you have with JavaScript?"
                    },
                    {
                        role: "assistant", 
                        content: "5 years"
                    }
                ],
                [
                    {
                        role: "user",
                        content: "Form Question: How many years of experience do you have with JavaScript?"
                    },
                    {
                        role: "assistant",
                        content: "5 years"
                    }
                ],
                [
                    {
                        role: "user",
                        content: "Form Question: Are you willing to relocate to Berlin?"
                    },
                    {
                        role: "assistant",
                        content: "Yes"
                    }
                ]
            ]
        };
        
        // Add timestamps and question IDs to mock data
        mockData["Software Engineer"].forEach((conversation, index) => {
            conversation.timestamp = Date.now() - (index * 60000); // 1 minute apart
            const userMsg = conversation.find(msg => msg.role === 'user');
            if (userMsg) {
                conversation.questionId = extractQuestionPart(userMsg.content);
            }
        });
        
        callback({ conversationData: mockData });
    }
};

// Start the analysis
storage.get(['conversationData'], function(result) {
    analyzeConversationData(result.conversationData);
}); 