const axios = require("axios");
const logger = require("./logger");
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
        // Use a safer approach to evaluate transformations
        if (typeof transform === 'function') {
            return transform(value);
        }
        logger.warn('⚠️ Transform is not a function:', { transform: typeof transform });
        return value;
    } catch (error) {
        logger.error(`❌ Transform error:`, { error: error.message });
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
 * Transform data using a provided transform function
 * @param {Object} data - The data to transform
 * @param {Function} transform - The transform function
 * @returns {Object|null} - Transformed data or null if transformation fails
 */
function transformData(data, transform) {
    if (!data) return null;

    try {
        if (typeof transform !== "function") {
            logger.warn('⚠️ Transform is not a function:', { transform: typeof transform });
            return data;
        }
        return transform(data);
    } catch (error) {
        logger.error(`❌ Transform error:`, { error: error.message });
        return null;
    }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - The function to retry
 * @param {Object} options - Retry options
 * @returns {Promise} - Promise that resolves with the function result
 */
async function retry(fn, { retries = 3, retryDelay = 1000 } = {}) {
    let lastError;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt === retries) break;

            logger.warn(`Attempt ${attempt}/${retries} failed:`, { error: error.message });
            logger.info(`Waiting ${retryDelay}ms before next attempt...`);
            
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            retryDelay *= 2; // Exponential backoff
        }
    }

    throw lastError;
}

/**
 * Fetches and processes data from a specific data source
 * @param {object} source - Data source configuration
 * @returns {Promise<object>} - Processed data in standardized format
 */
async function fetchFromSource(source) {
  try {
    logger.info(`�� Fetching data from ${source.name} (${source.url})...`);
    
    const data = await retry(async () => {
      return await axios.get(source.url, {
        headers: source.headers || {},
        timeout: source.timeout || 5000
      });
    });
    
    const processedData = {};
    const parserConfig = source.parser_config;
    
    // Process each category defined in the parser config
    Object.entries(parserConfig).forEach(([category, config]) => {
      const rawData = config.path ? getValueByPath(data, config.path) : data;
      if (!rawData) {
        logger.warn(`⚠️ No data found at path "${config.path}" for ${category}`);
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
    logger.error(`❌ Error fetching data from ${source.name}:`, { error: error.message });
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
  fetchFromSource,
  mergeResults,
  retry,
  transformData
}; 