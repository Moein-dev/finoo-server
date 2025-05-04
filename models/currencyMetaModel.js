class CurrencyMetaModel {
    constructor({
      symbol,
      name,
      category,
      icon = null,
      use_auto_icon = 1,
      priority = 100,
      color = '#FFFFFF',
      svg_icon = 'default.svg',
      server_symbol = null,
    }) {
      this.symbol = symbol;
      this.name = name;
      this.category = category;
      this.icon = icon;
      this.use_auto_icon = use_auto_icon;
      this.priority = priority;
      this.color = color;
      this.svg_icon = svg_icon;
      this.server_symbol = server_symbol ?? symbol;
    }
  }
  
  module.exports = CurrencyMetaModel;
  