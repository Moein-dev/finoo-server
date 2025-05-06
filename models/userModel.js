class UserModel {
    constructor({
        id,
        username,
        email = null,
        email_verified_at = null,
        phone = null,
        is_phone_verified = false,
        name = null,
        image = null,
        role = 'user',
        refresh_token = null,
        created_at = null,
        updated_at = null
    }) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.email_verified_at = email_verified_at;
        this.phone = phone;
        this.is_phone_verified = is_phone_verified;
        this.name = name;
        this.image = image;
        this.role = role;
        this.refresh_token = refresh_token;
        this.created_at = created_at;
        this.updated_at = updated_at;
    }

    // تبدیل داده‌های دیتابیس به مدل کاربر
    static fromDatabase(row) {
        return new UserModel({
            id: row.id,
            username: row.username,
            email: row.email,
            email_verified_at: row.email_verified_at,
            phone: row.phone,
            is_phone_verified: row.is_phone_verified === 1,
            name: row.name,
            image: row.image,
            role: row.role,
            refresh_token: row.refresh_token,
            created_at: row.created_at,
            updated_at: row.updated_at
        });
    }

    // تبدیل مدل به JSON برای ارسال به کلاینت
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            email: this.email,
            is_email_verified: !!this.email_verified_at,
            phone: this.phone,
            is_phone_verified: this.is_phone_verified,
            name: this.name,
            image: this.image,
            role: this.role
        };
    }

    // تبدیل مدل به اطلاعات پروفایل برای ارسال به کلاینت
    toProfileJSON() {
        return {
            username: this.username,
            email: this.email,
            is_email_verified: !!this.email_verified_at,
            phone: this.phone,
            is_phone_verified: this.is_phone_verified,
            name: this.name,
            image: this.image
        };
    }
}

module.exports = UserModel;