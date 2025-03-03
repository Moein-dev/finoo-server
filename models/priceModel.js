class PriceModel {
  constructor({ symbol, category, name, price, unit, timestamp, fetchId = null }) {
      this.symbol = symbol;
      this.category = category;
      this.name = name;
      this.price = parseFloat(price);
      this.unit = unit || "IRR";
      this.timestamp = timestamp ? new Date(timestamp) : new Date();
      this.fetchId = fetchId;
  }

  /**
   * 📌 اعتبارسنجی داده‌های ورودی
   */
  static validate(data) {
      if (!data.symbol || !data.category || !data.name || isNaN(data.price)) {
          console.error("❌ Invalid price data:", data);
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
          this.fetchId
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
          fetchId: row.fetch_id
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