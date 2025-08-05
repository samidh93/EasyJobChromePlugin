/**
 * PlatformDetector - Detects the current job platform based on URL patterns
 * Supports LinkedIn, Indeed, and StepStone platforms
 */
class PlatformDetector {
    /**
     * Platform URL patterns and their identifiers
     */
    static PLATFORM_PATTERNS = {
        linkedin: [
            /linkedin\.com/i,
            /linkedin\.[a-z]{2,3}/i  // International domains like linkedin.de, linkedin.fr
        ],
        indeed: [
            /indeed\.com/i,
            /indeed\.[a-z]{2,3}/i,   // International domains like indeed.de, indeed.co.uk
            /indeed\.[a-z]{2,3}\.[a-z]{2,3}/i  // Domains like indeed.co.uk
        ],
        stepstone: [
            /stepstone\.de/i,
            /stepstone\.com/i,
            /stepstone\.[a-z]{2,3}/i  // Other international StepStone domains
        ]
    };

    /**
     * Default platform when detection fails
     */
    static DEFAULT_PLATFORM = 'linkedin';

    /**
     * Detect current platform from URL
     * @param {string} url - URL to analyze (defaults to current page URL)
     * @returns {string} - Platform identifier ('linkedin', 'indeed', 'stepstone')
     */
    static detectPlatform(url = window.location.href) {
        // Handle special cases first - don't default to linkedin for these
        if (url === 'about:blank' || url === 'chrome://newtab/' || url.startsWith('chrome://')) {
            console.log(`[PlatformDetector] Special URL detected: ${url}, returning 'unknown'`);
            return 'unknown';
        }

        // Normalize URL to lowercase for case-insensitive matching
        const normalizedUrl = url.toLowerCase();

        // Check each platform pattern
        for (const [platform, patterns] of Object.entries(this.PLATFORM_PATTERNS)) {
            for (const pattern of patterns) {
                if (pattern.test(normalizedUrl)) {
                    console.log(`[PlatformDetector] Detected platform: ${platform} from URL: ${url}`);
                    return platform;
                }
            }
        }

        // Log warning if no platform detected
        console.warn(`[PlatformDetector] No platform detected from URL: ${url}, returning 'unknown'`);
        return 'unknown';
    }

    /**
     * Get current platform
     * @returns {string} - Current platform identifier
     */
    static getCurrentPlatform() {
        return this.detectPlatform();
    }

    /**
     * Check if current URL is a supported job platform
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isSupportedPlatform(url = window.location.href) {
        const platform = this.detectPlatform(url);
        return platform !== 'unknown' && Object.keys(this.PLATFORM_PATTERNS).includes(platform);
    }

    /**
     * Get all supported platforms
     * @returns {string[]} - Array of supported platform identifiers
     */
    static getSupportedPlatforms() {
        return Object.keys(this.PLATFORM_PATTERNS);
    }

    /**
     * Check if URL belongs to specific platform
     * @param {string} platformName - Platform to check for
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isPlatform(platformName, url = window.location.href) {
        return this.detectPlatform(url) === platformName.toLowerCase();
    }

    /**
     * Check if current page is LinkedIn
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isLinkedIn(url = window.location.href) {
        return this.isPlatform('linkedin', url);
    }

    /**
     * Check if current page is Indeed
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isIndeed(url = window.location.href) {
        return this.isPlatform('indeed', url);
    }

    /**
     * Check if current page is StepStone
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isStepStone(url = window.location.href) {
        return this.isPlatform('stepstone', url);
    }

    /**
     * Get platform display name
     * @param {string} platformName - Platform identifier
     * @returns {string} - Human-readable platform name
     */
    static getPlatformDisplayName(platformName) {
        const displayNames = {
            linkedin: 'LinkedIn',
            indeed: 'Indeed',
            stepstone: 'StepStone'
        };
        return displayNames[platformName.toLowerCase()] || platformName;
    }

    /**
     * Check if URL is a job search/listing page for the detected platform
     * @param {string} url - URL to check (defaults to current page URL)
     * @returns {boolean}
     */
    static isJobSearchPage(url = window.location.href) {
        const platform = this.detectPlatform(url);
        
        // Handle special cases
        if (platform === 'unknown') {
            return false;
        }
        
        const normalizedUrl = url.toLowerCase();

        switch (platform) {
            case 'linkedin':
                return normalizedUrl.includes('/jobs/') || normalizedUrl.includes('/job/');
            
            case 'indeed':
                return normalizedUrl.includes('/jobs') || 
                       normalizedUrl.includes('/viewjob') ||
                       normalizedUrl.includes('q=') || // Job search query
                       normalizedUrl.includes('/job/');
            
            case 'stepstone':
                return normalizedUrl.includes('/jobs') || 
                       normalizedUrl.includes('/job/') ||
                       normalizedUrl.includes('/stellenangebote') || // German
                       normalizedUrl.includes('/stellenanzeige');    // German
            
            default:
                return false;
        }
    }

    /**
     * Debug method to log platform detection details
     * @param {string} url - URL to analyze (defaults to current page URL)
     */
    static debugDetection(url = window.location.href) {
        console.group('[PlatformDetector] Detection Details');
        console.log('URL:', url);
        console.log('Detected Platform:', this.detectPlatform(url));
        console.log('Is Supported:', this.isSupportedPlatform(url));
        console.log('Is Job Search Page:', this.isJobSearchPage(url));
        console.log('Display Name:', this.getPlatformDisplayName(this.detectPlatform(url)));
        console.groupEnd();
    }
}

export default PlatformDetector; 