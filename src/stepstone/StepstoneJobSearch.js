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
            const jobCards = document.querySelectorAll('article[data-at="job-item"][class^="res"]');
            
            if (jobCards.length > 0) {
                console.log(`[StepstoneJobSearch] Found ${jobCards.length} jobs with verified selector: article[data-testid="job-item"]`);
                return jobCards;
            }
            
            // Fallback selectors if main selector doesn't work
            const fallbackSelectors = [
                '[data-testid="job-item"]',
                'article[data-at="job-item"][class^="res"]', 
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
            
            // PRIORITY 1: Look for "next" button first (like LinkedIn) - avoids full page reload
            // This should work for sequential page navigation
            const nextSelectors = [
                'a[aria-label*="next" i]',
                'button[aria-label*="next" i]', 
                'a[title*="weiter" i]',
                'button[title*="weiter" i]',
                'a[title*="Next" i]',
                'button[title*="Next" i]',
                'a[href*="page="]', // Any link with page parameter
                'button[href*="page="]',
                '.next',
                '[class*="next"]',
                '[class*="Next"]',
                '[class*="pagination"] a:last-child', // Last pagination link
                '[class*="pager"] a:last-child'
            ];
            
            // Try document-level search first (pagination might be outside searchElement)
            console.log(`[StepstoneJobSearch] Looking for next button with ${nextSelectors.length} selectors...`);
            for (const nextSelector of nextSelectors) {
                const nextButton = document.querySelector(nextSelector);
                if (nextButton) {
                    // Check if it's actually a "next" button by checking href or text
                    const href = nextButton.href || '';
                    const text = nextButton.textContent?.toLowerCase() || '';
                    const ariaLabel = nextButton.getAttribute('aria-label')?.toLowerCase() || '';
                    const title = nextButton.getAttribute('title')?.toLowerCase() || '';
                    
                    const isNextButton = 
                        !nextButton.disabled && 
                        nextButton.offsetParent !== null &&
                        (href.includes(`page=${targetPage}`) ||
                         text.includes('next') || text.includes('weiter') ||
                         ariaLabel.includes('next') || ariaLabel.includes('weiter') ||
                         title.includes('next') || title.includes('weiter') ||
                         nextSelector.includes('next') || nextSelector.includes('weiter'));
                    
                    if (isNextButton) {
                        console.log(`[StepstoneJobSearch] ✅ Found valid next button with selector: ${nextSelector}`);
                        console.log(`[StepstoneJobSearch] Button href: ${href}, text: ${text}, aria-label: ${ariaLabel}`);
                        nextButton.click();
                        console.log('[StepstoneJobSearch] Clicked next button');
                        
                        // Wait for page to load (like LinkedIn)
                        await this.wait(3000);
                        
                        // Wait for jobs to load - verify page has loaded
                        const jobsLoaded = await this.waitForJobsToLoad();
                        if (jobsLoaded) {
                            console.log('[StepstoneJobSearch] ✅ Successfully navigated to next page (SPA - no reload)');
                            return true;
                        } else {
                            console.log('[StepstoneJobSearch] ⚠️ Jobs may still be loading, but continuing...');
                            return true; // Continue anyway, will be checked on next iteration
                        }
                    } else {
                        console.log(`[StepstoneJobSearch] Found element but not a valid next button: ${nextSelector} (disabled: ${nextButton.disabled})`);
                    }
                }
            }
            console.log('[StepstoneJobSearch] ❌ No valid next button found, trying other methods...');
            
            // PRIORITY 2: Look for pagination controls and specific page number
            const paginationSelectors = [
                '.pagination',
                '[class*="pagination"]',
                '[class*="pager"]',
                '.paging',
                'nav[aria-label*="pagination" i]',
                'nav[aria-label*="seiten" i]'
            ];
            
            console.log(`[StepstoneJobSearch] Looking for pagination container with ${paginationSelectors.length} selectors...`);
            for (const selector of paginationSelectors) {
                const pagination = document.querySelector(selector);
                if (!pagination) {
                    console.log(`[StepstoneJobSearch] Pagination container not found: ${selector}`);
                    continue;
                }
                
                console.log(`[StepstoneJobSearch] Found pagination container: ${selector}`);
                
                // Look for specific page number link/button
                const pageLinkSelectors = [
                    `a[href*="page=${targetPage}"]`,
                    `button[data-page="${targetPage}"]`,
                    `a[href*="&page=${targetPage}"]`,
                    `a[href*="?page=${targetPage}"]`,
                    `[data-page="${targetPage}"]`
                ];
                
                for (const linkSelector of pageLinkSelectors) {
                    const pageLink = pagination.querySelector(linkSelector);
                    if (pageLink && !pageLink.disabled && pageLink.offsetParent !== null) {
                        console.log(`[StepstoneJobSearch] ✅ Found page ${targetPage} link with selector: ${linkSelector}`);
                        pageLink.click();
                        console.log(`[StepstoneJobSearch] Clicked page ${targetPage} link`);
                        await this.wait(3000); // Wait for page load
                        
                        const jobsLoaded = await this.waitForJobsToLoad();
                        if (jobsLoaded) {
                            console.log('[StepstoneJobSearch] ✅ Successfully navigated via page link (SPA)');
                            return true;
                        } else {
                            console.log('[StepstoneJobSearch] ⚠️ Jobs may still be loading, but continuing...');
                            return true;
                        }
                    }
                }
            }
            
            // PRIORITY 3: Fallback - URL manipulation (causes full page reload, but resume logic handles it)
            // Only use if button/link clicks failed
            console.log('[StepstoneJobSearch] ⚠️ Button/link navigation failed, trying URL manipulation as fallback...');
            console.log('[StepstoneJobSearch] ⚠️  This will cause page reload, but resume logic will continue auto-apply');
            
            const currentUrl = new URL(window.location.href);
            const searchParams = currentUrl.searchParams;
            
            // StepStone uses different parameter names for pagination
            const pageParams = ['page', 'p', 'offset'];
            
            for (const param of pageParams) {
                if (searchParams.has(param) || param === 'page') {
                    // Store state before reload (for resume logic)
                    try {
                        await chrome.storage.local.set({
                            'stepstonePaginationState': {
                                currentPage: targetPage,
                                timestamp: Date.now()
                            },
                            'stepstoneAutoApplyRunning': true
                        });
                        console.log(`[StepstoneJobSearch] ✅ Stored pagination state for resume (page ${targetPage})`);
                    } catch (error) {
                        console.error('[StepstoneJobSearch] Failed to store pagination state:', error);
                    }
                    
                    console.log(`[StepstoneJobSearch] 🔄 Using URL manipulation with param '${param}' (page ${targetPage})`);
                    console.log(`[StepstoneJobSearch] ⚠️  Page will reload, but auto-apply will resume from page ${targetPage}`);
                    searchParams.set(param, targetPage.toString());
                    window.location.href = currentUrl.toString();
                    // Script will reload, but resume logic in startAutoApply() will continue
                    return true;
                }
            }
            
            console.log('[StepstoneJobSearch] ❌ Could not find pagination controls or navigation method');
            return false;
            
        } catch (error) {
            console.error('[StepstoneJobSearch] Error navigating to next page:', error);
            return false;
        }
    }
    
    /**
     * Wait for jobs to load after navigation (like LinkedIn)
     * @returns {Promise<boolean>} - True if jobs are loaded
     */
    static async waitForJobsToLoad(maxAttempts = 10) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            // Check if job elements are present
            const jobCards = document.querySelectorAll('article[data-at="job-item"][class^="res"]');
            if (jobCards.length > 0) {
                console.log(`[StepstoneJobSearch] Jobs loaded: found ${jobCards.length} jobs`);
                return true;
            }
            
            // Also check for job count element as indicator
            const jobCountElement = document.querySelector('[data-at="search-jobs-count"]');
            if (jobCountElement && jobCountElement.textContent.trim()) {
                console.log('[StepstoneJobSearch] Job count element found, page likely loaded');
                return true;
            }
            
            if (attempt < maxAttempts - 1) {
                await this.wait(500); // Wait 500ms between checks
            }
        }
        
        console.log('[StepstoneJobSearch] Timeout waiting for jobs to load');
        return false;
    }
    
    /**
     * Check if currently on the last page (like LinkedIn)
     * @returns {Promise<boolean>} - True if on last page
     */
    static async isOnLastPage() {
        try {
            // Look for "next" button - if disabled or not found, likely on last page
            const nextSelectors = [
                'a[aria-label*="next" i]',
                'button[aria-label*="next" i]',
                'a[title*="weiter" i]',
                'button[title*="weiter" i]',
                'a[title*="Next" i]',
                'button[title*="Next" i]',
                '.next',
                '[class*="next"]'
            ];
            
            for (const selector of nextSelectors) {
                const nextButton = document.querySelector(selector);
                if (nextButton) {
                    // If button exists but is disabled, we're on last page
                    if (nextButton.disabled || nextButton.getAttribute('aria-disabled') === 'true') {
                        console.log('[StepstoneJobSearch] Next button found but disabled - on last page');
                        return true;
                    }
                    // If button exists and is enabled, we're not on last page
                    console.log('[StepstoneJobSearch] Next button found and enabled - not on last page');
                    return false;
                }
            }
            
            // If no next button found, assume last page
            console.log('[StepstoneJobSearch] No next button found - assuming last page');
            return true;
        } catch (error) {
            console.error('[StepstoneJobSearch] Error checking if on last page:', error);
            return true; // Assume last page if error (fail safe)
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