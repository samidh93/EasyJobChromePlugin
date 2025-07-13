// Background Managers - Export classes
export { default as BackgroundManager } from './BackgroundManager.js';
export { default as AutoApplyManager } from './AutoApplyManager.js';
export { default as UserManager } from './UserManager.js';
export { default as AIManager } from './AIManager.js';
export { default as ResumeManager } from './ResumeManager.js';
export { default as APIManager } from './APIManager.js';

// Create and export a singleton instance
import BackgroundManager from './BackgroundManager.js';

// Create background manager instance
const backgroundManager = new BackgroundManager();

// Export individual managers for direct access
export const autoApplyManager = backgroundManager.getManager('autoApply');
export const userManager = backgroundManager.getManager('user');
export const aiManager = backgroundManager.getManager('ai');
export const resumeManager = backgroundManager.getManager('resume');
export const apiManager = backgroundManager.getManager('api');

// Export the main background manager instance
export default backgroundManager; 