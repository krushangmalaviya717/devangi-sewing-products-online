const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
const perms = '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]';
db.run('INSERT INTO admin_users (username, password_hash, display_name, permissions) VALUES (?, ?, ?, ?)', 
    ['admin123', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Admin 123', perms], 
    (err) => { 
        if(err) console.error(err); 
        else console.log('User admin123 added'); 
    }
);
