import yaml from 'js-yaml';
import memoryStore from './MemoryStore.js';

/**
 * ProfileLoader class to handle YAML profile loading and processing
 */
class ProfileLoader {
  constructor() {}

  /**
   * Parse YAML content to a JavaScript object
   * @param {string} yamlContent - YAML content to parse
   * @returns {Object|null} - Parsed YAML or null if failed
   */
  parseUserContext(yamlContent) {
    try {
      if (!yamlContent) return null;
      
      const parsed = yaml.load(yamlContent);
      console.log('YAML parsed successfully');
      return parsed;
    } catch (error) {
      console.error('Error parsing YAML:', error);
      return null;
    }
  }

  /**
   * Count the total number of fields in the data object
   * @param {Object} obj - The object to count fields for
   * @returns {number} - The total number of fields
   */
  countFields(obj) {
    let count = 0;
    
    const traverse = (o) => {
      for (const [key, value] of Object.entries(o)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          traverse(value);
        } else {
          count++;
        }
      }
    };
    
    traverse(obj);
    return count;
  }

  /**
   * Better stringify complex objects and arrays
   * @param {any} value - The value to stringify
   * @param {string} key - The key name for context-aware formatting
   * @returns {string} - Formatted string representation
   */
  formatValueForEmbedding(value, key = '') {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Add contextual information for specific fields to improve semantic search
    const lowerKey = key.toLowerCase();
    
    // Enhance salary information with alternative phrasings
    if (lowerKey.includes('salary') || lowerKey.includes('compensation')) {
      return `Salary: ${value}, Expected salary: ${value}, Desired compensation: ${value}, Annual salary: ${value}`;
    }
    
    // Enhance phone information
    if (lowerKey.includes('phone')) {
      return `Phone number: ${value}, Contact number: ${value}, Tel: ${value}`;
    }
    
    // Enhance visa information
    if (lowerKey.includes('visa')) {
      return `Visa required: ${value}, Visa status: ${value}, Work permit: ${value}`;
    }
    
    // For arrays, format each item and join them
    if (Array.isArray(value)) {
      return value.map(item => this.formatValueForEmbedding(item)).join(', ');
    }
    
    // For objects, create a formatted string with key-value pairs
    if (typeof value === 'object') {
      // Extract meaningful properties and format them
      return Object.entries(value)
        .map(([key, val]) => {
          // Skip internal or empty properties
          if (key.startsWith('_') || val === null || val === undefined) {
            return null;
          }
          
          // Handle nested objects/arrays recursively
          const formattedVal = this.formatValueForEmbedding(val, key);
          if (formattedVal) {
            return `${key}: ${formattedVal}`;
          }
          return null;
        })
        .filter(Boolean) // Remove null entries
        .join(', ');
    }
    
    // For primitive values, just convert to string
    return String(value);
  }

  /**
   * Process user data from YAML and store as embeddings
   * @param {string} yamlContent - YAML content to process
   * @param {function} progressCallback - Optional callback for progress updates
   * @returns {Promise<Object>} - Processing result with success status
   */
  async processUserContext(yamlContent, progressCallback = null) {
    try {
      if (!yamlContent) {
        console.error('No YAML content provided');
        return { success: false, error: 'No YAML content provided' };
      }

      // Parse YAML
      const userData = this.parseUserContext(yamlContent);
      if (!userData) {
        console.error('Failed to parse YAML content');
        return { success: false, error: 'Failed to parse YAML content' };
      }
      
      console.log("User context parsed successfully, processing fields for embeddings");
      
      // Check the size of the YAML content in bytes
      const yamlSize = new TextEncoder().encode(yamlContent).length;
      console.log(`YAML content size: ${yamlSize} bytes (${(yamlSize / 1024).toFixed(2)} KB)`);
      
      // Count total fields for progress reporting
      const totalFields = this.countFields(userData);
      let processedFields = 0;
      
      console.log(`Total fields to process: ${totalFields}`);
      
      // Create a flat array of all fields to process
      const fieldsToProcess = [];
      
      // Extract all fields into a flat array
      for (const [key, value] of Object.entries(userData)) {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Handle nested objects
          for (const [subKey, subValue] of Object.entries(value)) {
            const entryKey = `${key}.${subKey}`;
            // Use the new formatter with key context
            const entryValue = this.formatValueForEmbedding(subValue, subKey);
            fieldsToProcess.push({ key: entryKey, value: entryValue });
          }
          
          // Extract important fields for enriched semantic search
          if (key === 'personal_information') {
            // Add enhanced salary information if available
            if (value.salary) {
              fieldsToProcess.push({ 
                key: 'salary_information',
                value: `Expected salary: ${value.salary}, Desired compensation: ${value.salary}, Annual salary expectation: ${value.salary}, Salary requirement: ${value.salary}, Compensation expectation: ${value.salary}`
              });
            }
            
            // Add enhanced contact information
            if (value.phone) {
              const prefix = value.phone_prefix || '';
              fieldsToProcess.push({
                key: 'contact_information',
                value: `Phone number: ${prefix}${value.phone}, Email: ${value.email || ''}, Contact details: ${prefix}${value.phone} and ${value.email || ''}`
              });
            }
            
            // Add enhanced location information
            if (value.country || value.city) {
              fieldsToProcess.push({
                key: 'location_information',
                value: `Located in ${value.city || ''}, ${value.country || ''}, Location: ${value.city || ''}, ${value.country || ''}`
              });
            }
          }
        } else {
          // Handle top-level values with new formatter
          const formattedValue = this.formatValueForEmbedding(value, key);
          fieldsToProcess.push({ key, value: formattedValue });
        }
      }
      
      console.log(`Prepared ${fieldsToProcess.length} fields to process for embeddings`);
      
      // Special case: Add an experience summary by extracting years if possible
      if (userData.experiences && Array.isArray(userData.experiences)) {
        try {
          // Try to calculate years of experience
          const yearsRegex = /(\d{4})\s*-\s*(Present|\d{4})/i;
          let experienceSummary = '';
          
          userData.experiences.forEach(exp => {
            if (exp.employment_period) {
              experienceSummary += `${exp.position || 'Role'} at ${exp.company || 'Company'} (${exp.employment_period}). `;
            }
          });
          
          if (experienceSummary) {
            fieldsToProcess.push({
              key: 'experience_summary',
              value: `Professional experience: ${experienceSummary} Years of experience in software development, engineering, and related fields.`
            });
          }
        } catch (e) {
          console.warn('Error creating experience summary:', e);
        }
      }
      
      // Calculate the estimated size of the dataset before processing
      const estimatedDataSize = JSON.stringify(fieldsToProcess).length;
      console.log(`Estimated data size before embeddings: ${estimatedDataSize} bytes (${(estimatedDataSize / 1024).toFixed(2)} KB)`);
      
      // Check if we need to use chunking for large datasets
      // Chrome storage has a limit typically around 5-10 MB
      const useChunking = estimatedDataSize > 1000000; // 1MB threshold for chunking
      const chunkSize = useChunking ? 10 : fieldsToProcess.length;
      
      if (useChunking) {
        console.log(`Using chunking strategy for large dataset (${chunkSize} fields per chunk)`);
      }
      
      // Process in batches to avoid overwhelming the system
      const batchSize = 5;
      const totalBatches = Math.ceil(fieldsToProcess.length / batchSize);
      
      console.log(`Processing embeddings in ${totalBatches} batches of ${batchSize}`);
      
      // Clear existing data before starting if we're processing everything
      if (useChunking) {
        try {
          // Only clear if we're using chunking to avoid data loss
          await memoryStore.clearAllData();
          console.log('Cleared existing data before processing chunks');
        } catch (clearError) {
          console.warn('Error clearing existing data:', clearError);
        }
      }
      
      let storageErrors = 0;
      
      for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
        const startIdx = batchIndex * batchSize;
        const endIdx = Math.min((batchIndex + 1) * batchSize, fieldsToProcess.length);
        const batch = fieldsToProcess.slice(startIdx, endIdx);
        
        console.log(`Processing batch ${batchIndex + 1}/${totalBatches} (${batch.length} fields)`);
        
        // Process each batch concurrently
        const batchPromises = batch.map(field => memoryStore.addEntry(field.key, field.value));
        const results = await Promise.allSettled(batchPromises);
        
        // Check for failures
        const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value));
        if (failures.length > 0) {
          console.warn(`${failures.length} embeddings failed in batch ${batchIndex + 1}`);
        }
        
        // Update progress after each batch
        processedFields += batch.length;
        if (progressCallback) {
          const progress = Math.round((processedFields / totalFields) * 100);
          progressCallback({ 
            progress, 
            message: `Processing batch ${batchIndex + 1}/${totalBatches} (${processedFields}/${totalFields} fields)`
          });
        }
        
        // Save chunks to storage periodically if using chunking strategy
        if (useChunking && (batchIndex + 1) % Math.ceil(chunkSize / batchSize) === 0) {
          try {
            console.log(`Saving chunk to storage after batch ${batchIndex + 1}...`);
            await memoryStore.saveAllEmbeddings();
            
            // Clear memory store after saving to keep memory usage low
            console.log('Clearing memory store after saving chunk');
            const storeSize = Object.keys(memoryStore.data).length;
            memoryStore.data = {};
            console.log(`Cleared ${storeSize} entries from memory`);
          } catch (saveError) {
            console.error('Error saving chunk to storage:', saveError);
            storageErrors++;
            
            // If we're getting persistent storage errors, abort
            if (storageErrors >= 3) {
              console.error('Multiple storage errors encountered, aborting processing');
              if (progressCallback) {
                progressCallback({ 
                  progress: 0, 
                  message: `Error: Storage quota exceeded. Try reducing YAML complexity.`
                });
              }
              return { 
                success: false, 
                error: 'Storage quota exceeded',
                details: 'The profile is too large to store with embeddings. Try simplifying your profile or using fewer fields.'
              };
            }
          }
        }
        
        // Small delay between batches to avoid overwhelming the system
        if (batchIndex < totalBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Save all embeddings to storage after processing is complete
      // (or save final chunk if using chunking)
      console.log(`Embedding generation complete, saving to storage...`);
      try {
        // Only save if we have data and aren't using chunking (or it's the final chunk)
        if (Object.keys(memoryStore.data).length > 0) {
          const saveResult = await memoryStore.saveAllEmbeddings();
          console.log(`Save result: ${saveResult ? 'Success' : 'Failed'}`);
        } else if (useChunking) {
          console.log('No final chunk to save (already saved in chunks)');
        }
        
        // Double-check memory store state
        const finalStoreSize = useChunking ? 
          await memoryStore.getStoredEmbeddingsCount() : 
          Object.keys(memoryStore.data).length;
          
        console.log(`Final storage contains ${finalStoreSize} entries`);
      } catch (saveError) {
        console.error('Error saving embeddings:', saveError);
        
        // Check for storage quota errors
        if (saveError && saveError.message && (
          saveError.message.includes('quota') || 
          saveError.message.includes('QUOTA') || 
          saveError.message.includes('limit') ||
          saveError.message.includes('space')
        )) {
          if (progressCallback) {
            progressCallback({ 
              progress: 0, 
              message: `Error: Storage quota exceeded. Try reducing YAML complexity.`
            });
          }
          return { 
            success: false, 
            error: 'Storage quota exceeded',
            details: 'The profile is too large to store with embeddings. Try simplifying your profile.'
          };
        }
      }
      
      // Final progress update
      if (progressCallback) {
        progressCallback({ progress: 100, message: 'All fields processed' });
      }
      
      return { success: true, data: userData };
    } catch (error) {
      console.error('Error processing user context:', error);
      if (progressCallback) {
        progressCallback({ progress: 0, message: `Error: ${error.message}` });
      }
      return { success: false, error: error.message };
    }
  }
}

export default new ProfileLoader();
export { ProfileLoader };
