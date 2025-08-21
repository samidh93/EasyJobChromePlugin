/**
 * API Manager
 * Handles generic API requests to the backend server only
 */
class APIManager {
    constructor(backgroundManager) {
        this.backgroundManager = backgroundManager;
        this.DATABASE_AVAILABLE = true;
        this.API_BASE_URL = 'http://localhost:3001/api';
    }

    /**
     * Handle API-related messages
     */
    async handleMessage(request, sendResponse) {
        const { action } = request;
        
        switch (action) {
            case 'apiRequest':
                await this.handleApiRequest(request, sendResponse);
                break;
            default:
                sendResponse({ success: false, error: 'Unknown API action' });
        }
    }

    /**
     * Handle generic API request to backend server
     */
    async handleApiRequest(request, sendResponse) {
        try {
            const { method, url, data } = request;
            
            console.log('APIManager received request:', { method, url, data });
            
            if (!this.DATABASE_AVAILABLE) {
                sendResponse({ success: false, error: 'Database not available' });
                return;
            }

            const apiUrl = `${this.API_BASE_URL}${url}`;
            console.log('Making request to:', apiUrl);
            
            const options = {
                method: method,
                headers: {
                    'Content-Type': 'application/json',
                }
            };

            if (data && (method === 'POST' || method === 'PUT')) {
                options.body = JSON.stringify(data);
            }

            console.log('Request options:', options);
            const response = await fetch(apiUrl, options);
            const result = await response.json();

            console.log('API response:', { status: response.status, result });

            if (!response.ok) {
                sendResponse({ success: false, error: result.error || 'API request failed' });
                return;
            }

            sendResponse({ success: true, ...result });
        } catch (error) {
            console.error('API request error:', error);
            sendResponse({ success: false, error: error.message });
        }
    }
}

export default APIManager; 