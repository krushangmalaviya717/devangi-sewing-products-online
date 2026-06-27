const path = require('path');
const Database = require(path.join(__dirname, 'node_modules', 'better-sqlite3'));
const db = new Database(path.join(__dirname, 'database.sqlite'));

try {
  const updates = [
    { key: 'seo_title', value: 'Devangi Products' },
    { key: 'seo_description', value: 'Devangi Products Online Store - High quality sewing products and tools.' },
    { key: 'store_name', value: 'Devangi Products' }
  ];

  updates.forEach(u => {
    const result = db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(u.value, u.key);
    console.log('Updated ' + u.key + ': ' + result.changes + ' row(s) changed');
  });

  // Show current values
  const rows = db.prepare("SELECT key, value FROM settings WHERE key IN ('seo_title','seo_description','store_name')").all();
  console.log('\nCurrent DB values:');
  rows.forEach(r => console.log('  ' + r.key + ' = ' + r.value));
  
  // Also show ALL settings to find any other brand references
  const allRows = db.prepare("SELECT key, value FROM settings").all();
  console.log('\nAll settings:');
  allRows.forEach(r => {
    if (r.value && r.value.toLowerCase && r.value.toLowerCase().includes('devangi')) {
      console.log('  [DEVANGI] ' + r.key + ' = ' + r.value);
    }
  });

} catch(e) {
  console.error('Error:', e.message);
}

db.close();
console.log('\nDone!');
