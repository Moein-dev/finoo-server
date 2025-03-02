const db = require("../config/db");
const cron = require("node-cron");
const dataSources = require("./dataSources");
const { fetchFromSource, mergeResults } = require("../utils/dataFetcher");

/**
 * Fetches data from all configured sources, merges them, and saves to the database
 */
const fetchPrices = async () => {
  try {
    // Step 1: Fetch data from all sources in parallel
    console.log("🚀 Starting to fetch data from all sources...");
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
      return;
    }
    
    // Step 3: Merge all successful results
    const mergedData = mergeResults(successResults);
    console.log(`✅ Successfully fetched data from ${successResults.length} source(s).`);
    
    // Step 4: Save to database
    await saveToDatabase(mergedData);
    
  } catch (error) {
    console.error("❌ Error in fetchPrices:", error.message);
  }
};

/**
 * Saves the merged data to the database
 * @param {object} data - The merged data with metadata
 */
async function saveToDatabase(data) {
  if (!data || !data.data || Object.keys(data.data).length === 0) {
    console.error("❌ Data is empty, skipping save.");
    return;
  }
  
  const jsonData = JSON.stringify(data);
  const today = new Date().toISOString().split("T")[0];
  
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    
    // Store the data with metadata intact
    const query = `
      INSERT INTO gold_prices (date, data)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE data = VALUES(data);
    `;
    
    await connection.query(query, [today, jsonData]);
    await connection.commit();
    
    console.log("✅ Data successfully saved to database!");
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error saving data to database:", error);
  } finally {
    connection.release();
  }
}

// Schedule the fetching jobs
cron.schedule("0 8 * * *", () => {
  console.log("🔄 Fetching new data at 8 AM...");
  fetchPrices();
});

cron.schedule("0 20 * * *", () => {
  console.log("🔄 Fetching new data at 8 PM...");
  fetchPrices();
});

// Initial fetch on startup
fetchPrices();

module.exports = fetchPrices;
