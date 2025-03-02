const axios = require("axios");
const PriceModel = require("../models/priceModel");

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
      source.retries, 
      source.retryDelay
    );
    
    // Apply the source-specific parser to transform data to our format
    const processedData = source.parser(data);
    
    // Validate that each item in each category conforms to our model
    Object.keys(processedData).forEach(category => {
      if (Array.isArray(processedData[category])) {
        processedData[category] = processedData[category].filter(item => {
          // Make sure all items are instances of PriceModel
          if (!(item instanceof PriceModel)) {
            console.warn(`Item in ${category} is not a PriceModel instance, converting...`);
            return new PriceModel(item);
          }
          return item;
        });
      }
    });
    
    // Add metadata about the source and fetch time
    return {
      data: processedData,
      meta: {
        source: source.id,
        source_name: source.name,
        fetched_at: new Date().toISOString(),
        status: 'success'
      }
    };
  } catch (error) {
    console.error(`❌ Error fetching data from ${source.name}: ${error.message}`);
    return {
      data: source.categories.reduce((acc, category) => {
        acc[category] = [];
        return acc;
      }, {}),
      meta: {
        source: source.id,
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
      
      // Only add properly formatted items
      if (Array.isArray(items) && items.length > 0) {
        // Ensure each item follows our standard model and has category set
        const validItems = items.filter(item => item instanceof PriceModel).map(item => {
          // Ensure category is set to the current category if not already set
          if (!item.category) {
            item.category = category;
          }
          return item;
        });
        
        mergedData[category] = [...mergedData[category], ...validItems];
      }
    });
  });
  
  // Flatten all categories into a single 'prices' array for easier client consumption
  const allPrices = [];
  Object.entries(mergedData).forEach(([category, items]) => {
    if (Array.isArray(items)) {
      // No need to set category here as we already ensured it above
      allPrices.push(...items);
    }
  });
  
  return {
    data: {
      // Keep the categorized data
      categories: mergedData,
      // Also provide a flat list of all prices
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