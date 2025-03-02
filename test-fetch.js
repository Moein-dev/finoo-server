// Test script to verify data fetching and model transformation

const dataSources = require('./jobs/dataSources');
const { fetchFromSource, mergeResults } = require('./utils/dataFetcher');
const PriceModel = require('./models/priceModel');

async function testFetch() {
  try {
    console.log('🧪 Starting test of data fetching and model transformation...');
    
    // Step 1: Fetch data from all sources in parallel
    console.log('🚀 Fetching data from all sources...');
    const fetchPromises = dataSources.map(source => fetchFromSource(source));
    const results = await Promise.allSettled(fetchPromises);
    
    // Step 2: Process results and log some stats
    const successResults = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successResults.push(result.value);
        console.log(`✅ Successfully fetched from ${dataSources[index].name}`);
        
        // Log some data stats for this source
        const categories = Object.keys(result.value.data);
        categories.forEach(category => {
          const items = result.value.data[category];
          if (Array.isArray(items)) {
            console.log(`  - ${category}: ${items.length} items`);
            
            // Verify all items are PriceModel instances
            const allModels = items.every(item => item instanceof PriceModel);
            console.log(`  - All ${category} items are PriceModel instances: ${allModels}`);
            
            // Check for required fields
            if (items.length > 0) {
              const firstItem = items[0];
              console.log(`  - Sample item: 
                * name: ${firstItem.name}
                * price: ${firstItem.price}
                * unit: ${firstItem.unit}
                * date: ${firstItem.date}
                * symbol: ${firstItem.symbol}
                * category: ${firstItem.category}`);
            }
          }
        });
      } else {
        console.error(`❌ Failed to fetch from ${dataSources[index].name}: ${result.reason.message}`);
      }
    });
    
    if (successResults.length === 0) {
      console.error('❌ No data was successfully fetched from any source.');
      return;
    }
    
    // Step 3: Merge results
    console.log('\n🔄 Testing merge function...');
    const mergedData = mergeResults(successResults);
    
    // Step 4: Validate merged data
    const { prices, categories } = mergedData.data;
    console.log(`✅ Merged data has ${prices.length} total items across ${Object.keys(categories).length} categories`);
    
    // Verify all items in the prices array are PriceModel instances with category
    const allModels = prices.every(item => item instanceof PriceModel);
    console.log(`✅ All merged items are PriceModel instances: ${allModels}`);
    
    // Check that each item has a category
    const allHaveCategory = prices.every(item => item.category && item.category.length > 0);
    console.log(`✅ All merged items have a category: ${allHaveCategory}`);
    
    // Log category distribution
    const categoryCount = {};
    prices.forEach(item => {
      categoryCount[item.category] = (categoryCount[item.category] || 0) + 1;
    });
    console.log('📊 Category distribution:');
    Object.entries(categoryCount).forEach(([category, count]) => {
      console.log(`  - ${category}: ${count} items`);
    });
    
    console.log('\n🎉 Test completed successfully! The data model is working as expected.');
    return mergedData;
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testFetch()
  .then(result => {
    if (result) {
      console.log('✅ All tests passed!');
    }
  })
  .catch(err => console.error('❌ Test error:', err)); 