const Filter = require('./models/Filter.cjs');

/**
 * Filter Service
 * Provides high-level operations for managing job filters
 */
class FilterService {
    /**
     * Get all filters for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of Filter objects
     */
    async getFiltersByUserId(userId) {
        try {
            return await Filter.findByUserId(userId);
        } catch (error) {
            throw new Error(`Failed to get filters for user ${userId}: ${error.message}`);
        }
    }

    /**
     * Get active filters for a user
     * @param {string} userId - User ID
     * @returns {Promise<Array>} Array of active Filter objects
     */
    async getActiveFiltersByUserId(userId) {
        try {
            return await Filter.findActiveByUserId(userId);
        } catch (error) {
            throw new Error(`Failed to get active filters for user ${userId}: ${error.message}`);
        }
    }

    /**
     * Get a specific filter by ID
     * @param {string} filterId - Filter ID
     * @returns {Promise<Filter|null>} Filter object or null if not found
     */
    async getFilterById(filterId) {
        try {
            return await Filter.findById(filterId);
        } catch (error) {
            throw new Error(`Failed to get filter ${filterId}: ${error.message}`);
        }
    }

    /**
     * Create a new filter
     * @param {Object} filterData - Filter data
     * @param {string} filterData.user_id - User ID
     * @param {string} filterData.name - Filter name
     * @param {string} filterData.description - Filter description
     * @param {string} filterData.type - Filter type (job_title, company_name, job_description)
     * @param {Array<string>} filterData.keywords - Array of keywords
     * @param {string} filterData.action - Action (allow, block)
     * @param {string} filterData.match_type - Match type (contains, not_contains)
     * @param {boolean} filterData.is_active - Whether filter is active
     * @param {number} filterData.priority - Priority (higher = more important)
     * @returns {Promise<Filter>} Created Filter object
     */
    async createFilter(filterData) {
        try {
            // Validate required fields
            this.validateFilterData(filterData);
            
            // Set default values
            const data = {
                ...filterData,
                is_active: filterData.is_active !== undefined ? filterData.is_active : true,
                priority: filterData.priority || 0
            };

            return await Filter.create(data);
        } catch (error) {
            throw new Error(`Failed to create filter: ${error.message}`);
        }
    }

    /**
     * Update an existing filter
     * @param {string} filterId - Filter ID
     * @param {Object} updateData - Data to update
     * @returns {Promise<Filter>} Updated Filter object
     */
    async updateFilter(filterId, updateData) {
        try {
            const filter = await Filter.findById(filterId);
            if (!filter) {
                throw new Error(`Filter ${filterId} not found`);
            }

            // Validate update data if keywords are being updated
            if (updateData.keywords) {
                this.validateKeywords(updateData.keywords);
            }

            await filter.update(updateData);
            return filter;
        } catch (error) {
            throw new Error(`Failed to update filter ${filterId}: ${error.message}`);
        }
    }

    /**
     * Delete a filter
     * @param {string} filterId - Filter ID
     * @returns {Promise<boolean>} True if deleted successfully
     */
    async deleteFilter(filterId) {
        try {
            const filter = await Filter.findById(filterId);
            if (!filter) {
                throw new Error(`Filter ${filterId} not found`);
            }

            return await filter.delete();
        } catch (error) {
            throw new Error(`Failed to delete filter ${filterId}: ${error.message}`);
        }
    }

    /**
     * Toggle filter active status
     * @param {string} filterId - Filter ID
     * @returns {Promise<Filter>} Updated Filter object
     */
    async toggleFilterActive(filterId) {
        try {
            const filter = await Filter.findById(filterId);
            if (!filter) {
                throw new Error(`Filter ${filterId} not found`);
            }

            await filter.update({ is_active: !filter.is_active });
            return filter;
        } catch (error) {
            throw new Error(`Failed to toggle filter ${filterId}: ${error.message}`);
        }
    }

    /**
     * Update filter priority
     * @param {string} filterId - Filter ID
     * @param {number} priority - New priority value
     * @returns {Promise<Filter>} Updated Filter object
     */
    async updateFilterPriority(filterId, priority) {
        try {
            const filter = await Filter.findById(filterId);
            if (!filter) {
                throw new Error(`Filter ${filterId} not found`);
            }

            if (typeof priority !== 'number' || priority < 0) {
                throw new Error('Priority must be a non-negative number');
            }

            await filter.update({ priority });
            return filter;
        } catch (error) {
            throw new Error(`Failed to update priority for filter ${filterId}: ${error.message}`);
        }
    }

    /**
     * Test filters against job data
     * @param {string} userId - User ID
     * @param {Object} jobData - Job data to test
     * @param {string} jobData.job_title - Job title
     * @param {string} jobData.company_name - Company name
     * @param {string} jobData.job_description - Job description
     * @returns {Promise<Object>} Test results with decision and matched filters
     */
    async testFiltersAgainstJob(userId, jobData) {
        try {
            const activeFilters = await this.getActiveFiltersByUserId(userId);
            if (activeFilters.length === 0) {
                return {
                    decision: 'allow',
                    reason: 'No active filters',
                    matchedFilters: []
                };
            }

            // Sort filters by priority (highest first)
            const sortedFilters = activeFilters.sort((a, b) => b.priority - a.priority);
            
            let decision = 'allow'; // Default decision
            const matchedFilters = [];
            const reasons = [];

            for (const filter of sortedFilters) {
                const matchResult = this.evaluateFilter(filter, jobData);
                
                if (matchResult.matches) {
                    matchedFilters.push({
                        filterId: filter.id,
                        filterName: filter.name,
                        filterType: filter.type,
                        action: filter.action,
                        matchType: filter.match_type,
                        keywords: filter.keywords,
                        priority: filter.priority,
                        matchedValue: matchResult.matchedValue
                    });

                    // If this is a blocking filter, job is blocked
                    if (filter.action === 'block') {
                        decision = 'block';
                        reasons.push(`Blocked by filter "${filter.name}" (${filter.type}: ${filter.keywords.join(', ')})`);
                        break; // Stop processing, job is blocked
                    }
                    
                    // If this is an allowing filter, note it
                    if (filter.action === 'allow') {
                        reasons.push(`Allowed by filter "${filter.name}" (${filter.type}: ${filter.keywords.join(', ')})`);
                    }
                }
            }

            return {
                decision,
                reason: reasons.length > 0 ? reasons.join('; ') : 'No filters matched',
                matchedFilters
            };
        } catch (error) {
            throw new Error(`Failed to test filters against job: ${error.message}`);
        }
    }

    /**
     * Evaluate a single filter against job data
     * @param {Filter} filter - Filter to evaluate
     * @param {Object} jobData - Job data
     * @returns {Object} Match result
     */
    evaluateFilter(filter, jobData) {
        let textToCheck = '';
        let matchedValue = '';

        switch (filter.type) {
            case 'job_title':
                textToCheck = (jobData.job_title || '').toLowerCase();
                matchedValue = jobData.job_title || '';
                break;
            case 'company_name':
                textToCheck = (jobData.company_name || '').toLowerCase();
                matchedValue = jobData.company_name || '';
                break;
            case 'job_description':
                textToCheck = (jobData.job_description || '').toLowerCase();
                matchedValue = jobData.job_description || '';
                break;
            default:
                return { matches: false, matchedValue: '' };
        }

        const matches = filter.keywords.some(keyword => {
            const lowerKeyword = keyword.toLowerCase();
            if (filter.match_type === 'contains') {
                return textToCheck.includes(lowerKeyword);
            } else if (filter.match_type === 'not_contains') {
                return !textToCheck.includes(lowerKeyword);
            }
            return false;
        });

        return {
            matches,
            matchedValue: matches ? matchedValue : ''
        };
    }

    /**
     * Validate filter data
     * @param {Object} filterData - Filter data to validate
     * @throws {Error} If validation fails
     */
    validateFilterData(filterData) {
        const requiredFields = ['user_id', 'name', 'type', 'keywords', 'action', 'match_type'];
        
        for (const field of requiredFields) {
            if (!filterData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        // Validate type
        const validTypes = ['job_title', 'company_name', 'job_description'];
        if (!validTypes.includes(filterData.type)) {
            throw new Error(`Invalid type: ${filterData.type}. Must be one of: ${validTypes.join(', ')}`);
        }

        // Validate action
        const validActions = ['allow', 'block'];
        if (!validActions.includes(filterData.action)) {
            throw new Error(`Invalid action: ${filterData.action}. Must be one of: ${validActions.join(', ')}`);
        }

        // Validate match_type
        const validMatchTypes = ['contains', 'not_contains'];
        if (!validMatchTypes.includes(filterData.match_type)) {
            throw new Error(`Invalid match_type: ${filterData.match_type}. Must be one of: ${validMatchTypes.join(', ')}`);
        }

        // Validate keywords
        this.validateKeywords(filterData.keywords);
    }

    /**
     * Validate keywords array
     * @param {Array} keywords - Keywords to validate
     * @throws {Error} If validation fails
     */
    validateKeywords(keywords) {
        if (!Array.isArray(keywords)) {
            throw new Error('Keywords must be an array');
        }

        if (keywords.length === 0) {
            throw new Error('Keywords array cannot be empty');
        }

        for (const keyword of keywords) {
            if (typeof keyword !== 'string' || keyword.trim().length === 0) {
                throw new Error('All keywords must be non-empty strings');
            }
        }
    }

    /**
     * Get filter statistics for a user
     * @param {string} userId - User ID
     * @returns {Promise<Object>} Filter statistics
     */
    async getFilterStats(userId) {
        try {
            const allFilters = await this.getFiltersByUserId(userId);
            const activeFilters = allFilters.filter(f => f.is_active);
            
            const stats = {
                total: allFilters.length,
                active: activeFilters.length,
                inactive: allFilters.length - activeFilters.length,
                byType: {
                    job_title: 0,
                    company_name: 0,
                    job_description: 0
                },
                byAction: {
                    allow: 0,
                    block: 0
                }
            };

            allFilters.forEach(filter => {
                stats.byType[filter.type]++;
                stats.byAction[filter.action]++;
            });

            return stats;
        } catch (error) {
            throw new Error(`Failed to get filter stats for user ${userId}: ${error.message}`);
        }
    }
}

module.exports = FilterService;
