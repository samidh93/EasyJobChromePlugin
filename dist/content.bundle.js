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

// src/linkedin/LinkedInBase.js
var LinkedInBase = class {
  static async wait(ms = 1e3) {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
  static debugLog(message) {
    console.log("[".concat(this.constructor.name, "] ").concat(message));
  }
  static errorLog(message, error) {
    console.error("[".concat(this.constructor.name, "] ").concat(message, ":"), error);
  }
};
var LinkedInBase_default = LinkedInBase;

// src/linkedin/LinkedInJobSearch.js
var LinkedInJobSearch = class extends LinkedInBase_default {
  static async getTotalJobsSearchCount(element) {
    try {
      await this.wait();
      const totalResultsElement = element.querySelector(".jobs-search-results-list__subtitle");
      if (totalResultsElement) {
        const totalResultsText = totalResultsElement.textContent.trim();
        const totalResultsInt = parseInt(
          totalResultsText.split(" ")[0].replace(/,/g, "").replace(/\./g, "").replace(/\+/g, "")
        );
        this.debugLog("Total jobs found: ".concat(totalResultsInt));
        return totalResultsInt;
      } else {
        this.debugLog("No results found");
        return 0;
      }
    } catch (error) {
      this.errorLog("Error fetching total jobs count", error);
      return 0;
    }
  }
  static async getAvailablePages(element, totalJobs) {
    try {
      await this.wait();
      const listPages = element.querySelector('ul[class*="jobs-search-pagination__pages"]');
      if (!listPages) {
        this.debugLog("Pagination list not found.");
        return 0;
      }
      const listPagesAvailable = listPages.querySelectorAll("li");
      if (listPagesAvailable.length === 0) {
        this.debugLog("No pagination items found.");
        return 0;
      }
      const lastPage = listPagesAvailable[listPagesAvailable.length - 1];
      this.debugLog("Last page: ".concat(lastPage));
      const totalPages = Math.ceil(totalJobs / 25);
      this.debugLog("Total pages available: ".concat(totalPages));
      return totalPages;
    } catch (error) {
      this.errorLog("Error fetching available pages", error);
      return 0;
    }
  }
  static async getListOfJobsOnPage(element) {
    try {
      await this.wait();
      const jobsContainer = element.querySelector(".scaffold-layout__list");
      if (!jobsContainer) {
        this.debugLog("Jobs container not found.");
        return [];
      }
      const jobElements = jobsContainer.querySelectorAll("li[class*='scaffold-layout__list-item']");
      this.debugLog("Found ".concat(jobElements.length, " jobs on this page."));
      return Array.from(jobElements);
    } catch (error) {
      this.errorLog("Error fetching list of jobs", error);
      return [];
    }
  }
  static async goToNextPage() {
    try {
      await this.wait();
      const nextButton = document.querySelector('button[aria-label="View next page"]') || document.querySelector("button.jobs-search-pagination__button--next") || document.querySelector('button[aria-label="Next"]');
      if (nextButton && !nextButton.disabled) {
        this.debugLog("Found next page button, clicking...");
        nextButton.click();
        this.debugLog("Clicked next page button");
        await this.wait(3e3);
        const jobsLoaded = true;
        if (jobsLoaded) {
          this.debugLog("Successfully navigated to next page");
          return true;
        } else {
          this.debugLog("Jobs failed to load on next page");
          return false;
        }
      } else {
        this.debugLog("Next page button not found or disabled - likely on last page");
        return false;
      }
    } catch (error) {
      this.errorLog("Error navigating to next page", error);
      return false;
    }
  }
  static async isOnLastPage() {
    try {
      const nextButton = document.querySelector('button[aria-label="View next page"]') || document.querySelector("button.jobs-search-pagination__button--next");
      return !nextButton || nextButton.disabled;
    } catch (error) {
      this.errorLog("Error checking if on last page", error);
      return true;
    }
  }
};
var LinkedInJobSearch_default = LinkedInJobSearch;

// src/linkedin/LinkedInJobInteraction.js
var LinkedInJobInteraction = class extends LinkedInBase_default {
  static async getJobClickableElement(job) {
    try {
      await this.wait();
      const clickableElement = job.querySelector("a");
      if (clickableElement) {
        return clickableElement;
      } else {
        this.debugLog("Could not find clickable element for job");
        return null;
      }
    } catch (error) {
      this.errorLog("Error fetching clickable element", error);
      return null;
    }
  }
  static async scrollDownToLoadNextJob(job) {
    try {
      await this.wait();
      job.scrollIntoView({ behavior: "smooth", block: "center" });
      this.debugLog("Scrolled down to load next job");
    } catch (error) {
      this.errorLog("Error scrolling down to load next job", error);
    }
  }
  static async clickOnJob(jobElement) {
    try {
      jobElement.click();
      this.debugLog("Clicked on job element");
    } catch (error) {
      this.debugLog("Could not click on job element", error);
    }
  }
  static async isEasyButtonAvailable() {
    try {
      const applyButton = document.querySelector(".jobs-s-apply button");
      if (applyButton) {
        this.debugLog("found easy apply button");
        return true;
      } else {
        this.debugLog("easy apply button not found");
        return false;
      }
    } catch (error) {
      console.error("easy apply button not found error", error);
      return false;
    }
  }
  static async clickEasyApply() {
    try {
      const applyButton = document.querySelector(".jobs-s-apply button");
      if (applyButton) {
        applyButton.click();
        this.debugLog("Clicked on easy apply button");
        return true;
      }
      throw new Error("Easy apply button not found");
    } catch (error) {
      this.errorLog("Error clicking on easy apply button", error);
      throw error;
    }
  }
};
var LinkedInJobInteraction_default = LinkedInJobInteraction;

// src/linkedin/LinkedInJobInfo.js
var LinkedInJobInfo = class extends LinkedInBase_default {
  static async getJobId() {
    try {
      const jobId = new URLSearchParams(window.location.search).get("currentJobId");
      if (!jobId) {
        this.debugLog("Job ID not found in URL");
        return null;
      }
      this.debugLog("Found job ID: ".concat(jobId));
      return jobId;
    } catch (error) {
      this.errorLog("Error getting job ID", error);
      return null;
    }
  }
  static async getJobTitle() {
    try {
      const titleElement = document.querySelector(".job-details-jobs-unified-top-card__job-title h1");
      if (titleElement) {
        const title = titleElement.textContent.trim();
        this.debugLog("Found job title: ".concat(title));
        return title;
      }
      this.debugLog("Job title not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting job title", error);
      return null;
    }
  }
  static async getCompanyName() {
    try {
      const companyElement = document.querySelector(".job-details-jobs-unified-top-card__company-name a");
      if (companyElement) {
        const companyName = companyElement.textContent.trim();
        this.debugLog("Found company name: ".concat(companyName));
        return companyName;
      }
      this.debugLog("Company name not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting company name", error);
      return null;
    }
  }
  static async getLocation() {
    try {
      const locationElement = document.querySelector(".job-details-jobs-unified-top-card__tertiary-description-container .tvm__text");
      if (locationElement) {
        const location = locationElement.textContent.trim();
        this.debugLog("Found location: ".concat(location));
        return location;
      }
      this.debugLog("Location not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting location", error);
      return null;
    }
  }
  static async getJobType() {
    try {
      const pills = document.querySelectorAll("button.job-details-preferences-and-skills .job-details-preferences-and-skills__pill");
      if (pills.length > 1) {
        const jobTypePill = pills[1];
        const spans = jobTypePill.querySelectorAll("span");
        if (spans.length > 0) {
          const innerSpans = spans[0].querySelectorAll("span");
          if (innerSpans.length > 0) {
            const jobType = innerSpans[0].textContent.trim();
            if (jobType) {
              this.debugLog("Found jobType type: ".concat(jobType));
              return jobType;
            }
          }
        }
      }
      this.debugLog("jobType type not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting jobType type", error);
      return null;
    }
  }
  static async getRemoteType() {
    try {
      const pills = document.querySelectorAll("button.job-details-preferences-and-skills .job-details-preferences-and-skills__pill");
      if (pills.length > 0) {
        const remoteTypePill = pills[0];
        const spans = remoteTypePill.querySelectorAll("span");
        if (spans.length > 0) {
          const innerSpans = spans[0].querySelectorAll("span");
          if (innerSpans.length > 0) {
            const remote = innerSpans[0].textContent.trim();
            if (remote) {
              this.debugLog("Found remote type: ".concat(remote));
              return remote;
            }
          }
        }
      }
      this.debugLog("Remote type not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting remote type", error);
      return null;
    }
  }
  static async getJobDescription() {
    try {
      const descriptionElement = document.querySelector(".jobs-description__content");
      if (descriptionElement) {
        const description = descriptionElement.textContent.trim();
        this.debugLog("Found job description");
        return description;
      }
      this.debugLog("Job description not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting job description", error);
      return null;
    }
  }
  static async getApplicantCount() {
    try {
      const elements = document.querySelectorAll(".job-details-jobs-unified-top-card__tertiary-description-container .tvm__text");
      const applicantElement = elements.length > 0 ? elements[elements.length - 1] : null;
      if (applicantElement) {
        const count = applicantElement.textContent.trim();
        this.debugLog("Found applicant count: ".concat(count));
        return count;
      }
      this.debugLog("Applicant count not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting applicant count", error);
      return null;
    }
  }
  static async getPostedDate() {
    try {
      const applicantElement = document.querySelectorAll(".job-details-jobs-unified-top-card__tertiary-description-container .tvm__text")[2];
      if (applicantElement) {
        const count = applicantElement.textContent.trim();
        this.debugLog("Found posted date: ".concat(count));
        return count;
      }
      this.debugLog("posted date not found");
      return null;
    } catch (error) {
      this.errorLog("Error getting applicant count", error);
      return null;
    }
  }
  static async getAllJobInfo() {
    try {
      const jobInfo = {
        jobId: await this.getJobId(),
        title: await this.getJobTitle(),
        company: await this.getCompanyName(),
        location: await this.getLocation(),
        jobType: await this.getJobType(),
        remoteType: await this.getRemoteType(),
        description: await this.getJobDescription(),
        applicantCount: await this.getApplicantCount(),
        postedDate: await this.getPostedDate()
      };
      this.debugLog("Retrieved all job information");
      return jobInfo;
    } catch (error) {
      this.errorLog("Error getting all job information", error);
      return null;
    }
  }
};
var LinkedInJobInfo_default = LinkedInJobInfo;

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
  async callAIWithStop(requestData, shouldStop2 = null) {
    try {
      const provider = this.getProvider();
      if (provider === "ollama") {
        const model = this.getModel();
        const requestBody = __spreadProps(__spreadValues({}, requestData), {
          model
        });
        return new Promise((resolve, reject) => {
          let stopCheckInterval = null;
          if (shouldStop2) {
            stopCheckInterval = setInterval(async () => {
              try {
                let stopRequested = false;
                if (typeof shouldStop2 === "function") {
                  stopRequested = await shouldStop2();
                } else if (shouldStop2 && shouldStop2.value !== void 0) {
                  stopRequested = shouldStop2.value;
                } else {
                  stopRequested = !!shouldStop2;
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
          if (shouldStop2) {
            stopCheckInterval = setInterval(async () => {
              try {
                let stopRequested = false;
                if (typeof shouldStop2 === "function") {
                  stopRequested = await shouldStop2();
                } else if (shouldStop2 && shouldStop2.value !== void 0) {
                  stopRequested = shouldStop2.value;
                } else {
                  stopRequested = !!shouldStop2;
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
  async answerQuestion(question, options = null, shouldStop2 = null, resumeId = null) {
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
      if (shouldStop2) {
        let stopRequested = false;
        if (typeof shouldStop2 === "function") {
          stopRequested = await shouldStop2();
        } else if (shouldStop2 && shouldStop2.value !== void 0) {
          stopRequested = shouldStop2.value;
        } else {
          stopRequested = !!shouldStop2;
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
      }, shouldStop2);
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

// src/linkedin/ApplicationTracker.js
var ApplicationTracker = class extends LinkedInBase_default {
  constructor() {
    super();
    this.currentApplication = null;
    this.questionsAnswers = [];
  }
  // Ensure error logging methods are available
  debugLog(message) {
    console.log("[ApplicationTracker] ".concat(message));
  }
  errorLog(message, error) {
    console.error("[ApplicationTracker] ".concat(message, ":"), error);
  }
  /**
   * Start tracking a new application
   * @param {Object} jobInfo - Job information from LinkedIn
   * @param {Object} userData - Current user data
   * @param {Object} aiSettings - AI settings used
   * @param {string} resumeId - Resume ID used for application
   */
  async startApplication(jobInfo, userData, aiSettings, resumeId) {
    try {
      this.debugLog("Starting application tracking...");
      const company = await this.createOrFindCompany(jobInfo);
      const job = await this.createOrFindJob(jobInfo, company.id);
      this.currentApplication = await this.createApplication({
        user_id: userData.id,
        job_id: job.id,
        ai_settings_id: aiSettings.id,
        resume_id: resumeId,
        status: "applied",
        notes: "Applied via EasyJob extension"
      });
      this.questionsAnswers = [];
      this.debugLog("Application tracking started: ".concat(this.currentApplication.id));
      return this.currentApplication;
    } catch (error) {
      this.errorLog("Error starting application tracking:", error);
      throw error;
    }
  }
  /**
   * Create or find company in database
   * @param {Object} jobInfo - Job information
   * @returns {Object} Company object
   */
  async createOrFindCompany(jobInfo) {
    try {
      this.debugLog("Creating/finding company for job info:", jobInfo);
      if (!jobInfo.company) {
        throw new Error("Company name is required");
      }
      const existingCompany = await this.findCompanyByName(jobInfo.company);
      if (existingCompany) {
        this.debugLog("Found existing company: ".concat(existingCompany.name));
        return existingCompany;
      }
      const companyData = {
        name: jobInfo.company,
        industry: null,
        // Could be extracted from job description later
        size: null,
        location: jobInfo.location,
        website: null,
        linkedin_url: null
      };
      this.debugLog("Creating new company with data:", companyData);
      const newCompany = await this.createCompany(companyData);
      this.debugLog("Created new company: ".concat(newCompany.name));
      return newCompany;
    } catch (error) {
      this.errorLog("Error creating/finding company:", error);
      throw error;
    }
  }
  /**
   * Create or find job in database
   * @param {Object} jobInfo - Job information
   * @param {string} companyId - Company ID
   * @returns {Object} Job object
   */
  async createOrFindJob(jobInfo, companyId) {
    var _a;
    try {
      if (!jobInfo.title) {
        throw new Error("Job title is required");
      }
      if (jobInfo.jobId) {
        const existingJob = await this.findJobByPlatformId("linkedin", jobInfo.jobId);
        if (existingJob) {
          this.debugLog("Found existing job: ".concat(existingJob.title));
          return existingJob;
        }
      }
      const newJob = await this.createJob({
        company_id: companyId,
        title: jobInfo.title,
        location: jobInfo.location,
        is_remote: ((_a = jobInfo.remoteType) == null ? void 0 : _a.toLowerCase().includes("remote")) || false,
        job_type: this.normalizeJobType(jobInfo.jobType),
        platform: "linkedin",
        platform_job_id: jobInfo.jobId,
        job_url: window.location.href,
        job_description: jobInfo.description,
        applicant_count: this.parseApplicantCount(jobInfo.applicantCount),
        posted_date: this.parsePostedDate(jobInfo.postedDate),
        status: "active"
      });
      this.debugLog("Created new job: ".concat(newJob.title));
      return newJob;
    } catch (error) {
      this.errorLog("Error creating/finding job:", error);
      throw error;
    }
  }
  /**
   * Create application in database
   * @param {Object} applicationData - Application data
   * @returns {Object} Application object
   */
  async createApplication(applicationData) {
    try {
      this.debugLog("Creating application with data:", applicationData);
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "POST",
        url: "/api/applications",
        data: applicationData
      });
      this.debugLog("Application creation response:", response);
      if (response && response.success) {
        this.debugLog("Application created: ".concat(response.application.id));
        return response.application;
      } else {
        this.debugLog("Failed to create application: ".concat(response == null ? void 0 : response.error));
        throw new Error((response == null ? void 0 : response.error) || "Failed to create application");
      }
    } catch (error) {
      this.errorLog("Error creating application:", error);
      throw error;
    }
  }
  /**
   * Add a question and answer to the current application
   * @param {string} question - The question text
   * @param {string} answer - The AI-generated answer
   * @param {string} questionType - Type of question
   * @param {string} aiModel - AI model used
   * @param {boolean} isSkipped - Whether question was skipped
   */
  async addQuestionAnswer(question, answer, questionType, aiModel, isSkipped = false) {
    try {
      if (!this.currentApplication) {
        this.debugLog("No current application, skipping question/answer save");
        return;
      }
      if (!question || !answer) {
        this.debugLog("Invalid question or answer, skipping save");
        return;
      }
      const qaData = {
        application_id: this.currentApplication.id,
        question,
        answer,
        question_type: questionType || "general",
        ai_model_used: aiModel || "unknown",
        confidence_score: 0.95,
        // Default confidence
        is_skipped: isSkipped
      };
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "POST",
        url: "/api/questions-answers",
        data: qaData
      });
      if (response && response.success) {
        this.questionsAnswers.push(response.question_answer);
        this.debugLog("Question/answer saved: ".concat(response.question_answer.id));
      } else {
        this.debugLog("Failed to save question/answer: ".concat(response == null ? void 0 : response.error));
      }
    } catch (error) {
      this.errorLog("Error adding question/answer:", error);
    }
  }
  /**
   * Update application status
   * @param {string} status - New status
   * @param {string} notes - Optional notes
   */
  async updateApplicationStatus(status, notes = null) {
    try {
      if (!this.currentApplication) {
        this.debugLog("No current application to update");
        return;
      }
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "PUT",
        url: "/api/applications/".concat(this.currentApplication.id, "/status"),
        data: { status, notes }
      });
      if (response && response.success) {
        this.currentApplication = response.application;
        this.debugLog("Application status updated to: ".concat(status));
      } else {
        this.debugLog("Failed to update application status: ".concat(response == null ? void 0 : response.error));
      }
    } catch (error) {
      this.errorLog("Error updating application status:", error);
    }
  }
  /**
   * Complete the application tracking
   * @param {boolean} success - Whether application was successful
   */
  async completeApplication(success = true) {
    try {
      if (!this.currentApplication) {
        this.debugLog("No current application to complete");
        return;
      }
      const status = success ? "applied" : "failed";
      const notes = success ? "Application submitted successfully" : "Application failed or was cancelled";
      await this.updateApplicationStatus(status, notes);
      this.debugLog("Application tracking completed: ".concat(status));
      this.currentApplication = null;
      this.questionsAnswers = [];
    } catch (error) {
      this.errorLog("Error completing application:", error);
    }
  }
  // Helper methods for API calls
  async findCompanyByName(name) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "GET",
        url: "/companies/search?name=".concat(encodeURIComponent(name))
      });
      return (response == null ? void 0 : response.success) ? response.company : null;
    } catch (error) {
      this.debugLog("Error finding company:", error);
      return null;
    }
  }
  async createCompany(companyData) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "POST",
        url: "/api/companies",
        data: companyData
      });
      return (response == null ? void 0 : response.success) ? response.company : null;
    } catch (error) {
      this.errorLog("Error creating company:", error);
      throw error;
    }
  }
  async findJobByPlatformId(platform, platformJobId) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "GET",
        url: "/jobs/platform/".concat(platform, "/").concat(platformJobId)
      });
      return (response == null ? void 0 : response.success) ? response.job : null;
    } catch (error) {
      this.debugLog("Error finding job:", error);
      return null;
    }
  }
  async createJob(jobData) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "apiRequest",
        method: "POST",
        url: "/api/jobs",
        data: jobData
      });
      return (response == null ? void 0 : response.success) ? response.job : null;
    } catch (error) {
      this.errorLog("Error creating job:", error);
      throw error;
    }
  }
  // Utility methods
  normalizeJobType(jobType) {
    if (!jobType) return "full-time";
    const type = jobType.toLowerCase();
    if (type.includes("full")) return "full-time";
    if (type.includes("part")) return "part-time";
    if (type.includes("contract")) return "contract";
    if (type.includes("intern")) return "internship";
    return "full-time";
  }
  parseApplicantCount(countText) {
    if (!countText) return 0;
    const match = countText.match(/(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }
  parsePostedDate(dateText) {
    if (!dateText) return /* @__PURE__ */ new Date();
    const now = /* @__PURE__ */ new Date();
    if (dateText.includes("today")) return now;
    if (dateText.includes("yesterday")) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    const daysMatch = dateText.match(/(\d+)\s*days?\s*ago/);
    if (daysMatch) {
      const days = parseInt(daysMatch[1]);
      const pastDate = new Date(now);
      pastDate.setDate(pastDate.getDate() - days);
      return pastDate;
    }
    return now;
  }
  /**
   * Get current application data
   * @returns {Object} Current application and questions/answers
   */
  getCurrentApplicationData() {
    return {
      application: this.currentApplication,
      questionsAnswers: this.questionsAnswers
    };
  }
};
var applicationTracker = new ApplicationTracker();
var ApplicationTracker_default = applicationTracker;

// src/linkedin/LinkedInForm.js
var LinkedInForm = class extends LinkedInBase_default {
  static async closeForm(save = false) {
    var _a, _b;
    try {
      let closeButton = document.querySelector('button[aria-label="Dismiss"]');
      if (!closeButton) {
        closeButton = document.querySelector('button[aria-label="Close"]') || document.querySelector('button[aria-label="Cancel"]') || document.querySelector("button[data-test-modal-close-btn]");
      }
      if (closeButton) {
        closeButton.click();
        await this.wait();
        if (save) {
          const saveButton = document.querySelector('button[data-control-name="save_application_btn"]');
          if (saveButton) {
            saveButton.click();
            this.debugLog("Closed form and saved application");
          }
        } else {
          const discardButton = document.querySelector('button[data-control-name="discard_application_confirm_btn"]') || document.querySelector("button[data-test-dialog-secondary-btn]");
          if (discardButton) {
            discardButton.click();
            this.debugLog("Closed form and discarded application");
          }
        }
        await this.wait();
      }
    } catch (error) {
      this.errorLog("Error closing form", error);
      try {
        const allCloseButtons = document.querySelectorAll("button");
        for (const button of allCloseButtons) {
          if (button.textContent.toLowerCase().includes("close") || button.textContent.toLowerCase().includes("cancel") || ((_a = button.getAttribute("aria-label")) == null ? void 0 : _a.toLowerCase().includes("close")) || ((_b = button.getAttribute("aria-label")) == null ? void 0 : _b.toLowerCase().includes("dismiss"))) {
            button.click();
            await this.wait(500);
          }
        }
      } catch (finalError) {
        this.errorLog("Failed final attempt to close form", finalError);
      }
    }
  }
  static async clickNextPage() {
    try {
      await this.wait();
      const nextPageButton = document.querySelector('button[aria-label="Continue to next step"]');
      if (nextPageButton) {
        nextPageButton.click();
        this.debugLog("Clicked on next page button");
      }
    } catch (error) {
      this.errorLog("Error clicking on next page button", error);
    }
  }
  static async clickPreviousPage() {
    try {
      await this.wait();
      const previousPageButton = document.querySelector('button[aria-label="Back to previous step"]');
      if (previousPageButton) {
        previousPageButton.click();
        this.debugLog("Clicked on previous page button");
      }
    } catch (error) {
      this.errorLog("Error clicking on previous page button", error);
    }
  }
  static async clickReviewApplication() {
    try {
      await this.wait();
      const reviewButton = document.querySelector('button[aria-label="Review your application"]');
      if (reviewButton) {
        reviewButton.click();
        this.debugLog("Clicked on review button");
      }
    } catch (error) {
      this.errorLog("Error clicking on review button", error);
    }
  }
  static async clickSubmitApplication() {
    try {
      await this.wait();
      const submitButton = document.querySelector('button[aria-label="Submit application"]');
      if (submitButton) {
        submitButton.click();
        this.debugLog("Clicked on submit button");
      }
    } catch (error) {
      this.errorLog("Error clicking on submit button", error);
    }
  }
  static async clickDoneAfterSubmit() {
    try {
      let doneButton = document.querySelector('button[aria-label="Done"]');
      if (!doneButton) {
        doneButton = document.querySelector("button.artdeco-button span.artdeco-button__text");
        this.debugLog("Found done button", doneButton);
      }
      if (doneButton) {
        doneButton.click();
        this.debugLog("Clicked on Done button");
      } else {
        this.debugLog("Done button not found");
      }
    } catch (error) {
      this.errorLog("Error clicking on Done button", error);
    }
  }
  static async clickDismissAfterSubmit() {
    try {
      let dismissButton = document.querySelector('button[aria-label="Dismiss"]');
      if (!dismissButton) {
        dismissButton = document.querySelector("button[data-test-modal-close-btn]");
      }
      if (!dismissButton) {
        const buttons = document.querySelectorAll("button.artdeco-button--circle.artdeco-modal__dismiss");
        for (const button of buttons) {
          if (button.querySelector('svg use[href="#close-medium"]')) {
            dismissButton = button;
            break;
          }
        }
      }
      if (dismissButton) {
        dismissButton.click();
        this.debugLog("Clicked on Dismiss button");
      } else {
        this.debugLog("Dismiss button not found");
      }
    } catch (error) {
      this.errorLog("Error clicking on Dismiss button", error);
    }
  }
  static async findReviewButton() {
    try {
      const reviewButton = document.querySelector('button[aria-label="Review your application"]');
      return reviewButton;
    } catch (error) {
      this.errorLog("Error finding review button", error);
      return null;
    }
  }
  static async findNextButton() {
    try {
      const nextButton = document.querySelector('button[aria-label="Continue to next step"]');
      return nextButton;
    } catch (error) {
      this.errorLog("Error finding next button", error);
      return null;
    }
  }
  static async findSubmitButton() {
    try {
      const submitButton = document.querySelector('button[aria-label="Submit application"]');
      return submitButton;
    } catch (error) {
      this.errorLog("Error finding submit button", error);
      return null;
    }
  }
  static async findDoneButton() {
    try {
      let doneButton = document.querySelector('button[aria-label="Done"]');
      if (!doneButton) {
        const buttons = document.querySelectorAll("button.artdeco-button");
        for (const button of buttons) {
          const spanText = button.querySelector("span.artdeco-button__text");
          if (spanText && spanText.textContent.trim() === "Done") {
            doneButton = button;
            break;
          }
        }
      }
      return doneButton;
    } catch (error) {
      this.errorLog("Error finding done button", error);
      return null;
    }
  }
  static async processForm(shouldStop2) {
    try {
      this.debugLog("=== FORM PROCESSING STARTED ===");
      this.debugLog("Starting form processing");
      this.debugLog("About to call startApplicationTracking...");
      await this.startApplicationTracking();
      this.debugLog("startApplicationTracking completed");
      const formTimeout = setTimeout(async () => {
        this.debugLog("Form processing timeout reached");
      }, 3 * 60 * 1e3);
      let currentPageProcessed = false;
      let stopRequested = false;
      while (!stopRequested) {
        if (typeof shouldStop2 === "function") {
          stopRequested = await shouldStop2();
        } else if (shouldStop2 && shouldStop2.value !== void 0) {
          stopRequested = shouldStop2.value;
        } else {
          stopRequested = !!shouldStop2;
        }
        if (stopRequested) {
          this.debugLog("Stop requested during form processing");
          break;
        }
        try {
          const reviewButton = await this.findReviewButton();
          if (reviewButton) {
            this.debugLog("Found review button");
            const reviewTimeout = setTimeout(() => {
              this.debugLog("Review processing timeout reached");
              shouldStop2.value = true;
            }, 1 * 60 * 1e3);
            const formElements2 = document.querySelectorAll("div.fb-dash-form-element");
            if (formElements2.length > 0 && !currentPageProcessed) {
              this.debugLog("Found questions on current page, processing before review");
              const result = await this.processFormQuestions(shouldStop2);
              if (result.stopped) {
                this.debugLog("Form questions processing stopped by user");
                break;
              }
              if (!result.success) {
                this.debugLog("Form questions processing failed");
              }
              currentPageProcessed = true;
              this.debugLog("Current page form questions processed, will not reprocess");
            } else if (currentPageProcessed) {
              this.debugLog("Skipping redundant form processing for current page");
            } else {
              this.debugLog("No form questions found on current page");
            }
            await this.clickReviewApplication();
            await this.wait(2e3);
            if (typeof shouldStop2 === "function") {
              stopRequested = await shouldStop2();
            } else if (shouldStop2 && shouldStop2.value !== void 0) {
              stopRequested = shouldStop2.value;
            } else {
              stopRequested = !!shouldStop2;
            }
            if (stopRequested) {
              this.debugLog("Stop requested after clicking review");
              break;
            }
            const reviewFormElements = document.querySelectorAll("div.fb-dash-form-element");
            if (reviewFormElements.length > 0) {
              this.debugLog("Found questions on review page");
              const result = await this.processFormQuestions(shouldStop2);
              if (result.stopped) {
                this.debugLog("Review questions processing stopped by user");
                break;
              }
              if (!result.success) {
                this.debugLog("Review questions processing failed");
              }
            } else {
              this.debugLog("No questions found on review page");
            }
            await this.clickSubmitApplication();
            await this.wait(2e3);
            await this.clickDismissAfterSubmit();
            await ApplicationTracker_default.completeApplication(true);
            this.debugLog("Clicked submit button after review");
            clearTimeout(reviewTimeout);
            break;
          }
          const formElements = document.querySelectorAll("div.fb-dash-form-element");
          if (formElements.length > 0 && !currentPageProcessed) {
            this.debugLog("Found form questions, processing...");
            const result = await this.processFormQuestions(shouldStop2);
            if (result.stopped) {
              this.debugLog("Form questions processing stopped by user");
              break;
            }
            if (!result.success) {
              this.debugLog("Form questions processing failed");
            }
            currentPageProcessed = true;
            this.debugLog("Form questions processed");
          }
          const nextButton = await this.findNextButton();
          if (nextButton) {
            this.debugLog("Found next button, moving to next page");
            await this.clickNextPage();
            await this.wait(2e3);
            if (typeof shouldStop2 === "function") {
              stopRequested = await shouldStop2();
            } else if (shouldStop2 && shouldStop2.value !== void 0) {
              stopRequested = shouldStop2.value;
            } else {
              stopRequested = !!shouldStop2;
            }
            if (stopRequested) {
              this.debugLog("Stop requested after navigation");
              break;
            }
            currentPageProcessed = false;
            continue;
          }
          const submitButton = await this.findSubmitButton();
          if (submitButton) {
            this.debugLog("Found submit button, submitting application");
            if (typeof shouldStop2 === "function") {
              stopRequested = await shouldStop2();
            } else if (shouldStop2 && shouldStop2.value !== void 0) {
              stopRequested = shouldStop2.value;
            } else {
              stopRequested = !!shouldStop2;
            }
            if (stopRequested) {
              this.debugLog("Stop requested before final submit");
              break;
            }
            await this.clickSubmitApplication();
            await this.wait(2e3);
            await this.clickDismissAfterSubmit();
            await ApplicationTracker_default.completeApplication(true);
            break;
          }
          this.debugLog("No navigation buttons found, waiting...");
          await this.wait(1e3);
        } catch (error) {
          this.errorLog("Error in form processing loop", error);
          await this.wait(2e3);
        }
      }
      clearTimeout(formTimeout);
      this.debugLog("Form processing completed");
      return true;
    } catch (error) {
      this.errorLog("Error processing form", error);
      return false;
    }
  }
  /**
   * Start application tracking for the current job
   */
  static async startApplicationTracking() {
    try {
      this.debugLog("=== STARTING APPLICATION TRACKING ===");
      const jobResult = await chrome.storage.local.get(["currentJob"]);
      this.debugLog("Job result:", jobResult);
      if (!jobResult.currentJob) {
        this.debugLog("No current job found, skipping application tracking");
        return;
      }
      const userResult = await chrome.storage.local.get(["currentUser"]);
      this.debugLog("User result:", userResult);
      if (!userResult.currentUser) {
        this.debugLog("No current user found, skipping application tracking");
        return;
      }
      const aiSettings = window.currentAiSettings;
      this.debugLog("AI settings from window:", aiSettings);
      if (!aiSettings) {
        this.debugLog("No AI settings found, skipping application tracking");
        return;
      }
      const resumeResult = await chrome.storage.local.get(["currentResumeId"]);
      this.debugLog("Resume result:", resumeResult);
      if (!resumeResult.currentResumeId) {
        this.debugLog("No current resume ID found, skipping application tracking");
        return;
      }
      this.debugLog("All data found, starting application tracking...");
      this.debugLog("Job info:", jobResult.currentJob);
      this.debugLog("User data:", userResult.currentUser);
      this.debugLog("AI settings:", aiSettings);
      this.debugLog("Resume ID:", resumeResult.currentResumeId);
      await ApplicationTracker_default.startApplication(
        jobResult.currentJob,
        userResult.currentUser,
        aiSettings,
        resumeResult.currentResumeId
      );
      this.debugLog("Application tracking started successfully");
    } catch (error) {
      this.errorLog("Error starting application tracking:", error);
    }
  }
  /**
   * Check if a question should be skipped because it's already prefilled in LinkedIn
   * @param {string} questionText - The question text to check
   * @returns {boolean} - True if the question should be skipped
   */
  static shouldSkipQuestion(questionText) {
    const lowerQuestion = questionText.toLowerCase();
    return this.shouldSkipQuestionDirect(lowerQuestion);
  }
  /**
   * Comprehensive keyword matching for common languages
   * @param {string} lowerQuestion - Lowercase question text
   * @returns {boolean} - True if should skip
   */
  static shouldSkipQuestionDirect(lowerQuestion) {
    if (lowerQuestion.includes("email") || lowerQuestion.includes("e-mail") || lowerQuestion.includes("e-mail-adresse")) {
      return true;
    }
    const phoneTerms = [
      "phone",
      "mobile",
      "cell",
      "telephone",
      "handy",
      // English
      "telefon",
      "handynummer",
      "handynumer",
      "mobilnummer",
      "handy",
      // German (including typo)
      "tel\xE9fono",
      "m\xF3vil",
      "celular",
      "tel\xE9fono m\xF3vil",
      // Spanish
      "t\xE9l\xE9phone",
      "portable",
      "mobile",
      "t\xE9l\xE9phone portable",
      // French
      "telefono",
      "cellulare",
      "mobile",
      "telefono cellulare"
      // Italian
    ];
    if (phoneTerms.some((term) => lowerQuestion.includes(term))) {
      return true;
    }
    const codeTerms = [
      "country code",
      "area code",
      "phone prefix",
      "calling code",
      "prefix",
      // English
      "landsvorwahl",
      "vorwahl",
      "l\xE4ndercode",
      "vorwahl",
      // German
      "c\xF3digo de pa\xEDs",
      "c\xF3digo de \xE1rea",
      "prefijo",
      "c\xF3digo",
      // Spanish
      "indicatif pays",
      "indicatif",
      "pr\xE9fixe",
      "indicatif t\xE9l\xE9phonique",
      // French
      "prefisso",
      "codice paese",
      "prefisso telefonico"
      // Italian
    ];
    if (codeTerms.some((term) => lowerQuestion.includes(term))) {
      return true;
    }
    const contactTerms = [
      "contact information",
      "contact details",
      "contact",
      // English
      "kontaktinformation",
      "kontaktdaten",
      "kontakt",
      // German
      "informaci\xF3n de contacto",
      "datos de contacto",
      "contacto",
      // Spanish
      "coordonn\xE9es",
      "informations de contact",
      "contact",
      // French
      "informazioni di contatto",
      "dati di contatto",
      "contatto"
      // Italian
    ];
    if (contactTerms.some((term) => lowerQuestion.includes(term))) {
      return true;
    }
    const nameTerms = [
      "first name",
      "last name",
      "full name",
      "name",
      "given name",
      "family name",
      // English
      "vorname",
      "nachname",
      "vollst\xE4ndiger name",
      "name",
      "familienname",
      // German
      "nombre",
      "apellido",
      "nombre completo",
      "primer nombre",
      "segundo nombre",
      // Spanish
      "pr\xE9nom",
      "nom",
      "nom complet",
      "nom de famille",
      // French
      "nome",
      "cognome",
      "nome completo",
      "nome di battesimo"
      // Italian
    ];
    if (nameTerms.some((term) => lowerQuestion.includes(term))) {
      return true;
    }
    return false;
  }
  static async processFormQuestions(shouldStop2 = null) {
    try {
      this.debugLog("Processing form questions");
      const formElements = document.querySelectorAll("div.fb-dash-form-element");
      this.debugLog("Found ".concat(formElements.length, " form elements"));
      for (const element of formElements) {
        if (shouldStop2) {
          let stopRequested = false;
          if (typeof shouldStop2 === "function") {
            stopRequested = await shouldStop2();
          } else if (shouldStop2 && shouldStop2.value !== void 0) {
            stopRequested = shouldStop2.value;
          } else {
            stopRequested = !!shouldStop2;
          }
          if (stopRequested) {
            this.debugLog("Stop requested during form questions processing");
            return { stopped: true };
          }
        }
        try {
          const labelElement = element.querySelector("legend span.fb-dash-form-element__label span") || element.querySelector("label");
          if (!labelElement) {
            this.debugLog("No label found for form element");
            continue;
          }
          let questionText = labelElement.textContent.trim();
          questionText = questionText.replace(/(.+?)\1/, "$1");
          this.debugLog("Processing question: ".concat(questionText));
          if (this.shouldSkipQuestion(questionText)) {
            this.debugLog("Skipping prefilled question: ".concat(questionText));
            continue;
          }
          const inputField = element.querySelector("input, textarea, select");
          if (!inputField) {
            this.debugLog("No input field found for question");
            continue;
          }
          let options = [];
          switch (inputField.tagName.toLowerCase()) {
            case "input":
              if (inputField.type === "radio") {
                const radioOptions = element.querySelectorAll('input[type="radio"]');
                radioOptions.forEach((radio) => {
                  const radioLabel = element.querySelector('label[for="'.concat(radio.id, '"]'));
                  if (radioLabel) {
                    options.push(radioLabel.textContent.trim());
                  }
                });
              }
              break;
            case "select":
              options = Array.from(inputField.options).map((option) => option.text.trim());
              break;
          }
          if (options.length > 0) {
            this.debugLog('Available options for "'.concat(questionText, '":'));
          }
          const questionResult = await this.answerQuestion(questionText, options, inputField, element, shouldStop2);
          if (questionResult.stopped) {
            this.debugLog("Form questions processing stopped by user");
            return { stopped: true };
          }
          if (!questionResult.success) {
            this.debugLog("Failed to answer question: ".concat(questionText));
          }
        } catch (error) {
          this.errorLog("Error processing form element: ".concat(error.message), error);
        }
      }
      this.debugLog("Completed processing form questions");
      return { success: true };
    } catch (error) {
      this.errorLog("Error in processFormQuestions", error);
      return { success: false };
    }
  }
  static async answerQuestion(question, options = [], inputField, element, shouldStop2 = null) {
    var _a;
    try {
      let aiSettings = null;
      if (window.currentAiSettings) {
        aiSettings = window.currentAiSettings;
        this.debugLog("Using AI settings from current settings:", aiSettings);
      }
      let userId = null;
      try {
        const userResult = await chrome.storage.local.get(["currentUser"]);
        if (userResult.currentUser && userResult.currentUser.id) {
          userId = userResult.currentUser.id;
          this.debugLog("Using user ID: ".concat(userId));
        }
      } catch (error) {
        this.errorLog("Error getting current user:", error);
      }
      const ai = new AIQuestionAnswerer_default(userId);
      if (aiSettings) {
        const settings = {
          ai_provider: aiSettings.provider,
          ai_model: aiSettings.model,
          apiKey: aiSettings.apiKey,
          is_default: true
        };
        ai.aiSettingsManager.setSettings(settings);
        this.debugLog("Set AI settings directly: provider=".concat(settings.ai_provider, ", model=").concat(settings.ai_model));
      }
      this.debugLog("Answering question: ".concat(question));
      this.debugLog("Available options:", options);
      try {
        const result2 = await chrome.storage.local.get(["userResumeData", "userResumeText", "userResumeType"]);
        if (result2 && (result2.userResumeData || result2.userResumeText)) {
          this.debugLog("Found user resume data in storage");
          if (result2.userResumeData) {
            await ai.setUserContext(result2.userResumeData, result2.userResumeText);
            this.debugLog("Set structured user context in AI instance");
          } else {
            await ai.setUserContext(result2.userResumeText);
            this.debugLog("Set text user context in AI instance");
          }
        } else {
          this.debugLog("No user resume found in storage");
        }
      } catch (error) {
        this.errorLog("Error loading user resume from storage:", error);
      }
      let resumeId = null;
      try {
        this.debugLog("=== RESUME ID RETRIEVAL DEBUG ===");
        const resumeResult = await chrome.storage.local.get(["currentResumeId"]);
        this.debugLog("Resume result from storage:", resumeResult);
        if (resumeResult.currentResumeId) {
          resumeId = resumeResult.currentResumeId;
          this.debugLog("Using resume ID from storage: ".concat(resumeId));
        } else {
          this.debugLog("No resume ID in storage, fetching from database...");
          if (userId) {
            this.debugLog("Fetching default resume for user: ".concat(userId));
            const response = await chrome.runtime.sendMessage({
              action: "apiRequest",
              method: "GET",
              url: "/users/".concat(userId, "/resumes/default")
            });
            this.debugLog("Default resume API response:", response);
            this.debugLog("Response success:", response == null ? void 0 : response.success);
            this.debugLog("Response resume:", response == null ? void 0 : response.resume);
            this.debugLog("Response error:", response == null ? void 0 : response.error);
            if (response && response.success && response.resume) {
              resumeId = response.resume.id;
              this.debugLog("Got resume ID from database: ".concat(resumeId));
              await chrome.storage.local.set({ "currentResumeId": resumeId });
              this.debugLog("Stored resume ID in storage for future use");
            } else {
              this.debugLog("Failed to get default resume from database:", response);
              this.debugLog("Response details:", {
                success: response == null ? void 0 : response.success,
                error: response == null ? void 0 : response.error,
                status: response == null ? void 0 : response.status,
                message: response == null ? void 0 : response.message
              });
            }
          } else {
            this.debugLog("No user ID available for resume fetch");
          }
        }
      } catch (error) {
        this.errorLog("Error getting current resume ID:", error);
      }
      const result = await ai.answerQuestion(question, options, shouldStop2, resumeId);
      if (result.stopped) {
        this.debugLog("Question answering stopped by user");
        return { stopped: true };
      }
      if (!result.success || !result.answer) {
        this.debugLog("No answer generated for question");
        return { success: false };
      }
      const answer = result.answer;
      this.debugLog("AI Answer: ".concat(answer));
      try {
        const questionType = this.detectQuestionType(question);
        const aiModel = ((_a = window.currentAiSettings) == null ? void 0 : _a.model) || "unknown";
        const isSkipped = this.shouldSkipQuestion(question);
        await ApplicationTracker_default.addQuestionAnswer(
          question,
          answer,
          questionType,
          aiModel,
          isSkipped
        );
      } catch (error) {
        this.errorLog("Error tracking question/answer:", error);
      }
      switch (inputField.tagName.toLowerCase()) {
        case "input":
          switch (inputField.type) {
            case "text":
            case "tel":
            case "email":
              inputField.value = answer;
              inputField.dispatchEvent(new Event("input", { bubbles: true }));
              break;
            case "radio":
              const radioOptions = element.querySelectorAll('input[type="radio"]');
              for (const radio of radioOptions) {
                const radioLabel = element.querySelector('label[for="'.concat(radio.id, '"]'));
                if (radioLabel && radioLabel.textContent.trim() === answer) {
                  radio.click();
                  this.debugLog("Selected radio option: ".concat(answer));
                  break;
                }
              }
              break;
            case "checkbox":
              inputField.checked = true;
              inputField.dispatchEvent(new Event("change", { bubbles: true }));
              break;
          }
          break;
        case "textarea":
          inputField.value = answer;
          inputField.dispatchEvent(new Event("input", { bubbles: true }));
          break;
        case "select":
          for (let i = 0; i < inputField.options.length; i++) {
            if (inputField.options[i].text.trim() === answer) {
              inputField.selectedIndex = i;
              inputField.dispatchEvent(new Event("change", { bubbles: true }));
              this.debugLog("Selected option: ".concat(answer));
              break;
            }
          }
          break;
      }
      await this.wait(500);
      return { success: true };
    } catch (error) {
      this.errorLog('Error answering question "'.concat(question, '"'), error);
      return { success: false };
    }
  }
  /**
   * Detect question type for tracking purposes
   * @param {string} question - The question text
   * @returns {string} - Question type
   */
  static detectQuestionType(question) {
    const questionLower = question.toLowerCase();
    if (questionLower.includes("level of") || questionLower.includes("proficiency in") || questionLower.includes("fluent in")) {
      return "language_level";
    } else if (questionLower.includes("skill") || questionLower.includes("experience") || questionLower.includes("years") || questionLower.includes("technology") || questionLower.includes("programming") || questionLower.includes("language") || questionLower.includes("c++") || questionLower.includes("python") || questionLower.includes("java")) {
      return "skills";
    } else if (questionLower.includes("education") || questionLower.includes("degree") || questionLower.includes("study") || questionLower.includes("university") || questionLower.includes("college")) {
      return "education";
    } else if (questionLower.includes("language") || questionLower.includes("speak") || questionLower.includes("fluent")) {
      return "languages";
    } else if (questionLower.includes("notice") || questionLower.includes("period") || questionLower.includes("availability") || questionLower.includes("start date")) {
      return "notice";
    } else if (questionLower.includes("salary") || questionLower.includes("compensation") || questionLower.includes("pay")) {
      return "salary";
    } else if (questionLower.includes("visa") || questionLower.includes("citizenship") || questionLower.includes("work permit")) {
      return "visa";
    } else if (questionLower.includes("certification") || questionLower.includes("certificate")) {
      return "certifications";
    } else {
      return "general";
    }
  }
};
var LinkedInForm_default = LinkedInForm;

// src/utils.js
var DEBUG = true;
function debugLog(message, data = null) {
  if (!DEBUG) return;
  const timestamp = (/* @__PURE__ */ new Date()).toISOString().split("T")[1];
  const logMessage = "[EasyJob Debug ".concat(timestamp, "] ").concat(message);
  if (data) {
    console.log(logMessage, data);
  } else {
    console.log(logMessage);
  }
}
function sendStatusUpdate(text, status = "info") {
  debugLog("Status Update: ".concat(status, " - ").concat(text));
  chrome.runtime.sendMessage({
    action: "STATUS_UPDATE",
    text,
    status
  });
}
async function shouldStop(isAutoApplyRunning2) {
  if (!isAutoApplyRunning2) {
    debugLog("Auto-apply process stopped by user (local check)");
    sendStatusUpdate("Auto-apply process stopped", "info");
    chrome.runtime.sendMessage({ action: "PROCESS_COMPLETE" });
    return true;
  }
  try {
    const response = await chrome.runtime.sendMessage({
      action: "getAutoApplyState"
    });
    if (response && response.success && !response.isRunning) {
      debugLog("Auto-apply process stopped by user (background check)");
      sendStatusUpdate("Auto-apply process stopped", "info");
      chrome.runtime.sendMessage({ action: "PROCESS_COMPLETE" });
      return true;
    }
  } catch (error) {
    debugLog("Failed to check background state, using local state", error);
  }
  return false;
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "START_AUTO_APPLY") {
    startAutoApplyProcess().then(() => {
      sendResponse({ success: true });
    }).catch((error) => {
      console.error("Error in auto-apply process:", error);
      sendResponse({ success: false, error: error.message });
    });
    return true;
  }
});

// src/linkedin/LinkedinJobPage.js
var LinkedInJobPage = class extends LinkedInBase_default {
  static async processJobPage(page, totalPages, searchElement, isAutoApplyRunning2) {
    this.debugLog("Processing page ".concat(page, "/").concat(totalPages));
    sendStatusUpdate("Processing page ".concat(page, " of ").concat(totalPages), "info");
    const jobs = await LinkedInJobSearch_default.getListOfJobsOnPage(searchElement);
    debugLog("Found ".concat(jobs.length, " jobs on page ").concat(page));
    for (const job of jobs) {
      if (await shouldStop(isAutoApplyRunning2)) {
        this.debugLog("Stop requested during job processing - breaking job loop");
        return false;
      }
      await LinkedInJob.processJob(job, isAutoApplyRunning2);
      if (await shouldStop(isAutoApplyRunning2)) {
        this.debugLog("Stop requested after job processing - breaking job loop");
        return false;
      }
    }
    if (page < totalPages) {
      debugLog("Finished processing page ".concat(page, ", navigating to next page..."));
      sendStatusUpdate("Moving to page ".concat(page + 1, " of ").concat(totalPages, "..."), "info");
      const nextPageSuccess = await LinkedInJobSearch_default.goToNextPage();
      if (!nextPageSuccess) {
        debugLog("Failed to navigate to next page or reached last page");
        const isLastPage = await LinkedInJobSearch_default.isOnLastPage();
        if (isLastPage) {
          debugLog("Confirmed: reached the last page");
          sendStatusUpdate("Reached the last page of results", "info");
        } else {
          debugLog("Navigation failed but not on last page - stopping process");
          sendStatusUpdate("Failed to navigate to next page - stopping", "error");
        }
        return false;
      } else {
        debugLog("Successfully navigated to page ".concat(page + 1));
      }
    } else {
      debugLog("Finished processing last page (".concat(page, "/").concat(totalPages, ")"));
    }
    return true;
  }
};
var LinkedInJob = class extends LinkedInBase_default {
  static async processJob(job, isAutoApplyRunning2) {
    try {
      const clickableElement = await LinkedInJobInteraction_default.getJobClickableElement(job);
      await LinkedInJobInteraction_default.clickOnJob(clickableElement);
      debugLog("Clicked on job");
      await LinkedInJobInteraction_default.scrollDownToLoadNextJob(job);
      debugLog("Scrolled to job");
      if (await shouldStop(isAutoApplyRunning2)) return;
      const isNotApplied = await LinkedInJobInteraction_default.isEasyButtonAvailable();
      debugLog("Is Easy Apply button available:", isNotApplied);
      if (!isNotApplied) {
        debugLog("Job already applied. Skipping...");
        sendStatusUpdate("Job already applied. Skipping...", "info");
        return;
      }
      const jobInfo = await LinkedInJobInfo_default.getAllJobInfo();
      debugLog("Job info:", jobInfo);
      await chrome.storage.local.set({ "currentJob": jobInfo });
      if (window.currentUserData) {
        await chrome.storage.local.set({ "currentUser": window.currentUserData });
        debugLog("Stored current user data for application tracking");
      }
      try {
        debugLog("=== RESUME ID STORAGE DEBUG ===");
        const resumeResult = await chrome.storage.local.get(["currentResumeId"]);
        debugLog("Current resume result from storage:", resumeResult);
        if (!resumeResult.currentResumeId) {
          debugLog("No current resume ID found, fetching default resume...");
          if (window.currentUserData) {
            debugLog("User data available, fetching default resume...");
            const response = await chrome.runtime.sendMessage({
              action: "apiRequest",
              method: "GET",
              url: "/users/".concat(window.currentUserData.id, "/resumes/default")
            });
            debugLog("Default resume API response:", response);
            if (response && response.success && response.resume) {
              await chrome.storage.local.set({ "currentResumeId": response.resume.id });
              debugLog("Stored current resume ID: ".concat(response.resume.id));
            } else {
              debugLog("Failed to get default resume:", response);
            }
          } else {
            debugLog("No user data available for resume fetch");
          }
        } else {
          debugLog("Resume ID already exists: ".concat(resumeResult.currentResumeId));
        }
      } catch (error) {
        debugLog("Error storing resume ID:", error);
      }
      await LinkedInJobInteraction_default.clickEasyApply();
      debugLog("Attempted to click Easy Apply");
      await new Promise((resolve) => setTimeout(resolve, 2e3));
      if (await shouldStop(isAutoApplyRunning2)) {
        this.debugLog("Stop requested before form processing");
        return;
      }
      const shouldStopCallback = async () => {
        return await shouldStop(isAutoApplyRunning2);
      };
      await LinkedInForm_default.processForm(shouldStopCallback);
      debugLog("Processed application form");
      await chrome.storage.local.remove("currentJob");
      debugLog("Removed current job from storage");
    } catch (error) {
      console.error("Error processing job:", error);
      debugLog("Error processing job:", { error: error.message, stack: error.stack });
      sendStatusUpdate("Error processing job. Continuing to next one...", "error");
    }
  }
};
var LinkedinJobPage_default = LinkedInJobPage;

// src/content.js
var isAutoApplyRunning = false;
debugLog("Content script loaded and ready to receive messages");
debugLog("Current URL:", window.location.href);
debugLog("Document ready state:", document.readyState);
async function startAutoApply() {
  try {
    debugLog("Starting auto-apply process");
    debugLog("Current URL:", window.location.href);
    if (await shouldStop(isAutoApplyRunning)) return;
    const searchElement = document.querySelector(".scaffold-layout.jobs-search-two-pane__layout");
    debugLog("Search element found:", !!searchElement);
    if (!searchElement) {
      debugLog("Available elements on page:", {
        body: document.body.innerHTML.substring(0, 500) + "...",
        possibleSelectors: {
          scaffold: document.querySelector(".scaffold-layout"),
          jobsSearch: document.querySelector(".jobs-search-two-pane__layout"),
          anyJobsRelated: document.querySelectorAll('[class*="jobs-"]')
        }
      });
      sendStatusUpdate("Could not find jobs list. Please make sure you are on LinkedIn jobs page.", "error");
      return;
    }
    debugLog("Getting total jobs count");
    const totalJobs = await LinkedInJobSearch_default.getTotalJobsSearchCount(searchElement);
    debugLog("Total jobs found:", totalJobs);
    sendStatusUpdate("Found ".concat(totalJobs, " jobs to process"), "info");
    debugLog("Getting available pages");
    const totalPages = await LinkedInJobSearch_default.getAvailablePages(searchElement, totalJobs);
    debugLog("Total pages found:", totalPages);
    for (let page = 1; page <= totalPages; page++) {
      if (await shouldStop(isAutoApplyRunning)) return;
      const pageProcessed = await LinkedinJobPage_default.processJobPage(page, totalPages, searchElement, isAutoApplyRunning);
      if (pageProcessed === false) {
        debugLog("Page processing failed or reached end, stopping at page ".concat(page));
        break;
      }
    }
    if (!await shouldStop(isAutoApplyRunning)) {
      debugLog("Auto-apply process completed");
      sendStatusUpdate("Auto-apply process completed!", "success");
      chrome.runtime.sendMessage({ action: "PROCESS_COMPLETE" });
    }
  } catch (error) {
    console.error("Error in auto-apply process:", error);
    debugLog("Fatal error in auto-apply process:", { error: error.message, stack: error.stack });
    sendStatusUpdate("Error in auto-apply process", "error");
  }
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  try {
    debugLog("Received message in content script:", message);
    debugLog("Message sender:", sender);
    if (message.action === "startAutoApply") {
      if (!isAutoApplyRunning) {
        isAutoApplyRunning = true;
        debugLog("Starting auto-apply process with user data:", message.userData);
        debugLog("AI settings:", message.aiSettings);
        window.currentUserData = message.userData;
        window.currentAiSettings = message.aiSettings;
        debugLog("Content script: Received AI settings:", {
          provider: message.aiSettings.provider,
          model: message.aiSettings.model,
          hasApiKey: !!message.aiSettings.apiKey
        });
        startAutoApply();
        sendResponse({ success: true, message: "Auto apply started" });
      } else {
        sendResponse({ success: false, message: "Auto apply already running" });
      }
    } else if (message.action === "stopAutoApply") {
      debugLog("Stopping auto-apply process");
      isAutoApplyRunning = false;
      sendResponse({ success: true, message: "Auto apply stopped" });
    } else if (message.action === "GET_STATE") {
      debugLog("Getting current state");
      sendResponse({ isRunning: isAutoApplyRunning });
    } else {
      if (message.action === "START_AUTO_APPLY") {
        if (!isAutoApplyRunning) {
          isAutoApplyRunning = true;
          debugLog("Starting auto-apply process (legacy format)");
          startAutoApply();
          sendResponse({ success: true, message: "Auto apply started" });
        } else {
          sendResponse({ success: false, message: "Auto apply already running" });
        }
      } else if (message.action === "STOP_AUTO_APPLY") {
        debugLog("Stopping auto-apply process (legacy format)");
        isAutoApplyRunning = false;
        sendResponse({ success: true, message: "Auto apply stopped" });
      } else {
        debugLog("Unknown action received:", message.action);
        sendResponse({ success: false, message: "Unknown action" });
      }
    }
  } catch (error) {
    debugLog("Error handling message in content script:", error);
    sendResponse({ success: false, error: error.message });
  }
  return true;
});
//# sourceMappingURL=content.bundle.js.map
