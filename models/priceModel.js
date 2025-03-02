/**
 * Standard price model that all data sources should conform to
 * Matches the client-side Dart class structure
 */

class PriceModel {
  constructor(data = {}) {
    this.name = data.name || '';
    this.price = String(data.price || '');
    this.unit = data.unit || 'IRR';
    this.date = data.date || new Date().toISOString();
    this.symbol = data.symbol || '';
    this.category = data.category || '';
  }
  
  toJSON() {
    return {
      name: this.name,
      price: this.price,
      unit: this.unit,
      date: this.date,
      symbol: this.symbol,
      category: this.category
    };
  }
}

module.exports = PriceModel; 