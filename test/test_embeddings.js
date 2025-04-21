// Test file for embedding functionality
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Function to call Ollama API directly for embeddings
async function getEmbedding(text) {
  try {
    console.log(`Getting embeddings for: ${text.substring(0, 30)}...`);
    const result = await callOllamaAPI('embeddings', {
      model: "nomic-embed-text",
      prompt: text.substring(0, 1500), // Limit text length to avoid token limits
      stream: false
    });
    return result;
  } catch (error) {
    console.error('Error getting embedding:', error);
    throw error;
  }
}

// Function to call Ollama API directly
async function callOllamaAPI(endpoint, data) {
  try {
    console.log(`Making Ollama API call to ${endpoint}`);
    
    const port = 11434;
    const response = await fetch(`http://localhost:${port}/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, details: ${errorText}`);
    }

    const result = await response.json();
    
    // Validate response format
    if (endpoint === 'embeddings') {
      if (!result || !result.embedding || !Array.isArray(result.embedding)) {
        throw new Error('Invalid embeddings response format from Ollama');
      }
    }
    
    return { success: true, data: result };
  } catch (error) {
    console.error(`Ollama API call failed (${endpoint}):`, error);
    return { 
      success: false, 
      error: error.message,
      details: error.stack
    };
  }
}

// Improved helper function to format values for embedding
function formatValueForEmbedding(value) {
  if (value === null || value === undefined) {
    return "";
  }
  
  if (Array.isArray(value)) {
    // Properly format each array element based on its type
    return value.map(item => {
      if (typeof item === 'object' && item !== null) {
        // For objects in arrays, format them recursively
        return Object.entries(item)
          .map(([k, v]) => `${k}: ${formatValueForEmbedding(v)}`)
          .join(", ");
      } else {
        return String(item);
      }
    }).join(" | ");
  }
  
  if (typeof value === 'object' && value !== null) {
    // For objects, convert to a readable string of key-value pairs
    return Object.entries(value)
      .map(([k, v]) => `${k}: ${formatValueForEmbedding(v)}`)
      .join(", ");
  }
  
  return String(value);
}

// Simple memory store to keep track of embeddings
class SimpleStore {
  constructor() {
    this.data = {};
  }
  
  async addEntry(key, text) {
    if (!text) return false;
    
    try {
      console.log(`Adding entry for key: ${key}`);
      const response = await getEmbedding(text);
      
      if (response && response.success && response.data && response.data.embedding) {
        // Store key, text, and embedding
        this.data[key] = {
          text: text,
          embedding: response.data.embedding
        };
        console.log(`Successfully added embedding for key: ${key}`);
        return true;
      }
      console.warn(`Failed to generate embedding for key: ${key}`);
      return false;
    } catch (error) {
      console.error('Error adding entry to store:', error);
      return false;
    }
  }
  
  // Function to calculate cosine similarity between two vectors
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }
  
  // Search function to find relevant information
  async search(query, topK = 5) {
    console.log(`Searching for: "${query}"`);
    
    try {
      // Get embedding for query
      const response = await getEmbedding(query);
      
      if (!response || !response.success || !response.data || !response.data.embedding) {
        console.error('Failed to generate embedding for search query');
        return [];
      }
      
      const queryEmbedding = response.data.embedding;
      const similarities = {};
      
      // Calculate cosine similarity for each entry
      for (const [key, entry] of Object.entries(this.data)) {
        const similarity = this.cosineSimilarity(entry.embedding, queryEmbedding);
        similarities[key] = similarity;
      }
      
      // Sort by similarity and return top K results
      const topResults = Object.keys(similarities)
        .sort((a, b) => similarities[b] - similarities[a])
        .slice(0, topK)
        .map(key => ({
          key: key,
          text: this.data[key].text,
          similarity: similarities[key]
        }));
      
      console.log(`Found ${topResults.length} relevant results`);
      return topResults;
    } catch (error) {
      console.error('Error searching:', error);
      return [];
    }
  }
}

// Function to properly flatten nested array structures
function flattenYamlData(data, parentKey = '') {
  const result = [];
  
  for (const [key, value] of Object.entries(data)) {
    const currentKey = parentKey ? `${parentKey}.${key}` : key;
    
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        // Add the array as a whole (for backward compatibility)
        result.push({
          key: currentKey,
          value: formatValueForEmbedding(value)
        });
        
        // Also add each array item individually with its index
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            // For objects in arrays (like skills, experiences)
            for (const [itemKey, itemValue] of Object.entries(item)) {
              const itemFullKey = `${currentKey}[${index}].${itemKey}`;
              result.push({
                key: itemFullKey,
                value: formatValueForEmbedding(itemValue)
              });
            }
          } else {
            // For simple values in arrays
            result.push({
              key: `${currentKey}[${index}]`,
              value: formatValueForEmbedding(item)
            });
          }
        });
      } else {
        // For regular objects (like personal_information)
        for (const [subKey, subValue] of Object.entries(value)) {
          const subFullKey = `${currentKey}.${subKey}`;
          result.push({
            key: subFullKey,
            value: formatValueForEmbedding(subValue)
          });
        }
      }
    } else {
      // For simple top-level values
      result.push({
        key: currentKey,
        value: formatValueForEmbedding(value)
      });
    }
  }
  
  return result;
}

// Function to test semantic search with common resume questions
async function testSemanticSearch(store) {
  console.log('\n----- TESTING SEMANTIC SEARCH -----\n');
  
  // First, print the personal_information section to verify salary field exists
  console.log('Personal information fields:');
  Object.keys(store.data).forEach(key => {
    if (key.includes('personal_information')) {
      console.log(`- ${key}: ${store.data[key].text}`);
    }
  });
  
  // Add a direct key search for salary to demonstrate the difference
  console.log('\n\nTesting direct key lookup for salary:');
  if (store.data['personal_information.salary']) {
    console.log('Found salary directly:', store.data['personal_information.salary'].text);
  } else {
    console.log('Could not find personal_information.salary directly in store');
    
    // Search for any key containing "salary"
    const salaryKeys = Object.keys(store.data).filter(key => key.toLowerCase().includes('salary'));
    if (salaryKeys.length > 0) {
      console.log('Found these salary-related fields:');
      salaryKeys.forEach(key => {
        console.log(`- ${key}: ${store.data[key].text}`);
      });
    }
  }

  // Try multiple different salary queries
  const salaryQueries = [
    "What is the salary?",
    "What is your salary expectation?", 
    "How much do you expect to earn?",
    "What compensation are you looking for?",
    "What is the desired salary?"
  ];

  console.log('\n----- TESTING SALARY QUERIES -----\n');
  for (const query of salaryQueries) {
    console.log(`\nQUERY: "${query}"`);
    const results = await store.search(query);
    console.log('Top 3 results:');
    results.slice(0, 3).forEach((result, i) => {
      console.log(`${i+1}. [${result.key}] (${(result.similarity*100).toFixed(2)}% match)`);
      console.log(`   ${result.text}`);
    });
  }
  
  const testQueries = [
    "What is the phone number?",
    "Does this person need a visa?",
    "How many years of experience in software development?",
    "What programming languages does this person know?",
    "What certifications does this person have?",
    "Where is this person located?",
    "What is their education background?"
  ];
  
  console.log('\n----- TESTING OTHER QUERIES -----\n');
  for (const query of testQueries) {
    console.log(`\nSEARCH QUERY: "${query}"`);
    const results = await store.search(query);
    
    console.log('Top results:');
    results.forEach((result, i) => {
      console.log(`${i+1}. [${result.key}] (${(result.similarity*100).toFixed(2)}% match)`);
      console.log(`   ${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}`);
    });
  }
}

// Main testing function
async function testEmbeddings() {
  console.log('Starting embedding test...');
  
  try {
    // Initialize simple store
    const store = new SimpleStore();
    
    // Load the specified YAML file
    const yamlPath = '/Users/sami/dev/EasyJob/input/sami_dhiab_resume.yaml';
    console.log(`Loading YAML from: ${yamlPath}`);
    const yamlContent = fs.readFileSync(yamlPath, 'utf8');
    
    // Parse YAML
    const userData = yaml.load(yamlContent);
    if (!userData) {
      throw new Error('Failed to parse YAML content');
    }
    
    console.log('YAML file loaded and parsed successfully');
    
    // Process fields from YAML using the new flattening function
    const fieldsToProcess = flattenYamlData(userData);
    
    console.log(`Found ${fieldsToProcess.length} fields to process`);
    
    // Print some examples of the flattened structure
    console.log('Sample of flattened fields:');
    fieldsToProcess.slice(0, 5).forEach(field => {
      console.log(`- ${field.key}`);
    });
    console.log('...');
    
    // Process all fields from the YAML file
    console.log('Processing all fields from the YAML file');
    
    // Process fields in batches to avoid overwhelming the system
    const batchSize = 10;
    let processed = 0;
    
    for (let i = 0; i < fieldsToProcess.length; i += batchSize) {
      const batch = fieldsToProcess.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(fieldsToProcess.length/batchSize)} (${batch.length} fields)`);
      
      // Process each field in the batch
      const promises = batch.map(async (field) => {
        console.log(`Processing field: ${field.key}`);
        const result = await store.addEntry(field.key, field.value);
        if (result) {
          console.log(`Successfully generated embedding for ${field.key}`);
          processed++;
        } else {
          console.error(`Failed to generate embedding for ${field.key}`);
        }
      });
      
      // Wait for all embeddings in this batch to complete
      await Promise.all(promises);
      console.log(`Completed batch. Progress: ${processed}/${fieldsToProcess.length} fields`);
    }
    
    // Print summary
    console.log('Test complete. Summary:');
    console.log(`Total fields: ${fieldsToProcess.length}`);
    console.log(`Successfully processed: ${Object.keys(store.data).length}`);
    console.log(`Vector dimensions: ${store.data[Object.keys(store.data)[0]].embedding.length}`);
    
    // Now test the search functionality
    await testSemanticSearch(store);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testEmbeddings().then(() => {
  console.log('Test finished');
}); 