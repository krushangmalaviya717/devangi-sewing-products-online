const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const crypto = require('crypto');

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
                let parsed = null;
                try {
                    parsed = data ? JSON.parse(data) : null;
                } catch(e) {
                    parsed = data;
                }
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: parsed
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
    let tempStaffId = null;
    try {
        console.log('\n=== TEST 1: Authentication & Sidebar Permission Filtering ===\n');

        // 1. Create a temporary staff user in the DB with ONLY "orders" permission
        const staffUsername = 'temp_orders_staff_' + Math.floor(Math.random() * 1000);
        const rawPassword = 'Password123';
        const passwordHash = crypto.createHash('sha256').update(rawPassword).digest('hex');
        
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO admin_users (username, password_hash, display_name, permissions) VALUES (?, ?, ?, ?)',
                [staffUsername, passwordHash, 'Temp Order Staff', JSON.stringify(['orders'])],
                function(err) {
                    if (err) reject(err);
                    else {
                        tempStaffId = this.lastID;
                        resolve();
                    }
                }
            );
        });
        console.log(`Created temporary staff user in DB: username=${staffUsername}, id=${tempStaffId}`);

        // 2. Login as the temporary staff user
        const loginRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/login',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, { username: staffUsername, password: rawPassword });

        const cookieHeader = loginRes.headers['set-cookie'];
        const staffSessionCookie = cookieHeader ? cookieHeader[0].split(';')[0] : '';
        console.log('Staff login response:', loginRes.statusCode, 'Cookie obtained:', !!staffSessionCookie);

        if (!staffSessionCookie) {
            throw new Error('Failed to obtain session cookie for staff login.');
        }

        // 3. Verify they can access orders API (since they have 'orders' permission)
        const ordersRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/orders',
            method: 'GET',
            headers: { 'Cookie': staffSessionCookie }
        });
        console.log('Staff GET /api/admin/orders status:', ordersRes.statusCode);
        if (ordersRes.statusCode === 200) {
            console.log('✅ TEST PASSED: Staff with "orders" permission is ALLOWED access to orders API.');
        } else {
            console.log('❌ TEST FAILED: Staff was blocked from orders API.');
        }

        // 4. Verify they cannot access settings or staff API (requires settings/staff permission)
        const staffListRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/staff',
            method: 'GET',
            headers: { 'Cookie': staffSessionCookie }
        });
        console.log('Staff GET /api/admin/staff status:', staffListRes.statusCode, staffListRes.body);
        if (staffListRes.statusCode === 403) {
            console.log('✅ TEST PASSED: Staff without "settings" permission is FORBIDDEN from staff API.');
        } else {
            console.log('❌ TEST FAILED: Staff was allowed access to staff API without permission.');
        }

        // 5. Test session endpoint for this staff member to verify permissions array matches
        const sessionRes = await makeRequest({
            hostname: 'localhost',
            port: 3000,
            path: '/api/admin/session',
            method: 'GET',
            headers: { 'Cookie': staffSessionCookie }
        });
        console.log('Session endpoint returns permissions:', sessionRes.body.admin?.permissions);
        if (sessionRes.body.loggedIn && sessionRes.body.admin.permissions.includes('orders') && sessionRes.body.admin.permissions.length === 1) {
            console.log('✅ TEST PASSED: Session permissions array successfully returns ["orders"].');
        } else {
            console.log('❌ TEST FAILED: Session permissions mismatch.');
        }


        console.log('\n=== TEST 2: Courier tracking AWB & Guest Tracking API ===\n');

        // Let's get an existing order from DB
        const testOrder = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM orders ORDER BY id DESC LIMIT 1', [], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!testOrder) {
            console.log('⚠️ No orders found in DB. Skipping Courier tracking test.');
        } else {
            console.log(`Using Order #${testOrder.id} (Phone: ${testOrder.phone}) for Courier Tracking Test.`);

            // Get items for this order to satisfy full payload requirement
            const orderItems = await new Promise((resolve, reject) => {
                db.all('SELECT * FROM order_items WHERE order_id = ?', [testOrder.id], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
            });

            // Login as admin to perform updates
            const adminLoginRes = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: '/api/admin/login',
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            }, { username: 'admin', password: 'admin123' });

            const adminCookieHeader = adminLoginRes.headers['set-cookie'];
            const adminSessionCookie = adminCookieHeader ? adminCookieHeader[0].split(';')[0] : '';
            
            // 1. Save Courier Name and AWB using PUT
            const updatePayload = {
                first_name: testOrder.first_name,
                last_name: testOrder.last_name,
                fullname: testOrder.fullname,
                phone: testOrder.phone,
                email: testOrder.email || '',
                house_no: testOrder.house_no || '',
                society: testOrder.society || '',
                street: testOrder.street || '',
                landmark: testOrder.landmark || '',
                city: testOrder.city || '',
                state: testOrder.state || '',
                pincode: testOrder.pincode || '',
                address: testOrder.address,
                items: orderItems,
                delivery_charge: testOrder.delivery_charge,
                total_amount: testOrder.total_amount,
                payment_method: testOrder.payment_method,
                payment_status: testOrder.payment_status,
                status: 'Shipped', // Mark as Shipped
                courier_name: 'Shree Mahavir Courier',
                tracking_number: 'MHV99887766'
            };

            const updateRes = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/admin/orders/${testOrder.id}`,
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Cookie': adminSessionCookie
                }
            }, updatePayload);

            console.log('Update tracking status:', updateRes.statusCode, updateRes.body);
            if (updateRes.statusCode === 200) {
                console.log('✅ TEST PASSED: Courier tracking AWB successfully updated via PUT orders API.');
            } else {
                console.log('❌ TEST FAILED: PUT orders API failed.');
            }

            // 2. Query DB to double check
            const dbOrder = await new Promise((resolve, reject) => {
                db.get('SELECT courier_name, tracking_number, status FROM orders WHERE id = ?', [testOrder.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            console.log('DB values after update:', dbOrder);
            if (dbOrder.courier_name === 'Shree Mahavir Courier' && dbOrder.tracking_number === 'MHV99887766' && dbOrder.status === 'Shipped') {
                console.log('✅ TEST PASSED: DB contains the correct courier and tracking number.');
            } else {
                console.log('❌ TEST FAILED: DB has incorrect values.');
            }

            // 3. Verify client-facing /api/guest/track-order returns tracking details
            const guestTrackRes = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/guest/track-order?phone=${encodeURIComponent(testOrder.phone)}&order_id=${testOrder.id}`,
                method: 'GET'
            });
            
            console.log('Guest tracking status:', guestTrackRes.statusCode, 'Body keys:', Object.keys(guestTrackRes.body));
            if (guestTrackRes.statusCode === 200 && guestTrackRes.body.success) {
                const guestOrder = guestTrackRes.body.order;
                if (guestOrder.courier_name === 'Shree Mahavir Courier' && guestOrder.tracking_number === 'MHV99887766') {
                    console.log('✅ TEST PASSED: Guest tracking API successfully returns courier details to customer.');
                } else {
                    console.log('❌ TEST FAILED: Guest tracking API did not include courier details.');
                }
            } else {
                console.log('❌ TEST FAILED: Guest tracking API returned error or failed.');
            }


            console.log('\n=== TEST 3: WhatsApp Notification Link Generation ===\n');

            // 1. Call customer WhatsApp API
            const waRes = await makeRequest({
                hostname: 'localhost',
                port: 3000,
                path: `/api/admin/orders/${testOrder.id}/customer-whatsapp`,
                method: 'GET',
                headers: { 'Cookie': adminSessionCookie }
            });

            console.log('WhatsApp response URL:', waRes.body.url);
            if (waRes.statusCode === 200 && waRes.body.url) {
                const urlObj = new URL(waRes.body.url);
                const text = urlObj.searchParams.get('text');
                console.log('Formatted Message Text:\n', text);
                if (text.includes('MHV99887766') && text.includes('Shree Mahavir Courier') && text.includes('17track.net')) {
                    console.log('✅ TEST PASSED: WhatsApp alert message successfully contains Shree Mahavir Courier tracking info & link.');
                } else {
                    console.log('❌ TEST FAILED: WhatsApp alert message did not contain courier info or link correctly.');
                }
            } else {
                console.log('❌ TEST FAILED: WhatsApp notification generation failed.');
            }
        }

    } catch (e) {
        console.error('Test execution error:', e);
    } finally {
        // Cleanup temp staff user
        if (tempStaffId) {
            await new Promise((resolve) => {
                db.run('DELETE FROM admin_users WHERE id = ?', [tempStaffId], () => {
                    console.log('\nCleaned up temporary staff user.');
                    resolve();
                });
            });
        }
        db.close();
        console.log('Database connection closed.');
    }
}

runTests();
