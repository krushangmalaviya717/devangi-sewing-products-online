const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath);

console.log('Resetting navigation_links...');

db.serialize(() => {
    db.run("DELETE FROM navigation_links");
    db.run("DELETE FROM sqlite_sequence WHERE name='navigation_links'");
    
    const stmt = db.prepare("INSERT INTO navigation_links (title, url, is_active, sort_order) VALUES (?, ?, ?, ?)");
    const seed = [
        ['Home', '/index.html', 1, 1],
        ['Shop', '/shop.html', 1, 2],
        ['Contact Us', '#', 1, 3]
    ];
    
    seed.forEach(item => stmt.run(item));
    stmt.finalize();
    console.log('Done!');
});

db.close();
