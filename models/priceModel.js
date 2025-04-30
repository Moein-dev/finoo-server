class PriceModel {
    constructor(name, symbol, category, date, price, unit, priority = null) {
        this.name = name;
        this.symbol = symbol;
        this.category = category;
        this.date = date;
        this.price = parseFloat(price);
        this.unit = unit;
        this.priority = priority;
    }

    static fromDatabase(row) {
        return new PriceModel(
            row.name,
            row.symbol,
            row.category,
            row.date,
            row.price,
            row.unit,
            row.priority || null
        );
    }

    toJSON() {
        return {
            name: this.name,
            symbol: this.symbol,
            category: this.category,
            date: this.date,
            price: this.price,
            unit: this.unit,
            priority: this.priority,
        };
    }
}


module.exports = PriceModel;