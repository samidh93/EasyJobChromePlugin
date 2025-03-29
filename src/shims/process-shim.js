// Minimal process shim for browser environment
export const process = {
    env: {
        NODE_ENV: window.process?.env?.NODE_ENV || 'development'
    }
}; 