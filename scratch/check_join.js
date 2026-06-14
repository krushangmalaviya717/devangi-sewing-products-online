const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

const userId = 1; // Assuming user_id 1 based on previous logs
const sql = `
    SELECT 
        o.id as order_id_main, 
        i.id as item_id_main,
        o.*, 
        i.id as item_id, i.name as item_name, i.price as item_price, 
        i.quantity as item_quantity, i.image as item_image
    FROM orders o
    LEFT JOIN order_items i ON o.id = i.order_id
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
`;

db.all(sql, [userId], (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('JOIN Result (First 2 rows):', rows.slice(0, 2));
    }
    db.close();
});
