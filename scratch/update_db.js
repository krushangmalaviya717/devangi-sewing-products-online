const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.serialize(() => {
    db.run("UPDATE store_settings SET setting_value = 'Devangi Sewing Products' WHERE setting_key = 'store_name'", [], (err) => {
        if (err) {
            console.error("Error updating store_name:", err);
        } else {
            printSettings();
        }
    });
});

function printSettings() {
    db.all("SELECT * FROM store_settings WHERE setting_key = 'store_name'", [], (err, rows) => {
        if (!err) console.log('Updated settings in DB:', rows);
        db.close();
    });
}
