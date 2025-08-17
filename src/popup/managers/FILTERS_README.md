# Job Filters Feature

## Overview

The Job Filters feature allows users to automatically filter job applications based on specific criteria before applying. This helps ensure that only relevant jobs are processed, saving time and improving application quality.

## Features

### Filter Types
- **Job Title**: Filter based on job title keywords
- **Company Name**: Filter based on company name keywords  
- **Job Description**: Filter based on job description content

### Filter Actions
- **Allow**: Only apply to jobs that match this filter
- **Block**: Skip jobs that match this filter

### Match Types
- **Contains**: Job must contain any of the specified keywords
- **Does not contain**: Job must NOT contain any of the specified keywords

## How It Works

1. **Filter Creation**: Users create filters with specific criteria
2. **Auto-Application**: When auto-apply is triggered, filters are evaluated against job data
3. **Decision Making**: Jobs are either allowed or blocked based on filter rules
4. **Logging**: All filter decisions are logged for transparency

## Filter Priority

Filters are evaluated in the following order:
1. **Block filters** are checked first - if any block filter matches, the job is rejected
2. **Allow filters** are checked next - if any allow filter matches, the job is approved
3. If no filters match, the job is allowed by default

## Example Use Cases

### Frontend Developer Focus
```
Filter: "Frontend Developer"
Type: Job Title
Keywords: frontend, front-end, react, vue, angular
Action: Allow
Match: Contains
```

### Avoid Consulting Companies
```
Filter: "Block Consulting"
Type: Company Name
Keywords: consulting, agency, outsourcing
Action: Block
Match: Contains
```

### Remote Work Preference
```
Filter: "Remote Work"
Type: Job Description
Keywords: remote, work from home, telecommute
Action: Allow
Match: Contains
```

## Technical Implementation

### Components
- `FiltersManager.js`: Manages filter state and API calls
- `FiltersComponent.js`: React UI component for filter management
- Database integration for persistent storage

### API Endpoints
- `GET /users/{userId}/filters` - Retrieve user filters
- `POST /users/{userId}/filters` - Create new filter
- `PUT /users/{userId}/filters/{filterId}` - Update existing filter
- `DELETE /users/{userId}/filters/{filterId}` - Delete filter

### Filter Testing
Users can test their filters against sample job data to see how they would work in practice.

## Future Enhancements

- **Advanced Logic**: AND/OR combinations between filters
- **Regex Support**: Pattern matching for power users
- **Filter Templates**: Pre-built filter sets for common roles
- **Success Tracking**: Monitor which filters lead to better job matches
- **Platform-Specific**: Different filter rules for different job sites

## Usage Instructions

1. Navigate to the "Filters" tab in the popup
2. Click "Add Filter" to create a new filter
3. Configure the filter type, keywords, action, and match type
4. Use "Test Filters" to verify filter behavior
5. Toggle filters on/off as needed
6. Edit or delete filters using the action buttons

## Best Practices

- **Start Simple**: Begin with basic filters and refine over time
- **Test Thoroughly**: Use the test feature to verify filter behavior
- **Regular Review**: Periodically review and update filters based on results
- **Keyword Quality**: Use specific, relevant keywords for better filtering
- **Balance**: Don't over-filter - ensure you're not missing good opportunities
