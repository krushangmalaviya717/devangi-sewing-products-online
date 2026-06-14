const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.all("PRAGMA table_info(orders)", [], (err, rows) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("ORDERS TABLE INFO:", JSON.stringify(rows, null, 2));
    db.close();
});
