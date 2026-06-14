const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT * FROM order_items WHERE order_id = 5', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Items for Order #5:', rows);
    }
    db.close();
});
