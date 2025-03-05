class PriceModel {
    constructor(name, symbol, category, date, price, unit) {
        this.name = name;
        this.symbol = symbol;
        this.category = category;
        this.date = date;
        this.price = parseFloat(price);
        this.unit = unit;
    }

    // 📌 متد تبدیل از ردیف دیتابیس به مدل
    static fromDatabase(row) {
        return new PriceModel(
            row.name,
            row.symbol,
            row.category,
            row.date,
            row.price,
            row.unit
        );
    }

    // 📌 متد تبدیل به آبجکت JSON
    toJSON() {
        return {
            name: this.name,
            symbol: this.symbol,
            category: this.category,
            date: this.date,
            price: this.price,
            unit: this.unit,
        };
    }
}

module.exports = PriceModel;