/**
 * StepstoneJobSearch - Handles StepStone job search functionality
 * Based on StepStone's DOM structure and search interface
 */
class StepstoneJobSearch {
    
    /**
     * Get total jobs count from StepStone search results
     * @param {Element} searchElement - The main search container element
     * @returns {Promise<number>} - Total number of jobs found
     */
    static async getTotalJobsSearchCount(searchElement = document) {
        try {
            // Wait for DOM to be ready and stable
            await this.wait(2000);
            
            // StepStone job count selector - use stable data attributes first
            const primarySelectors = [
                '[data-at="search-jobs-count"]', // Most stable - data attribute
                '.at-facet-header-total-results', // Semantic class name
                '.at-facets-header-title [data-at="search-jobs-count"]' // More specific path
            ];
            
            let jobCountElement = null;
            let attempts = 0;
            const maxAttempts = 3;
            
            // Try multiple times with increasing delays
            while (attempts < maxAttempts && !jobCountElement) {
                for (const selector of primarySelectors) {
                    jobCountElement = searchElement.querySelector(selector);
                    if (jobCountElement) {
                        console.log(`[StepstoneJobSearch] Found job count with selector: ${selector} (attempt ${attempts + 1})`);
                        break;
                    }
                }
                
                if (!jobCountElement) {
                    attempts++;
                    if (attempts < maxAttempts) {
                        console.log(`[StepstoneJobSearch] Job count not found, retrying in ${attempts * 1000}ms...`);
                        await this.wait(attempts * 1000);
                    }
                }
            }
            
            if (jobCountElement) {
                const jobCountText = jobCountElement.textContent.trim();
                
                // StepStone uses German number formatting (e.g., "23.429")
                // Remove dots and convert to integer
                const jobCount = parseInt(
                    jobCountText
                        .replace(/\./g, '') // Remove German thousand separators
                        .replace(/\s/g, '') // Remove any spaces
                        .replace(/[^\d]/g, '') // Keep only digits
                );
                
                console.log(`[StepstoneJobSearch] Total jobs found: ${jobCount} (raw: "${jobCountText}")`);
                return isNaN(jobCount) ? 0 : jobCount;
            }
            
            // Fallback: try more general selectors (avoid dynamic res-* classes)
            const fallbackSelectors = [
                '[class*="total-results"]',
                '[class*="job-count"]',
                '[data-genesis-element="BASE"]:has([data-at="search-jobs-count"])',
                'h1 span:first-child', // Often the count is the first span in the header
                '.at-facets-header-title span:first-child'
            ];
            
            for (const selector of fallbackSelectors) {
                const element = searchElement.querySelector(selector);
                if (element) {
                    const text = element.textContent.trim();
                    const count = parseInt(text.replace(/\./g, '').replace(/[^\d]/g, ''));
                    if (!isNaN(count) && count > 0) {
                        console.log(`[StepstoneJobSearch] Found job count with fallback selector "${selector}": ${count} (raw: "${text}")`);
                        return count;
                    }
                }
            }
            
            console.log('[StepstoneJobSearch] No job count found');
            return 0;
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error getting total jobs count:', error);
            return 0;
        }
    }
    
    /**
     * Get available pages for StepStone search results
     * @param {Element} searchElement - The main search container element  
     * @param {number} totalJobs - Total number of jobs from getTotalJobsSearchCount()
     * @returns {Promise<number>} - Number of pages to process
     */
    static async getAvailablePages(searchElement = document, totalJobs) {
        try {
            await this.wait(500);
            
            // StepStone typically shows 20 jobs per page
            const jobsPerPage = 20;
            
            // Look for pagination element - avoid dynamic classes
            const paginationSelectors = [
                '[role="navigation"][aria-label*="pagination"]', // Semantic ARIA
                '[role="navigation"][aria-label*="Pagination"]',
                'nav[class*="pagination"]', // Semantic nav element
                '.pagination',
                '[class*="pagination"]',
                '[data-testid*="pagination"]',
                '[aria-label*="Pagination"]',
                'nav[class*="pager"]',
                '.paging'
            ];
            
            let maxPage = 1;
            
            for (const selector of paginationSelectors) {
                const pagination = searchElement.querySelector(selector);
                if (pagination) {
                    // Look for page numbers
                    const pageElements = pagination.querySelectorAll('a, button, span');
                    
                    pageElements.forEach(element => {
                        const text = element.textContent.trim();
                        const pageNum = parseInt(text);
                        if (!isNaN(pageNum) && pageNum > maxPage) {
                            maxPage = pageNum;
                        }
                    });
                    
                    // Look for "next" or "weiter" buttons to determine if more pages exist
                    const nextButton = pagination.querySelector('[aria-label*="next"], [aria-label*="weiter"], [title*="weiter"]');
                    if (nextButton && !nextButton.disabled) {
                        // If there's a next button, ensure we have at least current page + 1
                        maxPage = Math.max(maxPage, 2);
                    }
                    
                    break;
                }
            }
            
            // Calculate based on total jobs if pagination not found
            if (maxPage === 1 && totalJobs > jobsPerPage) {
                maxPage = Math.ceil(totalJobs / jobsPerPage);
                // StepStone typically limits to 50 pages (1000 jobs)
                maxPage = Math.min(maxPage, 50);
            }
            
            console.log(`[StepstoneJobSearch] Available pages: ${maxPage} (based on ${totalJobs} total jobs)`);
            return maxPage;
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error getting available pages:', error);
            return 1;
        }
    }
    
    /**
     * Get list of job elements on current page
     * @param {Element} searchElement - The main search container element
     * @returns {Promise<NodeList>} - List of job elements
     */
    static async getListOfJobsOnPage(searchElement = document) {
        try {
            await this.wait(1000);
            
            // StepStone job listing selector (verified working)
            const jobCards = document.querySelectorAll('article[data-testid="job-item"]');
            
            if (jobCards.length > 0) {
                console.log(`[StepstoneJobSearch] Found ${jobCards.length} jobs with verified selector: article[data-testid="job-item"]`);
                return jobCards;
            }
            
            // Fallback selectors if main selector doesn't work
            const fallbackSelectors = [
                '[data-testid="job-item"]',
                'article[data-testid*="job"]',
                '.job-element',
                '[class*="job-item"]',
                '.resultlist-item'
            ];
            
            for (const selector of fallbackSelectors) {
                const jobElements = searchElement.querySelectorAll(selector);
                if (jobElements.length > 0) {
                    console.log(`[StepstoneJobSearch] Found ${jobElements.length} jobs with fallback selector: ${selector}`);
                    return jobElements;
                }
            }
            
            console.log('[StepstoneJobSearch] No job elements found on page');
            return [];
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error getting job list:', error);
            return [];
        }
    }
    
    /**
     * Navigate to next page of results
     * @param {number} targetPage - Page number to navigate to
     * @returns {Promise<boolean>} - Success status
     */
    static async navigateToNextPage(targetPage) {
        try {
            console.log(`[StepstoneJobSearch] Navigating to page ${targetPage}`);
            
            // Look for pagination controls
            const paginationSelectors = [
                '.pagination',
                '[class*="pagination"]',
                '[class*="pager"]',
                '.paging'
            ];
            
            for (const selector of paginationSelectors) {
                const pagination = document.querySelector(selector);
                if (!pagination) continue;
                
                // Look for specific page number
                const pageLink = pagination.querySelector(`a[href*="page=${targetPage}"], button[data-page="${targetPage}"]`);
                if (pageLink) {
                    pageLink.click();
                    await this.wait(2000); // Wait for page load
                    return true;
                }
                
                // Look for "next" button if going to next sequential page
                const nextSelectors = [
                    'a[aria-label*="next"]',
                    'button[aria-label*="next"]', 
                    'a[title*="weiter"]',
                    'button[title*="weiter"]',
                    '.next',
                    '[class*="next"]'
                ];
                
                for (const nextSelector of nextSelectors) {
                    const nextButton = pagination.querySelector(nextSelector);
                    if (nextButton && !nextButton.disabled) {
                        nextButton.click();
                        await this.wait(2000);
                        return true;
                    }
                }
            }
            
            // Fallback: try URL manipulation
            const currentUrl = new URL(window.location.href);
            const searchParams = currentUrl.searchParams;
            
            // StepStone uses different parameter names for pagination
            const pageParams = ['page', 'p', 'offset'];
            
            for (const param of pageParams) {
                if (searchParams.has(param) || param === 'page') {
                    searchParams.set(param, targetPage.toString());
                    window.location.href = currentUrl.toString();
                    return true;
                }
            }
            
            console.log('[StepstoneJobSearch] Could not find pagination controls');
            return false;
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error navigating to next page:', error);
            return false;
        }
    }
    
    /**
     * Get current search query information
     * @returns {Object} - Search query details
     */
    static getCurrentSearchInfo() {
        try {
            const searchInfo = {
                query: '',
                location: '',
                totalResults: 0
            };
            
            // Extract from the header element - use stable selectors
            const headerSelectors = [
                '.at-facets-header-title',
                'h1[class*="facets-header"]',
                '[data-genesis-element="TEXT"]:has([data-at="search-jobs-count"])',
                'h1:has([data-at="search-jobs-count"])'
            ];
            
            let headerElement = null;
            for (const selector of headerSelectors) {
                headerElement = document.querySelector(selector);
                if (headerElement) break;
            }
            
            if (headerElement) {
                // Extract job title from first link (more robust selector)
                const jobTitleSelectors = [
                    'a[href*="/jobs/"][href*="q="]', // More specific - job search link
                    'a[href*="/jobs/"]:first-of-type',
                    'a[href*="/stellenangebote/"]:first-of-type'
                ];
                
                for (const selector of jobTitleSelectors) {
                    const jobTitleLink = headerElement.querySelector(selector);
                    if (jobTitleLink) {
                        searchInfo.query = jobTitleLink.textContent.trim();
                        break;
                    }
                }
                
                // Extract location from second link (more robust)
                const locationSelectors = [
                    'a[href*="/jobs/in-"]', // Specific pattern for location links
                    'a[href*="/jobs/"][href*="deutschland"]',
                    'a[href*="/jobs/"]:last-of-type'
                ];
                
                for (const selector of locationSelectors) {
                    const locationLink = headerElement.querySelector(selector);
                    if (locationLink) {
                        searchInfo.location = locationLink.textContent.trim();
                        break;
                    }
                }
                
                // Extract total results using stable selector
                const countElement = headerElement.querySelector('[data-at="search-jobs-count"]');
                if (countElement) {
                    const count = parseInt(countElement.textContent.replace(/\./g, '').replace(/[^\d]/g, ''));
                    if (!isNaN(count)) {
                        searchInfo.totalResults = count;
                    }
                }
            }
            
            return searchInfo;
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error getting search info:', error);
            return { query: '', location: '', totalResults: 0 };
        }
    }
    
    /**
     * Wait utility function
     * @param {number} ms - Milliseconds to wait
     * @returns {Promise<void>}
     */
    static async wait(ms = 1000) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    
    /**
     * Debug log with class prefix
     * @param {string} message - Message to log
     */
    static debugLog(message) {
        console.log(`[StepstoneJobSearch] ${message}`);
    }
    
    /**
     * Error log with class prefix
     * @param {string} message - Error message
     * @param {Error} error - Error object
     */
    static errorLog(message, error) {
        console.error(`[StepstoneJobSearch] ${message}:`, error);
    }
}

export default StepstoneJobSearch; 