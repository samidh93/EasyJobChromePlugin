import React, { useState, useEffect } from 'react';
import { Filter, Plus, Trash2, Edit, Eye, EyeOff, Check, X, AlertCircle, Target, Building, FileText, Play, Pause } from 'lucide-react';
import { filtersManager } from './index.js';

const FiltersComponent = ({ currentUser, onFiltersUpdate }) => {
  const [filters, setFilters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingFilter, setEditingFilter] = useState(null);
  const [showTestForm, setShowTestForm] = useState(false);
  const [testResults, setTestResults] = useState(null);

  // Form state for adding/editing filters
  const [filterForm, setFilterForm] = useState({
    name: '',
    type: 'job_title',
    keywords: '',
    action: 'allow',
    matchType: 'contains',
    isActive: true,
    description: ''
  });

  // Test form state
  const [testForm, setTestForm] = useState({
    title: '',
    company: '',
    description: ''
  });

  // Filter type options
  const FILTER_TYPES = [
    { value: 'job_title', label: 'Job Title', icon: Target },
    { value: 'company_name', label: 'Company Name', icon: Building },
    { value: 'job_description', label: 'Job Description', icon: FileText }
  ];

  // Action options
  const ACTIONS = [
    { value: 'allow', label: 'Allow', color: 'text-green-600' },
    { value: 'block', label: 'Block', color: 'text-red-600' }
  ];

  // Match type options
  const MATCH_TYPES = [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' }
  ];

  // Listen to filters manager state changes
  useEffect(() => {
    const unsubscribe = filtersManager.addListener((state) => {
      setFilters(state.filters);
      setLoading(state.loading);
    });

    return unsubscribe;
  }, []);

  // Load filters when component mounts or user changes
  useEffect(() => {
    if (currentUser) {
      filtersManager.loadFilters(currentUser.id);
    }
  }, [currentUser]);

  // Reset form when editing changes
  useEffect(() => {
    console.log('editingFilter changed:', editingFilter);
    if (editingFilter) {
      setFilterForm({
        name: editingFilter.name,
        type: editingFilter.type,
        keywords: editingFilter.keywords.join(', '),
        action: editingFilter.action,
        matchType: editingFilter.matchType,
        isActive: editingFilter.isActive,
        description: editingFilter.description
      });
    } else {
      resetForm();
    }
  }, [editingFilter]);

  const resetForm = () => {
    setFilterForm({
      name: '',
      type: 'job_title',
      keywords: '',
      action: 'allow',
      matchType: 'contains',
      isActive: true,
      description: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!filterForm.name.trim() || !filterForm.keywords.trim()) {
      setStatusMessage('Please fill in all required fields');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    const keywords = filterForm.keywords.split(',').map(k => k.trim()).filter(k => k);
    if (keywords.length === 0) {
      setStatusMessage('Please enter at least one keyword');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    const filterData = {
      ...filterForm,
      keywords
    };

    let result;
    if (editingFilter) {
      result = await filtersManager.updateFilter(currentUser.id, editingFilter.id, filterData);
    } else {
      result = await filtersManager.createFilter(currentUser.id, filterData);
    }

    if (result.success) {
      setStatusMessage(editingFilter ? 'Filter updated successfully!' : 'Filter created successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
      setShowAddForm(false);
      setEditingFilter(null);
      resetForm();
      if (onFiltersUpdate) onFiltersUpdate();
    } else {
      setStatusMessage(result.error || 'Failed to save filter');
      setTimeout(() => setStatusMessage(''), 3000);
    }
  };

  const handleDelete = async (filterId) => {
    if (confirm('Are you sure you want to delete this filter?')) {
      const result = await filtersManager.deleteFilter(currentUser.id, filterId);
      if (result.success) {
        setStatusMessage('Filter deleted successfully!');
        setTimeout(() => setStatusMessage(''), 3000);
        if (onFiltersUpdate) onFiltersUpdate();
      } else {
        setStatusMessage(result.error || 'Failed to delete filter');
        setTimeout(() => setStatusMessage(''), 3000);
      }
    }
  };

  const handleToggleActive = async (filter) => {
    const updatedFilter = { ...filter, isActive: !filter.isActive };
    const result = await filtersManager.updateFilter(currentUser.id, filter.id, updatedFilter);
    if (result.success) {
      if (onFiltersUpdate) onFiltersUpdate();
    }
  };

  const handleTestFilters = () => {
    if (!testForm.title.trim() && !testForm.company.trim() && !testForm.description.trim()) {
      setStatusMessage('Please enter at least one field to test');
      setTimeout(() => setStatusMessage(''), 3000);
      return;
    }

    const results = filtersManager.testFilters(testForm);
    setTestResults(results);
    setShowTestForm(false);
  };

  const addDefaultFilters = async () => {
    const defaultFilters = filtersManager.getDefaultFilters();
    let successCount = 0;
    
    for (const filter of defaultFilters) {
      const result = await filtersManager.createFilter(currentUser.id, filter);
      if (result.success) successCount++;
    }

    if (successCount > 0) {
      setStatusMessage(`Added ${successCount} default filters!`);
      setTimeout(() => setStatusMessage(''), 3000);
      if (onFiltersUpdate) onFiltersUpdate();
    }
  };

  const getFilterIcon = (type) => {
    const filterType = FILTER_TYPES.find(ft => ft.value === type);
    const IconComponent = filterType ? filterType.icon : Target;
    return <IconComponent size={16} />;
  };

  const getActionColor = (action) => {
    return action === 'allow' ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="tab-content">
      <div className="filters-header">
        <h2>Job Filters</h2>
        <p className="filters-description">
          Configure filters to automatically allow or block job applications based on title, company, or description.
        </p>
      </div>

      {/* Status Message */}
      {statusMessage && (
        <div className={`status-message ${statusMessage.includes('successfully') ? 'success' : 'error'}`}>
          {statusMessage}
        </div>
      )}

      {/* Actions Bar */}
      <div className="actions-bar">
        <button
          className="primary-button"
          onClick={() => setShowAddForm(true)}
        >
          <Plus size={16} />
          Add Filter
        </button>
        <button
          className="secondary-button"
          onClick={() => setShowTestForm(true)}
        >
          <Play size={16} />
          Test Filters
        </button>
        <button
          className="secondary-button"
          onClick={addDefaultFilters}
        >
          <Filter size={16} />
          Add Defaults
        </button>
      </div>

      {/* Filters List */}
      <div className="filters-list">
        {loading ? (
          <div className="loading-state">Loading filters...</div>
        ) : filters.length === 0 ? (
          <div className="empty-state">
            <Filter size={48} className="empty-icon" />
            <h3>No filters configured</h3>
            <p>Create your first filter to start automatically filtering job applications.</p>
            <button
              className="primary-button"
              onClick={() => setShowAddForm(true)}
            >
              Create First Filter
            </button>
          </div>
        ) : (
          filters.map((filter) => (
            <div key={filter.id} className={`filter-item ${!filter.isActive ? 'inactive' : ''}`}>
              <div className="filter-header">
                <div className="filter-info">
                  <div className="filter-icon">
                    {getFilterIcon(filter.type)}
                  </div>
                  <div className="filter-details">
                    <h4 className="filter-name">{filter.name}</h4>
                    <p className="filter-description">{filter.description}</p>
                  </div>
                </div>
                <div className="filter-actions">
                  <button
                    className={`action-button ${filter.isActive ? 'active' : 'inactive'}`}
                    onClick={() => handleToggleActive(filter)}
                    title={filter.isActive ? 'Deactivate filter' : 'Activate filter'}
                  >
                    {filter.isActive ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button
                    className="action-button edit"
                    onClick={() => {
                      console.log('Edit button clicked for filter:', filter);
                      setEditingFilter(filter);
                    }}
                    title="Edit filter"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    className="action-button delete"
                    onClick={() => handleDelete(filter.id)}
                    title="Delete filter"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <div className="filter-rules">
                <div className="filter-rule">
                  <span className="rule-label">Type:</span>
                  <span className="rule-value">{FILTER_TYPES.find(ft => ft.value === filter.type)?.label}</span>
                </div>
                <div className="filter-rule">
                  <span className="rule-label">Keywords:</span>
                  <span className="rule-value">{filter.keywords.join(', ')}</span>
                </div>
                <div className="filter-rule">
                  <span className="rule-label">Match:</span>
                  <span className="rule-value">{MATCH_TYPES.find(mt => mt.value === filter.matchType)?.label}</span>
                </div>
                <div className="filter-rule">
                  <span className="rule-label">Action:</span>
                  <span className={`rule-value ${getActionColor(filter.action)}`}>
                    {ACTIONS.find(a => a.value === filter.action)?.label}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Filter Form */}
      {(showAddForm || editingFilter) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>{editingFilter ? 'Edit Filter' : 'Add New Filter'}</h3>
              <button
                className="close-button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingFilter(null);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="filter-form">
              <div className="form-group">
                <label htmlFor="filter-name">Filter Name *</label>
                <input
                  id="filter-name"
                  type="text"
                  value={filterForm.name}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Frontend Developer, Remote Work"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="filter-description">Description</label>
                <input
                  id="filter-description"
                  type="text"
                  value={filterForm.description}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this filter does"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="filter-type">Filter Type *</label>
                  <select
                    id="filter-type"
                    value={filterForm.type}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, type: e.target.value }))}
                    required
                  >
                    {FILTER_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="filter-action">Action *</label>
                  <select
                    id="filter-action"
                    value={filterForm.action}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, action: e.target.value }))}
                    required
                  >
                    {ACTIONS.map(action => (
                      <option key={action.value} value={action.value}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="filter-match-type">Match Type *</label>
                  <select
                    id="filter-match-type"
                    value={filterForm.matchType}
                    onChange={(e) => setFilterForm(prev => ({ ...prev, matchType: e.target.value }))}
                    required
                  >
                    {MATCH_TYPES.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="filter-active">Status</label>
                  <div className="checkbox-group">
                    <input
                      id="filter-active"
                      type="checkbox"
                      checked={filterForm.isActive}
                      onChange={(e) => setFilterForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    />
                    <label htmlFor="filter-active">Active</label>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="filter-keywords">Keywords *</label>
                <input
                  id="filter-keywords"
                  type="text"
                  value={filterForm.keywords}
                  onChange={(e) => setFilterForm(prev => ({ ...prev, keywords: e.target.value }))}
                  placeholder="Enter keywords separated by commas (e.g., react, frontend, remote)"
                  required
                />
                <div className="form-help">
                  Separate multiple keywords with commas. The filter will match if any keyword is found.
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingFilter(null);
                    resetForm();
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-button">
                  {editingFilter ? 'Update Filter' : 'Create Filter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Test Filters Form */}
      {showTestForm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Test Your Filters</h3>
              <button
                className="close-button"
                onClick={() => setShowTestForm(false)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="test-form">
              <p className="test-description">
                Enter job details to see how your filters would work on a real job posting.
              </p>
              
              <div className="form-group">
                <label htmlFor="test-title">Job Title</label>
                <input
                  id="test-title"
                  type="text"
                  value={testForm.title}
                  onChange={(e) => setTestForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Senior Frontend Developer"
                />
              </div>

              <div className="form-group">
                <label htmlFor="test-company">Company Name</label>
                <input
                  id="test-company"
                  type="text"
                  value={testForm.company}
                  onChange={(e) => setTestForm(prev => ({ ...prev, company: e.target.value }))}
                  placeholder="e.g., Google, Microsoft"
                />
              </div>

              <div className="form-group">
                <label htmlFor="test-description">Job Description</label>
                <textarea
                  id="test-description"
                  value={testForm.description}
                  onChange={(e) => setTestForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Paste the job description here..."
                  rows={4}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowTestForm(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={handleTestFilters}
                >
                  Test Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {testResults && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Filter Test Results</h3>
              <button
                className="close-button"
                onClick={() => setTestResults(null)}
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="test-results">
              <div className={`result-summary ${testResults.shouldApply ? 'allowed' : 'blocked'}`}>
                <div className="result-icon">
                  {testResults.shouldApply ? <Check size={24} /> : <X size={24} />}
                </div>
                <div className="result-text">
                  <h4>Application {testResults.shouldApply ? 'Allowed' : 'Blocked'}</h4>
                  <p>
                    {testResults.shouldApply 
                      ? 'This job passes all your filters and would be allowed for application.'
                      : 'This job was blocked by one or more of your filters.'
                    }
                  </p>
                </div>
              </div>

              {testResults.reasons.length > 0 && (
                <div className="result-details">
                  <h5>Filter Results:</h5>
                  <ul className="result-reasons">
                    {testResults.reasons.map((reason, index) => (
                      <li key={index} className="result-reason">
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {testResults.matchedFilters.length > 0 && (
                <div className="result-details">
                  <h5>Matched Filters:</h5>
                  <div className="matched-filters">
                    {testResults.matchedFilters.map((filter, index) => (
                      <div key={index} className="matched-filter">
                        <span className="filter-name">{filter.name}</span>
                        <span className={`filter-action ${getActionColor(filter.action)}`}>
                          {filter.action === 'allow' ? '✓ Allow' : '✗ Block'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setTestResults(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FiltersComponent;
