const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err);
        process.exit(1);
    }
    console.log('Connected to database.');
});

// Shift existing banners' sort_order up
db.run('UPDATE banners SET sort_order = sort_order + 1', [], (err) => {
    if (err) {
        console.error('Error shifting sort orders:', err);
    }
    
    // Insert new responsive banner
    const query = `INSERT INTO banners (title, subtitle, offer_text, image_url, mobile_image_url, link_url, button_text, sort_order, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        "Premium Sewing Materials",
        "New Arrival",
        "Starting at ₹99",
        "/assets/images/devangi-banner-pc.png",
        "/assets/images/devangi-banner-mobile.png",
        "/shop.html",
        "Shop Now",
        0,
        1
    ];

    db.run(query, params, function(err) {
        if (err) {
            console.error('Error inserting banner:', err);
        } else {
            console.log('Successfully added responsive banner with ID:', this.lastID);
        }
        db.close();
    });
});
