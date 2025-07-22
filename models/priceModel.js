const CurrencyModel = require("./currencyModel");

class PriceModel {
  constructor(data) {
    this.id = data.id;
    this.currency = new CurrencyModel({
      name: data.name,
      symbol: data.symbol,
      icon: data.icon,
      color: data.color,
      category: data.category,
      priority: data.priority,
      unit: data.unit,
    });
    this.date = data.date;
    this.price = parseFloat(data.price);
    this.bubblePercent = data.bubblePercent;
  }

  static fromDatabase(row) {
    return new PriceModel({
      id: row.id,
      name: row.name,
      symbol: row.symbol,
      icon: row.icon,
      color: row.color,
      category: row.category,
      priority: row.priority,
      unit: row.unit,
      date: row.date,
      price: row.price,
      bubblePercent: row.percent_bubble,
    });
  }

  toJSON() {
    return {
      id: this.id,
      currency: {
        name: this.currency.name,
        symbol: this.currency.symbol,
        icon: this.currency.icon,
        color: this.currency.color,
        category: this.currency.category,
        priority: this.currency.priority,
        unit: this.currency.unit,
      },
      date: this.date,
      price: this.price,
      bubblePercent: this.bubblePercent,
    };
  }
}

module.exports = PriceModel;
