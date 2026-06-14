const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');

db.all('SELECT * FROM categories', [], (err, categories) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Categories:', categories);
    }
    db.all('SELECT DISTINCT category FROM products', [], (err, prodCats) => {
        if (err) {
            console.error(err);
        } else {
            printProductsSummary();
            console.log('Product Categories:', prodCats);
        }
        db.close();
    });
});

function printProductsSummary() {
    db.all('SELECT id, title, category FROM products LIMIT 10', [], (err, rows) => {
        if (!err) console.log('Sample Products:', rows);
    });
}
