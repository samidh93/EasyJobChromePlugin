# Manager Architecture

This directory contains the manager classes that provide better abstraction and separation of concerns for the EasyJob React app.

## Overview

The manager architecture provides:
- **Centralized state management** for different domains
- **Event-driven updates** through listeners
- **Clean separation of concerns** between UI and business logic
- **Reusable functionality** across components
- **Better error handling** and logging

## Managers

### AuthManager

Handles all authentication-related operations:

```javascript
import { authManager } from './managers/index.js';

// Login
const result = await authManager.login(email, password);

// Register
const result = await authManager.register({
  email: 'user@example.com',
  password: 'password123',
  username: 'username'
});

// Logout
const result = await authManager.logout();

// Load current user
const result = await authManager.loadCurrentUser();

// Get current auth state
const authState = authManager.getAuthState();
```

**Methods:**
- `login(email, password)` - Authenticate user
- `register(userData)` - Register new user
- `logout()` - Logout current user
- `loadCurrentUser()` - Load user from storage/background
- `loadUserData()` - Load user data from local storage
- `getAuthState()` - Get current authentication state
- `addListener(callback)` - Listen to auth state changes

### ApplicationsManager

Handles all application-related operations:

```javascript
import { applicationsManager } from './managers/index.js';

// Load applications for a user
const result = await applicationsManager.loadApplications(userId);

// Select an application and load its details
const result = await applicationsManager.selectApplication(applicationId);

// Get filtered applications
const filtered = applicationsManager.getFilteredApplications();

// Get unique companies
const companies = applicationsManager.getUniqueCompanies();
```

**Methods:**
- `loadApplications(userId)` - Load applications for a user
- `selectApplication(applicationId)` - Select and load application details
- `loadApplicationQuestions(applicationId)` - Load Q&A for an application
- `clearSelectedApplication()` - Clear selected application
- `setFilters(filters)` - Set application filters
- `getFilteredApplications()` - Get filtered applications
- `getUniqueCompanies()` - Get unique companies from applications
- `getJobsForCompany(company)` - Get jobs for a specific company
- `getApplicationsForJob(company, jobTitle)` - Get applications for a specific job
- `getApplicationStats(userId)` - Get application statistics
- `clear()` - Clear all data
- `addListener(callback)` - Listen to applications state changes

### AiManager

Handles all AI settings-related operations:

```javascript
import { aiManager } from './managers/index.js';

// Load AI settings for a user
const result = await aiManager.loadAiSettings(userId);

// Save new AI settings
const result = await aiManager.saveAiSettings(userId, settingsData);

// Set default AI settings
const result = await aiManager.setDefaultAiSettings(settingsId);

// Delete AI settings
const result = await aiManager.deleteAiSettings(settingsId);

// Load Ollama models
const result = await aiManager.loadOllamaModels();
```

**Methods:**
- `loadAiSettings(userId)` - Load AI settings for a user
- `saveAiSettings(userId, settingsData)` - Save new AI settings
- `setDefaultAiSettings(settingsId)` - Set default AI settings
- `deleteAiSettings(settingsId)` - Delete AI settings
- `loadOllamaModels()` - Load available Ollama models
- `getDefaultAiSettings(userId)` - Get default AI settings for a user
- `hasAiSettings()` - Check if user has AI settings
- `getAiSettingsById(settingsId)` - Get AI settings by ID
- `clear()` - Clear all data
- `addListener(callback)` - Listen to AI settings state changes

### ResumeManager

Handles all resume-related operations:

```javascript
import { resumeManager } from './managers/index.js';

// Load resumes for a user
const result = await resumeManager.loadResumes(userId);

// Upload a new resume
const result = await resumeManager.uploadResume(userId, fileData, formData);

// Set default resume
const result = await resumeManager.setDefaultResume(resumeId);

// Delete resume
const result = await resumeManager.deleteResume(resumeId);

// Download resume
const result = await resumeManager.downloadResume(resumeId, fileName);
```

**Methods:**
- `loadResumes(userId)` - Load resumes for a user
- `uploadResume(userId, fileData, formData)` - Upload a new resume
- `setDefaultResume(resumeId)` - Set default resume
- `deleteResume(resumeId)` - Delete resume
- `downloadResume(resumeId, fileName)` - Download resume
- `updateUploadProgress(progress)` - Update upload progress
- `hasResumes()` - Check if user has resumes
- `getResumeById(resumeId)` - Get resume by ID
- `getDefaultResume()` - Get default resume
- `formatFileSize(bytes)` - Format file size
- `getFileIcon(extension)` - Get file icon based on extension
- `clear()` - Clear all data
- `addListener(callback)` - Listen to resume state changes

## State Management

Both managers use a listener pattern for state updates:

```javascript
// Subscribe to auth state changes
const unsubscribe = authManager.addListener((authState) => {
  console.log('Auth state changed:', authState);
  // Update your component state here
});

// Subscribe to applications state changes
const unsubscribe = applicationsManager.addListener((appsState) => {
  console.log('Applications state changed:', appsState);
  // Update your component state here
});

// Clean up when component unmounts
useEffect(() => {
  const unsubscribe = authManager.addListener(handleAuthChange);
  return unsubscribe;
}, []);
```

## Integration with React

The managers are integrated into the main App component:

```javascript
// In App.js
import { authManager, applicationsManager } from './managers/index.js';

// Listen to manager state changes
useEffect(() => {
  const unsubscribe = authManager.addListener((authState) => {
    setCurrentUser(authState.currentUser);
    setIsLoggedIn(authState.isLoggedIn);
  });

  return unsubscribe;
}, []);

useEffect(() => {
  const unsubscribe = applicationsManager.addListener((appsState) => {
    setApplicationHistory(appsState.applications);
    setSelectedApplication(appsState.selectedApplication);
  });

  return unsubscribe;
}, []);
```

## Benefits

1. **Separation of Concerns**: Business logic is separated from UI components
2. **Reusability**: Managers can be used across different components
3. **Centralized State**: Single source of truth for each domain
4. **Event-Driven**: Components automatically update when state changes
5. **Better Testing**: Managers can be tested independently
6. **Error Handling**: Centralized error handling and logging
7. **Maintainability**: Easier to maintain and extend functionality

## Testing

A test page is available at `test-managers.html` to verify manager functionality:

```bash
# Open the test page in your browser
open src/popup/managers/test-managers.html
```

## Timezone Support

The application includes comprehensive timezone support to handle UTC timestamps from the database:

### Timezone Utilities

Located in `src/popup/utils/timezone.js`, these utilities provide:

```javascript
import { 
  formatLocalTime, 
  formatBerlinTime, 
  getUserTimezone, 
  isBerlinTimezone,
  formatTimeWithTimezone 
} from './utils/timezone.js';

// Convert UTC timestamp to local timezone
const localDate = formatLocalTime(utcTimestamp, 'date');
const localDateTime = formatLocalTime(utcTimestamp, 'datetime');
const localRelative = formatLocalTime(utcTimestamp, 'relative');

// Convert UTC timestamp to Berlin timezone
const berlinDate = formatBerlinTime(utcTimestamp, 'date');
const berlinDateTime = formatBerlinTime(utcTimestamp, 'datetime');

// Get user's timezone
const timezone = getUserTimezone();
const isBerlin = isBerlinTimezone();
```

### Format Options

- `'date'` - Date only (e.g., "7/12/2025")
- `'time'` - Time only (e.g., "3:07:42 PM")
- `'datetime'` - Date and time (e.g., "7/12/2025, 3:07:42 PM")
- `'relative'` - Relative time (e.g., "2 hours ago", "3 days ago")
- `'iso'` - ISO format

### Database Configuration

- **Database timezone**: UTC (recommended for consistency)
- **Timestamp columns**: `TIMESTAMP WITHOUT TIME ZONE`
- **Frontend conversion**: Automatic conversion to user's local timezone

### Testing

A timezone test page is available at `test-timezone.html`:

```bash
# Open the test page in your browser
open src/popup/test-timezone.html
```

## Future Enhancements

Potential future managers:
- **JobSearchManager** - Handle job search and filtering
- **NotificationManager** - Handle notifications and alerts
- **AnalyticsManager** - Handle application analytics and reporting

## Migration Guide

To migrate existing code to use managers:

1. **Replace direct API calls** with manager method calls
2. **Replace local state management** with manager listeners
3. **Update component logic** to use manager state
4. **Remove duplicate code** that's now handled by managers
5. **Test thoroughly** to ensure functionality is preserved

Example migration:

```javascript
// Before
const response = await chrome.runtime.sendMessage({
  action: 'loginUser',
  email: email,
  password: password
});

// After
const result = await authManager.login(email, password);
``` 