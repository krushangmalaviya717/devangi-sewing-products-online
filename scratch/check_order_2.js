const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all('SELECT * FROM orders WHERE id = 2', [], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Order #2:', rows[0]);
    }
    db.close();
});
