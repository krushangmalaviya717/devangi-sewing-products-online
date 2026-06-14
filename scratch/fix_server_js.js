const fs = require('fs');
const content = fs.readFileSync('server.js', 'utf8');

const target = `// Update Order Payment Status (Admin)
app.post('/api/admin/orders/:id/payment', (req, res) => {
    const { status, note } = req.body;
    const orderId = req.params.id;
    
    db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [status, orderId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'Payment: ' + status, note || ''], (err) => {
            res.json({ success: true, message: \`Payment status updated to \${status}\` });
        });
    });
});`;

const replacement = target + `

// Get Customer Stats (Admin)
app.get('/api/admin/customers/stats', (req, res) => {
    const { phone } = req.query;
    db.get('SELECT COUNT(*) as order_count FROM orders WHERE phone = ?', [phone], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ order_count: row.order_count || 0 });
    });
});`;

if (content.includes(target)) {
    const newContent = content.replace(target, replacement);
    fs.writeFileSync('server.js', newContent);
    console.log('server.js updated with customer stats route');
} else {
    console.error('Target content not found in server.js');
}
