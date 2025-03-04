const logger = require('../utils/logger'); // Assuming a logger utility is available

class PriceModel {
    constructor({ symbol, category, name, price, unit, timestamp, fetchId = null, change_percent = null, source_name = null }) {
        this.symbol = symbol;
        this.category = category;
        this.name = name;
        this.price = parseFloat(price);
        this.unit = unit || "IRR";
        this.timestamp = timestamp ? new Date(timestamp) : new Date();
        this.fetchId = fetchId;
        this.change_percent = change_percent ? parseFloat(change_percent) : null;
        this.source_name = source_name;
    }
  
    /**
     * 📌 اعتبارسنجی داده‌های ورودی
     */
    static validate(data) {
        if (!data.symbol || !data.category || !data.name || isNaN(data.price)) {
            logger.error("❌ Invalid price data:", data);
            return false;
        }
        if (data.change_percent !== null && isNaN(data.change_percent)) {
            logger.error("❌ Invalid change_percent value:", data);
            return false;
        }
        return true;
    }
  
    /**
     * 📌 تبدیل داده‌ها به فرمت ذخیره در دیتابیس
     */
    toDBFormat() {
        return [
            this.symbol,
            this.category,
            this.name,
            this.price,
            this.unit,
            this.timestamp,
            this.fetchId,
            this.change_percent,
            this.source_name
        ];
    }
  
    /**
     * 📌 تبدیل داده‌ها از دیتابیس به مدل `PriceModel`
     */
    static fromDB(row) {
        return new PriceModel({
            symbol: row.symbol,
            category: row.category,
            name: row.name,
            price: row.price,
            unit: row.unit,
            timestamp: row.timestamp,
            fetchId: row.fetch_id,
            change_percent: row.change_percent,
            source_name: row.source_name
        });
    }
  
    /**
     * 📌 تبدیل لیستی از داده‌ها از دیتابیس به مدل `PriceModel`
     */
    static fromDBList(rows) {
        return rows.map(row => PriceModel.fromDB(row));
    }
  }
  
  module.exports = PriceModel;