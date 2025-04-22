/**
 * ConversationHistory class to manage conversation state for AI interactions
 */
class ConversationHistory {
  constructor() {
    this.conversation_history = [];
    this.conversation_history_company = [];
    this.savedConversations = [];
    
    // Set default system context
    this.setSystemContext();
  }

  /**
   * Set the system context for the conversation
   * @param {string} systemContext - Optional custom system context
   */
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
    
    this.conversation_history = [{ role: "system", content: systemContext }];
    this.conversation_history_company = [...this.conversation_history];
  }
  
  /**
   * Add a user message to both conversation histories
   * @param {string} content - Message content
   */
  addUserMessage(content) {
    const message = { role: "user", content };
    this.conversation_history.push(message);
    this.conversation_history_company.push(message);
  }
  
  /**
   * Add an assistant response to company history and reset histories
   * @param {string} content - Response content
   */
  addAssistantResponse(content) {
    // First, add assistant response to conversation history so it can be sent to the popup
    const assistantMessage = { role: "assistant", content };
    this.conversation_history.push(assistantMessage);
    
    // Also add to company history
    this.conversation_history_company.push(assistantMessage);
    
    // We no longer reset immediately, to allow the conversation to be sent to the popup
  }
  
  /**
   * Finalize current conversation and save it before starting new
   * This should be called at the beginning of form processing
   * @param {Object} jobInfo - Job information to associate with this conversation
   */
  finalizeAndSaveConversation(jobInfo) {
    // Only save if we have a meaningful conversation (more than just system message)
    if (this.conversation_history.length > 1) {
      console.log(`Finalizing conversation with ${this.conversation_history.length} messages`);
      
      // Save the conversation with job info
      this.savedConversations.push({
        timestamp: new Date().toISOString(),
        job: jobInfo,
        conversation: JSON.parse(JSON.stringify(this.conversation_history))
      });
      
      console.log(`Saved conversation. Total saved: ${this.savedConversations.length}`);
    }
    
    // Reset for new conversation
    this.resetConversations();
  }
  
  /**
   * Get all saved conversations for a specific job
   * @param {string} jobTitle - Job title to filter by
   * @returns {Array} - All conversations for this job
   */
  getSavedConversations(jobTitle) {
    return this.savedConversations
      .filter(item => !jobTitle || item.job?.title === jobTitle)
      .map(item => item.conversation);
  }
  
  /**
   * Reset conversation histories, keeping only the system message
   */
  resetConversations() {
    // Keep only the first message (system context)
    this.conversation_history = this.conversation_history.slice(0, 1);
    this.conversation_history_company = [];
    console.log('Conversation history reset for new form');
  }
  
  /**
   * Get the current conversation history for API calls
   * @returns {Array} - Conversation history
   */
  getCurrentHistory() {
    // Make sure we return a complete conversation including system message and all user/assistant messages
    // We want to return a deep copy to prevent any modifications
    return JSON.parse(JSON.stringify(this.conversation_history));
  }
  
  /**
   * Build a prompt for a question with options
   * @param {string} question - The question to answer
   * @param {Array} options - Available options
   * @param {string} relevantContext - Context from memory search
   * @returns {string} - Formatted prompt
   */
  buildOptionsPrompt(question, options, relevantContext) {
    // Format options as string, just like Python
    const optionsStr = options.map(opt => `"${opt}"`).join(", ");
    
    // Check if this is likely a country code question
    const isCountryQuestion = 
      question.toLowerCase().includes("landesvorwahl") ||
      question.toLowerCase().includes("country code") ||
      question.toLowerCase().includes("country") ||
      options.some(opt => opt.includes("(+") && opt.includes(")"));
    
    let promptText = `Form Question: ${question} ?
Available Options: [${optionsStr}]
User Context Data Hint: ${relevantContext}
IMPORTANT: You MUST choose EXACTLY ONE option from the list above.
Your answer should match one of the options EXACTLY as written.
DO NOT add any explanation or additional text.`;
    
    // Add country-specific guidance if relevant
    if (isCountryQuestion) {
      promptText += `
ADDITIONAL GUIDANCE: 
- If this is a country selection question and the user is from Germany, select "Deutschland (+49)"
- Country names may be in German (e.g., "Deutschland" for Germany, "Vereinigte Staaten" for USA)
- Always choose the option that matches the user's country, paying attention to both the name and country code`;
    }
    
    return promptText;
  }
  
  /**
   * Build a prompt for a question without options
   * @param {string} question - The question to answer
   * @param {string} relevantContext - Context from memory search
   * @param {string} phone - User's phone number
   * @param {string} desiredSalary - User's desired salary
   * @returns {string} - Formatted prompt
   */
  buildNoOptionsPrompt(question, relevantContext, phone = "", desiredSalary = "") {
    return `Form Question: ${question} ?
User Context Data Hint: ${relevantContext}
IMPORTANT:
- Return ONLY the answer as a plain string
- If the question requires a number, return ONLY a number
- If the question requires a phone number, return the user's phone ${phone}
- If the question asks for a salary, use the user's expected salary ${desiredSalary} or provide a reasonable estimate based on job market data
- DO NOT add any explanation or additional text
- Make sure the answer is professional and benefits the user`;
  }
}

export default new ConversationHistory();
export { ConversationHistory };
