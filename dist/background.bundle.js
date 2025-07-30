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

// src/background/managers/AutoApplyManager.js
var AutoApplyManager = class {
  constructor(backgroundManager2) {
    this.backgroundManager = backgroundManager2;
  }
  /**
   * Handle auto-apply related messages
   */
  async handleMessage(request, sendResponse) {
    const { action } = request;
    switch (action) {
      case "startAutoApply":
        await this.handleStartAutoApply(request, sendResponse);
        break;
      case "stopAutoApply":
        await this.handleStopAutoApply(request, sendResponse);
        break;
      case "getAutoApplyState":
        await this.handleGetAutoApplyState(request, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: "Unknown auto-apply action" });
    }
  }
  /**
   * Handle start auto apply
   */
  async handleStartAutoApply(request, sendResponse) {
    try {
      console.log("Starting auto apply with data:", request);
      if (!request.loginData || !request.loginData.username) {
        throw new Error("Login data required");
      }
      if (!request.aiSettings || !request.aiSettings.provider || !request.aiSettings.model) {
        throw new Error("AI settings required");
      }
      this.backgroundManager.setAutoApplyState({
        isRunning: true,
        userData: request.loginData,
        aiSettings: request.aiSettings
      });
      const aiManager2 = this.backgroundManager.getManager("ai");
      await aiManager2.testAiConnection(request.aiSettings);
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        if (!tabs[0].url.includes("linkedin.com")) {
          throw new Error("Please navigate to LinkedIn jobs page first");
        }
        chrome.tabs.sendMessage(tabId, {
          action: "startAutoApply",
          userData: request.loginData,
          aiSettings: request.aiSettings
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending message to content script:", chrome.runtime.lastError);
            sendResponse({
              success: false,
              error: "Failed to communicate with LinkedIn page. Please refresh the page and try again."
            });
          } else {
            console.log("Content script response:", response);
            sendResponse({ success: true, message: "Auto apply started successfully" });
          }
        });
      } else {
        throw new Error("No active tab found");
      }
    } catch (error) {
      console.error("Error starting auto apply:", error);
      this.backgroundManager.setAutoApplyState({ isRunning: false });
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle stop auto apply
   */
  async handleStopAutoApply(request, sendResponse) {
    try {
      console.log("Stopping auto apply");
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0) {
        const tabId = tabs[0].id;
        chrome.tabs.sendMessage(tabId, {
          action: "stopAutoApply"
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.error("Error sending stop message to content script:", chrome.runtime.lastError);
            this.backgroundManager.setAutoApplyState({ isRunning: false });
            sendResponse({ success: true, message: "Auto apply stopped (content script communication error)" });
          } else if (response && response.success) {
            console.log("Auto apply stopped successfully");
            this.backgroundManager.setAutoApplyState({ isRunning: false });
            sendResponse({ success: true, message: "Auto apply stopped" });
          } else {
            console.error("Content script failed to stop auto apply:", response == null ? void 0 : response.error);
            this.backgroundManager.setAutoApplyState({ isRunning: false });
            sendResponse({ success: true, message: "Auto apply stopped (with content script error)" });
          }
        });
      } else {
        this.backgroundManager.setAutoApplyState({ isRunning: false });
        sendResponse({ success: true, message: "Auto apply stopped (no active tab)" });
      }
    } catch (error) {
      console.error("Error stopping auto apply:", error);
      this.backgroundManager.setAutoApplyState({ isRunning: false });
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle get auto apply state
   */
  async handleGetAutoApplyState(request, sendResponse) {
    const state = this.backgroundManager.getAutoApplyState();
    sendResponse({
      success: true,
      isRunning: state.isRunning
    });
  }
};
var AutoApplyManager_default = AutoApplyManager;

// src/background/managers/UserManager.js
var UserManager = class {
  constructor(backgroundManager2) {
    this.backgroundManager = backgroundManager2;
    this.DATABASE_AVAILABLE = true;
    this.API_BASE_URL = "http://localhost:3001/api";
  }
  /**
   * Handle user-related messages
   */
  async handleMessage(request, sendResponse) {
    const { action } = request;
    switch (action) {
      case "registerUser":
        await this.handleUserRegistration(request, sendResponse);
        break;
      case "loginUser":
        await this.handleUserLogin(request, sendResponse);
        break;
      case "logoutUser":
        await this.handleUserLogout(request, sendResponse);
        break;
      case "getUserProfile":
        await this.handleGetUserProfile(request, sendResponse);
        break;
      case "updateUserProfile":
        await this.handleUpdateUserProfile(request, sendResponse);
        break;
      case "getCurrentUser":
        await this.handleGetCurrentUser(request, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: "Unknown user action" });
    }
  }
  /**
   * Handle user registration
   */
  async handleUserRegistration(request, sendResponse) {
    try {
      if (!this.DATABASE_AVAILABLE) {
        console.log("Database not available, using local storage fallback");
        const userData = request.userData;
        if (!userData || !userData.username || !userData.email || !userData.password) {
          throw new Error("Missing required user data (username, email, password)");
        }
        const existingUsers = await chrome.storage.local.get(["users"]) || { users: {} };
        if (existingUsers.users && existingUsers.users[userData.email]) {
          throw new Error("User with this email already exists");
        }
        const newUser = {
          id: "local_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
          username: userData.username,
          email: userData.email,
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_login: null,
          is_active: true
        };
        const users = existingUsers.users || {};
        users[userData.email] = __spreadProps(__spreadValues({}, newUser), {
          password_hash: "local_" + userData.password
          // Simple hash for demo
        });
        await chrome.storage.local.set({ users });
        this.backgroundManager.setAutoApplyState({ user: newUser });
        await chrome.storage.local.set({
          currentUser: newUser,
          isLoggedIn: true,
          userId: newUser.id
        });
        console.log("User registered successfully (local):", newUser.id);
        sendResponse({ success: true, user: newUser });
        return;
      }
      const response = await fetch("".concat(this.API_BASE_URL, "/users/register"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(request.userData)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }
      this.backgroundManager.setAutoApplyState({ user: result.user });
      await chrome.storage.local.set({
        currentUser: result.user,
        isLoggedIn: true,
        userId: result.user.id
      });
      console.log("User registered successfully (database):", result.user.id);
      sendResponse({ success: true, user: result.user });
    } catch (error) {
      console.error("Error registering user:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle user login
   */
  async handleUserLogin(request, sendResponse) {
    try {
      if (!this.DATABASE_AVAILABLE) {
        console.log("Database not available, using local storage fallback");
        const { email, password } = request;
        if (!email || !password) {
          throw new Error("Email and password are required");
        }
        const result2 = await chrome.storage.local.get(["users"]);
        const users = result2.users || {};
        const userData = users[email];
        if (!userData) {
          throw new Error("Invalid email or password");
        }
        if (userData.password_hash !== "local_" + password) {
          throw new Error("Invalid email or password");
        }
        const user = {
          id: userData.id,
          username: userData.username,
          email: userData.email,
          created_at: userData.created_at,
          updated_at: (/* @__PURE__ */ new Date()).toISOString(),
          last_login: (/* @__PURE__ */ new Date()).toISOString(),
          is_active: userData.is_active
        };
        users[email] = __spreadProps(__spreadValues({}, userData), { last_login: user.last_login });
        await chrome.storage.local.set({ users });
        this.backgroundManager.setAutoApplyState({ user });
        await chrome.storage.local.set({
          currentUser: user,
          isLoggedIn: true,
          userId: user.id
        });
        console.log("User logged in successfully (local):", user.id);
        sendResponse({ success: true, user });
        return;
      }
      const response = await fetch("".concat(this.API_BASE_URL, "/users/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: request.email, password: request.password })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Login failed");
      }
      this.backgroundManager.setAutoApplyState({ user: result.user });
      await chrome.storage.local.set({
        currentUser: result.user,
        isLoggedIn: true,
        userId: result.user.id
      });
      console.log("User logged in successfully (database):", result.user.id);
      sendResponse({ success: true, user: result.user });
    } catch (error) {
      console.error("Error logging in user:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle user logout
   */
  async handleUserLogout(request, sendResponse) {
    try {
      console.log("User logout");
      this.backgroundManager.setAutoApplyState({ user: null });
      await chrome.storage.local.remove(["currentUser", "isLoggedIn", "userId"]);
      console.log("User logged out successfully");
      sendResponse({ success: true });
    } catch (error) {
      console.error("Error logging out user:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle get user profile
   */
  async handleGetUserProfile(request, sendResponse) {
    try {
      if (!this.DATABASE_AVAILABLE) {
        const { userId: userId2 } = request;
        if (!userId2) {
          throw new Error("User ID is required");
        }
        const result2 = await chrome.storage.local.get(["currentUser"]);
        if (!result2.currentUser || result2.currentUser.id !== userId2) {
          throw new Error("User not found");
        }
        const profile = {
          profile: result2.currentUser,
          stats: {
            total_applications: "0",
            pending_applications: "0",
            interviews: "0",
            offers: "0",
            companies_applied_to: "0",
            questions_answered: "0"
          },
          resumes: [],
          aiSettings: []
        };
        sendResponse({ success: true, profile });
        return;
      }
      const { userId } = request;
      if (!userId) {
        throw new Error("User ID is required");
      }
      const response = await fetch("".concat(this.API_BASE_URL, "/users/").concat(userId, "/profile"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to get user profile");
      }
      sendResponse({ success: true, profile: result.profile });
    } catch (error) {
      console.error("Error getting user profile:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle update user profile
   */
  async handleUpdateUserProfile(request, sendResponse) {
    try {
      if (!this.DATABASE_AVAILABLE) {
        const { userId: userId2, updateData: updateData2 } = request;
        if (!userId2 || !updateData2) {
          throw new Error("User ID and update data are required");
        }
        const result2 = await chrome.storage.local.get(["currentUser"]);
        if (!result2.currentUser || result2.currentUser.id !== userId2) {
          throw new Error("User not found");
        }
        const updatedUser = __spreadProps(__spreadValues(__spreadValues({}, result2.currentUser), updateData2), {
          updated_at: (/* @__PURE__ */ new Date()).toISOString()
        });
        this.backgroundManager.setAutoApplyState({ user: updatedUser });
        await chrome.storage.local.set({ currentUser: updatedUser });
        sendResponse({ success: true, user: updatedUser });
        return;
      }
      const { userId, updateData } = request;
      if (!userId || !updateData) {
        throw new Error("User ID and update data are required");
      }
      const response = await fetch("".concat(this.API_BASE_URL, "/users/").concat(userId), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(updateData)
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to update user profile");
      }
      const currentState = this.backgroundManager.getAutoApplyState();
      if (currentState.user && currentState.user.id === userId) {
        this.backgroundManager.setAutoApplyState({ user: result.user });
        await chrome.storage.local.set({ currentUser: result.user });
      }
      sendResponse({ success: true, user: result.user });
    } catch (error) {
      console.error("Error updating user profile:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle get current user
   */
  async handleGetCurrentUser(request, sendResponse) {
    try {
      const state = this.backgroundManager.getAutoApplyState();
      if (state.user) {
        sendResponse({ success: true, user: state.user, isLoggedIn: true });
        return;
      }
      const result = await chrome.storage.local.get(["currentUser", "isLoggedIn"]);
      if (result.currentUser && result.isLoggedIn) {
        this.backgroundManager.setAutoApplyState({ user: result.currentUser });
        sendResponse({ success: true, user: result.currentUser, isLoggedIn: true });
      } else {
        sendResponse({ success: true, user: null, isLoggedIn: false });
      }
    } catch (error) {
      console.error("Error getting current user:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
};
var UserManager_default = UserManager;

// src/background/managers/AIManager.js
var AIManager = class {
  constructor(backgroundManager2) {
    this.backgroundManager = backgroundManager2;
    this.OLLAMA_BASE_URL = "http://localhost:11434";
  }
  /**
   * Handle AI-related messages
   */
  async handleMessage(request, sendResponse) {
    const { action } = request;
    switch (action) {
      case "callOllama":
        await this.handleCallOllama(request, sendResponse);
        break;
      case "testOllama":
      case "testOllamaConnection":
        await this.handleTestOllama(request, sendResponse);
        break;
      case "ollamaRequest":
        await this.handleOllamaRequest(request, sendResponse);
        break;
      case "callOpenAI":
        await this.handleCallOpenAI(request, sendResponse);
        break;
      case "testOpenAI":
        await this.handleTestOpenAI(request, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: "Unknown AI action" });
    }
  }
  /**
   * Handle generic Ollama API requests (for simple operations like getting models)
   */
  async handleOllamaRequest(request, sendResponse) {
    try {
      const { method, url, data } = request;
      const ollamaUrl = "".concat(this.OLLAMA_BASE_URL).concat(url);
      const options = {
        method: method || "GET",
        headers: {
          "Content-Type": "application/json"
        }
      };
      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(ollamaUrl, options);
      if (!response.ok) {
        sendResponse({
          success: false,
          error: "Ollama request failed: ".concat(response.status, " ").concat(response.statusText)
        });
        return;
      }
      const result = await response.json();
      sendResponse(__spreadValues({ success: true }, result));
    } catch (error) {
      console.error("Ollama request error:", error);
      sendResponse({
        success: false,
        error: "Error connecting to Ollama. Make sure it's running on localhost:11434."
      });
    }
  }
  /**
   * Handle Ollama API calls (for complex AI operations like chat/generate)
   */
  async handleCallOllama(request, sendResponse) {
    try {
      const endpoint = request.endpoint || "generate";
      const data = request.data || {};
      const result = await this.callOllamaAPI(endpoint, data);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle Ollama connection testing
   */
  async handleTestOllama(request, sendResponse) {
    try {
      const result = await this.testOllamaConnection();
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Test AI connection based on provider
   */
  async testAiConnection(aiSettings) {
    console.log("Testing AI connection:", aiSettings);
    if (aiSettings.provider === "ollama") {
      const result = await this.testOllamaConnection();
      if (!result.success) {
        throw new Error("Ollama connection failed: ".concat(result.error));
      }
      console.log("Ollama connection successful");
    } else if (aiSettings.provider === "openai") {
      const result = await this.testOpenAIConnection(aiSettings.apiKey);
      if (!result.success) {
        throw new Error("OpenAI connection failed: ".concat(result.error));
      }
      console.log("OpenAI connection successful");
    } else {
      if (!aiSettings.apiKey) {
        throw new Error("API key required for ".concat(aiSettings.provider));
      }
      console.log("AI settings validated for ".concat(aiSettings.provider));
    }
  }
  /**
   * Test Ollama connection
   */
  async testOllamaConnection() {
    try {
      console.log("Testing Ollama connection...");
      const testMessage = {
        model: "qwen2.5:3b",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant."
          },
          {
            role: "user",
            content: "Hello, are you working?"
          }
        ],
        stream: false
        // Explicitly disable streaming
      };
      const result = await this.callOllamaAPI("chat", testMessage);
      if (result.success) {
        console.log("Ollama chat test successful:", result.data);
        return {
          success: true,
          data: {
            provider: "ollama",
            version: result.data.model,
            response: result.data.message.content,
            port: 11434
          }
        };
      } else {
        throw new Error(result.error || "Unknown error from Ollama");
      }
    } catch (error) {
      console.error("Ollama connection failed:", error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
        troubleshooting: "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal."
      };
    }
  }
  /**
   * Make Ollama API calls (for complex AI operations)
   */
  async callOllamaAPI(endpoint, data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j;
    try {
      console.log("=== OLLAMA API CALL DEBUG ===");
      console.log("Making Ollama API call to ".concat(endpoint, ":"), {
        model: data.model,
        prompt: ((_a = data.prompt) == null ? void 0 : _a.substring(0, 100)) + "...",
        messages: ((_b = data.messages) == null ? void 0 : _b.length) || 0,
        stream: data.stream
      });
      const port = 11434;
      console.log("Using Ollama port: ".concat(port));
      const requestData = __spreadProps(__spreadValues({}, data), { stream: false });
      console.log("Final request data:", __spreadProps(__spreadValues({}, requestData), {
        prompt: ((_c = requestData.prompt) == null ? void 0 : _c.substring(0, 200)) + (((_d = requestData.prompt) == null ? void 0 : _d.length) > 200 ? "..." : ""),
        messages: (_e = requestData.messages) == null ? void 0 : _e.map((msg) => ({
          role: msg.role,
          content: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
        }))
      }));
      const response = await fetch("http://localhost:".concat(port, "/api/").concat(endpoint), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify(requestData)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Ollama API error response:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error("HTTP error! status: ".concat(response.status, ", details: ").concat(errorText));
      }
      const responseText = await response.text();
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.warn("JSON parse error:", parseError.message);
        console.log("Response text:", responseText.substring(0, 200) + "...");
        try {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            result = JSON.parse(jsonMatch[0]);
            console.log("Successfully extracted JSON from response");
          } else {
            throw new Error("Couldn't find valid JSON object in response");
          }
        } catch (extractError) {
          console.error("Failed to extract JSON:", extractError);
          throw new Error("Invalid JSON response from Ollama: ".concat(parseError.message));
        }
      }
      console.log("Ollama API call successful:", {
        model: result.model,
        response: ((_f = result.response) == null ? void 0 : _f.substring(0, 100)) + "...",
        message: ((_h = (_g = result.message) == null ? void 0 : _g.content) == null ? void 0 : _h.substring(0, 100)) + "..."
      });
      if (endpoint === "chat") {
        if (!result || !result.message || !result.message.content) {
          console.error("Unexpected chat response structure from Ollama:", result);
          if (result && typeof result === "object") {
            const possibleContent = ((_i = result.message) == null ? void 0 : _i.content) || result.content || result.text || result.response || "";
            result = {
              message: {
                content: possibleContent || "No content found in response"
              },
              model: result.model || "unknown"
            };
            console.log("Constructed fallback response:", result);
          } else {
            throw new Error("Invalid chat response format from Ollama");
          }
        }
      } else if (endpoint === "generate") {
        if (!result || typeof result.response !== "string") {
          console.error("Unexpected generate response structure from Ollama:", result);
          if (result && typeof result === "object") {
            const possibleResponse = result.response || result.content || result.text || ((_j = result.message) == null ? void 0 : _j.content) || "";
            result = {
              response: possibleResponse || "No response found in result",
              model: result.model || "unknown"
            };
            console.log("Constructed fallback generate response:", result);
          } else {
            throw new Error("Invalid generate response format from Ollama");
          }
        }
      } else if (endpoint === "embeddings") {
        if (!result || !result.embedding || !Array.isArray(result.embedding)) {
          console.error("Unexpected embeddings response structure from Ollama:", result);
          throw new Error("Invalid embeddings response format from Ollama");
        }
      } else {
        if (!result) {
          console.error("Empty response from Ollama for endpoint ".concat(endpoint, ":"), result);
          throw new Error("Invalid response format from Ollama for ".concat(endpoint));
        }
      }
      console.log("=== END OLLAMA API CALL DEBUG ===");
      return { success: true, data: result };
    } catch (error) {
      console.error("Ollama API call failed (".concat(endpoint, "):"), error);
      console.log("=== END OLLAMA API CALL DEBUG ===");
      let troubleshooting = "Please make sure Ollama is running on your computer. Try running 'ollama serve' in your terminal.";
      if (error.name === "AbortError") {
        troubleshooting += " The request timed out - your model might be too large or your computer too slow.";
      } else if (error.message.includes("Failed to fetch")) {
        troubleshooting += " Your computer cannot connect to Ollama. Make sure it's running and not blocked by a firewall.";
      } else if (error.message.includes("Invalid response format") || error.message.includes("JSON")) {
        troubleshooting += " Ollama returned an unexpected response format. You might need to update Ollama to a newer version.";
      }
      return {
        success: false,
        error: error.message,
        details: error.stack,
        troubleshooting
      };
    }
  }
  /**
   * Handle OpenAI API calls
   */
  async handleCallOpenAI(request, sendResponse) {
    try {
      const data = request.data || {};
      const result = await this.callOpenAIAPI(data);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle OpenAI connection testing
   */
  async handleTestOpenAI(request, sendResponse) {
    try {
      const settings = this.backgroundManager.getAutoApplyState().aiSettings;
      const apiKey = (settings == null ? void 0 : settings.apiKey) || request.apiKey;
      if (!apiKey) {
        sendResponse({ success: false, error: "OpenAI API key is required" });
        return;
      }
      const result = await this.testOpenAIConnection(apiKey);
      sendResponse(result);
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Test OpenAI connection
   */
  async testOpenAIConnection(apiKey) {
    try {
      console.log("Testing OpenAI connection...");
      const testMessage = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful AI assistant."
          },
          {
            role: "user",
            content: "Hello, are you working?"
          }
        ],
        max_tokens: 50
      };
      const result = await this.callOpenAIAPI(__spreadProps(__spreadValues({}, testMessage), {
        apiKey
      }));
      if (result.success) {
        console.log("OpenAI connection test successful:", result.data);
        return {
          success: true,
          data: {
            version: result.data.model,
            response: result.data.choices[0].message.content,
            provider: "openai"
          }
        };
      } else {
        throw new Error(result.error || "Unknown error from OpenAI");
      }
    } catch (error) {
      console.error("OpenAI connection failed:", error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
        troubleshooting: "Please check your OpenAI API key and make sure it's valid."
      };
    }
  }
  /**
   * Make OpenAI API calls
   */
  async callOpenAIAPI(data) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _i;
    try {
      console.log("=== OPENAI API CALL DEBUG ===");
      console.log("Making OpenAI API call:", {
        model: data.model,
        prompt: ((_a = data.prompt) == null ? void 0 : _a.substring(0, 100)) + "...",
        messages: ((_b = data.messages) == null ? void 0 : _b.length) || 0,
        max_tokens: data.max_tokens,
        temperature: data.temperature
      });
      const { apiKey, model, prompt, messages, max_tokens = 1e3, temperature = 0.7 } = data;
      if (!apiKey) {
        throw new Error("OpenAI API key is required");
      }
      const requestBody = {
        model: model || "gpt-4o-mini",
        max_tokens,
        temperature
      };
      if (messages) {
        requestBody.messages = messages;
        console.log("Using messages format:", messages);
      } else if (prompt) {
        requestBody.messages = [
          {
            role: "user",
            content: prompt
          }
        ];
        console.log("Converted prompt to messages format");
      } else {
        throw new Error("Either prompt or messages must be provided");
      }
      console.log("Final request body:", __spreadProps(__spreadValues({}, requestBody), {
        messages: requestBody.messages.map((msg) => ({
          role: msg.role,
          content: msg.content.substring(0, 200) + (msg.content.length > 200 ? "..." : "")
        }))
      }));
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer ".concat(apiKey)
        },
        body: JSON.stringify(requestBody)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("OpenAI API error response:", {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        let errorMessage = "HTTP error! status: ".concat(response.status);
        if ((_c = errorData.error) == null ? void 0 : _c.message) {
          errorMessage = errorData.error.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        throw new Error(errorMessage);
      }
      const result = await response.json();
      console.log("OpenAI API call successful:", {
        model: result.model,
        usage: result.usage,
        responseLength: ((_f = (_e = (_d = result.choices[0]) == null ? void 0 : _d.message) == null ? void 0 : _e.content) == null ? void 0 : _f.length) || 0,
        response: ((_i = (_h = (_g = result.choices[0]) == null ? void 0 : _g.message) == null ? void 0 : _h.content) == null ? void 0 : _i.substring(0, 100)) + "..."
      });
      console.log("=== END OPENAI API CALL DEBUG ===");
      return { success: true, data: result };
    } catch (error) {
      console.error("OpenAI API call failed:", error);
      console.log("=== END OPENAI API CALL DEBUG ===");
      let troubleshooting = "Please check your OpenAI API key and make sure it's valid.";
      if (error.message.includes("401")) {
        troubleshooting = "Your OpenAI API key is invalid. Please check your API key.";
      } else if (error.message.includes("429")) {
        troubleshooting = "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message.includes("quota")) {
        troubleshooting = "You've exceeded your OpenAI API quota. Please check your billing.";
      } else if (error.message.includes("Failed to fetch")) {
        troubleshooting = "Network error. Please check your internet connection.";
      }
      return {
        success: false,
        error: error.message,
        troubleshooting
      };
    }
  }
};
var AIManager_default = AIManager;

// src/background/managers/ResumeManager.js
var ResumeManager = class {
  constructor(backgroundManager2) {
    this.backgroundManager = backgroundManager2;
    this.DATABASE_AVAILABLE = true;
    this.API_BASE_URL = "http://localhost:3001/api";
  }
  /**
   * Handle resume-related messages
   */
  async handleMessage(request, sendResponse) {
    const { action } = request;
    switch (action) {
      case "uploadResume":
        await this.handleResumeUpload(request, sendResponse);
        break;
      case "downloadResume":
        await this.handleResumeDownload(request, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: "Unknown resume action" });
    }
  }
  /**
   * Handle resume upload
   */
  async handleResumeUpload(request, sendResponse) {
    try {
      const { userId, fileData, formData } = request;
      if (!this.DATABASE_AVAILABLE) {
        sendResponse({ success: false, error: "Database not available" });
        return;
      }
      if (!fileData || !fileData.buffer) {
        sendResponse({ success: false, error: "No file data provided" });
        return;
      }
      console.log("Upload debug - fileData.buffer type:", typeof fileData.buffer);
      console.log("Upload debug - fileData.buffer length:", fileData.buffer.length);
      console.log("Upload debug - first 10 bytes:", fileData.buffer.slice(0, 10));
      const uploadData = new FormData();
      const uint8Array = new Uint8Array(fileData.buffer);
      console.log("Upload debug - uint8Array:", uint8Array.slice(0, 10));
      const fileBlob = new Blob([uint8Array], { type: fileData.type });
      console.log("Upload debug - blob size:", fileBlob.size);
      console.log("Upload debug - blob type:", fileBlob.type);
      const file = new File([fileBlob], fileData.name, {
        type: fileData.type,
        lastModified: fileData.lastModified
      });
      console.log("Upload debug - file size:", file.size);
      console.log("Upload debug - file type:", file.type);
      uploadData.append("resume", file);
      uploadData.append("name", formData.name || "");
      uploadData.append("short_description", formData.short_description || "");
      uploadData.append("is_default", formData.is_default || false);
      if (formData.structured_data) {
        uploadData.append("structured_data", formData.structured_data);
      }
      if (formData.formatted_text) {
        uploadData.append("formatted_text", formData.formatted_text);
      }
      if (formData.file_type) {
        uploadData.append("file_type", formData.file_type);
      }
      const response = await fetch("".concat(this.API_BASE_URL, "/users/").concat(userId, "/resumes/upload"), {
        method: "POST",
        body: uploadData
      });
      const result = await response.json();
      if (!response.ok) {
        sendResponse({ success: false, error: result.error || "Upload failed" });
        return;
      }
      sendResponse(__spreadValues({ success: true }, result));
    } catch (error) {
      console.error("Resume upload error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Handle resume download
   */
  async handleResumeDownload(request, sendResponse) {
    try {
      const { resumeId, fileName } = request;
      if (!this.DATABASE_AVAILABLE) {
        sendResponse({ success: false, error: "Database not available" });
        return;
      }
      const resumeResponse = await fetch("".concat(this.API_BASE_URL, "/resumes/").concat(resumeId));
      if (!resumeResponse.ok) {
        const result = await resumeResponse.json();
        sendResponse({ success: false, error: result.error || "Resume not found" });
        return;
      }
      const resumeData = await resumeResponse.json();
      const resume = resumeData.resume;
      const properFileName = "".concat(resume.name, ".").concat(resume.extension);
      const downloadResponse = await fetch("".concat(this.API_BASE_URL, "/resumes/").concat(resumeId, "/download"));
      if (!downloadResponse.ok) {
        const result = await downloadResponse.json();
        sendResponse({ success: false, error: result.error || "Download failed" });
        return;
      }
      const blob = await downloadResponse.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result;
        chrome.downloads.download({
          url: dataUrl,
          filename: properFileName
        }, (downloadId) => {
          if (chrome.runtime.lastError) {
            sendResponse({ success: false, error: chrome.runtime.lastError.message });
          } else {
            sendResponse({ success: true, downloadId });
          }
        });
      };
      reader.onerror = () => {
        sendResponse({ success: false, error: "Failed to read file data" });
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error("Resume download error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
};
var ResumeManager_default = ResumeManager;

// src/background/managers/APIManager.js
var APIManager = class {
  constructor(backgroundManager2) {
    this.backgroundManager = backgroundManager2;
    this.DATABASE_AVAILABLE = true;
    this.API_BASE_URL = "http://localhost:3001/api";
  }
  /**
   * Handle API-related messages
   */
  async handleMessage(request, sendResponse) {
    const { action } = request;
    switch (action) {
      case "apiRequest":
        await this.handleApiRequest(request, sendResponse);
        break;
      default:
        sendResponse({ success: false, error: "Unknown API action" });
    }
  }
  /**
   * Handle generic API request to backend server
   */
  async handleApiRequest(request, sendResponse) {
    try {
      const { method, url, data } = request;
      if (!this.DATABASE_AVAILABLE) {
        sendResponse({ success: false, error: "Database not available" });
        return;
      }
      const apiUrl = "".concat(this.API_BASE_URL).concat(url);
      const options = {
        method,
        headers: {
          "Content-Type": "application/json"
        }
      };
      if (data && (method === "POST" || method === "PUT")) {
        options.body = JSON.stringify(data);
      }
      const response = await fetch(apiUrl, options);
      const result = await response.json();
      if (!response.ok) {
        sendResponse({ success: false, error: result.error || "API request failed" });
        return;
      }
      sendResponse(__spreadValues({ success: true }, result));
    } catch (error) {
      console.error("API request error:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
};
var APIManager_default = APIManager;

// src/background/managers/BackgroundManager.js
var BackgroundManager = class {
  constructor() {
    this.isAutoApplyRunning = false;
    this.currentUserData = null;
    this.currentAiSettings = null;
    this.currentUser = null;
    this.managers = /* @__PURE__ */ new Map();
    this.initializeManagers();
    this.setupMessageListener();
  }
  /**
   * Initialize all background managers
   */
  initializeManagers() {
    this.managers.set("autoApply", new AutoApplyManager_default(this));
    this.managers.set("user", new UserManager_default(this));
    this.managers.set("ai", new AIManager_default(this));
    this.managers.set("resume", new ResumeManager_default(this));
    this.managers.set("api", new APIManager_default(this));
  }
  /**
   * Setup Chrome runtime message listener
   */
  setupMessageListener() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log("Background received message:", request);
      console.log("Message sender:", sender);
      if (!request || typeof request !== "object") {
        console.error("Invalid message received - not an object:", request);
        sendResponse({ success: false, error: "Invalid message: not an object" });
        return true;
      }
      this.handleMessage(request, sender, sendResponse);
      return true;
    });
  }
  /**
   * Route messages to appropriate managers
   */
  async handleMessage(request, sender, sendResponse) {
    try {
      const { action } = request;
      if (!action || typeof action !== "string") {
        console.error("Invalid message received - missing or invalid action:", request);
        sendResponse({ success: false, error: "Invalid message: missing or invalid action" });
        return;
      }
      if (action.startsWith("startAutoApply") || action.startsWith("stopAutoApply") || action === "getAutoApplyState") {
        await this.managers.get("autoApply").handleMessage(request, sendResponse);
      } else if (action.startsWith("registerUser") || action.startsWith("loginUser") || action.startsWith("logoutUser") || action.startsWith("getUserProfile") || action.startsWith("updateUserProfile") || action === "getCurrentUser") {
        await this.managers.get("user").handleMessage(request, sendResponse);
      } else if (action.startsWith("callOllama") || action.startsWith("testOllama") || action === "ollamaRequest" || action.startsWith("callOpenAI") || action.startsWith("testOpenAI")) {
        await this.managers.get("ai").handleMessage(request, sendResponse);
      } else if (action.startsWith("uploadResume") || action.startsWith("downloadResume")) {
        await this.managers.get("resume").handleMessage(request, sendResponse);
      } else if (action === "apiRequest") {
        await this.managers.get("api").handleMessage(request, sendResponse);
      } else if (action === "STATUS_UPDATE" || action === "PROCESS_COMPLETE") {
        console.log("Received status update:", request);
        sendResponse({ success: true, message: "Status update received" });
      } else {
        console.warn("Unknown action received:", action);
        sendResponse({ success: false, error: "Unknown action: ".concat(action) });
      }
    } catch (error) {
      console.error("Error handling message:", error);
      sendResponse({ success: false, error: error.message });
    }
  }
  /**
   * Get a specific manager
   */
  getManager(name) {
    return this.managers.get(name);
  }
  /**
   * Get current auto apply state
   */
  getAutoApplyState() {
    return {
      isRunning: this.isAutoApplyRunning,
      userData: this.currentUserData,
      aiSettings: this.currentAiSettings,
      user: this.currentUser
    };
  }
  /**
   * Set auto apply state
   */
  setAutoApplyState(state) {
    this.isAutoApplyRunning = state.isRunning || false;
    this.currentUserData = state.userData || null;
    this.currentAiSettings = state.aiSettings || null;
    this.currentUser = state.user || null;
  }
};
var BackgroundManager_default = BackgroundManager;

// src/background/managers/index.js
var backgroundManager = new BackgroundManager_default();
var autoApplyManager = backgroundManager.getManager("autoApply");
var userManager = backgroundManager.getManager("user");
var aiManager = backgroundManager.getManager("ai");
var resumeManager = backgroundManager.getManager("resume");
var apiManager = backgroundManager.getManager("api");
var managers_default = backgroundManager;

// src/background.js
console.log("Background script loaded - Using manager system");
chrome.runtime.onInstalled.addListener(() => {
  console.log("Job Tracker Extension Installed");
  console.log("Background managers initialized:", Object.keys(managers_default.managers));
});
//# sourceMappingURL=background.bundle.js.map
