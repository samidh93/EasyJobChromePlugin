import BaseApplicationTracker from '../platform/BaseApplicationTracker.js';

/**
 * StepstoneApplicationTracker - StepStone-specific implementation of ApplicationTracker
 * Extends BaseApplicationTracker with StepStone-specific job data mapping and parsing
 */
class StepstoneApplicationTracker extends BaseApplicationTracker {
    constructor() {
        super();
        // No state tracking needed - we only save successful applications
    }

    // ================================
    // PLATFORM-SPECIFIC IMPLEMENTATIONS
    // ================================

    /**
     * Get the platform name
     * @returns {string} 'stepstone'
     */
    getPlatformName() {
        return 'stepstone';
    }

    /**
     * Extract StepStone job ID from jobInfo URL
     * StepStone URLs typically look like: https://www.stepstone.de/stellenangebote--Job-12345678.html
     * or https://www.stepstone.de/job/12345678
     * @param {Object} jobInfo - Job information object
     * @returns {string|null} StepStone job ID or null if not available
     */
    getPlatformJobId(jobInfo) {
        if (!jobInfo || !jobInfo.url) {
            return null;
        }

        try {
            // Try to extract job ID from URL
            // Pattern 1: /job/12345678 or /stelle/12345678
            const jobIdMatch = jobInfo.url.match(/\/(?:job|stelle)\/(\d+)/);
            if (jobIdMatch) {
                return jobIdMatch[1];
            }

            // Pattern 2: --Job-12345678.html
            const jobIdMatch2 = jobInfo.url.match(/--Job-(\d+)\.html/);
            if (jobIdMatch2) {
                return jobIdMatch2[1];
            }

            // Pattern 3: Extract from URL path segments
            const urlParts = jobInfo.url.split('/');
            for (const part of urlParts) {
                if (/^\d+$/.test(part)) {
                    return part;
                }
            }

            // If no ID found, use URL as identifier (fallback)
            return null;
        } catch (error) {
            this.debugLog('Error extracting job ID from URL:', error);
            return null;
        }
    }

    /**
     * Map StepStone jobInfo to company data structure for database
     * @param {Object} jobInfo - Job information object
     * @returns {Object} Company data object
     */
    mapJobInfoToCompanyData(jobInfo) {
        return {
            name: jobInfo.company,
            industry: null, // Could be extracted from job description later
            size: null,
            location: jobInfo.location,
            website: null,
            linkedin_url: null
        };
    }

    /**
     * Map StepStone jobInfo to job data structure for database
     * @param {Object} jobInfo - Job information object
     * @param {string} companyId - Company ID
     * @returns {Object} Job data object
     */
    mapJobInfoToJobData(jobInfo, companyId) {
        // StepStone uses 'remote' (boolean) instead of 'remoteType' (string)
        const isRemote = jobInfo.remote === true || 
                        (typeof jobInfo.remote === 'string' && jobInfo.remote.toLowerCase().includes('remote'));

        return {
            company_id: companyId,
            title: jobInfo.title,
            location: jobInfo.location,
            is_remote: isRemote,
            job_type: this.normalizeJobType(jobInfo.jobType),
            platform: 'stepstone',
            platform_job_id: this.getPlatformJobId(jobInfo),
            job_url: jobInfo.url || window.location.href,
            job_description: jobInfo.description || '',
            applicant_count: this.parseApplicantCount(jobInfo.applicantCount), // StepStone may not have this
            posted_date: this.parsePostedDate(jobInfo.postedDate),
            status: 'active'
        };
    }

    /**
     * Normalize StepStone job type string to standard format
     * StepStone job types might be in German: "Vollzeit", "Teilzeit", etc.
     * @param {string} jobType - Raw job type string
     * @returns {string} Normalized job type
     */
    normalizeJobType(jobType) {
        if (!jobType) return 'full-time';
        
        const type = jobType.toLowerCase();
        
        // English patterns
        if (type.includes('full')) return 'full-time';
        if (type.includes('part')) return 'part-time';
        if (type.includes('contract')) return 'contract';
        if (type.includes('intern')) return 'internship';
        if (type.includes('temporary') || type.includes('temp')) return 'contract';
        
        // German patterns (StepStone is German platform)
        if (type.includes('vollzeit')) return 'full-time';
        if (type.includes('teilzeit')) return 'part-time';
        if (type.includes('befristet') || type.includes('zeitvertrag')) return 'contract';
        if (type.includes('praktikum') || type.includes('internship')) return 'internship';
        if (type.includes('freelance') || type.includes('freiberuflich')) return 'contract';
        
        return 'full-time'; // Default
    }

    /**
     * Parse applicant count from StepStone text
     * StepStone may not always display applicant count
     * @param {string} countText - Applicant count text (may be null/undefined)
     * @returns {number} Parsed applicant count or 0 if not available
     */
    parseApplicantCount(countText) {
        if (!countText) return 0;
        
        // Try to extract number from text (could be in German format)
        const match = countText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Parse posted date from StepStone text
     * StepStone date formats might be in German: "vor 2 Tagen", "Heute", etc.
     * @param {string} dateText - Posted date text
     * @returns {Date} Parsed date or current date if parsing fails
     */
    parsePostedDate(dateText) {
        if (!dateText) return new Date();
        
        const now = new Date();
        const lowerText = dateText.toLowerCase();
        
        // English patterns
        if (lowerText.includes('today') || lowerText.includes('heute')) {
            return now;
        }
        if (lowerText.includes('yesterday') || lowerText.includes('gestern')) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }
        
        // English: "X days ago"
        const daysMatchEn = dateText.match(/(\d+)\s*days?\s*ago/i);
        if (daysMatchEn) {
            const days = parseInt(daysMatchEn[1]);
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - days);
            return pastDate;
        }
        
        // German: "vor X Tagen" or "vor X Tag"
        const daysMatchDe = dateText.match(/vor\s+(\d+)\s+tag(en)?/i);
        if (daysMatchDe) {
            const days = parseInt(daysMatchDe[1]);
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - days);
            return pastDate;
        }
        
        // German: "vor X Wochen" (weeks)
        const weeksMatch = dateText.match(/vor\s+(\d+)\s+woche(n)?/i);
        if (weeksMatch) {
            const weeks = parseInt(weeksMatch[1]);
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - (weeks * 7));
            return pastDate;
        }
        
        // Try to parse as ISO date string
        try {
            const parsedDate = new Date(dateText);
            if (!isNaN(parsedDate.getTime())) {
                return parsedDate;
            }
        } catch (error) {
            // Ignore parsing errors
        }
        
        return now; // Default to current date
    }
}

// Create singleton instance
const applicationTracker = new StepstoneApplicationTracker();
export default applicationTracker;
