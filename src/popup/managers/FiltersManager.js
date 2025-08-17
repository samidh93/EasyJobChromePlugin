class FiltersManager {
  constructor() {
    this.state = {
      filters: [],
      loading: false,
      error: null
    };
    this.listeners = [];
    
    // Initialize with mock data for testing
    this.initializeMockData();
  }

  // Initialize with some mock filters for testing
  initializeMockData() {
    const storedFilters = localStorage.getItem('easyjob_filters');
    if (!storedFilters) {
      // Create default mock filters
      const defaultFilters = this.getDefaultFilters();
      localStorage.setItem('easyjob_filters', JSON.stringify(defaultFilters));
      this.state.filters = defaultFilters;
    } else {
      this.state.filters = JSON.parse(storedFilters);
    }
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

  // Save filters to local storage
  saveToStorage() {
    localStorage.setItem('easyjob_filters', JSON.stringify(this.state.filters));
  }

  // Load filters for a user (mock implementation)
  async loadFilters(userId) {
    if (!userId) {
      this.setState({ filters: [], loading: false, error: null });
      return { success: false, error: 'No user ID provided' };
    }

    this.setState({ loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Load from local storage
      const storedFilters = localStorage.getItem('easyjob_filters');
      const filters = storedFilters ? JSON.parse(storedFilters) : [];
      
      this.setState({ 
        filters, 
        loading: false, 
        error: null 
      });
      
      return { success: true, filters };
    } catch (error) {
      console.error('Error loading filters:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to load filters' 
      });
      return { success: false, error: 'Failed to load filters' };
    }
  }

  // Create a new filter (mock implementation)
  async createFilter(userId, filterData) {
    if (!userId) {
      return { success: false, error: 'No user ID provided' };
    }

    this.setState({ loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const newFilter = {
        id: Date.now(), // Simple ID generation for mock
        ...filterData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const updatedFilters = [...this.state.filters, newFilter];
      this.setState({ filters: updatedFilters, loading: false });
      this.saveToStorage();
      
      return { success: true, filter: newFilter };
    } catch (error) {
      console.error('Error creating filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to create filter' 
      });
      return { success: false, error: 'Failed to create filter' };
    }
  }

  // Update an existing filter (mock implementation)
  async updateFilter(userId, filterId, filterData) {
    if (!userId || !filterId) {
      return { success: false, error: 'Missing user ID or filter ID' };
    }

    this.setState({ loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedFilters = this.state.filters.map(filter => 
        filter.id === filterId 
          ? { ...filter, ...filterData, updated_at: new Date().toISOString() }
          : filter
      );
      
      this.setState({ filters: updatedFilters, loading: false });
      this.saveToStorage();
      
      return { success: true, filter: updatedFilters.find(f => f.id === filterId) };
    } catch (error) {
      console.error('Error updating filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to update filter' 
      });
      return { success: false, error: 'Failed to update filter' };
    }
  }

  // Delete a filter (mock implementation)
  async deleteFilter(userId, filterId) {
    if (!userId || !filterId) {
      return { success: false, error: 'Missing user ID or filter ID' };
    }

    this.setState({ loading: true, error: null });

    try {
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const updatedFilters = this.state.filters.filter(filter => filter.id !== filterId);
      this.setState({ filters: updatedFilters, loading: false });
      this.saveToStorage();
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting filter:', error);
      this.setState({ 
        loading: false, 
        error: 'Failed to delete filter' 
      });
      return { success: false, error: 'Failed to delete filter' };
    }
  }

  // Test filters against a job (for preview/testing)
  testFilters(jobData) {
    const { filters } = this.state;
    const results = {
      shouldApply: true,
      reasons: [],
      matchedFilters: []
    };

    for (const filter of filters) {
      if (!filter.isActive) continue;

      let matches = false;
      let matchReason = '';

      switch (filter.type) {
        case 'job_title':
          matches = this.matchesText(jobData.title || '', filter.keywords, filter.matchType);
          matchReason = `Job title ${filter.matchType === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
        case 'company_name':
          matches = this.matchesText(jobData.company || '', filter.keywords, filter.matchType);
          matchReason = `Company name ${filter.matchType === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
        case 'job_description':
          matches = this.matchesText(jobData.description || '', filter.keywords, filter.matchType);
          matchReason = `Job description ${filter.matchType === 'contains' ? 'contains' : 'does not contain'} "${filter.keywords.join(', ')}"`;
          break;
      }

      if (matches) {
        results.matchedFilters.push(filter);
        if (filter.action === 'block') {
          results.shouldApply = false;
          results.reasons.push(`Blocked: ${matchReason}`);
        } else if (filter.action === 'allow') {
          results.reasons.push(`Allowed: ${matchReason}`);
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

  // Get default filter templates
  getDefaultFilters() {
    return [
      {
        id: 1,
        name: 'Frontend Developer',
        type: 'job_title',
        keywords: ['frontend', 'front-end', 'react', 'vue', 'angular'],
        action: 'allow',
        matchType: 'contains',
        isActive: true,
        description: 'Allow frontend development roles',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 2,
        name: 'Block Consulting Companies',
        type: 'company_name',
        keywords: ['consulting', 'agency', 'outsourcing'],
        action: 'block',
        matchType: 'contains',
        isActive: true,
        description: 'Block consulting and agency companies',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 3,
        name: 'Remote Work Preferred',
        type: 'job_description',
        keywords: ['remote', 'work from home', 'telecommute'],
        action: 'allow',
        matchType: 'contains',
        isActive: true,
        description: 'Prefer remote work opportunities',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];
  }
}

// Create singleton instance
const filtersManager = new FiltersManager();

export default filtersManager;
