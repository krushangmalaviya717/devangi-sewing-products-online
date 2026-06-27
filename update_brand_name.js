const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // First, show all store_settings
  db.all('SELECT * FROM store_settings', [], (err, rows) => {
    if (err) { console.error(err); return; }
    console.log('Current store_settings:');
    rows.forEach(r => console.log(' ', JSON.stringify(r)));
  });
});

setTimeout(() => db.close(() => console.log('Done!')), 2000);
