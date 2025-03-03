const PriceModel = require('../models/priceModel');

const DATA_SOURCES = [
  {
    id: 'brsapi',
    name: 'BRS API',
    url: 'https://brsapi.ir/FreeTsetmcBourseApi/Api_Free_Gold_Currency_v2.json',
    type: 'json',
    categories: ['gold', 'currency', 'cryptocurrency'],
    parser: (data) => {
      const result = {};
      
      // Process gold data
      if (data.gold && Array.isArray(data.gold)) {
        result.gold = data.gold.map(item => new PriceModel({
          name: item.name || item.title,
          price: item.price || item.value,
          timestamp: item.timestamp || new Date(),
          unit: 'IRR',
          date: new Date().toISOString(),
          symbol: item.symbol || item.code || `GOLD_${item.id || ''}`,
          category: 'gold'
        }));
      }
      
      // Process currency data
      if (data.currency && Array.isArray(data.currency)) {
        result.currency = data.currency.map(item => new PriceModel({
          name: item.name || item.title,
          price: item.price || item.value,
          timestamp: item.timestamp || new Date(),
          unit: 'IRR',
          date: new Date().toISOString(),
          symbol: item.symbol || item.code || `CURRENCY_${item.id || ''}`,
          category: 'currency'
        }));
      }
      
      // Process cryptocurrency data
      if (data.cryptocurrency && Array.isArray(data.cryptocurrency)) {
        result.cryptocurrency = data.cryptocurrency.map(item => new PriceModel({
          name: item.name || item.title,
          price: item.price || item.value,
          timestamp: item.timestamp || new Date(),
          unit: item.unit || 'USD',
          date: new Date().toISOString(),
          symbol: item.symbol || item.code || `CRYPTO_${item.id || ''}`,
          category: 'cryptocurrency'
        }));
      }
      
      return result;
    },
    retries: 3,
    retryDelay: 5000,
  },
  {
    id: 'tgju',
    name: 'TGJU API',
    url: 'https://call4.tgju.org/ajax.json',
    type: 'json',
    categories: ['silver'],
    headers: { 
      accept: "*/*", 
      "accept-language": "en-US,en;q=0.9,fa;q=0.8" 
    },
    parser: (data) => {
      try {
        // Extract silver data and transform to our standard format
        const silverPrice = data?.current?.silver_999?.p ? parseFloat(data.current.silver_999.p.replace(/,/g, "")) : null;
        
        return {
          silver: silverPrice ? [
            new PriceModel({
              name: "نقره 999",
              price: silverPrice,
              unit: 'IRR',
              timestamp: new Date(),
              date: new Date().toISOString(),
              symbol: 'SILVER_999',
              category: 'silver'
            })
          ] : []
        };
      } catch (error) {
        console.error("Error parsing silver data:", error);
        return { silver: [] };
      }
    },
    retries: 3,
    retryDelay: 5000,
  },
  // You can easily add more data sources here following the same structure
];

module.exports = DATA_SOURCES; 