class FiltersManager {
  constructor() {
    this.state = {
      filters: [],
      loading: false,
      error: null
    };
    this.listeners = [];
    
    // No need to initialize mock data - will load from API
  }

  // Add a listener for state changes
  addListener(callback) {
    this.listeners.push(callback);
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }

  // Notify all listeners of state changes
  notifyListeners() {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Update state and notify listeners
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  // Save filters to local storage (deprecated - now using API)
  saveToStorage() {
    // No longer needed - data is persisted via API
    console.warn('saveToStorage is deprecated - data is now persisted via API');
  }

  // Load filters for a user from API
  async loadFilters(userId) {
    if (!userId) {
      this.setState({ filters: [], loading: false, error: null });
      return { success: false, error: 'No user ID provided' };
    }

    this.setState({ loading: true, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'GET',
        url: `/api/users/${userId}/filters`
      });

      if (response.success) {
        this.setState({ 
          filters: response.data, 
          loading: false, 
          error: null 
        });
        return { success: true, filters: response.data };
      } else {
        throw new Error(response.error || 'Failed to load filters');
      }
    } catch (error) {
      console.error('Error loading filters:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to load filters' 
      });
      return { success: false, error: 'Failed to load filters' };
    }
  }

  // Create a new filter via API
  async createFilter(userId, filterData) {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    this.setState({ loading: true, error: null });

    try {
      console.log('Sending API request:', {
        action: 'apiRequest',
        method: 'POST',
        url: `/api/users/${userId}/filters`,
        data: filterData
      });

      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'POST',
        url: `/api/users/${userId}/filters`,
        data: filterData
      });

      console.log('Received API response:', response);

      if (response.success) {
        const newFilter = response.data;
        const updatedFilters = [...this.state.filters, newFilter];
        this.setState({ filters: updatedFilters, loading: false });
        return { success: true, filter: newFilter };
      } else {
        throw new Error(response.error || 'Failed to create filter');
      }
    } catch (error) {
      console.error('Error creating filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to create filter' 
      });
      return { success: false, error: 'Failed to create filter' };
    }
  }

  // Update an existing filter via API
  async updateFilter(userId, filterId, filterData) {
    if (!userId || !filterId) {
      return { success: false, error: 'Missing user ID or filter ID' };
    }

    this.setState({ loading: true, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'PUT',
        url: `/api/filters/${filterId}`,
        data: filterData
      });

      if (response.success) {
        const updatedFilter = response.data;
        const updatedFilters = this.state.filters.map(filter => 
          filter.id === filterId ? updatedFilter : filter
        );
        
        this.setState({ filters: updatedFilters, loading: false });
        return { success: true, filter: updatedFilter };
      } else {
        throw new Error(response.error || 'Failed to update filter');
      }
    } catch (error) {
      console.error('Error updating filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to update filter' 
      });
      return { success: false, error: 'Failed to update filter' };
    }
  }

  // Delete a filter via API
  async deleteFilter(userId, filterId) {
    if (!userId || !filterId) {
      return { success: false, error: 'Missing user ID or filter ID' };
    }

    this.setState({ loading: true, error: null });

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'DELETE',
        url: `/api/filters/${filterId}`
      });

      if (response.success) {
        const updatedFilters = this.state.filters.filter(filter => filter.id !== filterId);
        this.setState({ filters: updatedFilters, loading: false });
        return { success: true };
      } else {
        throw new Error(response.error || 'Failed to delete filter');
      }
    } catch (error) {
      console.error('Error deleting filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to delete filter' 
      });
      return { success: false, error: 'Failed to delete filter' };
    }
  }

  // Test filters against a job using API
  async testFilters(userId, jobData) {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'apiRequest',
        method: 'POST',
        url: `/api/users/${userId}/filters/test`,
        data: jobData
      });

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        throw new Error(response.error || 'Failed to test filters');
      }
    } catch (error) {
      console.error('Error testing filters:', error);
      return { success: false, error: 'Failed to test filters' };
    }
  }

  // Test filters against a job (local implementation for backward compatibility)
  testFiltersLocal(jobData) {
    const { filters } = this.state;
    const results = {
      shouldApply: true,
      reasons: [],
      error: null
    };

    for (const filter of filters) {
      if (!filter.is_active) continue;

      let matches = false;
      let matchReason = '';

      switch (filter.type) {
        case 'job_title':
          matches = this.matchesText(jobData.title || '', filter.keywords, filter.match_type);
          matchReason = `Job title ${filter.match_type === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
        case 'company_name':
          matches = this.matchesText(jobData.company || '', filter.keywords, filter.match_type);
          matchReason = `Company name ${filter.match_type === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
        case 'job_description':
          matches = this.matchesText(jobData.description || '', filter.keywords, filter.match_type);
          matchReason = `Job description ${filter.match_type === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
      }

      if (matches) {
        if (filter.action === 'block') {
          results.shouldApply = false;
          results.reasons = [`Blocked: ${matchReason}`];
          break; // Stop processing if blocked
        } else if (filter.action === 'allow') {
          results.reasons = [`Allowed: ${matchReason}`];
        }
      }
    }

    return results;
  }

  // Helper method to check if text matches keywords
  matchesText(text, keywords, matchType) {
    if (!text || !keywords || keywords.length === 0) return false;
    
    const textLower = text.toLowerCase();
    
    if (matchType === 'contains') {
      return keywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    } else if (matchType === 'not_contains') {
      return !keywords.some(keyword => textLower.includes(keyword.toLowerCase()));
    }
    
    return false;
  }

  // Get default filter templates (deprecated - now using API)
  getDefaultFilters() {
    // No longer needed - default filters are created via API
    console.warn('getDefaultFilters is deprecated - default filters are now created via API');
    return [];
  }
}

// Create singleton instance
const filtersManager = new FiltersManager();

export default filtersManager;
