var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));

// src/ai/AISettingsManager.js
var AISettingsManager = class {
  constructor() {
    this.currentSettings = null;
    this.defaultModel = "qwen2.5:3b";
    this.settingsLoadPromise = null;
  }
  /**
   * Load AI settings from database via background script
   * @param {string} userId - User ID to load settings for
   * @returns {Promise<Object>} - AI settings object
   */
  async loadAISettings(userId) {
    try {
      console.log("AISettingsManager: Loading AI settings for user:", userId);
      console.log("AISettingsManager: User ID type:", typeof userId);
      console.log("AISettingsManager: User ID length:", userId ? userId.length : "null");
      if (!userId || typeof userId !== "string" || userId.length !== 36) {
        console.error("AISettingsManager: Invalid user ID provided:", userId);
        console.log("AISettingsManager: Returning default settings (ollama)");
        return this.getDefaultSettings();
      }
      console.log("AISettingsManager: Making API request to load settings...");
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "GET",
        url: "/users/".concat(userId, "/ai-settings/default")
      });
      console.log("AISettingsManager: API response received:", response);
      if (response && response.success) {
        this.currentSettings = response.ai_settings;
        console.log("AISettingsManager: Successfully loaded AI settings:", this.currentSettings);
        console.log("AISettingsManager: Provider:", this.currentSettings.ai_provider);
        console.log("AISettingsManager: Model:", this.currentSettings.ai_model);
        return this.currentSettings;
      } else {
        console.warn("AISettingsManager: No AI settings found, using default");
        console.log("AISettingsManager: Response was:", response);
        return this.getDefaultSettings();
      }
    } catch (error) {
      console.error("AISettingsManager: Error loading AI settings:", error);
      return this.getDefaultSettings();
    }
  }
  /**
   * Get default AI settings
   * @returns {Object} - Default settings object
   */
  getDefaultSettings() {
    return {
      provider: "ollama",
      model: this.defaultModel,
      apiKey: null,
      baseUrl: "http://localhost:11434",
      is_default: true
    };
  }
  /**
   * Get current AI settings
   * @returns {Object} - Current settings or default
   */
  getCurrentSettings() {
    return this.currentSettings || this.getDefaultSettings();
  }
  /**
   * Set AI settings
   * @param {Object} settings - AI settings object
   */
  setSettings(settings) {
    this.currentSettings = settings;
    console.log("AISettingsManager: Settings updated:", settings);
  }
  /**
   * Get the current model name
   * @returns {string} - Model name
   */
  getModel() {
    const settings = this.getCurrentSettings();
    return settings.ai_model || settings.model || this.defaultModel;
  }
  /**
   * Get the current provider
   * @returns {string} - Provider name
   */
  getProvider() {
    const settings = this.getCurrentSettings();
    return settings.ai_provider || settings.provider || "ollama";
  }
  /**
   * Get the decrypted API key for the current settings
   * @returns {Promise<string>} - Decrypted API key
   */
  async getDecryptedApiKey() {
    const settings = this.getCurrentSettings();
    if (settings.apiKey && settings.apiKey !== "encrypted") {
      return settings.apiKey;
    }
    if (settings.api_key_encrypted && settings.id) {
      try {
        const response = await chrome.runtime.sendMessage({
          action: "apiRequest",
          method: "GET",
          url: "/ai-settings/".concat(settings.id, "/encrypted-key")
        });
        if (response && response.success && response.api_key_encrypted) {
          const decryptResponse = await chrome.runtime.sendMessage({
            action: "apiRequest",
            method: "POST",
            url: "/ai-settings/decrypt-api-key",
            data: { encryptedApiKey: response.api_key_encrypted }
          });
          if (decryptResponse && decryptResponse.success) {
            settings.apiKey = decryptResponse.decryptedApiKey;
            return decryptResponse.decryptedApiKey;
          }
        }
      } catch (error) {
        console.error("AISettingsManager: Error fetching/decrypting API key:", error);
        throw new Error("Failed to retrieve API key");
      }
    }
    return null;
  }
  /**
   * Test AI connection
   * @returns {Promise<Object>} - Test result
   */
  async testConnection() {
    try {
      const provider = this.getProvider();
      if (provider === "ollama") {
        const response = await chrome.runtime.sendMessage({
          action: "testOllama"
        });
        return response;
      } else if (provider === "openai") {
        const response = await chrome.runtime.sendMessage({
          action: "testOpenAI"
        });
        return response;
      } else {
        const settings = this.getCurrentSettings();
        if (!settings.apiKey) {
          return { success: false, error: "API key required for ".concat(provider) };
        }
        return { success: true, message: "".concat(provider, " settings validated") };
      }
    } catch (error) {
      console.error("AISettingsManager: Error testing connection:", error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Call AI API with the current settings
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} - API response
   */
  async callAI(requestData) {
    var _a, _b, _c;
    try {
      const provider = this.getProvider();
      const model = this.getModel();
      console.log("=== AI API CALL DEBUG ===");
      console.log("Provider:", provider);
      console.log("Model:", model);
      console.log("Request Data:", {
        prompt: requestData.prompt,
        messages: requestData.messages,
        max_tokens: requestData.max_tokens,
        temperature: requestData.temperature,
        stream: requestData.stream
      });
      let inputTokens = 0;
      if (requestData.prompt) {
        inputTokens = this.estimateTokens(requestData.prompt);
        console.log("Input tokens (prompt):", inputTokens);
      } else if (requestData.messages) {
        inputTokens = this.estimateTokensFromMessages(requestData.messages);
        console.log("Input tokens (messages):", inputTokens);
      }
      if (provider === "ollama") {
        const requestBody = __spreadProps(__spreadValues({}, requestData), {
          model
        });
        console.log("Sending Ollama request:", requestBody);
        const response = await chrome.runtime.sendMessage({
          action: "callOllama",
          endpoint: "generate",
          data: requestBody
        });
        if (response.success === false) {
          throw new Error(response.error || "Unknown error from Ollama API");
        }
        const outputTokens = this.estimateTokens(response.data.response || "");
        console.log("Output tokens:", outputTokens);
        console.log("Total tokens:", inputTokens + outputTokens);
        console.log("=== END AI API CALL DEBUG ===");
        return response.data;
      } else if (provider === "openai") {
        const apiKey = await this.getDecryptedApiKey();
        if (!apiKey) {
          throw new Error("OpenAI API key is required");
        }
        const requestBody = __spreadProps(__spreadValues({}, requestData), {
          model,
          apiKey
        });
        console.log("Sending OpenAI request:", __spreadProps(__spreadValues({}, requestBody), {
          apiKey: "[REDACTED]"
        }));
        const response = await chrome.runtime.sendMessage({
          action: "callOpenAI",
          data: requestBody
        });
        if (response.success === false) {
          throw new Error(response.error || "Unknown error from OpenAI API");
        }
        const outputTokens = ((_a = response.data.usage) == null ? void 0 : _a.completion_tokens) || 0;
        const totalTokens = ((_b = response.data.usage) == null ? void 0 : _b.total_tokens) || 0;
        console.log("OpenAI Token Usage:", {
          prompt_tokens: ((_c = response.data.usage) == null ? void 0 : _c.prompt_tokens) || 0,
          completion_tokens: outputTokens,
          total_tokens: totalTokens
        });
        console.log("=== END AI API CALL DEBUG ===");
        return response.data;
      } else {
        throw new Error("Provider ".concat(provider, " not yet implemented"));
      }
    } catch (error) {
      console.error("AISettingsManager: Error calling AI API:", error);
      throw error;
    }
  }
  /**
   * Call AI API with stop checking
   * @param {Object} requestData - Request data
   * @param {Function} shouldStop - Function to check if should stop
   * @returns {Promise<Object>} - API response or stop status
   */
  async callAIWithStop(requestData, shouldStop = null) {
    try {
      const provider = this.getProvider();
      if (provider === "ollama") {
        const model = this.getModel();
        const requestBody = __spreadProps(__spreadValues({}, requestData), {
          model
        });
        return new Promise((resolve, reject) => {
          let stopCheckInterval = null;
          if (shouldStop) {
            stopCheckInterval = setInterval(async () => {
              try {
                let stopRequested = false;
                if (typeof shouldStop === "function") {
                  stopRequested = await shouldStop();
                } else if (shouldStop && shouldStop.value !== void 0) {
                  stopRequested = shouldStop.value;
                } else {
                  stopRequested = !!shouldStop;
                }
                if (stopRequested) {
                  console.log("Stop requested during AI API call");
                  if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                  }
                  resolve({ stopped: true });
                }
              } catch (error) {
                console.error("Error in stop check:", error);
              }
            }, 500);
          }
          chrome.runtime.sendMessage(
            {
              action: "callOllama",
              endpoint: "generate",
              data: requestBody
            },
            (response) => {
              if (stopCheckInterval) {
                clearInterval(stopCheckInterval);
              }
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response.success === false) {
                reject(new Error(response.error || "Unknown error from Ollama API"));
              } else {
                resolve(response.data);
              }
            }
          );
        });
      } else if (provider === "openai") {
        const model = this.getModel();
        const apiKey = await this.getDecryptedApiKey();
        if (!apiKey) {
          throw new Error("OpenAI API key is required");
        }
        return new Promise((resolve, reject) => {
          let stopCheckInterval = null;
          if (shouldStop) {
            stopCheckInterval = setInterval(async () => {
              try {
                let stopRequested = false;
                if (typeof shouldStop === "function") {
                  stopRequested = await shouldStop();
                } else if (shouldStop && shouldStop.value !== void 0) {
                  stopRequested = shouldStop.value;
                } else {
                  stopRequested = !!shouldStop;
                }
                if (stopRequested) {
                  console.log("Stop requested during OpenAI API call");
                  if (stopCheckInterval) {
                    clearInterval(stopCheckInterval);
                  }
                  resolve({ stopped: true });
                }
              } catch (error) {
                console.error("Error in stop check:", error);
              }
            }, 500);
          }
          chrome.runtime.sendMessage(
            {
              action: "callOpenAI",
              data: __spreadProps(__spreadValues({}, requestData), {
                model,
                apiKey
              })
            },
            (response) => {
              if (stopCheckInterval) {
                clearInterval(stopCheckInterval);
              }
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (response.success === false) {
                reject(new Error(response.error || "Unknown error from OpenAI API"));
              } else {
                resolve(response.data);
              }
            }
          );
        });
      } else {
        throw new Error("Provider ".concat(provider, " not yet implemented"));
      }
    } catch (error) {
      console.error("AISettingsManager: Error calling AI API with stop:", error);
      throw error;
    }
  }
  /**
   * Load available models for the current provider
   * @returns {Promise<Array>} - List of available models
   */
  async loadAvailableModels() {
    try {
      const provider = this.getProvider();
      if (provider === "ollama") {
        const response = await chrome.runtime.sendMessage({
          action: "ollamaRequest",
          method: "GET",
          url: "/api/tags"
        });
        if (response && response.success) {
          return response.models.map((model) => model.name);
        } else {
          throw new Error((response == null ? void 0 : response.error) || "Failed to load Ollama models");
        }
      } else {
        throw new Error("Provider ".concat(provider, " not yet implemented"));
      }
    } catch (error) {
      console.error("AISettingsManager: Error loading models:", error);
      throw error;
    }
  }
  /**
   * Estimate tokens for a text string (approximate calculation)
   * @param {string} text - Text to estimate tokens for
   * @returns {number} - Estimated token count
   */
  estimateTokens(text) {
    if (!text) return 0;
    const charCount = text.length;
    const estimatedTokens = Math.ceil(charCount / 4);
    return estimatedTokens;
  }
  /**
   * Estimate tokens for messages array
   * @param {Array} messages - Array of message objects
   * @returns {number} - Estimated total token count
   */
  estimateTokensFromMessages(messages) {
    if (!messages || !Array.isArray(messages)) return 0;
    let totalTokens = 0;
    for (const message of messages) {
      if (message.content) {
        totalTokens += this.estimateTokens(message.content);
      }
      totalTokens += 4;
    }
    return totalTokens;
  }
  /**
   * Get detailed token analysis for a prompt
   * @param {Object} requestData - Request data
   * @returns {Object} - Token analysis
   */
  getTokenAnalysis(requestData) {
    const analysis = {
      inputTokens: 0,
      estimatedOutputTokens: 0,
      maxTokens: requestData.max_tokens || 1e3,
      provider: this.getProvider(),
      model: this.getModel()
    };
    if (requestData.prompt) {
      analysis.inputTokens = this.estimateTokens(requestData.prompt);
    } else if (requestData.messages) {
      analysis.inputTokens = this.estimateTokensFromMessages(requestData.messages);
    }
    analysis.estimatedOutputTokens = Math.min(analysis.maxTokens, 100);
    return analysis;
  }
  /**
   * Clear current settings
   */
  clear() {
    this.currentSettings = null;
    this.settingsLoadPromise = null;
  }
};
var AISettingsManager_default = AISettingsManager;

// src/ai/AIQuestionAnswerer.js
var AIQuestionAnswerer = class {
  constructor(userId = null) {
    this.userId = userId;
    this.user_data = null;
    this.formatted_text = null;
    this.aiSettingsManager = new AISettingsManager_default();
    this.settingsLoadPromise = null;
    if (userId) {
      this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
    }
  }
  /**
   * Set the user ID and load AI settings
   * @param {string} userId - User ID to load settings for
   */
  async setUserId(userId) {
    this.userId = userId;
    if (userId) {
      this.settingsLoadPromise = this.aiSettingsManager.loadAISettings(userId);
      await this.settingsLoadPromise;
    }
  }
  /**
   * Ensure AI settings are loaded before making API calls
   * @returns {Promise<void>}
   */
  async ensureSettingsLoaded() {
    if (this.settingsLoadPromise) {
      await this.settingsLoadPromise;
      this.settingsLoadPromise = null;
    }
  }
  /**
   * Set the AI model to use (overrides settings)
   * @param {string} model - The model name to use
   */
  setModel(model) {
    if (model && typeof model === "string") {
      const currentSettings = this.aiSettingsManager.getCurrentSettings();
      const overrideSettings = __spreadProps(__spreadValues({}, currentSettings), { model });
      this.aiSettingsManager.setSettings(overrideSettings);
      console.log("AIQuestionAnswerer: Model overridden to: ".concat(model));
    }
  }
  /**
   * Set user data from structured data and formatted text
   * @param {Object|string} userData - Structured user data or formatted text
   * @param {string} formattedText - Optional formatted text for AI prompts
   * @returns {Promise<Object>} - Success status
   */
  async setUserContext(userData, formattedText = null) {
    try {
      if (typeof userData === "object" && userData !== null) {
        this.user_data = userData;
        this.formatted_text = formattedText || this.formatUserDataAsText();
        console.log("User context set with structured data");
      } else if (typeof userData === "string") {
        this.user_data = null;
        this.formatted_text = userData;
        console.log("User context set with formatted text only");
      } else {
        throw new Error("Invalid user data format");
      }
      console.log("User context set successfully");
      return { success: true };
    } catch (error) {
      console.error("Error in setUserContext:", error);
      return { success: false, error: error.message };
    }
  }
  /**
   * Answer a question with or without options using AI
   * @param {string} question - The question to answer
   * @param {Array} options - Optional list of choices
   * @param {Function} shouldStop - Optional function to check if should stop
   * @param {string} resumeId - Optional resume ID for structured data
   * @returns {Promise<Object>} - Result object with status and answer
   */
  async answerQuestion(question, options = null, shouldStop = null, resumeId = null) {
    var _a, _b, _c;
    try {
      await this.ensureSettingsLoaded();
      console.log("=== AI QUESTION ANSWERING DEBUG ===");
      console.log("Question:", question);
      console.log("Using AI model:", this.aiSettingsManager.getModel());
      console.log("Options:", options);
      console.log("Resume ID:", resumeId);
      let relevantData = null;
      if (resumeId) {
        try {
          const questionType = this.detectQuestionType(question);
          console.log("Detected question type:", questionType);
          const response2 = await chrome.runtime.sendMessage({
            action: "apiRequest",
            method: "GET",
            url: "/resumes/".concat(resumeId, "/relevant-data?questionType=").concat(questionType)
          });
          if (response2 && response2.success) {
            relevantData = response2.relevantData;
            console.log("Retrieved relevant data from database:", relevantData);
          } else {
            console.log("No structured data found, falling back to user context");
          }
        } catch (error) {
          console.error("Error retrieving structured data:", error);
        }
      }
      const directAnswer = this.getDirectAnswer(question, relevantData);
      if (directAnswer) {
        console.log("Found direct answer:", directAnswer);
        if (options && Array.isArray(options) && options.length > 0) {
          const matchedOption = this.matchToOption(directAnswer, options);
          console.log("Matched direct answer to option:", matchedOption);
          console.log("=== END AI QUESTION ANSWERING DEBUG ===");
          return { success: true, answer: matchedOption };
        }
        console.log("=== END AI QUESTION ANSWERING DEBUG ===");
        return { success: true, answer: directAnswer };
      }
      if (shouldStop) {
        let stopRequested = false;
        if (typeof shouldStop === "function") {
          stopRequested = await shouldStop();
        } else if (shouldStop && shouldStop.value !== void 0) {
          stopRequested = shouldStop.value;
        } else {
          stopRequested = !!shouldStop;
        }
        if (stopRequested) {
          console.log("Stop requested before AI processing");
          console.log("=== END AI QUESTION ANSWERING DEBUG ===");
          return { success: false, stopped: true };
        }
      }
      const prompt = this.buildEnhancedPrompt(question, options);
      console.log("=== FULL PROMPT BEING SENT ===");
      console.log(prompt);
      console.log("=== END FULL PROMPT ===");
      const tokenAnalysis = this.aiSettingsManager.getTokenAnalysis({ prompt });
      console.log("Token Analysis:", tokenAnalysis);
      const response = await this.aiSettingsManager.callAIWithStop({
        prompt,
        stream: false
      }, shouldStop);
      if (response && response.stopped) {
        console.log("=== END AI QUESTION ANSWERING DEBUG ===");
        return { success: false, stopped: true };
      }
      let answer = "";
      if (response == null ? void 0 : response.response) {
        answer = response.response.trim();
      } else if ((_c = (_b = (_a = response == null ? void 0 : response.choices) == null ? void 0 : _a[0]) == null ? void 0 : _b.message) == null ? void 0 : _c.content) {
        answer = response.choices[0].message.content.trim();
      } else {
        console.warn("Unexpected AI response format:", response);
        answer = "";
      }
      console.log("Raw AI response:", answer);
      if (this.isYearsOfExperienceQuestion(question) && /^\d+$/.test(answer)) {
        const num = parseInt(answer);
        if (num < 5) {
          answer = "5";
          console.log("Enforced minimum 5 years for experience question, was: ".concat(num));
        }
      }
      if (options && Array.isArray(options) && options.length > 0) {
        answer = this.matchToOption(answer, options);
      }
      console.log("Final answer:", answer);
      console.log("=== END AI QUESTION ANSWERING DEBUG ===");
      return {
        success: true,
        answer: answer || "Information not available"
      };
    } catch (error) {
      console.error("Error in answerQuestion:", error);
      console.log("=== END AI QUESTION ANSWERING DEBUG ===");
      const fallbackAnswer = options && Array.isArray(options) && options.length > 0 ? options.length > 1 ? options[1] : options[0] : "Information not available";
      return { success: true, answer: fallbackAnswer };
    }
  }
  /**
   * Detect question type for optimized data retrieval
   * @param {string} question - The question to analyze
   * @returns {string} - Question type
   */
  detectQuestionType(question) {
    const questionLower = question.toLowerCase();
    if (questionLower.includes("level of") || questionLower.includes("proficiency in") || questionLower.includes("fluent in")) {
      return "language_level";
    } else if (questionLower.includes("skill") || questionLower.includes("experience") || questionLower.includes("years") || questionLower.includes("technology") || questionLower.includes("programming") || questionLower.includes("language") || questionLower.includes("c++") || questionLower.includes("python") || questionLower.includes("java")) {
      return "skills";
    } else if (questionLower.includes("education") || questionLower.includes("degree") || questionLower.includes("study") || questionLower.includes("university") || questionLower.includes("college")) {
      return "education";
    } else if (questionLower.includes("language") || questionLower.includes("speak") || questionLower.includes("fluent")) {
      return "languages";
    } else if (questionLower.includes("certification") || questionLower.includes("certified")) {
      return "certifications";
    } else if (questionLower.includes("name") || questionLower.includes("email") || questionLower.includes("phone") || questionLower.includes("contact") || questionLower.includes("location")) {
      return "personal";
    } else if (questionLower.includes("visa") || questionLower.includes("sponsorship") || questionLower.includes("work permit")) {
      return "visa";
    } else if (questionLower.includes("salary") || questionLower.includes("compensation") || questionLower.includes("pay") || questionLower.includes("expectation")) {
      return "salary";
    } else if (questionLower.includes("notice") || questionLower.includes("period") || questionLower.includes("availability") || questionLower.includes("start date")) {
      return "notice";
    } else {
      return "general";
    }
  }
  /**
   * Check for direct answers from user data (email, phone, name, etc.)
   * @param {string} question - The question to check
   * @param {Object} relevantData - Optional structured data from database
   * @returns {string|null} - Direct answer if found, null otherwise
   */
  getDirectAnswer(question, relevantData = null) {
    var _a;
    if (relevantData) {
      const questionLower = question.toLowerCase();
      if (relevantData.languages && (questionLower.includes("level of") || questionLower.includes("proficiency"))) {
        for (const lang of ["german", "english", "french", "arabic", "spanish"]) {
          if (questionLower.includes(lang)) {
            const language = relevantData.languages.find((l) => {
              var _a2;
              return ((_a2 = l.language) == null ? void 0 : _a2.toLowerCase()) === lang;
            });
            if (language) {
              return language.proficiency || "Unknown";
            }
          }
        }
      }
      if (relevantData.personal_info) {
        if (questionLower.includes("email") || questionLower.includes("e-mail")) {
          return relevantData.personal_info.email || null;
        }
        if (questionLower.includes("phone") || questionLower.includes("telephone") || questionLower.includes("mobile")) {
          return relevantData.personal_info.phone || null;
        }
        if (questionLower.includes("name")) {
          return relevantData.personal_info.name || null;
        }
        if (questionLower.includes("location") || questionLower.includes("address")) {
          return relevantData.personal_info.location || null;
        }
        if (questionLower.includes("citizenship")) {
          return relevantData.personal_info.citizenship || null;
        }
        if (questionLower.includes("visa") || questionLower.includes("sponsorship")) {
          return relevantData.personal_info.visa_required || null;
        }
        if (questionLower.includes("salary") || questionLower.includes("compensation") || questionLower.includes("pay")) {
          return relevantData.personal_info.salary || null;
        }
      }
    }
    if (!((_a = this.user_data) == null ? void 0 : _a.personal_information)) {
      return null;
    }
    const info = this.user_data.personal_information;
    const q = question.toLowerCase();
    if (q.includes("email") || q.includes("e-mail")) {
      return info.email || null;
    }
    if (q.includes("phone") || q.includes("mobile") || q.includes("telefon")) {
      const phone = info.phone_prefix ? "".concat(info.phone_prefix).concat(info.phone) : info.phone;
      return phone || null;
    }
    if (q.includes("first name") || q.includes("vorname")) {
      return info.name || null;
    }
    if (q.includes("last name") || q.includes("surname") || q.includes("nachname")) {
      return info.surname || null;
    }
    if (q.includes("country") && !q.includes("code")) {
      return info.country || null;
    }
    if (this.isNoticePeriodOrStartDateQuestion(question)) {
      if (q.includes("notice period") || q.includes("k\xFCndigungsfrist") || q.includes("kuendigungsfrist")) {
        if (q.includes("monate") || q.includes("deutsch")) {
          return "2 Monate";
        } else {
          return "2 months";
        }
      } else {
        return this.calculateDateTwoMonthsFromNow();
      }
    }
    return null;
  }
  /**
   * Build enhanced prompt with special handling for different question types
   * @param {string} question - The question
   * @param {Array} options - Available options (if any)
   * @returns {string} - Formatted prompt
   */
  buildEnhancedPrompt(question, options) {
    const userData = this.formatUserDataAsText();
    let prompt = 'You are a job applicant filling out a job application form. Answer questions based on your resume information in first person (as "I" not "he/she").\n\nMY RESUME:\n'.concat(userData, "\n\nQUESTION: ").concat(question, '\n\nIMPORTANT GENERAL RULES:\n- Answer as the job applicant (use "I", "my", "me" - NOT "he", "she", "Sami", or third person)\n- Be concise and direct\n- Only provide the specific information requested\n- Do not mention your name unless explicitly asked');
    if (this.isDecimalNumberQuestion(question)) {
      prompt += '\n\nIMPORTANT RULES FOR DECIMAL NUMBERS:\n- If asked for a decimal number, provide ONLY a decimal number (e.g., "3.5", "2.0", "1.2")\n- Do NOT include explanations, descriptions, or additional text\n- The number should be greater than 0.0 as requested\n- Example: "3.0" not "3.0 years" or explanations';
    }
    if (this.isYearsOfExperienceQuestion(question)) {
      prompt += '\n\nIMPORTANT RULES FOR YEARS OF EXPERIENCE:\n- If asked for years of experience, provide ONLY a number between 5-99\n- MINIMUM is always 5 years - never return 0, 1, 2, 3, or 4\n- Do NOT include words like "years", "Jahre", or descriptions\n- For skill levels: Beginner=5, Intermediate=7, Advanced=10+ years\n- Calculate based on work experience and skill level\n- If no specific experience found, default to 5 years minimum\n- If unclear or no data, always answer at least 5 years to maximize job prospects\n- Example: "5" not "5 years" or "5 Jahre"\n- Better to overestimate than underestimate for better interview chances';
    }
    if (this.isDegreeQuestion(question)) {
      prompt += '\n\nIMPORTANT RULES FOR DEGREE QUESTIONS:\n- Check education section carefully for exact degree matches\n- "Bachelor" = "Bachelor of Engineering" or "Bachelor of Science"\n- "Master" = "Master of Engineering" or "Master of Science"\n- Answer "Ja" for German forms, "Yes" for English forms\n- If degree is found, answer positively\n- Look for exact degree names in education section';
    }
    if (this.isSkillLevelQuestion(question)) {
      prompt += "\n\nIMPORTANT RULES FOR SKILL LEVEL QUESTIONS:\n- Check the skills section for exact skill matches\n- Look for the skill name and its level (Beginner/Intermediate/Advanced)\n- Be precise about the level mentioned in the resume\n- Do not guess or estimate levels";
    }
    if (this.isNoticePeriodOrStartDateQuestion(question)) {
      const twoMonthsFromNow = this.calculateDateTwoMonthsFromNow();
      prompt += '\n\nIMPORTANT RULES FOR NOTICE PERIOD AND START DATE:\n- For notice period questions, answer "2 months" or "2 Monate"\n- For starting date questions, provide the exact date: '.concat(twoMonthsFromNow, '\n- Use the format DD.MM.YYYY for German forms (e.g., "15.03.2024")\n- Use the format MM/DD/YYYY for English forms (e.g., "03/15/2024")\n- Current calculated start date (2 months from today): ').concat(twoMonthsFromNow, "\n- Be consistent with the date format expected by the form");
    }
    if (options && Array.isArray(options) && options.length > 0) {
      const optionsStr = options.map((opt) => '"'.concat(opt, '"')).join(", ");
      prompt += "\n\nAvailable Options: [".concat(optionsStr, "]\n\nIMPORTANT: You MUST choose EXACTLY ONE option from the list above. Your answer should match one of the options EXACTLY as written.");
    }
    prompt += "\n\nANSWER:";
    return prompt;
  }
  /**
   * Check if question is asking for a decimal number
   * @param {string} question - The question text
   * @returns {boolean} - True if asking for decimal number
   */
  isDecimalNumberQuestion(question) {
    const lowerQ = question.toLowerCase();
    return lowerQ.includes("decimal") || lowerQ.includes("dezimal") || lowerQ.includes("gr\xF6\xDFer als 0.0") || lowerQ.includes("greater than 0.0") || lowerQ.includes("decimal zahl") || lowerQ.includes("decimal number");
  }
  /**
   * Check if question is asking for years of experience
   * @param {string} question - The question text
   * @returns {boolean} - True if asking for years
   */
  isYearsOfExperienceQuestion(question) {
    const lowerQ = question.toLowerCase();
    return lowerQ.includes("jahre") || lowerQ.includes("years") || lowerQ.includes("experience") || lowerQ.includes("erfahrung") || lowerQ.includes("how many") || lowerQ.includes("wie viele");
  }
  /**
   * Check if question is asking about degrees/education
   * @param {string} question - The question text
   * @returns {boolean} - True if asking about degrees
   */
  isDegreeQuestion(question) {
    const lowerQ = question.toLowerCase();
    return lowerQ.includes("bachelor") || lowerQ.includes("master") || lowerQ.includes("degree") || lowerQ.includes("abschluss") || lowerQ.includes("bildung") || lowerQ.includes("education");
  }
  /**
   * Check if question is asking about skill levels
   * @param {string} question - The question text
   * @returns {boolean} - True if asking about skill levels
   */
  isSkillLevelQuestion(question) {
    const lowerQ = question.toLowerCase();
    return lowerQ.includes("level") || lowerQ.includes("niveau") || lowerQ.includes("skill") || lowerQ.includes("f\xE4higkeit") || lowerQ.includes("experience with") || lowerQ.includes("erfahrung mit");
  }
  /**
   * Check if question is asking for notice period or starting date
   * @param {string} question - The question text
   * @returns {boolean} - True if asking for notice period or starting date
   */
  isNoticePeriodOrStartDateQuestion(question) {
    const lowerQ = question.toLowerCase();
    return lowerQ.includes("notice period") || lowerQ.includes("starting date") || lowerQ.includes("start date") || lowerQ.includes("startdatum") || lowerQ.includes("beginn") || lowerQ.includes("beginnen") || lowerQ.includes("k\xFCndigungsfrist") || lowerQ.includes("kuendigungsfrist") || lowerQ.includes("verf\xFCgbar") || lowerQ.includes("verfuegbar") || lowerQ.includes("available") || lowerQ.includes("wann k\xF6nnen sie") || lowerQ.includes("when can you") || lowerQ.includes("earliest start") || lowerQ.includes("fr\xFChester beginn") || lowerQ.includes("fruehester beginn");
  }
  /**
   * Calculate the date two months from now
   * @returns {string} - Date in DD.MM.YYYY format
   */
  calculateDateTwoMonthsFromNow() {
    const now = /* @__PURE__ */ new Date();
    now.setMonth(now.getMonth() + 2);
    const day = String(now.getDate()).padStart(2, "0");
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const year = now.getFullYear();
    return "".concat(day, ".").concat(month, ".").concat(year);
  }
  /**
   * Format user data as readable text (like YAML formatting in Python)
   * @returns {string} - Formatted user data
   */
  formatUserDataAsText() {
    if (this.formatted_text) {
      return this.formatted_text;
    }
    if (!this.user_data) {
      return "No user data available.";
    }
    if (typeof this.user_data === "string") {
      return this.user_data;
    }
    return this.formatObject(this.user_data, 0);
  }
  /**
   * Recursively format object as indented text
   * @param {*} obj - Object to format
   * @param {number} indent - Indentation level
   * @returns {string} - Formatted text
   */
  formatObject(obj, indent = 0) {
    const indentStr = "  ".repeat(indent);
    let result = "";
    if (typeof obj === "object" && obj !== null) {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (typeof item === "object" && item !== null) {
            result += "".concat(indentStr, "- ").concat(this.formatObject(item, indent + 1));
          } else {
            result += "".concat(indentStr, "- ").concat(item, "\n");
          }
        }
      } else {
        for (const [key, value] of Object.entries(obj)) {
          const formattedKey = key.toUpperCase().replace(/_/g, " ");
          result += "".concat(indentStr).concat(formattedKey, ":\n");
          if (typeof value === "object" && value !== null) {
            result += this.formatObject(value, indent + 1);
          } else {
            result += "".concat(indentStr, "  ").concat(value, "\n");
          }
        }
      }
    } else {
      result += "".concat(indentStr).concat(obj, "\n");
    }
    return result;
  }
  /**
   * Match AI answer to one of the available options
   * @param {string} answer - AI generated answer
   * @param {Array} options - Available options
   * @returns {string} - Matched option
   */
  matchToOption(answer, options) {
    if (!answer || !options || options.length === 0) {
      return (options == null ? void 0 : options.length) > 0 ? options[0] : "Not available";
    }
    if (this.isDecimalNumberQuestion(answer) || /^\d+\.\d+$/.test(answer.trim())) {
      const decimalMatch = answer.match(/\d+\.\d+/);
      if (decimalMatch) {
        const decimal = decimalMatch[0];
        for (const option of options) {
          if (option.includes(decimal)) {
            return option;
          }
        }
        return decimal;
      }
    }
    if (this.isYearsOfExperienceQuestion(answer) || /^\d+$/.test(answer.trim())) {
      const numberMatch = answer.match(/\d+/);
      if (numberMatch) {
        let number = parseInt(numberMatch[0]);
        if (this.isYearsOfExperienceQuestion(answer) && number < 5) {
          number = 5;
        }
        const numberStr = number.toString();
        for (const option of options) {
          if (option.includes(numberStr)) {
            return option;
          }
        }
        return numberStr;
      }
    }
    if (this.isNoticePeriodOrStartDateQuestion(answer)) {
      if (answer.toLowerCase().includes("2 months") || answer.toLowerCase().includes("2 monate")) {
        for (const option of options) {
          if (option.toLowerCase().includes("2 months") || option.toLowerCase().includes("2 monate") || option.toLowerCase().includes("2 month")) {
            return option;
          }
        }
        return answer;
      }
      const dateMatch = answer.match(/\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}/);
      if (dateMatch) {
        const dateStr = dateMatch[0];
        for (const option of options) {
          if (option.includes(dateStr)) {
            return option;
          }
        }
        return dateStr;
      }
    }
    for (const option of options) {
      if (option.toLowerCase() === answer.toLowerCase()) {
        return option;
      }
    }
    for (const option of options) {
      if (option.toLowerCase().includes(answer.toLowerCase()) || answer.toLowerCase().includes(option.toLowerCase())) {
        return option;
      }
    }
    if (answer.toLowerCase().includes("germany") || answer.toLowerCase().includes("deutsch")) {
      for (const option of options) {
        if (option.toLowerCase().includes("deutsch") || option.toLowerCase().includes("germany") || option.includes("+49")) {
          return option;
        }
      }
    }
    return options.length > 1 ? options[1] : options[0];
  }
  /**
   * Test AI connection using AISettingsManager
   * @returns {Promise<boolean>} - Whether connection was successful
   */
  async testConnection() {
    try {
      await this.ensureSettingsLoaded();
      const result = await this.aiSettingsManager.testConnection();
      return result.success;
    } catch (error) {
      console.error("Error testing AI connection:", error);
      return false;
    }
  }
  /**
   * Get current AI settings
   * @returns {Object} - Current AI settings
   */
  getAISettings() {
    return this.aiSettingsManager.getCurrentSettings();
  }
  /**
   * Clear all data
   */
  clear() {
    this.user_data = null;
    this.formatted_text = null;
    this.aiSettingsManager.clear();
    this.settingsLoadPromise = null;
  }
};
var AIQuestionAnswerer_default = AIQuestionAnswerer;
export {
  AIQuestionAnswerer_default as default
};
//# sourceMappingURL=AIQuestionAnswerer.js.map
