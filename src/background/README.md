# Background Manager System

This directory contains the organized background script system using manager classes, similar to the popup manager system.

## Architecture

### Core Components

1. **BackgroundManager** - Main coordinator that routes messages to appropriate managers
2. **AutoApplyManager** - Handles LinkedIn auto-apply functionality
3. **UserManager** - Handles user registration, login, logout, and profile management
4. **AIManager** - Handles AI provider connections and API calls
5. **ResumeManager** - Handles resume upload and download
6. **APIManager** - Handles generic API requests

## File Structure

```
src/background/
├── managers/
│   ├── BackgroundManager.js    # Main coordinator
│   ├── AutoApplyManager.js     # Auto-apply functionality
│   ├── UserManager.js          # User management
│   ├── AIManager.js            # AI provider handling
│   ├── ResumeManager.js        # Resume operations
│   ├── APIManager.js           # Generic API requests
│   └── index.js                # Exports and singleton
└── README.md                   # This file
```

## How It Works

### Message Routing

The `BackgroundManager` automatically routes incoming Chrome messages to the appropriate manager based on the action:

```javascript
// Auto-apply actions
if (action.startsWith('startAutoApply') || action.startsWith('stopAutoApply') || action === 'getAutoApplyState') {
    await this.managers.get('autoApply').handleMessage(request, sendResponse);
}

// User actions
else if (action.startsWith('registerUser') || action.startsWith('loginUser') || action.startsWith('logoutUser') || 
         action.startsWith('getUserProfile') || action.startsWith('updateUserProfile') || action === 'getCurrentUser') {
    await this.managers.get('user').handleMessage(request, sendResponse);
}

// AI actions
else if (action.startsWith('callOllama') || action.startsWith('testOllama')) {
    await this.managers.get('ai').handleMessage(request, sendResponse);
}

// Resume actions
else if (action.startsWith('uploadResume') || action.startsWith('downloadResume')) {
    await this.managers.get('resume').handleMessage(request, sendResponse);
}

// API actions
else if (action === 'apiRequest') {
    await this.managers.get('api').handleMessage(request, sendResponse);
}
```

### State Management

The `BackgroundManager` maintains global state that can be accessed by all managers:

```javascript
// Get current state
const state = backgroundManager.getAutoApplyState();

// Set state
backgroundManager.setAutoApplyState({
    isRunning: true,
    userData: loginData,
    aiSettings: aiSettings,
    user: user
});
```

## Manager Details

### BackgroundManager
- **Purpose**: Main coordinator and message router
- **Responsibilities**: 
  - Initialize all managers
  - Route messages to appropriate managers
  - Maintain global state
  - Setup Chrome runtime listeners

### AutoApplyManager
- **Purpose**: Handle LinkedIn auto-apply functionality
- **Actions**: `startAutoApply`, `stopAutoApply`, `getAutoApplyState`
- **Responsibilities**:
  - Validate auto-apply requirements
  - Test AI connections
  - Communicate with content scripts
  - Manage auto-apply state

### UserManager
- **Purpose**: Handle user authentication and profile management
- **Actions**: `registerUser`, `loginUser`, `logoutUser`, `getUserProfile`, `updateUserProfile`, `getCurrentUser`
- **Responsibilities**:
  - User registration and login
  - Session management
  - Profile operations
  - Database/local storage fallback

### AIManager
- **Purpose**: Handle AI provider connections and API calls
- **Actions**: `callOllama`, `testOllama`, `testOllamaConnection`
- **Responsibilities**:
  - Ollama API communication
  - Connection testing
  - Error handling and troubleshooting
  - Support for multiple AI providers

### ResumeManager
- **Purpose**: Handle resume upload and download operations
- **Actions**: `uploadResume`, `downloadResume`
- **Responsibilities**:
  - File upload to backend
  - File download and Chrome downloads API
  - File format handling
  - Error handling

### APIManager
- **Purpose**: Handle generic API requests to the backend
- **Actions**: `apiRequest`
- **Responsibilities**:
  - Generic HTTP requests
  - Error handling
  - Response formatting

## Usage

### Basic Usage

```javascript
// Import the background manager system
import backgroundManager from './background/managers/index.js';

// Access individual managers
const userManager = backgroundManager.getManager('user');
const aiManager = backgroundManager.getManager('ai');

// Get current state
const state = backgroundManager.getAutoApplyState();
```

### Adding New Managers

1. Create a new manager class:

```javascript
class MyManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
    }

    async handleMessage(request, sendResponse) {
        // Handle messages
    }
}
```

2. Register it in BackgroundManager:

```javascript
initializeManagers() {
    this.managers.set('myManager', new MyManager(this));
}
```

3. Add routing logic:

```javascript
else if (action.startsWith('myAction')) {
    await this.managers.get('myManager').handleMessage(request, sendResponse);
}
```

## Benefits

### Before (Monolithic)
- 900+ lines in single file
- Hard to maintain and debug
- Mixed responsibilities
- Difficult to test individual components

### After (Manager System)
- **Separation of Concerns**: Each manager has a specific responsibility
- **Modularity**: Easy to add, remove, or modify functionality
- **Testability**: Each manager can be tested independently
- **Maintainability**: Clear structure and organization
- **Reusability**: Managers can be reused in different contexts

## Migration

The new system is fully backward compatible. All existing message actions work exactly the same way, but now they're handled by organized manager classes instead of a monolithic background script.

## Testing

Each manager can be tested independently:

```javascript
// Test user manager
const userManager = new UserManager(backgroundManager);
await userManager.handleMessage({ action: 'loginUser', email: 'test@example.com', password: 'password' }, mockSendResponse);

// Test AI manager
const aiManager = new AIManager(backgroundManager);
await aiManager.handleMessage({ action: 'testOllama' }, mockSendResponse);
``` 