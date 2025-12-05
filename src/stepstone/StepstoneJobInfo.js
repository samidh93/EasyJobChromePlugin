/**
 * StepstoneJobInfo - Handles StepStone job information extraction
 * Extracts job details from StepStone job listings and individual job pages
 */
class StepstoneJobInfo {
    
    /**
     * Extract job information from current job page
     * @returns {Promise<Object|null>} - Job details object
     */
    static async extractJobInfo() {
        try {
            console.log('[StepstoneJobInfo] Extracting job information from current page');
            
            const jobInfo = {
                title: await this.extractJobTitle(),
                company: await this.extractCompanyName(),
                location: await this.extractLocation(),
                url: window.location.href,
                description: await this.extractJobDescription(),
                requirements: await this.extractJobRequirements(),
                salary: await this.extractSalary(),
                jobType: await this.extractJobType(),
                remote: await this.isRemoteJob(),
                postedDate: await this.extractPostedDate(),
                benefits: await this.extractBenefits(),
                contactInfo: await this.extractContactInfo()
            };
            
            console.log('[StepstoneJobInfo] Extracted job info:', jobInfo);
            return jobInfo;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting job info:', error);
            return null;
        }
    }
    
    /**
     * Extract job title from job page
     * @returns {Promise<string>} - Job title
     */
    static async extractJobTitle() {
        try {
            const titleSelectors = [
                'h1[data-testid="job-title"]',
                '.job-title',
                'h1[class*="title"]',
                'h1[class*="job"]',
                '[data-testid*="title"] h1',
                '.header h1',
                'header h1',
                'h1'
            ];
            
            for (const selector of titleSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const title = element.textContent.trim();
                    console.log(`[StepstoneJobInfo] Found job title: "${title}"`);
                    return title;
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting job title:', error);
            return '';
        }
    }
    
    /**
     * Extract company name from job page
     * @returns {Promise<string>} - Company name
     */
    static async extractCompanyName() {
        try {
            const companySelectors = [
                '[data-testid="company-name"]',
                '.company-name',
                '[class*="company"] h2',
                '[class*="company"] span',
                '[class*="employer"]',
                '.job-company',
                'a[href*="/company/"]',
                'a[href*="/unternehmen/"]'
            ];
            
            for (const selector of companySelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const company = element.textContent.trim();
                    console.log(`[StepstoneJobInfo] Found company: "${company}"`);
                    return company;
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting company name:', error);
            return '';
        }
    }
    
    /**
     * Extract location from job page
     * @returns {Promise<string>} - Location
     */
    static async extractLocation() {
        try {
            const locationSelectors = [
                '[data-testid="job-location"]',
                '.job-location',
                '[class*="location"]',
                '[class*="ort"]',
                '[class*="standort"]',
                'span[title*="Location"]'
            ];
            
            for (const selector of locationSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const location = element.textContent.trim();
                    console.log(`[StepstoneJobInfo] Found location: "${location}"`);
                    return location;
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting location:', error);
            return '';
        }
    }
    
    /**
     * Extract job description from job page
     * @returns {Promise<string>} - Job description
     */
    static async extractJobDescription() {
        try {
            const descriptionSelectors = [
                '[data-testid="job-description"]',
                '.job-description',
                '[class*="description"]',
                '[class*="content"]',
                '.job-content',
                '[role="main"] div[class*="text"]',
                'section[class*="description"]'
            ];
            
            for (const selector of descriptionSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const description = element.textContent.trim();
                    if (description.length > 100) { // Ensure it's substantial content
                        console.log(`[StepstoneJobInfo] Found job description (${description.length} chars)`);
                        return description.substring(0, 2000); // Limit length
                    }
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting job description:', error);
            return '';
        }
    }
    
    /**
     * Extract job requirements from job page
     * @returns {Promise<string>} - Job requirements
     */
    static async extractJobRequirements() {
        try {
            const requirementSelectors = [
                '[data-testid="requirements"]',
                '.requirements',
                '[class*="requirement"]',
                '[class*="qualification"]',
                '[class*="skill"]'
            ];
            
            for (const selector of requirementSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const requirements = element.textContent.trim();
                    if (requirements.length > 50) {
                        console.log(`[StepstoneJobInfo] Found requirements (${requirements.length} chars)`);
                        return requirements.substring(0, 1000);
                    }
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting requirements:', error);
            return '';
        }
    }
    
    /**
     * Extract salary information from job page
     * @returns {Promise<string>} - Salary information
     */
    static async extractSalary() {
        try {
            const salarySelectors = [
                '[data-testid="salary"]',
                '.salary',
                '[class*="salary"]',
                '[class*="gehalt"]'
            ];
            
            for (const selector of salarySelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.includes('€')) {
                    const salary = element.textContent.trim();
                    console.log(`[StepstoneJobInfo] Found salary: "${salary}"`);
                    return salary;
                }
            }
            
            // Look for salary in text content
            const bodyText = document.body.textContent;
            const salaryRegex = /(\d{1,3}(?:\.\d{3})*(?:\s*-\s*\d{1,3}(?:\.\d{3})*)?\s*€(?:\/Jahr|\/Monat|\/Tag)?)/g;
            const salaryMatch = bodyText.match(salaryRegex);
            
            if (salaryMatch && salaryMatch.length > 0) {
                const salary = salaryMatch[0];
                console.log(`[StepstoneJobInfo] Found salary in text: "${salary}"`);
                return salary;
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting salary:', error);
            return '';
        }
    }
    
    /**
     * Extract job type (full-time, part-time, etc.)
     * @returns {Promise<string>} - Job type
     */
    static async extractJobType() {
        try {
            const jobTypeSelectors = [
                '[data-testid="job-type"]',
                '.job-type',
                '[class*="employment"]',
                '[class*="arbeitszeit"]'
            ];
            
            for (const selector of jobTypeSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    const jobType = element.textContent.trim();
                    console.log(`[StepstoneJobInfo] Found job type: "${jobType}"`);
                    return jobType;
                }
            }
            
            // Look for common German job type terms in text
            const bodyText = document.body.textContent.toLowerCase();
            const jobTypes = {
                'vollzeit': 'Vollzeit',
                'teilzeit': 'Teilzeit',
                'minijob': 'Minijob',
                'freelance': 'Freelance',
                'praktikum': 'Praktikum',
                'ausbildung': 'Ausbildung'
            };
            
            for (const [term, type] of Object.entries(jobTypes)) {
                if (bodyText.includes(term)) {
                    console.log(`[StepstoneJobInfo] Found job type in text: "${type}"`);
                    return type;
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting job type:', error);
            return '';
        }
    }
    
    /**
     * Check if job is remote
     * @returns {Promise<boolean>} - Whether job is remote
     */
    static async isRemoteJob() {
        try {
            const bodyText = document.body.textContent.toLowerCase();
            const remoteKeywords = [
                'remote', 'homeoffice', 'home office', 'home-office',
                'von zuhause', 'mobiles arbeiten', 'telearbeit'
            ];
            
            const isRemote = remoteKeywords.some(keyword => bodyText.includes(keyword));
            console.log(`[StepstoneJobInfo] Remote job: ${isRemote}`);
            return isRemote;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error checking remote status:', error);
            return false;
        }
    }
    
    /**
     * Extract posted date from job page
     * @returns {Promise<string>} - Posted date
     */
    static async extractPostedDate() {
        try {
            const dateSelectors = [
                '[data-testid="posted-date"]',
                '.posted-date',
                '[class*="date"]',
                'time',
                '[datetime]'
            ];
            
            for (const selector of dateSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const dateText = element.textContent.trim() || element.getAttribute('datetime');
                    if (dateText) {
                        console.log(`[StepstoneJobInfo] Found posted date: "${dateText}"`);
                        return dateText;
                    }
                }
            }
            
            return '';
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting posted date:', error);
            return '';
        }
    }
    
    /**
     * Extract benefits from job page
     * @returns {Promise<string[]>} - List of benefits
     */
    static async extractBenefits() {
        try {
            const benefitSelectors = [
                '[data-testid="benefits"]',
                '.benefits',
                '[class*="benefit"]',
                '[class*="vorteile"]'
            ];
            
            const benefits = [];
            
            for (const selector of benefitSelectors) {
                const element = document.querySelector(selector);
                if (element) {
                    const benefitText = element.textContent.trim();
                    if (benefitText) {
                        benefits.push(benefitText);
                    }
                }
            }
            
            console.log(`[StepstoneJobInfo] Found ${benefits.length} benefits`);
            return benefits;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting benefits:', error);
            return [];
        }
    }
    
    /**
     * Extract contact information
     * @returns {Promise<Object>} - Contact information
     */
    static async extractContactInfo() {
        try {
            const contactInfo = {
                email: '',
                phone: '',
                contactPerson: ''
            };
            
            // Look for email addresses
            const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
            const bodyText = document.body.textContent;
            const emailMatches = bodyText.match(emailRegex);
            if (emailMatches && emailMatches.length > 0) {
                contactInfo.email = emailMatches[0];
            }
            
            // Look for phone numbers (German format)
            const phoneRegex = /(?:\+49|0)[0-9\s\-\/\(\)]{8,}/g;
            const phoneMatches = bodyText.match(phoneRegex);
            if (phoneMatches && phoneMatches.length > 0) {
                contactInfo.phone = phoneMatches[0].trim();
            }
            
            // Look for contact person
            const contactSelectors = [
                '[data-testid="contact-person"]',
                '.contact-person',
                '[class*="ansprechpartner"]',
                '[class*="kontakt"]'
            ];
            
            for (const selector of contactSelectors) {
                const element = document.querySelector(selector);
                if (element && element.textContent.trim()) {
                    contactInfo.contactPerson = element.textContent.trim();
                    break;
                }
            }
            
            console.log('[StepstoneJobInfo] Extracted contact info:', contactInfo);
            return contactInfo;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting contact info:', error);
            return { email: '', phone: '', contactPerson: '' };
        }
    }
    
    /**
     * Extract job information from a job listing element (for search results)
     * @param {Element} jobElement - Individual job listing element (article[data-testid="job-item"])
     * @returns {Promise<Object>} - Basic job information
     */
    static async extractJobInfoFromListing(jobElement) {
        try {
            if (!jobElement) return null;
            
            const jobInfo = {
                title: '',
                company: '',
                location: '',
                url: '',
                workType: '',
                remote: false
            };
            
            // Extract title and URL (verified selectors)
            const titleElement = jobElement.querySelector('[data-testid="job-item-title"]');
            if (titleElement) {
                jobInfo.title = titleElement.textContent.trim();
                
                // Extract job URL - titleElement is usually an <a> tag
                const jobUrl = titleElement.getAttribute('href');
                if (jobUrl) {
                    // Ensure URL is absolute
                    if (jobUrl.startsWith('http')) {
                        jobInfo.url = jobUrl;
                    } else if (jobUrl.startsWith('/')) {
                        jobInfo.url = `https://www.stepstone.de${jobUrl}`;
                    } else {
                        jobInfo.url = `https://www.stepstone.de/${jobUrl}`;
                    }
                }
            }
            
            // Fallback: try to find any link in the job element if URL not found
            if (!jobInfo.url) {
                const linkSelectors = [
                    'a[href*="/job/"]',
                    'a[href*="/stelle/"]',
                    'a[data-testid*="job"]',
                    'a'
                ];
                
                for (const selector of linkSelectors) {
                    const link = jobElement.querySelector(selector);
                    if (link) {
                        const href = link.getAttribute('href');
                        if (href && (href.includes('/job/') || href.includes('/stelle/'))) {
                            jobInfo.url = href.startsWith('http') ? href : `https://www.stepstone.de${href}`;
                            console.log('[StepstoneJobInfo] Found URL via fallback:', jobInfo.url);
                            break;
                        }
                    }
                }
            }
            
            // Extract company name (verified selector)
            const companyElement = jobElement.querySelector('[data-at="job-item-company-name"]');
            if (companyElement) {
                jobInfo.company = companyElement.textContent.trim();
            }
            
            // Extract location (verified selector)
            const locationElement = jobElement.querySelector('[data-at="job-item-location"]');
            if (locationElement) {
                jobInfo.location = locationElement.textContent.trim();
            }
            
            // Extract work type/remote info (verified selector)
            const remoteElement = jobElement.querySelector('[data-at="job-item-work-from-home"]');
            if (remoteElement) {
                jobInfo.workType = remoteElement.textContent.trim();
                jobInfo.remote = jobInfo.workType.toLowerCase().includes('home') || 
                                jobInfo.workType.toLowerCase().includes('remote');
            }
            
            // Try to extract salary if visible
            const salarySelectors = [
                '[data-at*="salary"]',
                '[data-testid*="salary"]',
                '[class*="salary"]',
                '[class*="gehalt"]'
            ];
            
            for (const selector of salarySelectors) {
                const salaryElement = jobElement.querySelector(selector);
                if (salaryElement && salaryElement.textContent.includes('€')) {
                    jobInfo.salary = salaryElement.textContent.trim();
                    break;
                }
            }
            
            console.log('[StepstoneJobInfo] Extracted listing info:', jobInfo);
            return jobInfo;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error extracting job info from listing:', error);
            return null;
        }
    }

    /**
     * Extract job information from multiple job listing elements (bulk extraction)
     * @param {NodeList|Array} jobElements - Array of job card elements
     * @returns {Promise<Array>} - Array of job information objects
     */
    static async extractJobInfoFromListings(jobElements) {
        try {
            if (!jobElements || jobElements.length === 0) {
                console.log('[StepstoneJobInfo] No job elements provided for bulk extraction');
                return [];
            }
            
            console.log(`[StepstoneJobInfo] Extracting info from ${jobElements.length} job listings`);
            
            const jobs = [];
            
            for (const jobElement of jobElements) {
                try {
                    const jobInfo = await this.extractJobInfoFromListing(jobElement);
                    if (jobInfo && jobInfo.title) {
                        jobs.push(jobInfo);
                    }
                } catch (error) {
                    console.error('[StepstoneJobInfo] Error extracting individual job info:', error);
                    // Continue processing other jobs even if one fails
                }
            }
            
            console.log(`[StepstoneJobInfo] Successfully extracted ${jobs.length} job listings`);
            return jobs;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error in bulk job extraction:', error);
            return [];
        }
    }

    /**
     * Get detailed job listings using verified StepStone selectors
     * This method mimics your tested code structure
     * @returns {Promise<Array>} - Array of job objects with all details
     */
    static async getJobListingsFromPage() {
        try {
            // Use the exact selector you verified
            const jobCards = document.querySelectorAll('article[data-at="job-item"][class^="res"]');
            
            if (jobCards.length === 0) {
                console.log('[StepstoneJobInfo] No job cards found on page');
                return [];
            }
            
            console.log(`[StepstoneJobInfo] Found ${jobCards.length} job cards on page`);
            
            // Map each job card to extract information (following your tested approach)
            const jobs = Array.from(jobCards).map(card => {
                try {
                    // Job title and URL
                    const titleElement = card.querySelector('[data-testid="job-item-title"]');
                    const title = titleElement?.textContent.trim();
                    const jobUrl = titleElement?.getAttribute('href');
                    const fullJobUrl = jobUrl?.startsWith('http') ? jobUrl : `https://www.stepstone.de${jobUrl}`;

                    // Company name
                    const companyNameElement = card.querySelector('[data-at="job-item-company-name"]');
                    const companyName = companyNameElement?.textContent.trim();

                    // Location
                    const locationElement = card.querySelector('[data-at="job-item-location"]');
                    const location = locationElement?.textContent.trim();

                    // Work type (remote/home-office)
                    const remoteElement = card.querySelector('[data-at="job-item-work-from-home"]');
                    const workType = remoteElement?.textContent.trim();

                    return {
                        title,
                        company: companyName, // Standardize property name
                        companyName, // Keep original for compatibility
                        url: fullJobUrl, // Standardize property name
                        jobUrl: fullJobUrl, // Keep original for compatibility
                        location,
                        workType,
                        remote: workType?.toLowerCase().includes('home') || workType?.toLowerCase().includes('remote') || false
                    };
                } catch (error) {
                    console.error('[StepstoneJobInfo] Error extracting job info from card:', error);
                    return null;
                }
            }).filter(job => job && job.title); // Filter out failed extractions
            
            console.log(`[StepstoneJobInfo] Successfully extracted ${jobs.length} jobs from page`);
            return jobs;
            
        } catch (error) {
            console.error('[StepstoneJobInfo] Error getting job listings from page:', error);
            return [];
        }
    }
}

export default StepstoneJobInfo; 