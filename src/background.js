// background.js - Main background script entry point

// Import the background manager system
import backgroundManager from './background/managers/index.js';

console.log('Background script loaded - Using manager system');

// Initialize the background script when extension is installed
chrome.runtime.onInstalled.addListener(() => {
    console.log('Job Tracker Extension Installed');
    console.log('Background managers initialized:', Object.keys(backgroundManager.managers));
});

// The BackgroundManager class handles all message routing and functionality
// No additional code needed here - everything is managed by the manager system