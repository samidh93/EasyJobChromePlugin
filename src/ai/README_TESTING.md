# Testing AIQuestionAnswerer.js

This directory contains test files for the simplified AIQuestionAnswerer class.

## Test Files

### 1. `test_ai_answerer.html` - Browser Test Interface
A comprehensive web-based test interface that mocks the Chrome extension APIs.

**Features:**
- Visual interface for testing
- Mock Chrome API responses
- Real-time logging
- Sample questions and user data
- Support for both direct answers and AI-generated responses

**How to use:**
1. Open `test_ai_answerer.html` in a web browser
2. Click "Load User Data" to initialize with sample data
3. Test individual questions or use the batch test buttons
4. View results and logs in real-time

### 2. `test_ai_answerer.js` - Node.js Command Line Test
A Node.js script for command-line testing with mock responses.

**Features:**
- Command-line interface
- Comprehensive test suite
- Mock Chrome API and Ollama responses
- Colored output with emojis

**How to use:**
```bash
cd src/ai
node test_ai_answerer.js
```

## What Gets Tested

### Direct Answers (Personal Information)
These questions are answered directly from user data without AI:
- Email address
- Phone number  
- First name
- Last name
- Country

### AI-Generated Answers
These questions use the AI system (mocked in tests):
- Programming languages/skills
- Years of experience
- Job titles
- Educational background

### Questions with Options
Tests the option-matching functionality:
- Country selection with codes
- Experience level selection
- Work arrangement preferences

## Mock System

Both test files include mock implementations of:

### Chrome API Mock
```javascript
chrome.runtime.sendMessage(message, callback)
```
Simulates the Chrome extension messaging system.

### Ollama API Mock
Returns realistic responses based on question content:
- Email questions → sample email
- Phone questions → sample phone number  
- Skills questions → programming languages list
- Experience questions → years of experience
- Option questions → first available option

## Sample User Data

The tests use this sample data structure:
```json
{
  "personal_information": {
    "name": "John",
    "surname": "Doe", 
    "email": "john.doe@example.com",
    "phone": "1234567890",
    "phone_prefix": "+49",
    "country": "Germany",
    "salary": "75000"
  },
  "work_experience": [...],
  "skills": [...],
  "education": [...]
}
```

## Real Testing with Ollama

To test with real Ollama responses instead of mocks:

1. Make sure Ollama is running: `ollama serve`
2. Install the qwen2.5:3b model: `ollama pull qwen2.5:3b`
3. Test in the actual Chrome extension environment
4. The background script will handle real API calls

## Debugging

Both test files include extensive logging:
- HTML version: Check the "Test Log" section
- Node.js version: Output printed to console
- Browser DevTools: Check console for additional debug info

## Test Results

Expected behavior:
- ✅ Direct answers return exact personal information
- ✅ AI questions return contextual responses
- ✅ Option questions return valid selections
- ✅ Error handling works for invalid inputs
- ✅ Connection checks succeed (mocked)

## Next Steps

After testing with mocks, integrate into the Chrome extension:
1. Load user data via the extension popup
2. Test on real LinkedIn forms
3. Verify background script handles Ollama API calls
4. Monitor performance and accuracy 