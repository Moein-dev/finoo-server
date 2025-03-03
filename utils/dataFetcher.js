const axios = require("axios");
const PriceModel = require("../models/priceModel");

/**
 * Gets a value from an object using a dot-notation path
 * @param {object} obj - The object to get value from
 * @param {string} path - Dot notation path (e.g., "current.silver_999.p")
 * @returns {any} - The value at the path
 */
function getValueByPath(obj, path) {
    return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Applies a transformation to a value
 * @param {string} value - The value to transform
 * @param {string} transform - The transformation code
 * @returns {any} - The transformed value
 */
function applyTransform(value, transform) {
    // Create a safe context for the transformation
    const context = { value };
    try {
        return new Function('value', `return ${transform}`).call(context, value);
    } catch (error) {
        console.error(`❌ Transform error: ${error.message}`);
        return value;
    }
}

/**
 * Gets a mapped value using the mapping configuration
 * @param {object} data - Source data
 * @param {string|array} mapping - Mapping configuration
 * @returns {any} - The mapped value
 */
function getMappedValue(data, mapping) {
    if (Array.isArray(mapping)) {
        // Try each mapping key in order until one works
        for (const key of mapping) {
            const value = data[key];
            if (value !== undefined) return value;
        }
        return null;
    }
    return mapping; // Static value
}

/**
 * Fetches data from a given URL with retry capability
 * @param {string} url - The URL to fetch data from
 * @param {object} options - Request options (headers, etc.)
 * @param {number} retries - Number of retry attempts
 * @param {number} retryDelay - Delay in ms between retries
 * @returns {Promise<any>} - The fetched data
 */
async function fetchWithRetry(url, options = {}, retries = 3, retryDelay = 5000) {
  let lastError;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.get(url, options);
      return response.data;
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt}/${retries} failed: ${error.message}`);
      
      if (attempt < retries) {
        console.log(`Waiting ${retryDelay}ms before next attempt...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  throw new Error(`Failed after ${retries} attempts: ${lastError.message}`);
}

/**
 * Fetches and processes data from a specific data source
 * @param {object} source - Data source configuration
 * @returns {Promise<object>} - Processed data in standardized format
 */
async function fetchFromSource(source) {
  try {
    console.log(`📊 Fetching data from ${source.name} (${source.url})...`);
    
    const data = await fetchWithRetry(
      source.url,
      { headers: source.headers || {} },
      source.retry_count,
      source.retry_delay
    );
    
    const processedData = {};
    const parserConfig = source.parser_config;
    
    // Process each category defined in the parser config
    Object.entries(parserConfig).forEach(([category, config]) => {
      const rawData = config.path ? getValueByPath(data, config.path) : data;
      if (!rawData) {
        console.warn(`⚠️ No data found at path "${config.path}" for ${category}`);
        processedData[category] = [];
        return;
      }
      
      // Handle array or single item data
      const items = Array.isArray(rawData) ? rawData : [rawData];
      
      processedData[category] = items.map(item => {
        const mapped = {};
        
        // Apply mappings
        Object.entries(config.mapping).forEach(([key, mapping]) => {
          mapped[key] = getMappedValue(item, mapping);
        });
        
        // Apply transformations if any
        if (config.transform) {
          Object.entries(config.transform).forEach(([key, transform]) => {
            if (mapped[key] !== undefined) {
              mapped[key] = applyTransform(mapped[key], transform);
            }
          });
        }
        
        return new PriceModel(mapped);
      });
    });
    
    return {
      data: processedData,
      meta: {
        source_id: source.id,
        source_name: source.name,
        fetched_at: new Date().toISOString(),
        status: 'success'
      }
    };
  } catch (error) {
    console.error(`❌ Error fetching data from ${source.name}: ${error.message}`);
    return {
      data: {},
      meta: {
        source_id: source.id,
        source_name: source.name,
        fetched_at: new Date().toISOString(),
        status: 'error',
        error: error.message
      }
    };
  }
}

/**
 * Merges data from multiple sources into a single structure
 * @param {Array<object>} results - Array of processed results from different sources
 * @returns {object} - Merged data with metadata
 */
function mergeResults(results) {
  const mergedData = {};
  const sourcesInfo = [];
  const fetchTime = new Date().toISOString();
  
  // Process each result
  results.forEach(result => {
    // Add source metadata
    sourcesInfo.push(result.meta);
    
    // Merge the data by category
    Object.entries(result.data).forEach(([category, items]) => {
      if (!mergedData[category]) {
        mergedData[category] = [];
      }
      
      if (Array.isArray(items)) {
        const validItems = items.filter(item => item instanceof PriceModel);
        mergedData[category].push(...validItems);
      }
    });
  });
  
  // Create a flat list of all prices
  const allPrices = Object.values(mergedData).flat();
  
  return {
    data: {
      categories: mergedData,
      prices: allPrices
    },
    meta: {
      fetched_at: fetchTime,
      sources: sourcesInfo,
      total_items: allPrices.length
    }
  };
}

module.exports = {
  fetchWithRetry,
  fetchFromSource,
  mergeResults
}; 