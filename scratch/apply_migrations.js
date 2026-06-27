const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.run(`ALTER TABLE admin_users ADD COLUMN permissions TEXT DEFAULT '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]'`, (err) => {
    if (err) {
        console.error('admin_users permission alter failed:', err);
    } else {
        console.log('admin_users permission alter successful!');
        // Update default admin to make sure they have all permissions
        db.run(`UPDATE admin_users SET permissions = '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]' WHERE username = 'admin'`, (err2) => {
            if (err2) console.error('Failed to update admin permissions:', err2);
            else console.log('Successfully updated default admin permissions!');
        });
    }
    db.close();
});
