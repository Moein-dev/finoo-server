const CategoryModel = require('./categoryModel');

class CurrencyModel {
    constructor({
      id,
      name,
      symbol,
      category, // انتظار می‌رود category یک object از نوع CategoryModel باشد
      icon = null,
      server_key = null,
      unit,
      color = '#FFFFFF',
      priority = 100,
    }) {
      this.id = id;
      this.name = name;
      this.symbol = symbol;
      this.category = category; // حالا category یک object است
      this.icon = icon;
      this.server_key = server_key ?? symbol;
      this.unit = unit;
      this.color = color;
      this.priority = priority;
    }
  }
  
  module.exports = CurrencyModel;
  