const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath);

db.all('SELECT * FROM orders WHERE phone LIKE "%7600%" OR phone LIKE "%7600550038%"', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log("Orders found:", rows);
    }
    db.close();
});
