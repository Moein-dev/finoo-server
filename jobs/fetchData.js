const db = require("../config/db");
const dataSources = require("./dataSources");
const { fetchFromSource, mergeResults } = require("../utils/dataFetcher");

/**
 * Fetches data from all configured sources, merges them, and saves to the database
 * @param {string} triggerType - What triggered this fetch (for logging)
 * @returns {Promise<object>} - The merged data
 */
const fetchPrices = async (triggerType = 'manual') => {
  console.log(`🚀 Starting to fetch data from all sources... (trigger: ${triggerType})`);
  
  try {
    // Step 1: Fetch data from all sources in parallel
    const fetchPromises = dataSources.map(source => fetchFromSource(source));
    const results = await Promise.allSettled(fetchPromises);
    
    // Step 2: Process successful results and log failures
    const successResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successResults.push(result.value);
      } else {
        console.error(`❌ Failed to fetch from ${dataSources[index].name}: ${result.reason.message}`);
      }
    });
    
    if (successResults.length === 0) {
      console.error("❌ No data was successfully fetched from any source. Aborting database update.");
      return null;
    }
    
    // Step 3: Merge all successful results
    const mergedData = mergeResults(successResults);
    console.log(`✅ Successfully fetched data from ${successResults.length} source(s).`);
    
    // Step 4: Save to database
    await saveToDatabase(mergedData, triggerType);
    
    return mergedData;
  } catch (error) {
    console.error("❌ Error in fetchPrices:", error.message);
    throw error; // Propagate error to caller
  }
};

/**
 * Saves the merged data to the database
 * @param {object} data - The merged data with metadata
 * @param {string} triggerType - What triggered this save
 */
async function saveToDatabase(data, triggerType) {
  if (!data || !data.data || Object.keys(data.data).length === 0) {
    console.error("❌ Data is empty, skipping save.");
    return;
  }
  
  // Add trigger type to metadata before saving
  const enhancedData = {
    ...data,
    meta: {
      ...data.meta,
      trigger_type: triggerType
    }
  };
  
  const jsonData = JSON.stringify(enhancedData);
  const today = new Date().toISOString().split("T")[0];
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Store the data with metadata intact
    const query = `
      INSERT INTO gold_prices (date, data, trigger_type)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE data = VALUES(data), trigger_type = VALUES(trigger_type);
    `;
    
    await connection.query(query, [today, jsonData, triggerType]);
    await connection.commit();
    
    console.log(`✅ Data successfully saved to database! (trigger: ${triggerType})`);
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error saving data to database:", error);
    throw error; // Propagate error to caller
  } finally {
    connection.release();
  }
}

module.exports = fetchPrices;
