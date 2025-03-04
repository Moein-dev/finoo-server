const logger = require('../utils/logger'); // Assuming a logger utility is available

class PriceModel {
    constructor({ symbol_id, data_source_id, price, change_percent = null, fetch_id = null }) {
        this.symbol_id = symbol_id;
        this.data_source_id = data_source_id;
        this.price = parseFloat(price);
        this.change_percent = change_percent ? parseFloat(change_percent) : null;
        this.fetch_id = fetch_id;
        this.created_at = new Date();
    }
  
    /**
     * 📌 اعتبارسنجی داده‌های ورودی
     */
    static validate(data) {
        if (!data.symbol_id || !data.data_source_id || isNaN(data.price)) {
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
            this.symbol_id,
            this.price,
            this.change_percent,
            this.data_source_id,
            this.fetch_id,
            this.created_at
        ];
    }
  
    /**
     * 📌 تبدیل داده‌ها از دیتابیس به مدل `PriceModel`
     */
    static fromDB(row) {
        return new PriceModel({
            symbol_id: row.symbol_id,
            data_source_id: row.data_source_id,
            price: row.price,
            change_percent: row.change_percent,
            fetch_id: row.fetch_id,
            created_at: row.created_at
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