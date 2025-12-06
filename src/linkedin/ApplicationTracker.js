import BaseApplicationTracker from '../platform/BaseApplicationTracker.js';

/**
 * LinkedInApplicationTracker - LinkedIn-specific implementation of ApplicationTracker
 * Extends BaseApplicationTracker with LinkedIn-specific job data mapping and parsing
 */
class LinkedInApplicationTracker extends BaseApplicationTracker {
    constructor() {
        super();
        // No state tracking needed - we only save successful applications
    }

    // ================================
    // PLATFORM-SPECIFIC IMPLEMENTATIONS
    // ================================

    /**
     * Get the platform name
     * @returns {string} 'linkedin'
     */
    getPlatformName() {
        return 'linkedin';
    }

    /**
     * Extract LinkedIn job ID from jobInfo
     * @param {Object} jobInfo - Job information object
     * @returns {string|null} LinkedIn job ID or null if not available
     */
    getPlatformJobId(jobInfo) {
        return jobInfo.jobId || null;
    }

    /**
     * Map LinkedIn jobInfo to company data structure for database
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
     * Map LinkedIn jobInfo to job data structure for database
     * @param {Object} jobInfo - Job information object
     * @param {string} companyId - Company ID
     * @returns {Object} Job data object
     */
    mapJobInfoToJobData(jobInfo, companyId) {
        return {
            company_id: companyId,
            title: jobInfo.title,
            location: jobInfo.location,
            is_remote: jobInfo.remoteType?.toLowerCase().includes('remote') || false,
            job_type: this.normalizeJobType(jobInfo.jobType),
            platform: 'linkedin',
            platform_job_id: jobInfo.jobId,
            job_url: window.location.href,
            job_description: jobInfo.description,
            applicant_count: this.parseApplicantCount(jobInfo.applicantCount),
            posted_date: this.parsePostedDate(jobInfo.postedDate),
            status: 'active'
        };
    }

    /**
     * Normalize LinkedIn job type string to standard format
     * @param {string} jobType - Raw job type string
     * @returns {string} Normalized job type
     */
    normalizeJobType(jobType) {
        if (!jobType) return 'full-time';
        
        const type = jobType.toLowerCase();
        if (type.includes('full')) return 'full-time';
        if (type.includes('part')) return 'part-time';
        if (type.includes('contract')) return 'contract';
        if (type.includes('intern')) return 'internship';
        return 'full-time';
    }

    /**
     * Parse applicant count from LinkedIn text
     * @param {string} countText - Applicant count text (may be null/undefined)
     * @returns {number} Parsed applicant count or 0 if not available
     */
    parseApplicantCount(countText) {
        if (!countText) return 0;
        
        const match = countText.match(/(\d+)/);
        return match ? parseInt(match[1]) : 0;
    }

    /**
     * Parse posted date from LinkedIn text
     * @param {string} dateText - Posted date text
     * @returns {Date} Parsed date or current date if parsing fails
     */
    parsePostedDate(dateText) {
        if (!dateText) return new Date();
        
        // Simple parsing for common LinkedIn date formats
        const now = new Date();
        
        if (dateText.includes('today')) return now;
        if (dateText.includes('yesterday')) {
            const yesterday = new Date(now);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday;
        }
        
        // Try to parse "X days ago" format
        const daysMatch = dateText.match(/(\d+)\s*days?\s*ago/);
        if (daysMatch) {
            const days = parseInt(daysMatch[1]);
            const pastDate = new Date(now);
            pastDate.setDate(pastDate.getDate() - days);
            return pastDate;
        }
        
        return now;
    }
}

// Create singleton instance (maintains backward compatibility)
const applicationTracker = new LinkedInApplicationTracker();
export default applicationTracker; 