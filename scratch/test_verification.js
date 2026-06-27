const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');

const dbPath = path.join(__dirname, '..', 'database.sqlite');
console.log('Connecting to database:', dbPath);
const db = new sqlite3.Database(dbPath);

// Helper to make HTTP requests
function makeRequest(options, postData = null) {
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data ? JSON.parse(data) : null
                });
            });
        });
        req.on('error', reject);
        if (postData) {
            req.write(JSON.stringify(postData));
        }
        req.end();
    });
}

async function runTests() {
    try {
        console.log('--- TEST 1: Database Check ---');
        // Fetch a product to test stock logic
        const product = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM products ORDER BY id DESC LIMIT 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        
        if (!product) {
            console.error('No products found in DB. Please add a product first.');
            process.exit(1);
        }
        console.log(`Using product for testing: ID=${product.id}, Title="${product.title}", Stock=${product.stock}`);

        // Set low stock for verification if stock is unlimited (-1) or higher
        const originalStock = product.stock;
        await new Promise((resolve, reject) => {
            db.run('UPDATE products SET stock = 2 WHERE id = ?', [product.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('Set temporary stock of product to 2.');

        console.log('--- TEST 2: Stock Checkout Validation ---');
        // Attempt to order 3 units (which exceeds stock 2)
        const orderDataExceeded = {
            first_name: 'Test',
            last_name: 'User',
            phone: '1234567890',
            total_amount: 300,
            items: [{
                id: product.id,
                name: product.title,
                price: product.price,
                quantity: 3,
                image: product.image
            }],
            payment_method: 'COD'
        };

        const resExceeded = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, orderDataExceeded);

        console.log('Exceeded stock response:', resExceeded.statusCode, resExceeded.body);
        if (resExceeded.statusCode === 400 && resExceeded.body.error && resExceeded.body.error.includes('has only 2 units remaining')) {
            console.log('✅ TEST PASSED: Stock validation successfully rejected excess quantity order.');
        } else {
            console.log('❌ TEST FAILED: Stock validation did not reject excess quantity order correctly.');
        }

        // Attempt to order 2 units (which equals stock 2)
        const orderDataValid = {
            first_name: 'Test',
            last_name: 'User',
            phone: '1234567890',
            total_amount: 200,
            items: [{
                id: product.id,
                name: product.title,
                price: product.price,
                quantity: 2,
                image: product.image
            }],
            payment_method: 'COD'
        };

        const resValid = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/orders',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, orderDataValid);

        console.log('Valid stock response:', resValid.statusCode, resValid.body);
        if (resValid.statusCode === 200 && resValid.body.orderId) {
            console.log('✅ TEST PASSED: Stock validation allowed valid order.');
            
            // Check if stock decremented to 0
            const updatedProduct = await new Promise((resolve, reject) => {
                db.get('SELECT stock FROM products WHERE id = ?', [product.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            console.log('Updated stock in database:', updatedProduct.stock);
            if (updatedProduct.stock === 0) {
                console.log('✅ TEST PASSED: Stock successfully decremented to 0 in database.');
            } else {
                console.log('❌ TEST FAILED: Stock did not decrement correctly.');
            }
        } else {
            console.log('❌ TEST FAILED: Valid order was rejected.');
        }

        // Restore original stock
        await new Promise((resolve, reject) => {
            db.run('UPDATE products SET stock = ? WHERE id = ?', [originalStock, product.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log('Restored original product stock to:', originalStock);

        console.log('--- TEST 3: Admin Reviews API ---');
        // Login to get session cookie
        const loginRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: 'admin', password: 'admin123' });

        const cookieHeader = loginRes.headers['set-cookie'];
        const sessionCookie = cookieHeader ? cookieHeader[0].split(';')[0] : '';
        console.log('Admin login response:', loginRes.statusCode, 'Cookie obtained:', !!sessionCookie);

        if (sessionCookie) {
            // Test GET /api/admin/reviews
            const reviewsRes = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/admin/reviews',
                method: 'GET',
                headers: { 'Cookie': sessionCookie }
            });
            console.log('Admin reviews fetch status:', reviewsRes.statusCode, 'Count:', Array.isArray(reviewsRes.body) ? reviewsRes.body.length : 0);
            if (reviewsRes.statusCode === 200 && Array.isArray(reviewsRes.body)) {
                console.log('✅ TEST PASSED: Admin reviews fetch successful.');
            } else {
                console.log('❌ TEST FAILED: Admin reviews fetch failed.');
            }
        } else {
            console.log('❌ TEST FAILED: Could not log in as admin.');
        }

    } catch (e) {
        console.error('Test execution error:', e);
    } finally {
        db.close();
        console.log('Database connection closed.');
    }
}

runTests();
