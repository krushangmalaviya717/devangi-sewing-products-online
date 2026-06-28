const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const nodemailer = require('nodemailer');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const session = require('express-session');

// Razorpay Instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere'
});

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("SMTP Error:", error);
  } else {
    console.log("SMTP Ready");
  }
});

const dns = require("dns");

dns.lookup("smtp.gmail.com", (err, address) => {
  console.log("DNS Test:");
  console.log(err || address);
});

const app = express();
app.set('trust proxy', 1); // Trust first proxy (required for Hostinger to set secure session cookies)
const port = 3000;

// Security middleware to prevent public access to sensitive backend/source files
app.use((req, res, next) => {
    const blockedExtensions = ['.env', '.sqlite', '.git', '.json', '.md'];
    const lowerPath = req.path.toLowerCase();
    
    const isSensitive = blockedExtensions.some(ext => lowerPath.endsWith(ext)) ||
                        lowerPath === '/server.js' ||
                        lowerPath.includes('/.env') ||
                        lowerPath.includes('/database.sqlite');
                        
    const isNodeModules = lowerPath.startsWith('/node_modules');

    const isRootJs = lowerPath.endsWith('.js') && 
                     !lowerPath.startsWith('/assets/') && 
                     !lowerPath.startsWith('/admin/js/') && 
                     lowerPath !== '/reset_nav.js' && 
                     lowerPath !== '/update_headers.js';
                     
    if (isSensitive || isNodeModules || isRootJs) {
        return res.status(403).send('Access Denied');
    }
    next();
});

// Persistent Uploads Setup (Stored outside the project directory to survive Git redeployments)
const UPLOADS_BASE_DIR = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'devangi-uploads');
const productUploadDir = path.join(UPLOADS_BASE_DIR, 'products');
const bannerUploadDir = path.join(UPLOADS_BASE_DIR, 'banners');
const logoUploadDir = path.join(UPLOADS_BASE_DIR, 'logo');

[productUploadDir, bannerUploadDir, logoUploadDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Product Storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, productUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// Banner Storage
const bannerStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, bannerUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'banner-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadBanner = multer({ storage: bannerStorage });

// Logo & Favicon Storage
const logoStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, logoUploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'brand-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const uploadLogo = multer({ storage: logoStorage });

// Secure hashing helper using PBKDF2 (No external dependency needed, fully backward compatible)
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    if (!storedHash.includes(':')) {
        // Fallback to legacy plain sha256 hash
        const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
        return legacyHash === storedHash;
    }
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

// Database setup
const dbPath = process.env.DATABASE_PATH || './database.sqlite';
try {
    if (fs.existsSync(dbPath)) {
        fs.chmodSync(dbPath, 0o666);
        console.log('Database file permissions set to 0666');
    }
} catch (chmodErr) {
    console.error('Failed to set database file permissions:', chmodErr.message);
}

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to database:', err.message);
    } else {
        console.log(`Connected to SQLite database at: ${dbPath}`);

        // Initialize products table with all fields
        db.run(`CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            category TEXT NOT NULL,
            price REAL NOT NULL,
            original_price REAL,
            image TEXT NOT NULL,
            images TEXT,
            description TEXT,
            sizes TEXT,
            offer_text TEXT,
            rating REAL DEFAULT 4.9,
            badge TEXT,
            related_products TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // Migrate: add new columns if they don't exist (for existing DBs)
            const newCols = [
                { name: 'images', def: 'TEXT' },
                { name: 'description', def: 'TEXT' },
                { name: 'sizes', def: 'TEXT' },
                { name: 'offer_text', def: 'TEXT' },
                { name: 'rating', def: 'REAL DEFAULT 4.9' },
                { name: 'badge', def: 'TEXT' },
                { name: 'related_products', def: 'TEXT' }
            ];
            newCols.forEach(col => {
                db.run(`ALTER TABLE products ADD COLUMN ${col.name} ${col.def}`, (err) => {
                    // Ignore "duplicate column" errors — they mean column already exists
                });
            });
        });

        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            fullname TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS otp_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL,
            otp TEXT NOT NULL,
            expires_at DATETIME NOT NULL
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            fullname TEXT NOT NULL,
            email TEXT,
            phone TEXT NOT NULL,
            total_amount REAL NOT NULL,
            delivery_charge REAL DEFAULT 0,
            address TEXT NOT NULL,
            payment_method TEXT DEFAULT 'COD',
            payment_status TEXT DEFAULT 'Pending',
            status TEXT DEFAULT 'Order Placed',
            invoice_sent_at DATETIME,
            transaction_id TEXT,
            payment_details TEXT, -- JSON storage for gateway responses
            
            -- Address Snapshot
            first_name TEXT,
            last_name TEXT,
            house_no TEXT,
            society TEXT, -- Society / Building
            street TEXT,
            landmark TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            label TEXT, -- Home / Office
            
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.run(`ALTER TABLE orders ADD COLUMN transaction_id TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN payment_details TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN first_name TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN last_name TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN house_no TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN society TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN street TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN landmark TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN city TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN state TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN pincode TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN label TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN courier_name TEXT`, (err) => {});
            db.run(`ALTER TABLE orders ADD COLUMN tracking_number TEXT`, (err) => {});
        });

        // Addresses Table
        db.run(`CREATE TABLE IF NOT EXISTS addresses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            nickname TEXT, -- Home, Work, etc.
            first_name TEXT,
            last_name TEXT,
            fullname TEXT, -- for backward compatibility
            phone TEXT,
            house_no TEXT,
            society TEXT,
            street TEXT,
            landmark TEXT,
            city TEXT,
            state TEXT,
            pincode TEXT,
            is_default INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`, () => {
            db.run(`ALTER TABLE addresses ADD COLUMN first_name TEXT`, (err) => {});
            db.run(`ALTER TABLE addresses ADD COLUMN last_name TEXT`, (err) => {});
            db.run(`ALTER TABLE addresses ADD COLUMN society TEXT`, (err) => {});
        });

        db.run(`CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            quantity INTEGER NOT NULL,
            image TEXT,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS order_tracking (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            status TEXT NOT NULL,
            note TEXT,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
        )`);

        db.run(`CREATE TABLE IF NOT EXISTS navigation_links (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            url TEXT NOT NULL,
            is_active INTEGER DEFAULT 1,
            sort_order INTEGER DEFAULT 0
        )`, () => {
            // Seed the simple navigation links if none exist
            db.get("SELECT COUNT(*) AS count FROM navigation_links", [], (err, row) => {
                if (!err && row && row.count === 0) {
                    const seed = [
                        ['Home', '/index.html', 1, 1],
                        ['Shop', '/shop.html', 1, 2],
                        ['Contact Us', '#', 1, 3]
                    ];
                    const stmt = db.prepare("INSERT INTO navigation_links (title, url, is_active, sort_order) VALUES (?, ?, ?, ?)");
                    seed.forEach(item => stmt.run(item));
                    stmt.finalize();
                }
            });
        });

        // Categories table
        db.run(`CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL,
            icon TEXT DEFAULT '🏷️',
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.get("SELECT COUNT(*) AS count FROM categories", [], (err, row) => {
                if (!err && row && row.count === 0) {
                    const defaultCats = [
                        ['Clothes', '👗', 1],
                        ['Shoes', '👟', 2],
                        ['Jewelry', '💍', 3],
                        ['Perfume', '🧴', 4],
                        ['Cosmetics', '💄', 5],
                        ['Accessories', '👜', 6],
                        ['Fabric', '🧵', 7],
                        ['Saree', '🥻', 8],
                        ['Blouse', '👚', 9]
                    ];
                    const stmt = db.prepare("INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)");
                    defaultCats.forEach(c => stmt.run(c));
                    stmt.finalize();
                }
            });
        });

        // Banners table
        db.run(`CREATE TABLE IF NOT EXISTS banners (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            subtitle TEXT,
            title TEXT NOT NULL,
            offer_text TEXT,
            button_text TEXT DEFAULT 'Shop Now',
            link_url TEXT DEFAULT '/shop.html',
            image_url TEXT NOT NULL,
            mobile_image_url TEXT,
            status INTEGER DEFAULT 1,
            open_new_tab INTEGER DEFAULT 0,
            sort_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.run(`ALTER TABLE banners ADD COLUMN mobile_image_url TEXT`, (err) => {});
            db.run(`ALTER TABLE banners ADD COLUMN status INTEGER DEFAULT 1`, (err) => {});
            db.run(`ALTER TABLE banners ADD COLUMN open_new_tab INTEGER DEFAULT 0`, (err) => {});

            db.get("SELECT COUNT(*) AS count FROM banners", [], (err, row) => {
                if (!err && row && row.count === 0) {
                    const defaultBanners = [
                        ['Trending Item', "Women's latest fashion sale", 'starting at Rs. 200', 'Shop Now', '/shop.html', './assets/images/banner-1.jpg', 1],
                        ['Trending Accessories', 'Modern sunglasses', 'starting at Rs. 150', 'Shop Now', '/shop.html', './assets/images/banner-2.jpg', 2],
                        ['New Fashion', 'New summer collection', 'starting at Rs. 299', 'Shop Now', '/shop.html', './assets/images/banner-3.jpg', 3]
                    ];
                    const stmt = db.prepare("INSERT INTO banners (subtitle, title, offer_text, button_text, link_url, image_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    defaultBanners.forEach(b => stmt.run(b));
                    stmt.finalize();
                }
            });
        });


        // Reviews table
        db.run(`CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            product_id INTEGER NOT NULL,
            user_id INTEGER,
            user_name TEXT NOT NULL,
            rating INTEGER NOT NULL,
            comment TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
            UNIQUE(product_id, user_id)
        )`, () => {
            db.run(`ALTER TABLE reviews ADD COLUMN user_id INTEGER`, (err) => {});
        });

        // Admin users table
        db.run(`CREATE TABLE IF NOT EXISTS admin_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT DEFAULT 'Admin',
            permissions TEXT DEFAULT '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            // Migration: add permissions column if it doesn't exist (for existing DBs)
            db.run(`ALTER TABLE admin_users ADD COLUMN permissions TEXT DEFAULT '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]'`, (err) => {});

            // Seed default admin if none exists
            db.get('SELECT COUNT(*) AS count FROM admin_users', [], (err, row) => {
                if (!err && row && row.count === 0) {
                    const defaultHash = hashPassword('admin123');
                    db.run('INSERT INTO admin_users (username, password_hash, display_name, permissions) VALUES (?, ?, ?, ?)',
                        ['admin', defaultHash, 'Store Owner', '["dashboard","orders","products","categories","coupons","users","banners","reviews","navigation","contact","reports","settings","staff"]']);
                    console.log('Default admin created: admin / admin123');
                } else {
                    // Update existing default admin to have all permissions if null/empty
                    db.run("UPDATE admin_users SET permissions = '[\"dashboard\",\"orders\",\"products\",\"categories\",\"coupons\",\"users\",\"banners\",\"reviews\",\"navigation\",\"contact\",\"reports\",\"settings\",\"staff\"]' WHERE username = 'admin' AND (permissions IS NULL OR permissions = '')");
                }
            });
        });

        // Coupons table
        db.run(`CREATE TABLE IF NOT EXISTS coupons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE NOT NULL,
            type TEXT DEFAULT 'percentage',
            value REAL NOT NULL,
            min_order REAL DEFAULT 0,
            max_discount REAL DEFAULT 0,
            usage_limit INTEGER DEFAULT 0,
            used_count INTEGER DEFAULT 0,
            limit_per_user INTEGER DEFAULT 0,
            first_order_only INTEGER DEFAULT 0,
            applicable_categories TEXT DEFAULT '',
            is_active INTEGER DEFAULT 1,
            expires_at DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`, () => {
            db.run(`ALTER TABLE coupons ADD COLUMN limit_per_user INTEGER DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE coupons ADD COLUMN first_order_only INTEGER DEFAULT 0`, (err) => {});
            db.run(`ALTER TABLE coupons ADD COLUMN applicable_categories TEXT DEFAULT ''`, (err) => {});
        });

        // Coupon usage tracking
        db.run(`CREATE TABLE IF NOT EXISTS coupon_usage (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coupon_id INTEGER,
            user_id INTEGER,
            used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(coupon_id) REFERENCES coupons(id),
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Store settings table
        db.run(`CREATE TABLE IF NOT EXISTS store_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT
        )`, () => {
            // Seed default settings
            const defaults = {
                'store_name': 'Devangi Products',
                'store_phone': '+91 7600550038',
                'store_email': 'devangisewingclasses@gmail.com',
                'store_address': 'B-3, Yogiraj Soc., YogiChowk, Surat.',
                'store_gstin': '',
                'gst_rate': '0',
                'shipping_free_above': '250',
                'shipping_default_charge': '50',
                'whatsapp_number': '919725340354',
                'whatsapp_notify': '0',
                'social_instagram': '',
                'social_facebook': '',
                'social_youtube': '',
                'footer_text': 'Thank you for shopping with Devangi Products!',
                'payment_enable_cod': '1',
                'payment_enable_online': '1',
                'payment_enable_whatsapp': '0',
                'payment_whatsapp_number': '',
                'homepage_show_trust_badges': '1',
                'homepage_show_testimonials': '1',
                'homepage_show_faqs': '1',
                'razorpay_key_id': process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere',
                'razorpay_key_secret': process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere',
                'whatsapp_template_placed': 'Hello {name},\n\nThank you for shopping at {store_name}! 🌸\n\nYour Order #{order_id} has been placed successfully.\nTotal Amount: Rs. {total_amount}\nPayment Method: {payment_method}\n\nTrack your order here: {tracking_url}',
                'whatsapp_template_shipped': 'Hello {name},\n\nYour order #{order_id} from {store_name} has been shipped! 🚀\nCourier: {courier}\nAWB/Docket No: {tracking_number}\n\nTrack your parcel live here: {tracking_url}\n\nThank you for shopping with us! 🌸',
                'cod_charge': '0',
                'shipping_charge_gujarat': '50',
                'shipping_charge_maharashtra': '60',
                'shipping_charge_others': '100',
                'seo_title': 'Devangi Products',
                'seo_description': 'Devangi Products Online Store - High quality sewing products and tools.',
                'seo_keywords': 'sewing, sewing products, devangi, sewing classes, sewing tools',
                'store_logo': '/assets/images/logo/logo.svg',
                'store_favicon': '/favicon.ico',
                'minimum_order_amount': '0',
                'store_url': 'http://localhost:3000',
                'whatsapp_gateway_type': 'ultramsg',
                'whatsapp_ultramsg_instance': '',
                'whatsapp_ultramsg_token': '',
                'whatsapp_template_delivered': 'Hello {name},\n\nYour order #{order_id} from {store_name} has been delivered successfully! 🎉\n\nYou can view your order details and download the invoice here: {tracking_url}\n\nThank you for shopping with us! 🌸'
            };
            Object.entries(defaults).forEach(([key, val]) => {
                db.run('INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES (?, ?)', [key, val]);
            });
            // Force update old default shipping values to new defaults (250 / 50)
            db.run("UPDATE store_settings SET setting_value = '250' WHERE setting_key = 'shipping_free_above' AND setting_value = '999'");
            db.run("UPDATE store_settings SET setting_value = '50' WHERE setting_key = 'shipping_default_charge' AND setting_value = '60'");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('minimum_order_amount', '0')");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('store_url', 'http://localhost:3000')");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('whatsapp_gateway_type', 'ultramsg')");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('whatsapp_ultramsg_instance', '')");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('whatsapp_ultramsg_token', '')");
            db.run("INSERT OR IGNORE INTO store_settings (setting_key, setting_value) VALUES ('whatsapp_template_delivered', 'Hello {name},\n\nYour order #{order_id} from {store_name} has been delivered successfully! 🎉\n\nYou can view your order details and download the invoice here: {tracking_url}\n\nThank you for shopping with us! 🌸')");
            
            // Automatically correct store_url to the live domain on the production Linux server
            if (require('fs').existsSync('/home')) {
                db.run("UPDATE store_settings SET setting_value = 'https://devangiproduct.com' WHERE setting_key = 'store_url' AND setting_value LIKE '%localhost%'");
            }
        });

        // Contact queries table
        db.run(`CREATE TABLE IF NOT EXISTS contact_queries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            order_status TEXT,
            delivery_related TEXT,
            message TEXT NOT NULL,
            status TEXT DEFAULT 'New',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Admin audit logs table
        db.run(`CREATE TABLE IF NOT EXISTS admin_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            ip_address TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Add stock column to products
        db.run(`ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT -1`, (err) => {}); // -1 = unlimited

        // Auto-fix duplicate/zero/improper banner sort orders to be sequential (1, 2, 3...)
        db.all("SELECT id, sort_order FROM banners ORDER BY sort_order ASC, id ASC", [], (err, rows) => {
            if (!err && rows && rows.length > 0) {
                rows.forEach((row, index) => {
                    const newOrder = index + 1;
                    if (row.sort_order !== newOrder) {
                        db.run("UPDATE banners SET sort_order = ? WHERE id = ?", [newOrder, row.id]);
                    }
                });
            }
        });
    }
});

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to avoid blocking Razorpay & Ionicons
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Session secret fallback with cryptographically secure random bytes to prevent session forgery
// Session secret fallback using a stable value if process.env.SESSION_SECRET is missing to prevent logging out on server restart
const sessionSecret = process.env.SESSION_SECRET || 'devangi_sewing_secret_fallback_key_2026';

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
    name: 'devangi_sid', // Custom name to prevent fingerprinting
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        sameSite: 'lax',
        secure: isProduction // Secure cookie on live HTTPS site, insecure on local
    }
}));



// Admin Auth Middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.adminUser) {
        return next();
    }
    // For API calls return JSON, for page requests redirect
    if (req.path.startsWith('/api/')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    return res.redirect('/admin/login.html');
}

// Helper to log admin actions
function logAdminAction(req, action, details) {
    const username = req.session && req.session.adminUser ? req.session.adminUser.username : 'unknown';
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    db.run('INSERT INTO admin_audit_logs (username, action, details, ip_address) VALUES (?, ?, ?, ?)', 
        [username, action, details, ip], (err) => {
            if (err) console.error('Error writing audit log:', err);
        }
    );
}

// Helper to send automatic WhatsApp alert using Ultramsg
async function sendWhatsAppAlert(orderId, alertType) {
    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) {
            console.error('WhatsApp Alert Error: Order not found', orderId);
            return;
        }
        
        db.all('SELECT setting_key, setting_value FROM store_settings', [], async (err, rows) => {
            if (err) {
                console.error('WhatsApp Alert Error: Settings not found');
                return;
            }
            
            const settings = {};
            (rows || []).forEach(r => { settings[r.setting_key] = r.setting_value; });
            
            // Check if WhatsApp notification is enabled
            if (settings.whatsapp_notify !== '1') {
                console.log('WhatsApp Alert: Notifications are disabled in settings.');
                return;
            }
            
            const instanceId = settings.whatsapp_ultramsg_instance;
            const token = settings.whatsapp_ultramsg_token;
            
            if (!instanceId || !token) {
                console.error('WhatsApp Alert Error: Ultramsg Instance ID or Token is missing in settings.');
                return;
            }
            
            // Determine template
            let template = '';
            if (alertType === 'placed') {
                template = settings.whatsapp_template_placed || '';
            } else if (alertType === 'shipped') {
                template = settings.whatsapp_template_shipped || '';
            }
            
            if (!template) {
                console.error('WhatsApp Alert Error: Template is empty for', alertType);
                return;
            }
            
            // Format phone number (prepend 91 if it's 10 digits)
            let phone = (order.phone || '').trim().replace(/\D/g, '');
            if (phone.length === 10) {
                phone = '91' + phone;
            }
            
            // Replace placeholders
            let storeUrl = settings.store_url || 'http://localhost:3000';
            if (storeUrl.includes('localhost')) {
                if (process.env.STORE_URL) {
                    storeUrl = process.env.STORE_URL;
                } else if (process.env.VERCEL_URL) {
                    storeUrl = `https://${process.env.VERCEL_URL}`;
                }
            }
            const trackingUrl = `${storeUrl}/track-order.html?phone=${order.phone}&order_id=${orderId}`;
            const customerName = order.fullname || `${order.first_name} ${order.last_name}`;
            
            let message = template
                .replace(/{name}/g, customerName)
                .replace(/{order_id}/g, orderId)
                .replace(/{total_amount}/g, order.total_amount)
                .replace(/{payment_method}/g, order.payment_method || 'COD')
                .replace(/{tracking_url}/g, trackingUrl)
                .replace(/{courier}/g, order.courier_name || '')
                .replace(/{tracking_number}/g, order.tracking_number || '')
                .replace(/{store_name}/g, settings.store_name || 'Devangi Products');
                
            console.log(`Sending WhatsApp alert (${alertType}) to ${phone}...`);
            
            // Send request to Ultramsg
            try {
                const url = `https://api.ultramsg.com/${instanceId}/messages/chat`;
                const payload = JSON.stringify({
                    token: token,
                    to: phone,
                    body: message
                });
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: payload
                });
                
                const result = await response.json();
                console.log('WhatsApp Alert Response:', result);
            } catch (postErr) {
                console.error('WhatsApp Alert Post Error:', postErr);
            }
        });
    });
}

// Helper function to check granular permissions with backward compatibility
function checkPermission(perms, module, action = 'view') {
    if (!perms || !Array.isArray(perms)) return false;
    
    // Parent module allows everything for that module
    if (perms.includes(module)) return true;
    
    // Special mapping for settings and staff
    if (module === 'staff' && perms.includes('settings')) return true;
    if (module === 'settings' && perms.includes('staff')) return true;
    
    // Check specific action (e.g. products_create)
    const specificPerm = `${module}_${action}`;
    if (perms.includes(specificPerm)) return true;
    
    // If the check is for 'view', any granular action within the module implies 'view' authority
    if (action === 'view') {
        return perms.some(p => p.startsWith(module + '_'));
    }
    
    return false;
}

// Custom Permission Middleware (legacy wrapper)
function requirePermission(module, action = 'view') {
    return (req, res, next) => {
        if (!req.session || !req.session.adminUser) {
            if (req.path.startsWith('/api/')) return res.status(401).json({ error: 'Unauthorized' });
            return res.redirect('/admin/login.html');
        }
        const perms = req.session.adminUser.permissions || [];
        const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
        
        if (isSuper || checkPermission(perms, module, action)) {
            return next();
        }
        
        if (req.path.startsWith('/api/')) {
            return res.status(403).json({ error: `Forbidden: Insufficient permissions (${module}_${action})` });
        }
        return res.send(`
            <html>
                <head>
                    <title>Access Denied</title>
                    <script src="/assets/js/tailwindcss.js"></script>
                    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
                </head>
                <body class="bg-gray-50 flex items-center justify-center h-screen font-sans" style="font-family: 'Poppins', sans-serif;">
                    <div class="bg-white p-8 rounded-xl shadow-md border max-w-md text-center">
                        <div class="text-red-500 text-5xl mb-4">⚠️</div>
                        <h1 class="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
                        <p class="text-gray-500 text-sm mb-6">You do not have permission to access this resource (${module}_${action}).</p>
                        <a href="/admin/index.html" class="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Go to Dashboard</a>
                    </div>
                </body>
            </html>
        `);
    };
}

// Protect all admin pages except login
app.use('/admin', (req, res, next) => {
    // Allow login page and static assets
    if (req.path === '/login.html' || req.path.startsWith('/js/') || req.path.startsWith('/css/')) {
        return next();
    }
    if (!req.session || !req.session.adminUser) {
        return res.redirect('/admin/login.html');
    }

    // Path-based permission checks for HTML pages
    const pagePerms = {
        '/index.html': 'dashboard',
        '/orders.html': 'orders',
        '/products.html': 'products',
        '/categories.html': 'categories',
        '/coupons.html': 'coupons',
        '/users.html': 'users',
        '/user_details.html': 'users',
        '/banners.html': 'banners',
        '/reviews.html': 'reviews',
        '/navigation.html': 'navigation',
        '/contact.html': 'contact',
        '/reports.html': 'reports',
        '/settings.html': 'settings',
        '/staff.html': 'staff'
    };

    let checkPath = req.path;
    if (checkPath === '/' || checkPath === '') {
        checkPath = '/index.html';
    }
    const moduleName = pagePerms[checkPath];
    if (moduleName) {
        const userPerms = req.session.adminUser.permissions || [];
        const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
        
        if (!isSuper && !checkPermission(userPerms, moduleName, 'view')) {
            return res.send(`
                <html>
                    <head>
                        <title>Access Denied</title>
                        <script src="/assets/js/tailwindcss.js"></script>
                        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600;700&display=swap" rel="stylesheet">
                    </head>
                    <body class="bg-gray-50 flex items-center justify-center h-screen font-sans" style="font-family: 'Poppins', sans-serif;">
                        <div class="bg-white p-8 rounded-xl shadow-md border max-w-md text-center">
                            <div class="text-red-500 text-5xl mb-4">⚠️</div>
                            <h1 class="text-xl font-bold text-gray-800 mb-2">Access Denied</h1>
                            <p class="text-gray-500 text-sm mb-6">You do not have authority to access this page.</p>
                            <a href="/admin/index.html" class="bg-pink-500 hover:bg-pink-600 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors">Go to Dashboard</a>
                        </div>
                    </body>
                </html>
            `);
        }
    }
    return next();
});

// Protect all admin API calls based on permissions
app.use('/api/admin', (req, res, next) => {
    // Exclude login, logout, and session check
    if (req.path === '/login' || req.path === '/logout' || req.path === '/session') {
        return next();
    }
    
    if (!req.session || !req.session.adminUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const perms = req.session.adminUser.permissions || [];
    const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
    if (isSuper) {
        return next();
    }
    
    const reqPath = req.path;
    const method = req.method;
    
    let module = null;
    let action = 'view';
    
    if (reqPath.startsWith('/settings')) {
        module = 'settings';
        action = (method === 'GET') ? 'view' : 'edit';
    } else if (reqPath.startsWith('/reviews')) {
        module = 'reviews';
        action = (method === 'GET') ? 'view' : 'delete';
    } else if (reqPath.startsWith('/nav')) {
        module = 'navigation';
        if (method === 'GET') {
            action = 'view';
        } else {
            action = (method === 'DELETE') ? 'delete' : 'edit';
        }
    } else if (reqPath.startsWith('/orders')) {
        module = 'orders';
        if (reqPath.includes('/export')) {
            action = 'export';
        } else if (method === 'GET') {
            action = 'view';
        } else {
            action = 'edit';
        }
    } else if (reqPath.startsWith('/coupons')) {
        module = 'coupons';
        if (method === 'GET') {
            action = 'view';
        } else if (method === 'POST') {
            action = 'create';
        } else if (method === 'DELETE') {
            action = 'delete';
        } else {
            action = 'edit';
        }
    } else if (reqPath.startsWith('/contact')) {
        module = 'contact';
        action = (method === 'GET') ? 'view' : 'edit';
    } else if (reqPath.startsWith('/reports')) {
        module = 'reports';
        action = 'view';
    } else if (reqPath.startsWith('/staff')) {
        module = 'staff';
        if (method === 'GET') {
            action = 'view';
        } else if (method === 'POST') {
            action = 'create';
        } else if (method === 'DELETE') {
            action = 'delete';
        } else {
            action = 'edit';
        }
    } else if (reqPath.startsWith('/customers') || reqPath.startsWith('/user-details')) {
        module = 'users';
        action = 'view';
    }
    
    if (module && !checkPermission(perms, module, action)) {
        return res.status(403).json({ error: `Forbidden: Insufficient permissions (${module}_${action})` });
    }
    
    return next();
});

// Serve persistent uploads statically
app.use('/uploads', express.static(UPLOADS_BASE_DIR, {
    maxAge: '30d'
}));

// Static file serving
app.use(express.static(path.join(__dirname, '.'), {
    maxAge: '1d', // Cache static assets for 1 day in browser
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            // Do not cache HTML files so users always get the latest content updates
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

app.get("/test", (req, res) => {
  res.send("Server working");
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});


// ===== STORE SETTINGS API =====

// Public: Get all settings as key-value object
app.get('/api/settings', (req, res) => {
    db.all('SELECT setting_key, setting_value FROM store_settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        (rows || []).forEach(r => { settings[r.setting_key] = r.setting_value; });
        res.json(settings);
    });
});

// Admin: Update settings
app.put('/api/admin/settings', (req, res) => {
    const settings = req.body;
    if (!settings || typeof settings !== 'object') return res.status(400).json({ error: 'Invalid settings' });

    const entries = Object.entries(settings);
    if (entries.length === 0) return res.json({ success: true });

    let completed = 0;
    let errors = [];

    entries.forEach(([key, value]) => {
        const val = typeof value === 'object' ? JSON.stringify(value) : value;
        db.run('INSERT OR REPLACE INTO store_settings (setting_key, setting_value) VALUES (?, ?)', [key, val], (err) => {
            if (err) {
                console.error(`Failed to save setting ${key}:`, err);
                errors.push({ key, error: err.message });
            }
            completed++;
            if (completed === entries.length) {
                if (errors.length > 0) {
                    return res.status(500).json({ 
                        error: 'Failed to save some settings', 
                        details: errors 
                    });
                }
                logAdminAction(req, 'settings_update', 'Updated global store settings');
                res.json({ success: true });
            }
        });
    });
});

// GET: Public Razorpay Key
app.get('/api/razorpay/key', (req, res) => {
    db.get("SELECT setting_value FROM store_settings WHERE setting_key = 'razorpay_key_id'", [], (err, row) => {
        const key = row?.setting_value || process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere';
        res.json({ key });
    });
});

// POST: Admin Upload Settings Assets (Logo / Favicon)
app.post('/api/admin/settings/upload', uploadLogo.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const filePath = `/uploads/logo/${req.file.filename}`;
    res.json({ success: true, filePath });
});
// --- API Endpoints ---

// Global API 404 Handler (Ensures /api/ always returns JSON)
app.use('/api', (req, res, next) => {
    const originalJson = res.json;
    res.json = function(body) {
        res.setHeader('Content-Type', 'application/json');
        return originalJson.call(this, body);
    };
    next();
});

// UNIQUE ENDPOINT: /api/order-detail-system/:id
app.get('/api/order-detail-system/:id', (req, res) => {
    const orderId = req.params.id;
    const userId = req.query.user_id;
    console.log(`[SYSTEM] Accessing Order #${orderId} for User #${userId}`);

    db.get('SELECT * FROM orders WHERE id = ? AND user_id = ?', [orderId, userId], (err, order) => {
        // Return 200 with error instead of 404 to prevent HTML interception
        if (err || !order) {
            console.error("[SYSTEM] Order not found:", orderId);
            return res.json({ error: 'Order not found or access denied' });
        }
        
        db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
            db.all('SELECT * FROM order_tracking WHERE order_id = ? ORDER BY updated_at ASC', [orderId], (err, tracking) => {
                res.json({ success: true, order, items, tracking });
            });
        });
    });
});

// ===== CATEGORIES API =====

// Get all categories (with product count)
app.get('/api/categories', (req, res) => {
    const sql = `
        SELECT c.*, COUNT(p.id) as product_count
        FROM categories c
        LEFT JOIN products p ON LOWER(p.category) = LOWER(c.name)
        GROUP BY c.id
        ORDER BY c.sort_order ASC, c.name ASC
    `;
    db.all(sql, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Protect write endpoints for products and categories (Non-GET requests require admin session & granular permissions)
app.use('/api/products', (req, res, next) => {
    if (req.method === 'GET') return next();
    if (!req.session || !req.session.adminUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const perms = req.session.adminUser.permissions || [];
    const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
    if (isSuper) return next();

    let action = 'edit';
    if (req.method === 'POST') action = 'create';
    if (req.method === 'DELETE') action = 'delete';

    if (!checkPermission(perms, 'products', action)) {
        return res.status(403).json({ error: `Forbidden: Insufficient permissions (products_${action})` });
    }
    next();
});

app.use('/api/categories', (req, res, next) => {
    if (req.method === 'GET') return next();
    if (!req.session || !req.session.adminUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const perms = req.session.adminUser.permissions || [];
    const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
    if (isSuper) return next();

    let action = 'edit';
    if (req.method === 'POST') action = 'create';
    if (req.method === 'DELETE') action = 'delete';

    if (!checkPermission(perms, 'categories', action)) {
        return res.status(403).json({ error: `Forbidden: Insufficient permissions (categories_${action})` });
    }
    next();
});

// Add new category
app.post('/api/categories', (req, res) => {
    const { name, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    db.get('SELECT MAX(sort_order) as maxOrder FROM categories', [], (err, row) => {
        const nextOrder = (row && row.maxOrder != null) ? row.maxOrder + 1 : 1;
        db.run('INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?)',
            [name.trim(), icon || '🏷️', nextOrder],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Category already exists' });
                    return res.status(500).json({ error: err.message });
                }
                logAdminAction(req, 'category_create', `Created category: ${name.trim()}`);
                res.json({ success: true, id: this.lastID, name: name.trim() });
            });
    });
});

// Edit category
app.put('/api/categories/:id', (req, res) => {
    const { name, icon } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Category name is required' });

    // Get old name first (to update products table too)
    db.get('SELECT name FROM categories WHERE id = ?', [req.params.id], (err, old) => {
        if (err || !old) return res.status(404).json({ error: 'Category not found' });
        const oldName = old.name;

        db.run('UPDATE categories SET name = ?, icon = ? WHERE id = ?',
            [name.trim(), icon || '🏷️', req.params.id],
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Category name already exists' });
                    return res.status(500).json({ error: err.message });
                }
                // Also update all products that had the old category name
                db.run('UPDATE products SET category = ? WHERE category = ?', [name.trim(), oldName], () => {
                    logAdminAction(req, 'category_edit', `Updated category ID ${req.params.id}: ${name.trim()} (previously ${oldName})`);
                    res.json({ success: true });
                });
            });
    });
});

// Delete category
app.delete('/api/categories/:id', (req, res) => {
    db.run('DELETE FROM categories WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAdminAction(req, 'category_delete', `Deleted category ID: ${req.params.id}`);
        res.json({ success: true });
    });
});

// ===== PRODUCTS API =====

// Get all products
app.get('/api/products', (req, res) => {

    db.all('SELECT * FROM products ORDER BY id DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        // Parse images JSON for each product
        rows = rows.map(p => ({
            ...p,
            images: p.images ? JSON.parse(p.images) : (p.image ? [p.image] : [])
        }));
        res.json(rows);
    });
});

// Search products (for auto-suggestions)
app.get('/api/search', (req, res) => {
    const q = req.query.q;
    if (!q) return res.json([]);

    const sql = `SELECT id, title, image, price, category FROM products 
                 WHERE title LIKE ? OR category LIKE ? 
                 LIMIT 5`;
    const params = [`%${q}%`, `%${q}%`];

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add a new product (supports up to 10 images via 'images' field)
app.post('/api/products', upload.array('images', 10), (req, res) => {
    const { title, category, price, original_price, description, sizes, offer_text, rating, badge, stock, related_products } = req.body;

    if (!title || !category || !price) {
        return res.status(400).json({ error: 'Title, category, and price are required' });
    }

    let imagePaths = [];

    if (req.files && req.files.length > 0) {
        imagePaths = req.files.map(f => `/uploads/products/${f.filename}`);
    } else {
        imagePaths = ['/assets/images/products/1.jpg']; // default fallback
    }

    const primaryImage = imagePaths[0];
    const imagesJson = JSON.stringify(imagePaths);

    // Parse sizes: can be comma-separated string
    const sizesJson = sizes ? JSON.stringify(sizes.split(',').map(s => s.trim()).filter(Boolean)) : null;

    const sql = `INSERT INTO products 
        (title, category, price, original_price, image, images, description, sizes, offer_text, rating, badge, stock, related_products) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    const params = [
        title, category, parseFloat(price),
        original_price ? parseFloat(original_price) : null,
        primaryImage, imagesJson,
        description || null,
        sizesJson,
        offer_text || null,
        rating ? parseFloat(rating) : 4.9,
        badge || null,
        stock !== undefined && stock !== '' ? parseInt(stock) : -1,
        related_products || null
    ];

    db.run(sql, params, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        logAdminAction(req, 'product_create', `Created product: ${title} (Price: ${price})`);
        res.json({ id: this.lastID, message: 'Product added successfully' });
    });
});

// Public: Get single product by ID
app.get('/api/products/:id', (req, res) => {
    db.get('SELECT * FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!row) return res.status(404).json({ error: 'Product not found' });

        // Parse images and sizes JSON
        row.images = row.images ? JSON.parse(row.images) : (row.image ? [row.image] : []);
        row.sizes = row.sizes ? JSON.parse(row.sizes) : [];

        res.json(row);
    });
});

// Update a product (Edit)
app.put('/api/products/:id', upload.array('new_images', 10), (req, res) => {
    const id = req.params.id;
    const { title, category, price, original_price, description, sizes, offer_text, rating, badge, keep_images, related_products } = req.body;

    if (!title || !category || !price) {
        return res.status(400).json({ error: 'Title, category, and price are required' });
    }

    // First get existing product to preserve images if no new ones uploaded
    db.get('SELECT * FROM products WHERE id = ?', [id], (err, existing) => {
        if (err || !existing) return res.status(404).json({ error: 'Product not found' });

        let imagePaths = [];

        if (req.files && req.files.length > 0) {
            // New images uploaded — use them
            imagePaths = req.files.map(f => `/uploads/products/${f.filename}`);
        } else if (keep_images) {
            // Keep existing images (passed as JSON string from client)
            try { imagePaths = JSON.parse(keep_images); } catch(e) { imagePaths = []; }
        }

        // Fallback to existing images if nothing provided
        if (imagePaths.length === 0) {
            try { imagePaths = existing.images ? JSON.parse(existing.images) : [existing.image]; } catch(e) { imagePaths = [existing.image]; }
        }

        const primaryImage = imagePaths[0];
        const imagesJson = JSON.stringify(imagePaths);
        const sizesJson = sizes ? JSON.stringify(sizes.split(',').map(s => s.trim()).filter(Boolean)) : null;

        const stockVal = req.body.stock !== undefined && req.body.stock !== '' ? parseInt(req.body.stock) : (existing.stock || -1);

        const sql = `UPDATE products SET
            title=?, category=?, price=?, original_price=?, image=?, images=?,
            description=?, sizes=?, offer_text=?, rating=?, badge=?, stock=?, related_products=?
            WHERE id=?`;
        const params = [
            title, category, parseFloat(price),
            original_price ? parseFloat(original_price) : null,
            primaryImage, imagesJson,
            description || null,
            sizesJson,
            offer_text || null,
            rating ? parseFloat(rating) : 4.9,
            badge || null,
            stockVal,
            related_products || null,
            id
        ];

        db.run(sql, params, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAdminAction(req, 'product_edit', `Updated product: ${title} (ID: ${id})`);
            res.json({ message: 'Product updated successfully' });
        });
    });
});

// Delete a product
app.delete('/api/products/:id', (req, res) => {
    const id = req.params.id;
    const sql = 'DELETE FROM products WHERE id = ?';
    db.run(sql, id, function (err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        logAdminAction(req, 'product_delete', `Deleted product ID: ${id}`);
        res.json({ message: 'Product deleted', changes: this.changes });
    });
});

// ===== REVIEWS API =====

// Get reviews for a product
app.get('/api/reviews/:product_id', (req, res) => {
    db.all('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [req.params.product_id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Submit or Update a Review
app.post('/api/reviews', (req, res) => {
    const { product_id, user_id, user_name, rating, comment } = req.body;
    if (!product_id || !user_name || !rating) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO reviews (product_id, user_id, user_name, rating, comment, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(product_id, user_id) DO UPDATE SET
            rating = excluded.rating,
            comment = excluded.comment,
            created_at = CURRENT_TIMESTAMP
    `;

    db.run(query, [product_id, user_id, user_name, rating, comment], function(err) {
        if (err) {
            console.error('Review submission error:', err.message);
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Review saved successfully', id: this.lastID });
    });
});

// Get user's specific review for a product
app.get('/api/reviews/user/:product_id/:user_id', (req, res) => {
    const { product_id, user_id } = req.params;
    db.get('SELECT * FROM reviews WHERE product_id = ? AND user_id = ?', [product_id, user_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || null);
    });
});

// Check if user has purchased the product (for verified reviews)
app.get('/api/reviews/check-purchase/:product_id/:user_id', (req, res) => {
    const { product_id, user_id } = req.params;
    const query = `
        SELECT 1 FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.user_id = ? AND oi.product_id = ? AND o.status != 'Cancelled'
        LIMIT 1
    `;
    db.get(query, [user_id, product_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ purchased: !!row });
    });
});

// Verify guest purchase to allow reviews
app.post('/api/reviews/verify-guest-purchase', (req, res) => {
    const { phone, product_id } = req.body;
    if (!phone || !product_id) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const query = `
        SELECT o.fullname FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE o.phone = ? AND oi.product_id = ? AND o.status != 'Cancelled'
        LIMIT 1
    `;
    db.get(query, [phone, product_id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) {
            res.json({ verified: true, guest_name: row.fullname });
        } else {
            res.json({ verified: false, error: 'No purchased order found for this product with this phone number.' });
        }
    });
});

// Get latest reviews (Public - for homepage testimonials)
app.get('/api/public/reviews/latest', (req, res) => {
    db.all(`
        SELECT r.*, p.title as product_title 
        FROM reviews r 
        JOIN products p ON r.product_id = p.id 
        ORDER BY r.created_at DESC 
        LIMIT 6
    `, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ===== ADMIN REVIEWS API (Protected) =====

// Get all reviews (Admin)
app.get('/api/admin/reviews', requireAdmin, (req, res) => {
    const query = `
        SELECT r.*, p.title as product_title 
        FROM reviews r 
        LEFT JOIN products p ON r.product_id = p.id 
        ORDER BY r.created_at DESC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Delete a review (Admin)
app.delete('/api/admin/reviews/:id', requireAdmin, (req, res) => {
    db.run('DELETE FROM reviews WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Review deleted successfully' });
    });
});

// --- Auth Endpoints ---

// Get all users (Admin)
app.get('/api/users', (req, res) => {
    const { month, year } = req.query;
    let sql = 'SELECT id, fullname, email, created_at FROM users';
    let conditions = [];
    let params = [];

    if (month) {
        conditions.push("strftime('%m', created_at) = ?");
        params.push(month);
    }
    if (year) {
        conditions.push("strftime('%Y', created_at) = ?");
        params.push(year);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Fetch user details and order history by email (Admin)
app.get('/api/admin/user-details/:email', (req, res) => {
    const email = req.params.email;
    
    // First try to find the user in the users table
    db.get('SELECT id, fullname, email, created_at FROM users WHERE email = ?', [email], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Then get all their orders
        db.all('SELECT * FROM orders WHERE email = ? ORDER BY created_at DESC', [email], (err, orders) => {
            if (err) return res.status(500).json({ error: err.message });
            
            // Try to extract phone/name from the most recent order if not found in users table
            let customerInfo = user || { email: email, fullname: 'Unknown', is_guest: true };
            if (!user && orders.length > 0) {
                customerInfo.fullname = orders[0].fullname;
                customerInfo.phone = orders[0].phone;
            } else if (user && orders.length > 0) {
                customerInfo.phone = orders[0].phone;
            }
            
            res.json({
                user: customerInfo,
                orders: orders
            });
        });
    });
});

// --- Navigation Endpoints ---

// Frontend: Get active nav items
app.get('/api/nav', (req, res) => {
    db.all('SELECT * FROM navigation_links WHERE is_active = 1 ORDER BY sort_order ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Admin: Get all nav items
app.get('/api/admin/nav', (req, res) => {
    db.all('SELECT * FROM navigation_links ORDER BY sort_order ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(rows);
    });
});

// Admin: Add new nav item
app.post('/api/admin/nav', (req, res) => {
    const { title, url, sort_order } = req.body;
    db.run('INSERT INTO navigation_links (title, url, sort_order, is_active) VALUES (?, ?, ?, 1)',
        [title || 'New Link', url || '#', sort_order || 99], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true, id: this.lastID });
    });
});

// Admin: Toggle active status
app.put('/api/admin/nav/:id/toggle', (req, res) => {
    const { is_active } = req.body;
    db.run('UPDATE navigation_links SET is_active = ? WHERE id = ?',
        [is_active ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// Admin: Delete nav item
app.delete('/api/admin/nav/:id', (req, res) => {
    db.run('DELETE FROM navigation_links WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

// Check if email is already registered
app.post('/api/check-email', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email/Username is required' });

    // Check if it's an admin/staff user first
    db.get('SELECT username FROM admin_users WHERE username = ?', [email.trim()], (err, admin) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        
        if (admin) {
            // It's a staff/admin member
            return res.json({ exists: true, isAdmin: true, username: admin.username });
        }

        // Not an admin, check regular users
        db.get('SELECT id, email, fullname FROM users WHERE email = ?', [email], (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ exists: !!user, isAdmin: false, user: user || null });
        });
    });
});

app.post('/api/send-otp', (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60000);

    db.run('INSERT INTO otp_records (email, otp, expires_at) VALUES (?, ?, ?)', [email, otp, expiresAt.toISOString()], (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });

        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: 'Your Devangi Products OTP Code',
            text: `Your OTP code is: ${otp}. It will expire in 10 minutes. Please do not share this code.`
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ error: 'Failed to send OTP via email. Check .env configuration.' });
            }
            res.json({ message: 'OTP sent successfully' });
        });
    });
});

app.post('/api/verify-otp', (req, res) => {
    const { email, otp, fullname } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'Email and OTP required' });

    db.get('SELECT * FROM otp_records WHERE email = ? ORDER BY id DESC LIMIT 1', [email], (err, record) => {
        if (err || !record) return res.status(400).json({ error: 'Invalid or expired OTP' });

        if (record.otp !== otp) return res.status(400).json({ error: 'Incorrect OTP' });

        if (new Date(record.expires_at) < new Date()) {
            return res.status(400).json({ error: 'OTP has expired' });
        }

        db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
            if (user) {
                res.json({ message: 'Login successful', user });
            } else {
                db.run('INSERT INTO users (email, fullname) VALUES (?, ?)', [email, fullname || email.split('@')[0]], function(err) {
                    if (err) return res.status(500).json({ error: 'Failed to register user' });
                    res.json({ message: 'Registration successful', user: { id: this.lastID, email, fullname: fullname || email.split('@')[0] } });
                });
            }
        });
    });
});

// --- Checkout & Orders Endpoints ---

// Get All Orders (Admin) with Search, Filters, and Pagination
app.get('/api/admin/orders', (req, res) => {
    const { status, date, startDate, endDate, month, year, q, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    console.log(`Orders API call: status=${status}, startDate=${startDate}, endDate=${endDate}, month=${month}, year=${year}, q=${q}, page=${page}`);
    
    let sql = 'SELECT * FROM orders';
    let countSql = 'SELECT COUNT(*) as total FROM orders';
    const params = [];
    const countParams = [];
    
    let conditions = [];
    
    if (status) {
        conditions.push(' status = ?');
        params.push(status);
        countParams.push(status);
    }
    
    if (date) {
        conditions.push(' date(created_at) = ?');
        params.push(date);
        countParams.push(date);
    } else if (startDate && endDate) {
        conditions.push(' date(created_at) BETWEEN ? AND ?');
        params.push(startDate, endDate);
        countParams.push(startDate, endDate);
    } else if (startDate) {
        conditions.push(' date(created_at) >= ?');
        params.push(startDate);
        countParams.push(startDate);
    } else if (endDate) {
        conditions.push(' date(created_at) <= ?');
        params.push(endDate);
        countParams.push(endDate);
    }
    
    if (month) {
        conditions.push(" strftime('%m', created_at) = ?");
        params.push(month);
        countParams.push(month);
    }
    if (year) {
        conditions.push(" strftime('%Y', created_at) = ?");
        params.push(year);
        countParams.push(year);
    }
    
    if (q) {
        const searchTerm = `%${q}%`;
        conditions.push(' (id LIKE ? OR fullname LIKE ? OR phone LIKE ? OR email LIKE ?)');
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    if (conditions.length > 0) {
        const whereClause = ' WHERE ' + conditions.join(' AND');
        sql += whereClause;
        countSql += whereClause;
    }
    
    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('SQL:', sql, 'Params:', params);
    
    db.get(countSql, countParams, (err, countRow) => {
        if (err) {
            console.error('Count SQL Error:', err);
            return res.status(500).json({ error: err.message });
        }
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                console.error('Main SQL Error:', err);
                return res.status(500).json({ error: err.message });
            }
            
            console.log(`Found ${rows.length} orders out of ${countRow.total} total.`);
            
            const totalOrders = countRow.total;
            const totalPages = Math.ceil(totalOrders / limit);
            
            res.json({
                orders: rows,
                pagination: {
                    totalOrders,
                    totalPages,
                    currentPage: parseInt(page),
                    limit: parseInt(limit)
                }
            });
        });
    });
});

// Get Order Details (Admin)
app.get('/api/admin/orders/:id', (req, res) => {
    const orderId = req.params.id;
    console.log(`[ADMIN] Attempting to fetch details for Order #${orderId}`);
    
    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err) {
            console.error(`[ADMIN ERROR] DB Fetch Order #${orderId}:`, err);
            return res.status(500).json({ error: err.message });
        }
        if (!order) {
            console.warn(`[ADMIN WARN] Order #${orderId} not found`);
            return res.status(404).json({ error: 'Order not found' });
        }
        
        db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
            db.all('SELECT * FROM order_tracking WHERE order_id = ? ORDER BY updated_at DESC', [orderId], (err, tracking) => {
                console.log(`[ADMIN SUCCESS] Loaded Order #${orderId} with ${items.length} items`);
                res.json({ order, items, tracking });
            });
        });
    });
});

// Delete Order (Admin)
app.delete('/api/admin/orders/:id', (req, res) => {
    const orderId = req.params.id;
    console.log(`[ADMIN] Request to delete Order #${orderId}`);

    db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], function(err) {
        if (err) {
            console.error(`[ADMIN ERROR] Delete order items for Order #${orderId}:`, err);
            return res.status(500).json({ error: 'Failed to delete order items' });
        }
        
        db.run('DELETE FROM order_tracking WHERE order_id = ?', [orderId], function(err) {
            if (err) {
                console.error(`[ADMIN ERROR] Delete order tracking for Order #${orderId}:`, err);
                return res.status(500).json({ error: 'Failed to delete order tracking' });
            }
            
            db.run('DELETE FROM orders WHERE id = ?', [orderId], function(err) {
                if (err) {
                    console.error(`[ADMIN ERROR] Delete Order #${orderId}:`, err);
                    return res.status(500).json({ error: 'Failed to delete order record' });
                }
                console.log(`[ADMIN SUCCESS] Deleted Order #${orderId}`);
                logAdminAction(req, 'order_delete', `Deleted order #${orderId}`);
                res.json({ success: true, message: 'Order deleted successfully' });
            });
        });
    });
});

// Get User Orders (User Side) - Optimized with JOIN for performance
app.get('/api/user/:userId/orders', (req, res) => {
    const userId = req.params.userId;
    
    const sql = `
        SELECT 
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
            console.error('[DB ERROR] Fetch user orders:', err);
            return res.status(500).json({ error: err.message });
        }

        console.log(`[USER API] Found ${rows.length} raw rows for User #${userId}`);
        
        // Transform flat rows into nested order objects
        const ordersMap = new Map();
        
        rows.forEach(row => {
            if (!ordersMap.has(row.id)) {
                const { item_id, item_name, item_price, item_quantity, item_image, ...orderData } = row;
                ordersMap.set(row.id, {
                    ...orderData,
                    items: []
                });
            }
            
            const currentOrder = ordersMap.get(row.id);
            if (row.item_id) {
                console.log(`[USER API] Associating Item #${row.item_id} with Order #${row.id}`);
                currentOrder.items.push({
                    id: row.item_id,
                    name: row.item_name,
                    price: row.item_price,
                    quantity: row.item_quantity,
                    image: row.item_image
                });
            }
        });

        const result = Array.from(ordersMap.values());
        console.log(`[USER API] Sending ${result.length} orders. First order items count: ${result[0]?.items?.length || 0}`);
        res.json(result);
    });
});

// Get Guest Order Details for Tracking (Option B - Phone + Order ID)
app.get('/api/guest/track-order', (req, res) => {
    const { phone, order_id } = req.query;
    if (!phone || !order_id) {
        return res.status(400).json({ error: 'Phone number and Order ID are required' });
    }

    db.get('SELECT * FROM orders WHERE id = ? AND phone = ?', [order_id, phone], (err, order) => {
        if (err || !order) {
            return res.json({ error: 'Order not found or invalid phone number' });
        }
        
        db.all('SELECT * FROM order_items WHERE order_id = ?', [order_id], (err, items) => {
            db.all('SELECT * FROM order_tracking WHERE order_id = ? ORDER BY updated_at ASC', [order_id], (err, tracking) => {
                res.json({ success: true, order, items, tracking });
            });
        });
    });
});

// Get all orders by phone number (for guest lookups)
app.get('/api/guest/orders-by-phone', (req, res) => {
    const { phone } = req.query;
    if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
    }
    db.all('SELECT id, total_amount, status, created_at FROM orders WHERE phone = ? ORDER BY created_at DESC', [phone], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows || []);
    });
});

// Note: /api/user/orders/:id has been moved to the top of API section to prevent shadowing

// Update Order Status (Admin) with Logic & Automation
app.post('/api/admin/orders/:id/status', (req, res) => {
    const { status, note } = req.body;
    const orderId = req.params.id;
    
    // Get current status to validate transition
    db.get('SELECT status, payment_method, payment_status FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) return res.status(404).json({ error: 'Order not found' });
        
        const validTransitions = {
            'Order Placed': ['Processing', 'Cancelled'],
            'Processing': ['Shipped', 'Cancelled'],
            'Shipped': ['Out for Delivery'],
            'Out for Delivery': ['Delivered'],
            'Delivered': [],
            'Cancelled': []
        };
        
        // Internal Note check
        if (status === 'Internal Note') {
            db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'Note', note], (err) => {
                return res.json({ success: true, message: 'Note added' });
            });
            return;
        }

        const allowed = validTransitions[order.status] || [];
        if (!allowed.includes(status) && status !== order.status) {
            // Allow if it's the same status (maybe just updating note)
            // But generally we want to enforce the flow
            // return res.status(400).json({ error: `Invalid transition from ${order.status} to ${status}` });
        }

        db.run('UPDATE orders SET status = ? WHERE id = ?', [status, orderId], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Auto-update payment status if Delivered and COD
            if (status === 'Delivered' && order.payment_method === 'COD') {
                db.run('UPDATE orders SET payment_status = ? WHERE id = ?', ['Paid', orderId]);
            }

            // Log event
            db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', 
                [orderId, status, note || `Status updated to ${status}`], (err) => {
                logAdminAction(req, 'order_status_update', `Updated order #${orderId} status to: ${status}`);
                
                if (status === 'Shipped') {
                    sendWhatsAppAlert(orderId, 'shipped');
                } else if (status === 'Delivered') {
                    sendWhatsAppAlert(orderId, 'delivered');
                }
                
                res.json({ success: true, message: `Status updated to ${status}` });
            });
        });
    });
});

// Update Order Payment Status (Admin)
app.post('/api/admin/orders/:id/payment', (req, res) => {
    const { status, note } = req.body;
    const orderId = req.params.id;
    
    db.run('UPDATE orders SET payment_status = ? WHERE id = ?', [status, orderId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        
        db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'Payment: ' + status, note || ''], (err) => {
            logAdminAction(req, 'order_payment_update', `Updated order #${orderId} payment status to: ${status}`);
            res.json({ success: true, message: `Payment status updated to ${status}` });
        });
    });
});

// Edit Order Details (Admin)
app.put('/api/admin/orders/:id', requireAdmin, (req, res) => {
    const orderId = req.params.id;
    const { 
        first_name, last_name, fullname, email, phone, total_amount, delivery_charge, 
        address, house_no, society, street, landmark, city, state, pincode, label,
        items, payment_method, payment_status, status,
        courier_name, tracking_number
    } = req.body;

    if (!first_name || !last_name || !phone) {
        return res.status(400).json({ error: 'Missing required order details' });
    }

    const finalFullname = fullname || `${first_name} ${last_name}`;

    const sql = `UPDATE orders SET 
        first_name=?, last_name=?, fullname=?, email=?, phone=?, total_amount=?, delivery_charge=?, address=?, 
        house_no=?, society=?, street=?, landmark=?, city=?, state=?, pincode=?, label=?,
        payment_method=?, payment_status=?, status=?, courier_name=?, tracking_number=?
        WHERE id=?`;

    db.run(sql, [
        first_name, last_name, finalFullname, email || '', phone, total_amount, delivery_charge || 0, address || '',
        house_no, society, street, landmark, city, state, pincode, label,
        payment_method || 'COD', payment_status || 'Pending', status || 'Order Placed',
        courier_name || '', tracking_number || '',
        orderId
    ], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: 'Failed to update order' });
        }

        // If items are provided, update them
        if (items && Array.isArray(items)) {
            // Delete old items and insert new ones
            db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
                if (err) {
                    console.error('Error deleting old items:', err);
                }
                const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)');
                items.forEach(item => {
                    stmt.run([orderId, item.product_id || item.id || null, item.name, item.price, item.quantity || 1, item.image || '']);
                });
                stmt.finalize();
            });
        }

        // Add tracking timeline log for editing
        db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', [
            orderId, 
            status || 'Order Updated', 
            'Order details were updated by admin.'
        ], (err) => {
            logAdminAction(req, 'order_edit', `Updated order details for #${orderId}`);
            
            if (status === 'Shipped') {
                sendWhatsAppAlert(orderId, 'shipped');
            } else if (status === 'Delivered') {
                sendWhatsAppAlert(orderId, 'delivered');
            }
            
            res.json({ success: true, message: 'Order updated successfully' });
        });
    });
});

// Send Invoice Email (Admin)
app.post('/api/admin/orders/:id/send-invoice', async (req, res) => {
    const orderId = req.params.id;
    
    db.get('SELECT * FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (err || !order) return res.status(404).json({ error: 'Order not found' });
        if (!order.email) return res.status(400).json({ error: 'Customer email not found' });
        
        db.all('SELECT * FROM order_items WHERE order_id = ?', [orderId], (err, items) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            // Create simple HTML invoice for email
            const itemsHtml = items.map(item => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${item.price.toFixed(2)}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">Rs. ${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `).join('');
            
            const emailHtml = `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
                    <h2 style="color: #db2777;">Devangi Products</h2>
                    <p>Dear ${order.fullname},</p>
                    <p>Thank you for your order! Here is your invoice for order <strong>#${order.id}</strong>.</p>
                    
                    <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                        <thead>
                            <tr style="background-color: #f9fafb;">
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #eee;">Item</th>
                                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #eee;">Qty</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee;">Price</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #eee;">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${itemsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Subtotal:</td>
                                <td style="padding: 8px; text-align: right;">Rs. ${(order.total_amount - (order.delivery_charge || 0)).toFixed(2)}</td>
                            </tr>
                            <tr>
                                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Shipping:</td>
                                <td style="padding: 8px; text-align: right;">Rs. ${parseFloat(order.delivery_charge || 0).toFixed(2)}</td>
                            </tr>
                            <tr style="font-size: 18px; color: #db2777;">
                                <td colspan="3" style="padding: 8px; text-align: right; font-weight: bold;">Total:</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold;">Rs. ${parseFloat(order.total_amount).toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    <div style="margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px;">
                        <p><strong>Shipping Address:</strong><br>${order.address.replace(/\n/g, '<br>')}</p>
                        <p><strong>Payment Method:</strong> ${order.payment_method}</p>
                        <p><strong>Payment Status:</strong> ${order.payment_status}</p>
                    </div>
                    
                    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                        This is an automated email. Please do not reply.
                    </p>
                </div>
            `;
            
            const mailOptions = {
                from: process.env.GMAIL_USER,
                to: order.email,
                subject: `Invoice for Order #${order.id} - Devangi Products`,
                html: emailHtml
            };
            
            transporter.sendMail(mailOptions, (error, info) => {
                if (error) {
                    console.error('Email send error:', error);
                    return res.status(500).json({ error: 'Failed to send email. Check SMTP settings.' });
                }
                
                db.run('UPDATE orders SET invoice_sent_at = CURRENT_TIMESTAMP WHERE id = ?', [orderId], () => {
                    db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', 
                        [orderId, 'Invoice Sent', `Invoice emailed to ${order.email}`], () => {
                        res.json({ success: true, message: 'Invoice sent successfully' });
                    });
                });
            });
        });
    });
});

// Get Customer Stats (Admin)
app.get('/api/admin/customers/stats', (req, res) => {
    const { phone } = req.query;
    db.get('SELECT COUNT(*) as order_count FROM orders WHERE phone = ?', [phone], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ order_count: row.order_count || 0 });
    });
});

// ===== Address Management =====
app.get('/api/addresses', (req, res) => {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: 'User ID required' });
    db.all('SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC', [userId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/addresses', (req, res) => {
    const { user_id, nickname, first_name, last_name, phone, house_no, society, street, landmark, city, state, pincode, is_default } = req.body;
    
    if (is_default) {
        db.run('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user_id]);
    }

    const fullname = `${first_name} ${last_name}`;
    const sql = `INSERT INTO addresses (user_id, nickname, first_name, last_name, fullname, phone, house_no, society, street, landmark, city, state, pincode, is_default)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [user_id, nickname, first_name, last_name, fullname, phone, house_no, society, street, landmark, city, state, pincode, is_default ? 1 : 0], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

app.delete('/api/addresses/:id', (req, res) => {
    db.run('DELETE FROM addresses WHERE id = ?', [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== Razorpay Integration =====
function getRazorpayConfig(callback) {
    db.all("SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('razorpay_key_id', 'razorpay_key_secret')", [], (err, rows) => {
        let keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_YourKeyHere';
        let keySecret = process.env.RAZORPAY_KEY_SECRET || 'YourSecretHere';
        if (!err && rows) {
            rows.forEach(r => {
                if (r.setting_key === 'razorpay_key_id' && r.setting_value) keyId = r.setting_value;
                if (r.setting_key === 'razorpay_key_secret' && r.setting_value) keySecret = r.setting_value;
            });
        }
        callback(null, { keyId, keySecret });
    });
}

app.post('/api/razorpay/create-order', async (req, res) => {
    const { amount } = req.body; // Amount in INR
    const options = {
        amount: Math.round(amount * 100), // convert to paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`
    };
    getRazorpayConfig(async (err, config) => {
        try {
            const rzp = new Razorpay({ key_id: config.keyId, key_secret: config.keySecret });
            const order = await rzp.orders.create(options);
            res.json(order);
        } catch (err2) {
            res.status(500).json({ error: err2.message });
        }
    });
});

app.post('/api/razorpay/verify', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    getRazorpayConfig((err, config) => {
        const expectedSign = crypto
            .createHmac("sha256", config.keySecret)
            .update(sign.toString())
            .digest("hex");

        if (razorpay_signature === expectedSign) {
            return res.json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.status(400).json({ error: "Invalid signature" });
        }
    });
});

// Place Order (User Side - Updated for Automation & Structured Address)
app.post('/api/orders', (req, res) => {
    const { 
        user_id, first_name, last_name, fullname, email, phone, total_amount, delivery_charge, 
        address, // full string for compatibility
        house_no, society, street, landmark, city, state, pincode, label,
        items, payment_method, transaction_id, payment_status 
    } = req.body;
    
    if (!first_name || !last_name || !phone || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required order details' });
    }

    // Verify stock availability first
    const productIds = items.filter(item => item.id).map(item => item.id);
    if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        db.all(`SELECT id, title, stock FROM products WHERE id IN (${placeholders})`, productIds, (err, rows) => {
            if (err) return res.status(500).json({ error: 'Database error while verifying stock' });
            
            for (const item of items) {
                if (!item.id) continue;
                const dbProduct = rows.find(r => String(r.id) === String(item.id));
                if (dbProduct) {
                    if (dbProduct.stock !== -1 && dbProduct.stock < (item.quantity || 1)) {
                        return res.status(400).json({ 
                            error: `Product "${item.name || dbProduct.title}" has only ${dbProduct.stock} units remaining. Please adjust your quantity.` 
                        });
                    }
                }
            }
            
            // If all items pass stock check, proceed
            createOrder();
        });
    } else {
        createOrder();
    }

    function createOrder() {
        const sql = `INSERT INTO orders (
            user_id, first_name, last_name, fullname, email, phone, total_amount, delivery_charge, address, 
            house_no, society, street, landmark, city, state, pincode, label,
            payment_method, payment_status, transaction_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

        const status = payment_status || (payment_method === 'COD' ? 'Pending' : 'Paid');
        const finalFullname = fullname || `${first_name} ${last_name}`;

        db.run(sql, [
            user_id || null, first_name, last_name, finalFullname, email || '', phone, total_amount, delivery_charge || 0, address || '',
            house_no, society, street, landmark, city, state, pincode, label,
            payment_method || 'COD', status, transaction_id || null
        ], function(err) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Failed to create order' });
            }
            
            const orderId = this.lastID;
            
            // Insert items and decrement stock
            const stmt = db.prepare('INSERT INTO order_items (order_id, product_id, name, price, quantity, image) VALUES (?, ?, ?, ?, ?, ?)');
            items.forEach(item => {
                stmt.run([orderId, item.id || null, item.name, item.price, item.quantity || 1, item.image || '']);
                // Decrement stock (only if stock is tracked, i.e., > -1)
                if (item.id) {
                    db.run('UPDATE products SET stock = stock - ? WHERE id = ? AND stock >= ?', [item.quantity || 1, item.id, item.quantity || 1]);
                }
            });
            stmt.finalize();
            
            // Initial tracking
            db.run('INSERT INTO order_tracking (order_id, status, note) VALUES (?, ?, ?)', [orderId, 'Order Placed', 'Order received successfully.']);
            
            // Send automatic WhatsApp notification
            sendWhatsAppAlert(orderId, 'placed');
            
            res.json({ orderId, message: 'Order placed successfully' });
        });
    }
});


// ===== BANNERS API =====

// Get all banners
app.get('/api/banners', (req, res) => {
    db.all('SELECT * FROM banners ORDER BY sort_order ASC, id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Add new banner
app.post('/api/banners', uploadBanner.fields([{ name: 'image', maxCount: 1 }, { name: 'mobile_image', maxCount: 1 }]), (req, res) => {
    const { subtitle, title, offer_text, button_text, link_url, sort_order, status, open_new_tab } = req.body;
    
    const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
    if (!imageFile) {
        return res.status(400).json({ error: 'Desktop image is required' });
    }

    const imageUrl = `/uploads/banners/${imageFile.filename}`;
    
    const mobileImageFile = req.files && req.files['mobile_image'] ? req.files['mobile_image'][0] : null;
    const mobileImageUrl = mobileImageFile ? `/uploads/banners/${mobileImageFile.filename}` : null;

    const parsedStatus = (status === '1' || status === 'true') ? 1 : 0;
    const parsedOpenNewTab = (open_new_tab === '1' || open_new_tab === 'true') ? 1 : 0;
    const parsedSortOrder = parseInt(sort_order, 10);
    const finalSortOrder = isNaN(parsedSortOrder) ? 0 : parsedSortOrder;

    const sql = `INSERT INTO banners (subtitle, title, offer_text, button_text, link_url, image_url, mobile_image_url, status, open_new_tab, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(sql, [
        subtitle || '',
        title || '',
        offer_text || '',
        button_text || '',
        link_url || '',
        imageUrl,
        mobileImageUrl,
        parsedStatus,
        parsedOpenNewTab,
        finalSortOrder
    ], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, id: this.lastID });
    });
});

// Update banner
app.put('/api/banners/:id', uploadBanner.fields([{ name: 'image', maxCount: 1 }, { name: 'mobile_image', maxCount: 1 }]), (req, res) => {
    const { subtitle, title, offer_text, button_text, link_url, sort_order, status, open_new_tab, remove_mobile_image } = req.body;
    const id = req.params.id;

    const imageFile = req.files && req.files['image'] ? req.files['image'][0] : null;
    const mobileImageFile = req.files && req.files['mobile_image'] ? req.files['mobile_image'][0] : null;

    const parsedStatus = (status === '1' || status === 'true') ? 1 : 0;
    const parsedOpenNewTab = (open_new_tab === '1' || open_new_tab === 'true') ? 1 : 0;
    const removeMobile = (remove_mobile_image === '1' || remove_mobile_image === 'true');
    const parsedSortOrder = parseInt(sort_order, 10);
    const finalSortOrder = isNaN(parsedSortOrder) ? 0 : parsedSortOrder;

    let sql = `UPDATE banners SET subtitle=?, title=?, offer_text=?, button_text=?, link_url=?, status=?, open_new_tab=?, sort_order=?`;
    let params = [
        subtitle || '',
        title || '',
        offer_text || '',
        button_text || '',
        link_url || '',
        parsedStatus,
        parsedOpenNewTab,
        finalSortOrder
    ];

    if (imageFile) {
        const imageUrl = `/uploads/banners/${imageFile.filename}`;
        sql += `, image_url=?`;
        params.push(imageUrl);
    }
 
    if (mobileImageFile) {
        const mobileImageUrl = `/uploads/banners/${mobileImageFile.filename}`;
        sql += `, mobile_image_url=?`;
        params.push(mobileImageUrl);
    } else if (removeMobile) {
        sql += `, mobile_image_url=NULL`;
    }

    sql += ` WHERE id=?`;
    params.push(id);

    db.run(sql, params, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Delete banner
app.delete('/api/banners/:id', (req, res) => {
    db.run('DELETE FROM banners WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== CONTACT & SETTINGS API =====

// Get store settings (Public)
app.get('/api/settings', (req, res) => {
    db.all('SELECT setting_key, setting_value FROM store_settings', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        const settings = {};
        rows.forEach(r => settings[r.setting_key] = r.setting_value);
        res.json(settings);
    });
});

// Submit contact query (Public)
app.post('/api/contact', (req, res) => {
    const { name, email, order_status, delivery_related, message } = req.body;
    if (!name || !email || !message) return res.status(400).json({ error: 'Name, email, and message are required' });

    const sql = `INSERT INTO contact_queries (name, email, order_status, delivery_related, message) VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [name, email, order_status, delivery_related, message], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: 'Query submitted successfully' });
    });
});

// Get all contact queries (Admin)
app.get('/api/admin/contact', (req, res) => {
    const { month, year, status } = req.query;
    let sql = 'SELECT * FROM contact_queries';
    let conditions = [];
    let params = [];

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (month) {
        conditions.push("strftime('%m', created_at) = ?");
        params.push(month);
    }
    if (year) {
        conditions.push("strftime('%Y', created_at) = ?");
        params.push(year);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY id DESC';

    db.all(sql, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Update contact query status (Admin)
app.put('/api/admin/contact/:id', (req, res) => {
    const { status } = req.body;
    db.run('UPDATE contact_queries SET status = ? WHERE id = ?', [status, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ===== ADMIN AUTH =====

// In-memory rate limiting store for admin logins
const loginAttempts = {};
const rateLimitMiddleware = (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    if (loginAttempts[ip]) {
        const attempts = loginAttempts[ip].filter(t => now - t < 15 * 60 * 1000);
        loginAttempts[ip] = attempts;
        if (attempts.length >= 10) {
            return res.status(429).json({ error: 'Too many login attempts. Please try again after 15 minutes.' });
        }
    } else {
        loginAttempts[ip] = [];
    }
    next();
};

app.post('/api/admin/check-username', (req, res) => {
    const { username } = req.body;
    if (!username) return res.status(400).json({ error: 'Username is required' });

    db.get('SELECT username, display_name FROM admin_users WHERE username = ?', [username.trim()], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(404).json({ error: 'Username not found' });
        
        res.json({ exists: true, display_name: user.display_name });
    });
});

app.post('/api/admin/login', rateLimitMiddleware, (req, res) => {
    const { username, password, rememberMe } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    db.get('SELECT * FROM admin_users WHERE username = ?', [username.trim()], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!admin || !verifyPassword(password, admin.password_hash)) {
            if (loginAttempts[req.ip]) {
                loginAttempts[req.ip].push(Date.now());
            }
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        let permissionsList = [];
        try {
            permissionsList = JSON.parse(admin.permissions || '[]');
        } catch (e) {
            permissionsList = [];
        }

        req.session.adminUser = { 
            id: admin.id, 
            username: admin.username, 
            display_name: admin.display_name,
            permissions: permissionsList
        };
        
        // Set session lifetime to 2 days if rememberMe is checked, otherwise session-only
        if (rememberMe) {
            req.session.cookie.maxAge = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds
        } else {
            req.session.cookie.expires = false; // expires on browser close
        }
        
        if (loginAttempts[req.ip]) {
            loginAttempts[req.ip] = [];
        }

        logAdminAction(req, 'login', `Staff logged in (Remember me: ${!!rememberMe})`);

        res.json({ 
            success: true, 
            admin: { 
                username: admin.username, 
                display_name: admin.display_name,
                permissions: permissionsList
            } 
        });
    });
});

app.post('/api/admin/logout', (req, res) => {
    logAdminAction(req, 'logout', 'Staff logged out');
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/admin/logout', (req, res) => {
    logAdminAction(req, 'logout', 'Staff logged out');
    req.session.destroy(() => {
        res.redirect('/admin/login.html');
    });
});

app.get('/api/admin/session', (req, res) => {
    if (req.session && req.session.adminUser) {
        const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
        return res.json({ loggedIn: true, admin: req.session.adminUser, isSuper });
    }
    res.json({ loggedIn: false });
});

app.post('/api/admin/change-password', (req, res) => {
    if (!req.session || !req.session.adminUser) return res.status(401).json({ error: 'Unauthorized' });
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });

    db.get('SELECT * FROM admin_users WHERE id = ?', [req.session.adminUser.id], (err, admin) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!admin || !verifyPassword(current_password, admin.password_hash)) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }
        const newHash = hashPassword(new_password);
        db.run('UPDATE admin_users SET password_hash = ? WHERE id = ?', [newHash, req.session.adminUser.id], (err) => {
            if (err) return res.status(500).json({ error: err.message });
            logAdminAction(req, 'change_password', 'Staff changed their password');
            res.json({ success: true });
        });
    });
});

// ===== ADMIN STAFF CRUD API =====

// Get all staff members
app.get('/api/admin/staff', (req, res) => {
    db.all('SELECT id, username, display_name, permissions, created_at FROM admin_users ORDER BY id ASC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        // Parse permissions strings
        const staffList = rows.map(row => ({
            ...row,
            permissions: JSON.parse(row.permissions || '[]')
        }));
        res.json(staffList);
    });
});

// Create new staff member
app.post('/api/admin/staff', (req, res) => {
    const { username, password, display_name, permissions } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const hash = hashPassword(password);
    const permsString = JSON.stringify(permissions || []);

    db.run('INSERT INTO admin_users (username, password_hash, display_name, permissions) VALUES (?, ?, ?, ?)',
        [username.trim(), hash, display_name || 'Staff', permsString],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: err.message });
            }
            logAdminAction(req, 'staff_create', `Created staff account: ${username}`);
            res.json({ success: true, message: 'Staff member created successfully', id: this.lastID });
        }
    );
});

// Edit staff member
app.put('/api/admin/staff/:id', (req, res) => {
    const { username, password, display_name, permissions } = req.body;
    const { id } = req.params;

    // Check if editing main admin
    if (parseInt(id) === 1 && req.session.adminUser.id !== 1) {
        return res.status(403).json({ error: 'Only the main administrator can edit their own profile' });
    }

    let query = 'UPDATE admin_users SET display_name = ?';
    const params = [display_name || 'Staff'];

    if (parseInt(id) !== 1) {
        query += ', username = ?, permissions = ?';
        params.push(username.trim(), JSON.stringify(permissions || []));
    }

    if (password && password.trim() !== '') {
        query += ', password_hash = ?';
        params.push(hashPassword(password));
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE')) {
                return res.status(400).json({ error: 'Username already exists' });
            }
            return res.status(500).json({ error: err.message });
        }
        logAdminAction(req, 'staff_edit', `Updated staff account: ${username || id}`);
        res.json({ success: true, message: 'Staff member updated successfully' });
    });
});

// Delete staff member
app.delete('/api/admin/staff/:id', (req, res) => {
    const { id } = req.params;
    if (parseInt(id) === 1) {
        return res.status(400).json({ error: 'Cannot delete primary admin' });
    }

    db.run('DELETE FROM admin_users WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAdminAction(req, 'staff_delete', `Deleted staff account ID: ${id}`);
        res.json({ success: true, message: 'Staff member deleted successfully' });
    });
});

// Get Admin Audit Logs
app.get('/api/admin/audit-logs', (req, res) => {
    if (!req.session || !req.session.adminUser) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const perms = req.session.adminUser.permissions || [];
    const isSuper = req.session.adminUser.id === 1 || req.session.adminUser.username === 'admin';
    if (!isSuper && !checkPermission(perms, 'staff', 'view') && !checkPermission(perms, 'settings', 'view')) {
        return res.status(403).json({ error: 'Forbidden' });
    }

    const { username, action, limit = 100, offset = 0 } = req.query;
    let query = 'SELECT * FROM admin_audit_logs WHERE 1=1';
    const params = [];

    if (username) {
        query += ' AND username LIKE ?';
        params.push(`%${username}%`);
    }
    if (action) {
        query += ' AND action = ?';
        params.push(action);
    }

    query += ' ORDER BY id DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        
        let countQuery = 'SELECT COUNT(*) AS count FROM admin_audit_logs WHERE 1=1';
        const countParams = [];
        if (username) {
            countQuery += ' AND username LIKE ?';
            countParams.push(`%${username}%`);
        }
        if (action) {
            countQuery += ' AND action = ?';
            countParams.push(action);
        }

        db.get(countQuery, countParams, (err2, countRow) => {
            if (err2) return res.status(500).json({ error: err2.message });
            res.json({
                logs: rows,
                total: countRow ? countRow.count : 0
            });
        });
    });
});

// ===== COUPONS API =====

app.get('/api/admin/coupons', (req, res) => {
    db.all('SELECT * FROM coupons ORDER BY created_at DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admin/coupons', (req, res) => {
    const { code, type, value, min_order, max_discount, usage_limit, limit_per_user, first_order_only, applicable_categories, expires_at } = req.body;
    if (!code || (type !== 'free_shipping' && !value)) return res.status(400).json({ error: 'Code and value are required' });

    db.run(`INSERT INTO coupons (code, type, value, min_order, max_discount, usage_limit, limit_per_user, first_order_only, applicable_categories, expires_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            code.toUpperCase().trim(),
            type || 'percentage',
            value || 0,
            min_order || 0,
            max_discount || 0,
            usage_limit || 0,
            limit_per_user ? 1 : 0,
            first_order_only ? 1 : 0,
            applicable_categories || '',
            expires_at || null
        ],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Coupon code already exists' });
                return res.status(500).json({ error: err.message });
            }
            logAdminAction(req, 'coupon_create', `Created coupon: ${code.toUpperCase().trim()}`);
            res.json({ success: true, id: this.lastID });
        });
});

app.put('/api/admin/coupons/:id', (req, res) => {
    const { code, type, value, min_order, max_discount, usage_limit, limit_per_user, first_order_only, applicable_categories, is_active, expires_at } = req.body;
    db.run(`UPDATE coupons SET code=?, type=?, value=?, min_order=?, max_discount=?, usage_limit=?, limit_per_user=?, first_order_only=?, applicable_categories=?, is_active=?, expires_at=? WHERE id=?`,
        [
            code.toUpperCase().trim(),
            type,
            value || 0,
            min_order || 0,
            max_discount || 0,
            usage_limit || 0,
            limit_per_user ? 1 : 0,
            first_order_only ? 1 : 0,
            applicable_categories || '',
            is_active ? 1 : 0,
            expires_at || null,
            req.params.id
        ],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            logAdminAction(req, 'coupon_edit', `Updated coupon: ${code.toUpperCase().trim()} (ID: ${req.params.id})`);
            res.json({ success: true });
        });
});

app.delete('/api/admin/coupons/:id', (req, res) => {
    db.run('DELETE FROM coupons WHERE id = ?', [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAdminAction(req, 'coupon_delete', `Deleted coupon ID: ${req.params.id}`);
        res.json({ success: true });
    });
});

app.post('/api/admin/coupons/:id/status', (req, res) => {
    if (!req.session || !req.session.adminUser) return res.status(401).json({ error: 'Unauthorized' });
    const { is_active } = req.body;
    db.run('UPDATE coupons SET is_active = ? WHERE id = ?', [is_active ? 1 : 0, req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        logAdminAction(req, 'coupon_toggle', `Toggled coupon ID ${req.params.id} status to ${is_active ? 'Active' : 'Inactive'}`);
        res.json({ success: true });
    });
});

// Validate & Apply Coupon (Public - for checkout)
app.post('/api/coupons/validate', (req, res) => {
    const { code, order_total, user_id, items } = req.body;
    if (!code) return res.status(400).json({ error: 'Coupon code required' });

    db.get('SELECT * FROM coupons WHERE code = ? AND is_active = 1', [code.toUpperCase().trim()], (err, coupon) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!coupon) return res.status(400).json({ error: 'Invalid or expired coupon code' });

        // Check per-user limit
        if (coupon.limit_per_user && user_id) {
            db.get('SELECT id FROM coupon_usage WHERE coupon_id = ? AND user_id = ?', [coupon.id, user_id], (err, usageRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (usageRow) {
                    return res.status(400).json({ error: 'You have already used this coupon code' });
                }
                checkFirstOrderOnly(coupon);
            });
        } else {
            checkFirstOrderOnly(coupon);
        }
    });

    function checkFirstOrderOnly(coupon) {
        if (coupon.first_order_only && user_id) {
            db.get('SELECT id FROM orders WHERE user_id = ? AND status != "Cancelled" LIMIT 1', [user_id], (err, orderRow) => {
                if (err) return res.status(500).json({ error: err.message });
                if (orderRow) {
                    return res.status(400).json({ error: 'This coupon is only valid for your first order' });
                }
                proceedWithValidation(coupon);
            });
        } else {
            proceedWithValidation(coupon);
        }
    }

    function proceedWithValidation(coupon) {
        // Check expiry
        if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
            return res.status(400).json({ error: 'This coupon has expired' });
        }

        // Check usage limit
        if (coupon.usage_limit > 0 && coupon.used_count >= coupon.usage_limit) {
            return res.status(400).json({ error: 'Coupon usage limit reached' });
        }

        // Check minimum order
        if (coupon.min_order > 0 && order_total < coupon.min_order) {
            return res.status(400).json({ error: `Minimum order of Rs.${coupon.min_order} required` });
        }

        // Check category restriction
        if (coupon.applicable_categories && coupon.applicable_categories.trim() !== '') {
            const allowedCats = coupon.applicable_categories.split(',').map(c => c.trim().toLowerCase()).filter(Boolean);
            if (allowedCats.length > 0) {
                if (!items || !items.length) {
                    return res.status(400).json({ error: 'Cart items are required for category coupon validation' });
                }
                
                const itemIds = items.map(item => item.id).filter(Boolean);
                if (itemIds.length === 0) {
                    return res.status(400).json({ error: 'No valid items in cart' });
                }
                
                // Query categories of items
                const placeholders = itemIds.map(() => '?').join(',');
                db.all(`SELECT id, category FROM products WHERE id IN (${placeholders})`, itemIds, (err, products) => {
                    if (err) return res.status(500).json({ error: err.message });
                    
                    const productCategoryMap = {};
                    products.forEach(p => {
                        productCategoryMap[String(p.id)] = p.category ? p.category.trim().toLowerCase() : '';
                    });

                    // Calculate subtotal of items in allowed categories
                    let restrictedSubtotal = 0;
                    let hasApplicableItem = false;
                    
                    items.forEach(item => {
                        const cat = productCategoryMap[String(item.id)] || '';
                        if (allowedCats.includes(cat)) {
                            restrictedSubtotal += (parseFloat(item.price) * parseInt(item.quantity));
                            hasApplicableItem = true;
                        }
                    });

                    if (!hasApplicableItem) {
                        return res.status(400).json({ error: `This coupon only applies to products in categories: ${coupon.applicable_categories}` });
                    }

                    calculateAndSendDiscount(coupon, restrictedSubtotal);
                });
                return;
            }
        }

        // Default: discount applies to whole cart
        calculateAndSendDiscount(coupon, order_total);
    }

    function calculateAndSendDiscount(coupon, discountableSubtotal) {
        // Calculate discount
        let discount = 0;
        let isFreeShipping = false;
        if (coupon.type === 'percentage') {
            discount = (discountableSubtotal * coupon.value) / 100;
            if (coupon.max_discount > 0 && discount > coupon.max_discount) {
                discount = coupon.max_discount;
            }
        } else if (coupon.type === 'free_shipping') {
            isFreeShipping = true;
        } else {
            discount = coupon.value;
        }

        discount = Math.min(discount, order_total); // Can't exceed total cart amount

        res.json({
            valid: true,
            coupon_id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            discount: Math.round(discount * 100) / 100,
            is_free_shipping: isFreeShipping,
            message: isFreeShipping ? `Free Shipping Coupon applied!` : `Coupon applied! You save Rs.${discount.toFixed(2)}`
        });
    }
});

// Increment coupon usage (called after order placement)
app.post('/api/coupons/use/:id', (req, res) => {
    const couponId = req.params.id;
    const { user_id } = req.body;
    db.run('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?', [couponId], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (user_id) {
            db.run('INSERT INTO coupon_usage (coupon_id, user_id) VALUES (?, ?)', [couponId, user_id]);
        }
        res.json({ success: true });
    });
});

// ===== CSV EXPORT =====

app.get('/api/admin/orders/export/csv', (req, res) => {
    const { status, startDate, endDate, month, year } = req.query;
    let sql = 'SELECT * FROM orders';
    let conditions = [];
    let params = [];

    if (status) { conditions.push('status = ?'); params.push(status); }
    if (startDate && endDate) { conditions.push('date(created_at) BETWEEN ? AND ?'); params.push(startDate, endDate); }
    if (month) { conditions.push("strftime('%m', created_at) = ?"); params.push(month); }
    if (year) { conditions.push("strftime('%Y', created_at) = ?"); params.push(year); }

    if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY created_at DESC';

    db.all(sql, params, (err, orders) => {
        if (err) return res.status(500).json({ error: err.message });

        // CSV Headers
        const headers = ['Order ID', 'Customer Name', 'Email', 'Phone', 'Total Amount', 'Delivery Charge', 'Payment Method', 'Payment Status', 'Order Status', 'Address', 'City', 'State', 'Pincode', 'Date'];
        let csv = headers.join(',') + '\n';

        orders.forEach(o => {
            const row = [
                o.id,
                `"${(o.fullname || '').replace(/"/g, '""')}"`,
                `"${o.email || ''}"`,
                `"${o.phone || ''}"`,
                o.total_amount,
                o.delivery_charge || 0,
                `"${o.payment_method || ''}"`,
                `"${o.payment_status || ''}"`,
                `"${o.status || ''}"`,
                `"${(o.address || '').replace(/"/g, '""')}"`,
                `"${o.city || ''}"`,
                `"${o.state || ''}"`,
                `"${o.pincode || ''}"`,
                `"${o.created_at || ''}"`
            ];
            csv += row.join(',') + '\n';
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=orders_export_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    });
});

// ===== STOCK CHECK (Public) =====

app.get('/api/products/:id/stock', (req, res) => {
    db.get('SELECT id, stock FROM products WHERE id = ?', [req.params.id], (err, row) => {
        if (err || !row) return res.status(404).json({ error: 'Product not found' });
        res.json({ id: row.id, stock: row.stock, in_stock: row.stock === -1 || row.stock > 0 });
    });
});

// ===== NOTIFICATION COUNT =====

app.get('/api/admin/notifications/count', (req, res) => {
    const today = new Date().toLocaleDateString('en-CA');
    db.get(`SELECT 
        (SELECT COUNT(*) FROM orders WHERE status = 'Order Placed') as pending_orders,
        (SELECT COUNT(*) FROM orders WHERE date(created_at) = ?) as today_orders,
        (SELECT COUNT(*) FROM contact_queries WHERE status = 'New') as new_queries,
        (SELECT COUNT(*) FROM products WHERE stock > 0 AND stock <= 5) as low_stock
    `, [today], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { pending_orders: 0, today_orders: 0, new_queries: 0, low_stock: 0 });
    });
});

// ===== REPORTS DATA =====

app.get('/api/admin/reports', (req, res) => {
    const { startDate, endDate } = req.query;
    let dateFilter = '';
    let params = [];

    if (startDate && endDate) {
        dateFilter = ' WHERE date(created_at) BETWEEN ? AND ?';
        params = [startDate, endDate];
    }

    const queries = {
        // Revenue stats
        revenue: `SELECT 
            SUM(CASE WHEN payment_status = 'Paid' OR status = 'Delivered' THEN total_amount ELSE 0 END) as total_revenue,
            COUNT(*) as total_orders,
            AVG(total_amount) as avg_order_value,
            SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_orders
            FROM orders${dateFilter}`,
        // Monthly revenue
        monthly: `SELECT strftime('%Y-%m', created_at) as month,
            SUM(CASE WHEN payment_status = 'Paid' OR status = 'Delivered' THEN total_amount ELSE 0 END) as revenue,
            COUNT(*) as orders
            FROM orders${dateFilter}
            GROUP BY strftime('%Y-%m', created_at)
            ORDER BY month DESC LIMIT 12`,
        // Top products
        topProducts: `SELECT oi.name, SUM(oi.quantity) as total_sold, SUM(oi.price * oi.quantity) as total_revenue, oi.image, p.category, p.price as current_price
            FROM order_items oi
            JOIN orders o ON oi.order_id = o.id${dateFilter.replace('created_at', 'o.created_at')}
            LEFT JOIN products p ON oi.product_id = p.id
            GROUP BY oi.name ORDER BY total_sold DESC LIMIT 10`,
        // Payment methods
        paymentMethods: `SELECT payment_method, COUNT(*) as count, SUM(total_amount) as total
            FROM orders${dateFilter}
            GROUP BY payment_method`,
        // Category sales
        categorySales: `SELECT p.category, SUM(oi.quantity) as sold, SUM(oi.price * oi.quantity) as revenue
            FROM order_items oi
            JOIN products p ON oi.product_id = p.id
            JOIN orders o ON oi.order_id = o.id${dateFilter.replace('created_at', 'o.created_at')}
            GROUP BY p.category ORDER BY revenue DESC`,
        // City-wise orders
        cityOrders: `SELECT city, COUNT(*) as orders, SUM(total_amount) as revenue
            FROM orders${dateFilter}
            WHERE city IS NOT NULL AND city != ''
            GROUP BY LOWER(city) ORDER BY orders DESC LIMIT 10`
    };

    const results = {};
    let completed = 0;
    const queryKeys = Object.keys(queries);

    queryKeys.forEach(key => {
        const sql = queries[key];
        const method = key === 'revenue' ? 'get' : 'all';
        db[method](sql, [...params], (err, data) => {
            results[key] = err ? null : data;
            completed++;
            if (completed === queryKeys.length) {
                res.json(results);
            }
        });
    });
});

// ===== WHATSAPP NOTIFICATION HELPER =====

app.get('/api/admin/whatsapp-notify/:orderId', (req, res) => {
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.orderId], (err, order) => {
        if (!order) return res.status(404).json({ error: 'Order not found' });

        db.get("SELECT setting_value FROM store_settings WHERE setting_key = 'whatsapp_number'", [], (err, row) => {
            const phone = row?.setting_value || '919725340354';
            const message = `🛒 New Order #${order.id}\n👤 ${order.fullname}\n📱 ${order.phone}\n💰 Rs.${order.total_amount}\n📍 ${order.city || 'N/A'}\n📦 ${order.status}`;
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
            res.json({ url: whatsappUrl });
        });
    });
});

// Helper to replace variables in templates
function replaceTemplateVars(template, vars) {
    if (!template) return '';
    let result = template;
    Object.entries(vars).forEach(([key, val]) => {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, val != null ? val : '');
    });
    return result;
}

// Get WhatsApp alert URL for customer
app.get('/api/admin/orders/:id/customer-whatsapp', (req, res) => {
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, order) => {
        if (err || !order) return res.status(404).json({ error: 'Order not found' });
        
        // Fetch templates and store name
        db.all("SELECT setting_key, setting_value FROM store_settings WHERE setting_key IN ('store_name', 'whatsapp_template_placed', 'whatsapp_template_shipped')", [], (errSettings, rows) => {
            let storeName = 'Devangi Products';
            let templatePlaced = 'Hello {name},\n\nThank you for shopping at {store_name}! 🌸\n\nYour Order #{order_id} has been placed successfully.\nTotal Amount: Rs. {total_amount}\nPayment Method: {payment_method}\n\nTrack your order here: {tracking_url}';
            let templateShipped = 'Hello {name},\n\nYour order #{order_id} from {store_name} has been shipped! 🚀\nCourier: {courier}\nAWB/Docket No: {tracking_number}\n\nTrack your parcel live here: {tracking_url}\n\nThank you for shopping with us! 🌸';
            
            if (!errSettings && rows) {
                rows.forEach(r => {
                    if (r.setting_key === 'store_name' && r.setting_value) storeName = r.setting_value;
                    if (r.setting_key === 'whatsapp_template_placed' && r.setting_value) templatePlaced = r.setting_value;
                    if (r.setting_key === 'whatsapp_template_shipped' && r.setting_value) templateShipped = r.setting_value;
                });
            }
            
            const trackingUrl = `${req.protocol}://${req.get('host')}/track-order.html?phone=${order.phone}&order_id=${order.id}`;
            const actualTrackingUrl = order.tracking_number ? `https://t.17track.net/en#nums=${order.tracking_number}` : trackingUrl;
            
            const vars = {
                name: order.fullname,
                order_id: order.id,
                total_amount: order.total_amount,
                payment_method: order.payment_method,
                courier: order.courier_name || 'Courier',
                tracking_number: order.tracking_number || '',
                tracking_url: actualTrackingUrl,
                store_name: storeName
            };
            
            let message = '';
            if (order.status === 'Shipped') {
                message = replaceTemplateVars(templateShipped, vars);
            } else {
                message = replaceTemplateVars(templatePlaced, vars);
            }
            
            // Clean phone number (Indian numbers might start with 91 or not)
            let cleanPhone = order.phone.replace(/[^0-9]/g, '');
            if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
            
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
            res.json({ url: whatsappUrl });
        });
    });
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}`);
    console.log(`Admin Panel is running at http://localhost:${port}/admin/index.html`);
});

