import PlatformDetector from './PlatformDetector.js';

/**
 * PlatformFactory - Creates appropriate platform instances based on current URL
 * Uses lazy loading to import platform-specific implementations only when needed
 */
class PlatformFactory {
    /**
     * Cache for loaded platform classes to avoid repeated imports
     */
    static platformCache = new Map();

    /**
     * Create platform instance for current URL
     * @param {string} url - URL to create platform for (defaults to current URL)
     * @returns {Promise<BasePlatform>} - Platform instance
     */
    static async createPlatform(url = window.location.href) {
        const platformName = PlatformDetector.detectPlatform(url);
        return await this.createPlatformByName(platformName);
    }

    /**
     * Create platform instance by platform name
     * @param {string} platformName - Name of the platform ('linkedin', 'indeed', 'stepstone')
     * @returns {Promise<BasePlatform>} - Platform instance
     * @throws {Error} - If platform is not supported or fails to load
     */
    static async createPlatformByName(platformName) {
        const normalizedName = platformName.toLowerCase();

        try {
            // Check cache first
            if (this.platformCache.has(normalizedName)) {
                const PlatformClass = this.platformCache.get(normalizedName);
                console.log(`[PlatformFactory] Using cached ${normalizedName} platform`);
                return new PlatformClass();
            }

            // Load platform class based on name
            const PlatformClass = await this.loadPlatformClass(normalizedName);
            
            // Cache the loaded class
            this.platformCache.set(normalizedName, PlatformClass);
            
            // Create and return instance
            const platformInstance = new PlatformClass();
            console.log(`[PlatformFactory] Created ${normalizedName} platform instance`);
            
            return platformInstance;
            
        } catch (error) {
            console.error(`[PlatformFactory] Failed to create platform '${platformName}':`, error);
            throw new Error(`Failed to load platform '${platformName}': ${error.message}`);
        }
    }

    /**
     * Dynamically load platform class
     * @param {string} platformName - Platform name to load
     * @returns {Promise<Class>} - Platform class constructor
     * @private
     */
    static async loadPlatformClass(platformName) {
        switch (platformName) {
            case 'linkedin':
                console.log('[PlatformFactory] Loading LinkedIn platform...');
                const { default: LinkedInPlatform } = await import('../linkedin/LinkedInPlatform.js');
                return LinkedInPlatform;

            case 'indeed':
                console.log('[PlatformFactory] Loading Indeed platform...');
                const { default: IndeedPlatform } = await import('../indeed/IndeedPlatform.js');
                return IndeedPlatform;

            case 'stepstone':
                console.log('[PlatformFactory] Loading StepStone platform...');
                const { default: StepstonePlatform } = await import('../stepstone/StepstonePlatform.js');
                return StepstonePlatform;

            default:
                throw new Error(`Unsupported platform: ${platformName}`);
        }
    }

    /**
     * Get available platform names
     * @returns {string[]} - Array of supported platform names
     */
    static getAvailablePlatforms() {
        return PlatformDetector.getSupportedPlatforms();
    }

    /**
     * Check if platform is supported
     * @param {string} platformName - Platform name to check
     * @returns {boolean}
     */
    static isPlatformSupported(platformName) {
        return this.getAvailablePlatforms().includes(platformName.toLowerCase());
    }

    /**
     * Preload all platform classes (optional performance optimization)
     * @returns {Promise<void>}
     */
    static async preloadAllPlatforms() {
        console.log('[PlatformFactory] Preloading all platforms...');
        const platforms = this.getAvailablePlatforms();
        
        const loadPromises = platforms.map(async (platformName) => {
            try {
                await this.createPlatformByName(platformName);
                console.log(`[PlatformFactory] Preloaded ${platformName} platform`);
            } catch (error) {
                console.warn(`[PlatformFactory] Failed to preload ${platformName} platform:`, error);
            }
        });

        await Promise.allSettled(loadPromises);
        console.log('[PlatformFactory] Platform preloading completed');
    }

    /**
     * Clear platform cache (useful for testing or memory management)
     */
    static clearCache() {
        console.log('[PlatformFactory] Clearing platform cache');
        this.platformCache.clear();
    }

    /**
     * Get current platform instance
     * @returns {Promise<BasePlatform>} - Current platform instance
     */
    static async getCurrentPlatform() {
        return await this.createPlatform();
    }

    /**
     * Check if current page is a supported job platform
     * @param {string} url - URL to check (defaults to current URL)
     * @returns {boolean}
     */
    static isSupportedPage(url = window.location.href) {
        return PlatformDetector.isSupportedPlatform(url) && 
               PlatformDetector.isJobSearchPage(url);
    }

    /**
     * Get platform factory status for debugging
     * @returns {Object} - Factory status information
     */
    static getStatus() {
        const currentPlatform = PlatformDetector.getCurrentPlatform();
        const isSupported = this.isPlatformSupported(currentPlatform);
        const isJobPage = PlatformDetector.isJobSearchPage();
        const cachedPlatforms = Array.from(this.platformCache.keys());

        return {
            currentUrl: window.location.href,
            detectedPlatform: currentPlatform,
            isPlatformSupported: isSupported,
            isJobSearchPage: isJobPage,
            availablePlatforms: this.getAvailablePlatforms(),
            cachedPlatforms: cachedPlatforms
        };
    }

    /**
     * Debug method to log factory status
     */
    static debugStatus() {
        const status = this.getStatus();
        console.group('[PlatformFactory] Status');
        Object.entries(status).forEach(([key, value]) => {
            console.log(`${key}:`, value);
        });
        console.groupEnd();
    }
}

export default PlatformFactory; 