require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const url = require('url');
const multer = require('multer'); // Handling file uploads (PDFs)
const sgMail = require('@sendgrid/mail'); // NEW: Import SendGrid

const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173',
    'https://astounding-liger-a7f504.netlify.app', // Your Netlify URL
    'https://draveta.vercel.app' // Your Vercel URL
];
app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));
app.use(express.json());
app.set('trust proxy', true);

// --- Prevent Browser Caching for API Responses ---
// This ensures every request reaches the server (visible in Render logs)
app.use('/api', (req, res, next) => {
    res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
    });
    next();
});

// --- PostgreSQL Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- Configure Multer (Memory Storage for PDF) ---
const upload = multer({ storage: multer.memoryStorage() });

// --- Configure SendGrid ---
sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Set your API Key

// --- Create Tables ---
// ... (All CREATE TABLE queries remain exactly the same) ...
(async () => {
    try {
        // 1. Users Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                name VARCHAR(100),
                surname VARCHAR(100),
                phone VARCHAR(50),
                is_admin BOOLEAN DEFAULT FALSE,
                last_login_ip VARCHAR(50),
                allowed_ip VARCHAR(50),
                role VARCHAR(50) DEFAULT 'counter',
                organization VARCHAR(255)
            );
        `);
        // 2. Reports Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS reports (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                file_name VARCHAR(255),
                report_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // 3. Logs Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                log_name VARCHAR(255),
                log_content TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // 4. Drafts Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS drafts (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                draft_name VARCHAR(255),
                draft_data JSONB,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        // 5. Products Table (T-Job Sheet)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                product_name VARCHAR(255) NOT NULL,
                product_code VARCHAR(100),
                item_size VARCHAR(100),
                parts JSONB,
                organization VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        // 6. Tasks Table (T-Job Sheet) - COMPLETE SCHEMA
        await pool.query(`
            CREATE TABLE IF NOT EXISTS tasks (
                id SERIAL PRIMARY KEY,
                product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
                product_name VARCHAR(255),
                assigned_by_user_id INTEGER REFERENCES users(id),
                assigned_to_user_id INTEGER REFERENCES users(id),
                organization VARCHAR(255),
                quantity INTEGER NOT NULL,
                status VARCHAR(50) DEFAULT 'pending',
                assign_date DATE,
                expiry_date DATE,
                contractor_name VARCHAR(255),
                buyer_name VARCHAR(255),
                job_sheet_ref VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                completed_data JSONB
            );
        `);

        // 7. User Activity Table - Track user sessions and page visits
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_activity (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                action VARCHAR(100) NOT NULL,
                page VARCHAR(100),
                details JSONB,
                ip_address VARCHAR(50),
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 8. User Sessions Table - Track online status
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
                last_active TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                current_page VARCHAR(100),
                is_online BOOLEAN DEFAULT TRUE
            );
        `);
        
        // 9. T-Workflow Orders Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_orders (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255),
                order_number VARCHAR(20) UNIQUE NOT NULL,
                buyer_name VARCHAR(255),
                status VARCHAR(50) DEFAULT 'unassigned',
                assigned_to_user_id INTEGER REFERENCES users(id),
                created_by_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // 10. T-Workflow Items
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_items (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES workflow_orders(id) ON DELETE CASCADE,
                item_name VARCHAR(255),
                item_code VARCHAR(100),
                size VARCHAR(100),
                pieces INTEGER,
                cbm NUMERIC
            );
        `);

        // 11. T-Workflow Assignments
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_assignments (
                id SERIAL PRIMARY KEY,
                order_id INTEGER REFERENCES workflow_orders(id) ON DELETE CASCADE,
                order_item_id INTEGER REFERENCES workflow_items(id) ON DELETE CASCADE,
                assign_type VARCHAR(50), 
                assignee_name VARCHAR(255),
                rate NUMERIC,
                assign_date DATE,
                delivery_date DATE,
                note TEXT,
                po_number VARCHAR(100),
                jo_number VARCHAR(100),
                assigned_pieces INTEGER,
                created_by_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Migration: Add delivery_date and note columns if they don't exist
        await pool.query(`
            ALTER TABLE workflow_assignments 
            ADD COLUMN IF NOT EXISTS delivery_date DATE,
            ADD COLUMN IF NOT EXISTS note TEXT,
            ADD COLUMN IF NOT EXISTS po_number VARCHAR(100),
            ADD COLUMN IF NOT EXISTS jo_number VARCHAR(100);
        `).catch(e => console.log("Migration error (ignored):", e.message));

        // Migration: Drop cbm column
        await pool.query(`
            ALTER TABLE workflow_assignments DROP COLUMN IF EXISTS cbm;
        `).catch(e => console.log("Migration error (ignored):", e.message));

        // Migration: Add cbm to items and master
        await pool.query(`
            ALTER TABLE workflow_items ADD COLUMN IF NOT EXISTS cbm NUMERIC;
            ALTER TABLE workflow_item_master ADD COLUMN IF NOT EXISTS cbm NUMERIC;
        `).catch(e => console.log("Migration error (ignored):", e.message));

        // 12. T-Workflow Item Master (Catalog of all items)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_item_master (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255) NOT NULL,
                item_name VARCHAR(255) NOT NULL,
                item_code VARCHAR(100),
                size VARCHAR(100),
                cbm NUMERIC,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization, item_name, item_code, size)
            );
        `);

        // 13. T-Workflow Suppliers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_suppliers (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(100),
                email VARCHAR(255),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization, name)
            );
        `);

        // 14. T-Workflow Job Managers
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_job_managers (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                phone VARCHAR(100),
                email VARCHAR(255),
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(organization, name)
            );
        `);
        // 15. T-Workflow Inwards (Inventory received from assignments)
        await pool.query(`
            CREATE TABLE IF NOT EXISTS workflow_inwards (
                id SERIAL PRIMARY KEY,
                organization VARCHAR(255) NOT NULL,
                assignment_id INTEGER REFERENCES workflow_assignments(id) ON DELETE CASCADE,
                date DATE,
                challan_no VARCHAR(255),
                received_pieces INTEGER DEFAULT 0,
                created_by_user_id INTEGER REFERENCES users(id),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Safe Migration: Move from assignee_name to supplier_id / job_manager_id
        // Check if assignee_name still exists
        const checkColumnResult = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name='workflow_assignments' and column_name='assignee_name';
        `);

        if (checkColumnResult.rows.length > 0) {
            console.log("Migrating workflow_assignments to use separate supplier/manager tables...");
            
            // Add new columns
            await pool.query(`
                ALTER TABLE workflow_assignments 
                ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES workflow_suppliers(id),
                ADD COLUMN IF NOT EXISTS job_manager_id INTEGER REFERENCES workflow_job_managers(id);
            `);

            // Migrate unique suppliers
            await pool.query(`
                INSERT INTO workflow_suppliers (organization, name)
                SELECT DISTINCT o.organization, wa.assignee_name 
                FROM workflow_assignments wa
                JOIN workflow_orders o ON wa.order_id = o.id
                WHERE wa.assign_type = 'supplier' AND wa.assignee_name IS NOT NULL
                ON CONFLICT (organization, name) DO NOTHING;
            `);

            // Migrate unique job managers
            await pool.query(`
                INSERT INTO workflow_job_managers (organization, name)
                SELECT DISTINCT o.organization, wa.assignee_name 
                FROM workflow_assignments wa
                JOIN workflow_orders o ON wa.order_id = o.id
                WHERE wa.assign_type = 'job_manager' AND wa.assignee_name IS NOT NULL
                ON CONFLICT (organization, name) DO NOTHING;
            `);

            // Update workflow_assignments rows to point to new IDs
            await pool.query(`
                UPDATE workflow_assignments wa
                SET supplier_id = ws.id
                FROM workflow_suppliers ws, workflow_orders o
                WHERE wa.order_id = o.id AND ws.organization = o.organization 
                  AND wa.assignee_name = ws.name AND wa.assign_type = 'supplier';
            `);

            await pool.query(`
                UPDATE workflow_assignments wa
                SET job_manager_id = wm.id
                FROM workflow_job_managers wm, workflow_orders o
                WHERE wa.order_id = o.id AND wm.organization = o.organization 
                  AND wa.assignee_name = wm.name AND wa.assign_type = 'job_manager';
            `);

            // Drop assignee_name column safely
            await pool.query(`ALTER TABLE workflow_assignments DROP COLUMN assignee_name;`);
            console.log("Migration complete!");
        }

    } catch (err) {
        console.error("Error creating tables:", err);
    }
})();

// --- JWT Secret Key ---
const JWT_SECRET = process.env.JWT_SECRET;

// --- WebSocket Server Setup ---
// ... (WebSocket logic remains the same) ...
const wss = new WebSocket.Server({ server });
const clients = new Map();

wss.on('connection', async (ws, req) => {
    // ... (WS connection logic) ...
    const token = url.parse(req.url, true).query.token;
    if (!token) return ws.close();

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const userId = decoded.id;
        clients.set(userId, ws);

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            
            // Find all owners of the same organization to broadcast to them
            try {
                const result = await pool.query('SELECT id FROM users WHERE organization = $1 AND role = $2', [decoded.organization, 'owner']);
                const owners = result.rows;

                owners.forEach(owner => {
                    const ownerSocket = clients.get(owner.id);
                    if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                        // Forward the original message (could be CFT_UPDATE or FILENAME_UPDATE)
                        ownerSocket.send(JSON.stringify({ 
                            ...data,
                            counterId: userId, 
                            counterName: `${decoded.name} ${decoded.surname}` 
                        }));
                    }
                });
            } catch (dbError) {
                console.error("WebSocket DB Error:", dbError);
            }
        });

        ws.on('close', () => {
            clients.delete(userId);
             // Notify owners that a counter has disconnected
            try {
                pool.query('SELECT id FROM users WHERE organization = $1 AND role = $2', [decoded.organization, 'owner'])
                    .then(result => {
                        result.rows.forEach(owner => {
                            const ownerSocket = clients.get(owner.id);
                            if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                                ownerSocket.send(JSON.stringify({ type: 'COUNTER_DISCONNECTED', counterId: userId }));
                            }
                        });
                    });
            } catch (dbError) {
                console.error("Error notifying owners of disconnect:", dbError);
            }
        });
    } catch (err) {
        ws.close();
    }
});


// --- Authentication Middleware ---
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) return res.status(401).send({ error: 'Unauthorized' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (error) {
        res.status(401).send({ error: 'Invalid token' });
    }
};

// ==========================================
//             API ENDPOINTS
// ==========================================

// --- AUTH & USER MANAGEMENT ---

app.post('/api/register', authenticate, async (req, res) => {
    if (!req.user.isAdmin) {
        return res.status(403).send({ error: 'Forbidden: Only admins can register new users.' });
    }
    const { email, password, name, surname, phone, role, organization } = req.body;
    if (!email || !password || !name || !surname || !phone || !role || !organization) {
        return res.status(400).send({ error: 'All fields are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (email, password_hash, name, surname, phone, role, organization) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [email, hashedPassword, name, surname, phone, role, organization]
        );
        res.status(201).send({ message: 'User created successfully' });
    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).send({ error: 'An account with this email already exists.' });
        }
        console.error("Registration Error:", error);
        res.status(500).send({ error: 'Failed to register user.' });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) return res.status(401).send({ error: 'Invalid credentials' });

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) return res.status(401).send({ error: 'Invalid credentials' });
        
        if (user.allowed_ip && user.allowed_ip !== ip) {
            return res.status(403).send({ error: 'Access from this IP address is not allowed.' });
        }

        await pool.query('UPDATE users SET last_login_ip = $1 WHERE id = $2', [ip, user.id]);

        // Log login activity
        await pool.query(`
            INSERT INTO user_activity (user_id, action, page, ip_address, user_agent)
            VALUES ($1, 'login', 'login', $2, $3)
        `, [user.id, ip, userAgent]);

        // Create/update user session
        await pool.query(`
            INSERT INTO user_sessions (user_id, last_active, current_page, is_online)
            VALUES ($1, NOW(), 'login', TRUE)
            ON CONFLICT (user_id) 
            DO UPDATE SET last_active = NOW(), current_page = 'login', is_online = TRUE
        `, [user.id]);

        const token = jwt.sign(
            { id: user.id, isAdmin: user.is_admin, name: user.name, surname: user.surname, role: user.role, organization: user.organization },
            JWT_SECRET,
            { expiresIn: '1d' }
        );
        res.status(200).send({ token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send({ error: 'Login failed.' });
    }
});

app.get('/api/users', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    try {
        const result = await pool.query('SELECT id, name, surname, email, last_login_ip, allowed_ip, role, organization FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).send({ error: 'Failed to fetch users.' });
    }
});

// --- GET COUNTERS (for Owners) ---
app.get('/api/users/counters', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    if (role !== 'owner') {
        return res.status(403).send({ error: 'Forbidden' });
    }
    try {
        const result = await pool.query(
            "SELECT id, name, surname FROM users WHERE organization = $1 AND role = 'counter'",
            [organization]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Counters Error:", error);
        res.status(500).send({ error: 'Failed to fetch counters.' });
    }
});

app.delete('/api/users/:id', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        console.error("Delete User Error:", error);
        res.status(500).send({ error: 'Failed to delete user.' });
    }
});

app.put('/api/users/:id', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    const { name, surname, email, phone, role, organization } = req.body;
    try {
        await pool.query(
            'UPDATE users SET name = $1, surname = $2, email = $3, phone = $4, role = $5, organization = $6 WHERE id = $7',
            [name, surname, email, phone, role, organization, req.params.id]
        );
        res.status(200).send({ message: 'User updated successfully' });
    } catch (error) {
        console.error("Update User Error:", error);
        res.status(500).send({ error: 'Failed to update user.' });
    }
});

app.post('/api/users/:id/lock-ip', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    try {
        await pool.query('UPDATE users SET allowed_ip = $1 WHERE id = $2', [req.body.ipAddress || null, req.params.id]);
        res.status(200).send({ message: 'IP lock updated successfully' });
    } catch (error) {
        console.error("Lock IP Error:", error);
        res.status(500).send({ error: 'Failed to update IP lock.' });
    }
});

// --- T-CAL REPORTS & LOGS ---

app.get('/api/reports', authenticate, async (req, res) => {
    const { id, role, organization } = req.user;
    try {
        let result;
        if (role === 'owner') {
            result = await pool.query(
                `SELECT r.*, u.name, u.surname 
                 FROM reports r 
                 JOIN users u ON r.user_id = u.id 
                 WHERE u.organization = $1 
                 ORDER BY r.created_at DESC`,
                [organization]
            );
        } else {
            result = await pool.query('SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [id]);
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Reports Error:", error);
        res.status(500).send({ error: 'Failed to fetch reports.' });
    }
});

app.get('/api/logs', authenticate, async (req, res) => {
    const { id, role, organization } = req.user;
    try {
        let result;
        if (role === 'owner') {
            result = await pool.query(
                `SELECT l.*, u.name, u.surname 
                 FROM logs l 
                 JOIN users u ON l.user_id = u.id 
                 WHERE u.organization = $1 
                 ORDER BY l.created_at DESC`,
                [organization]
            );
        } else {
            result = await pool.query('SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC', [id]);
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Logs Error:", error);
        res.status(500).send({ error: 'Failed to fetch logs.' });
    }
});

app.post('/api/reports', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { reportData, fileName } = req.body;
    try {
        await pool.query(
            'INSERT INTO reports (user_id, file_name, report_data) VALUES ($1, $2, $3)',
            [userId, fileName, reportData]
        );
        res.status(201).send({ message: 'Report saved successfully' });
    } catch (error) {
        console.error("Save Report Error:", error);
        res.status(500).send({ error: 'Failed to save report.' });
    }
});

app.delete('/api/reports/:id', authenticate, async (req, res) => {
    const { id: userId, role, organization } = req.user;
    const reportId = req.params.id;
    try {
        let result;
        if (role === 'owner') {
             result = await pool.query(
                `DELETE FROM reports r USING users u 
                 WHERE r.id = $1 AND r.user_id = u.id AND u.organization = $2`, 
                [reportId, organization]
            );
        } else {
            result = await pool.query(
                'DELETE FROM reports WHERE id = $1 AND user_id = $2',
                [reportId, userId]
            );
        }

        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Report not found or permission denied.' });
        }
        res.status(200).send({ message: 'Report deleted successfully' });

    } catch (error) {
        console.error("Delete Report Error:", error);
        res.status(500).send({ error: 'Failed to delete report.' });
    }
});

// --- BATCH SYNC ENDPOINT FOR OFFLINE DATA ---
// This endpoint handles syncing multiple reports/logs from offline storage
app.post('/api/reports/sync', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { reports = [], logs = [] } = req.body;
    
    const results = {
        reports: { synced: 0, failed: 0, errors: [] },
        logs: { synced: 0, failed: 0, errors: [] }
    };
    
    // Process reports
    for (const report of reports) {
        try {
            await pool.query(
                'INSERT INTO reports (user_id, file_name, report_data, created_at) VALUES ($1, $2, $3, $4)',
                [userId, report.fileName || 'Offline Report', report.reportData, report.timestamp || new Date()]
            );
            results.reports.synced++;
        } catch (error) {
            results.reports.failed++;
            results.reports.errors.push({ id: report.id, error: error.message });
            console.error("Sync Report Error:", error);
        }
    }
    
    // Process logs
    for (const log of logs) {
        try {
            await pool.query(
                'INSERT INTO logs (user_id, log_name, log_content, created_at) VALUES ($1, $2, $3, $4)',
                [userId, log.logName || 'Offline Log', log.logContent, log.timestamp || new Date()]
            );
            results.logs.synced++;
        } catch (error) {
            results.logs.failed++;
            results.logs.errors.push({ id: log.id, error: error.message });
            console.error("Sync Log Error:", error);
        }
    }
    
    const totalSynced = results.reports.synced + results.logs.synced;
    const totalFailed = results.reports.failed + results.logs.failed;
    
    console.log(`[Sync] User ${userId} synced ${totalSynced} items (${totalFailed} failed)`);
    
    res.status(200).json({
        success: true,
        message: `Synced ${totalSynced} items successfully`,
        results
    });
});

app.post('/api/logs', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { logContent, logName } = req.body;
    try {
        await pool.query(
            'INSERT INTO logs (user_id, log_name, log_content) VALUES ($1, $2, $3)',
            [userId, logName, logContent]
        );
        res.status(201).send({ message: 'Log saved successfully' });
    } catch (error) {
        console.error("Save Log Error:", error);
        res.status(500).send({ error: 'Failed to save log.' });
    }
});

app.delete('/api/logs/:id', authenticate, async (req, res) => {
    const { id: userId, role, organization } = req.user;
    const logId = req.params.id;
     try {
        let result;
        if (role === 'owner') {
             result = await pool.query(
                `DELETE FROM logs l USING users u 
                 WHERE l.id = $1 AND l.user_id = u.id AND u.organization = $2`, 
                [logId, organization]
            );
        } else {
            result = await pool.query(
                'DELETE FROM logs WHERE id = $1 AND user_id = $2',
                [logId, userId]
            );
        }
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Log not found or permission denied.' });
        }
        res.status(200).send({ message: 'Log deleted successfully' });
    } catch (error) {
        console.error("Delete Log Error:", error);
        res.status(500).send({ error: 'Failed to delete log.' });
    }
});

// --- T-JOB SHEET: PRODUCT ENDPOINTS ---
app.get('/api/products', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            'SELECT * FROM products WHERE organization = $1 ORDER BY created_at DESC',
            [organization]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Products Error:", error);
        res.status(500).send({ error: 'Failed to fetch products.' });
    }
});

app.get('/api/products/part-names', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            'SELECT parts FROM products WHERE organization = $1',
            [organization]
        );
        const allParts = result.rows.flatMap(row => row.parts || []);
        const partNames = allParts.map(part => part.part_name);
        const uniquePartNames = [...new Set(partNames)].filter(Boolean); 
        res.status(200).json(uniquePartNames);
    } catch (error) {
        console.error("Fetch Part Names Error:", error);
        res.status(500).send({ error: 'Failed to fetch part names.' });
    }
});

app.post('/api/products', authenticate, async (req, res) => {
    const { id: userId, organization } = req.user;
    const { productName, productCode, itemSize, parts } = req.body;

    if (!productName || !parts || parts.length === 0) {
        return res.status(400).send({ error: 'Product name and parts are required.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO products (user_id, product_name, product_code, item_size, parts, organization) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [userId, productName, productCode, itemSize, JSON.stringify(parts), organization]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Save Product Error:", error);
        res.status(500).send({ error: 'Failed to save product.' });
    }
});

app.put('/api/products/:id', authenticate, async (req, res) => {
    const { id: userId, organization, role } = req.user;
    const { id } = req.params;
    const { productName, productCode, itemSize, parts } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can update products.' });
    }
    if (!productName || !parts || parts.length === 0) {
        return res.status(400).send({ error: 'Product name and parts are required.' });
    }

    try {
        const result = await pool.query(
            'UPDATE products SET product_name = $1, product_code = $2, item_size = $3, parts = $4 WHERE id = $5 AND organization = $6 RETURNING *',
            [productName, productCode, itemSize, JSON.stringify(parts), id, organization]
        );
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Product not found or permission denied.' });
        }
        res.status(200).json(result.rows[0]);
    } catch (error) {
        console.error("Update Product Error:", error);
        res.status(500).send({ error: 'Failed to update product.' });
    }
});

app.delete('/api/products/:id', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { id } = req.params;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete products.' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM products WHERE id = $1 AND organization = $2',
            [id, organization]
        );
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Product not found or permission denied.' });
        }
        res.status(200).send({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error("Delete Product Error:", error);
        res.status(500).send({ error: 'Failed to delete product.' });
    }
});


// --- T-JOB SHEET: TASK ENDPOINTS ---
app.get('/api/tasks', authenticate, async (req, res) => {
    const { organization, id: userId, role } = req.user;
    let query;
    let params;

    if (role === 'owner') {
        query = "SELECT t.*, p.parts, u.name as assigned_to_name FROM tasks t JOIN products p ON t.product_id = p.id LEFT JOIN users u ON t.assigned_to_user_id = u.id WHERE t.organization = $1 ORDER BY t.created_at DESC";
        params = [organization];
    } else {
        query = "SELECT t.*, p.parts FROM tasks t JOIN products p ON t.product_id = p.id WHERE t.organization = $1 AND t.assigned_to_user_id = $2 ORDER BY t.status, t.created_at DESC";
        params = [organization, userId];
    }

    try {
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Tasks Error:", error);
        res.status(500).send({ error: 'Failed to fetch tasks.' });
    }
});

app.get('/api/tasks/contractors', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            'SELECT DISTINCT contractor_name FROM tasks WHERE organization = $1 AND contractor_name IS NOT NULL',
            [organization]
        );
        const names = result.rows.map(r => r.contractor_name).filter(Boolean);
        res.status(200).json(names);
    } catch (error) {
        console.error("Fetch Contractors Error:", error);
        res.status(500).send({ error: 'Failed to fetch contractors.' });
    }
});

app.get('/api/tasks/buyers', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            'SELECT DISTINCT buyer_name FROM tasks WHERE organization = $1 AND buyer_name IS NOT NULL',
            [organization]
        );
        const names = result.rows.map(r => r.buyer_name).filter(Boolean);
        res.status(200).json(names);
    } catch (error) {
        console.error("Fetch Buyers Error:", error);
        res.status(500).send({ error: 'Failed to fetch buyers.' });
    }
});

app.get('/api/tasks', authenticate, async (req, res) => {
    // ... (logic remains same) ...
    const { organization, id: userId, role } = req.user;
    let query;
    let params;
    if (role === 'owner') {
        query = "SELECT t.*, p.parts, u.name as assigned_to_name FROM tasks t JOIN products p ON t.product_id = p.id LEFT JOIN users u ON t.assigned_to_user_id = u.id WHERE t.organization = $1 ORDER BY t.created_at DESC";
        params = [organization];
    } else {
        query = "SELECT t.*, p.parts FROM tasks t JOIN products p ON t.product_id = p.id WHERE t.organization = $1 AND t.assigned_to_user_id = $2 ORDER BY t.status, t.created_at DESC";
        params = [organization, userId];
    }
    try {
        const result = await pool.query(query, params);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Tasks Error:", error);
        res.status(500).send({ error: 'Failed to fetch tasks.' });
    }
});

app.post('/api/tasks', authenticate, async (req, res) => {
    // ... (logic remains same) ...
    const { id: userId, organization, role } = req.user;
    const { productId, productName, quantity, assignedToUserId, assignDate, expiryDate, contractorName, buyerName, jobSheetRef } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can assign tasks.' });
    }
    if (!productId || !quantity || quantity <= 0 || !assignedToUserId || !assignDate || !expiryDate) {
        return res.status(400).send({ error: 'Required fields are missing.' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO tasks (product_id, product_name, assigned_by_user_id, assigned_to_user_id, organization, quantity, status, assign_date, expiry_date, contractor_name, buyer_name, job_sheet_ref) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
            [productId, productName, userId, assignedToUserId, organization, quantity, 'pending', assignDate, expiryDate, contractorName, buyerName, jobSheetRef]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Assign Task Error:", error);
        res.status(500).send({ error: 'Failed to assign task.' });
    }
});

// --- UPDATED: COMPLETE TASK WITH SENDGRID EMAIL ---
app.put('/api/tasks/:id/complete', authenticate, upload.single('pdf'), async (req, res) => {
    const { id: userId, role } = req.user;
    const { id } = req.params;
    
    let recordedData;
    try {
        // If sent as JSON body (no file)
        if (req.body.recordedData && typeof req.body.recordedData === 'object') {
            recordedData = req.body.recordedData;
        } 
        // If sent as FormData string (with file)
        else if (req.body.recordedData) {
        recordedData = JSON.parse(req.body.recordedData);
        }
    } catch (e) {
        return res.status(400).send({ error: 'Invalid recorded data format.' });
    }

    if (role !== 'counter') {
        return res.status(403).send({ error: 'Only counters can complete tasks.' });
    }

    try {
        // 1. Update Database
        const result = await pool.query(
            "UPDATE tasks SET status = 'completed', completed_at = CURRENT_TIMESTAMP, completed_data = $1 WHERE id = $2 AND assigned_to_user_id = $3 RETURNING *",
            [JSON.stringify(recordedData), id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Task not found or you are not authorized.' });
        }
        
        const task = result.rows[0];

        // 2. Find the Owner's Email
        const ownerResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [task.assigned_by_user_id]);
        const owner = ownerResult.rows[0];

        // 3. Send Email using SendGrid
        if (owner && req.file) {
            const msg = {
                to: owner.email,
                from: process.env.EMAIL_USER, // Must be a verified sender in your SendGrid account
                subject: `Job Completed: ${task.product_name} (Ref: ${task.job_sheet_ref || 'N/A'})`,
                text: `
Hello ${owner.name},

A task has been marked as complete by the counter.

Product: ${task.product_name}
Quantity: ${task.quantity}
Contractor: ${task.contractor_name || 'N/A'}
Completed On: ${new Date().toLocaleString()}

Please find the detailed PDF report attached.

Best regards,
T-CAL System
                `,
                attachments: [
                    {
                        content: req.file.buffer.toString('base64'), // SendGrid needs base64
                        filename: `JobReport_${task.product_name}.pdf`,
                        type: 'application/pdf',
                        disposition: 'attachment'
                    }
                ]
            };

            sgMail
                .send(msg)
                .then(() => {
                    console.log('Email sent via SendGrid');
                })
                .catch((error) => {
                    console.error('SendGrid Error:', error);
                });
        }

        res.status(200).json(task);
    } catch (error) {
        console.error("Complete Task Error:", error);
        res.status(500).send({ error: 'Failed to complete task.' });
    }
});

app.delete('/api/tasks/:id', authenticate, async (req, res) => {
    // ... (DELETE logic remains the same) ...
     const { organization, role } = req.user;
    const { id } = req.params;

         if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete tasks.' });
    }

    try {
        const result = await pool.query(
            'DELETE FROM tasks WHERE id = $1 AND organization = $2',
            [id, organization]
        );
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Task not found or permission denied.' });
        }
                res.status(200).send({ message: 'Task deleted successfully' });
    } catch (error) {
        console.error("Delete Task Error:", error);
        res.status(500).send({ error: 'Failed to delete task.' });
    }
});


// ==========================================
//       USER ACTIVITY TRACKING ENDPOINTS
// ==========================================

// --- Heartbeat - Update user's online status ---
app.post('/api/activity/heartbeat', authenticate, async (req, res) => {
    const { id: userId } = req.user;
    const { page } = req.body;
    
    try {
        await pool.query(`
            INSERT INTO user_sessions (user_id, last_active, current_page, is_online)
            VALUES ($1, CURRENT_TIMESTAMP, $2, TRUE)
            ON CONFLICT (user_id) 
            DO UPDATE SET last_active = CURRENT_TIMESTAMP, current_page = $2, is_online = TRUE
        `, [userId, page]);
        
        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Heartbeat Error:", error);
        res.status(500).send({ error: 'Failed to update heartbeat.' });
    }
});

// --- Log user activity (page visit, action, etc.) ---
app.post('/api/activity/log', authenticate, async (req, res) => {
    const { id: userId } = req.user;
    const { action, page, details } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    
    try {
        await pool.query(`
            INSERT INTO user_activity (user_id, action, page, details, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5, $6)
        `, [userId, action || 'unknown', page || 'unknown', details ? JSON.stringify(details) : null, ip, userAgent]);
        
        res.status(201).send({ success: true });
    } catch (error) {
        console.error("Activity Log Error:", error.message);
        res.status(500).send({ error: 'Failed to log activity.', details: error.message });
    }
});

// --- Get all users with their activity status (Admin only) ---
app.get('/api/activity/users', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    
    try {
        const result = await pool.query(`
            SELECT 
                u.id, u.name, u.surname, u.email, u.role, u.organization, u.last_login_ip,
                s.last_active, s.current_page, s.is_online,
                CASE 
                    WHEN s.last_active > NOW() - INTERVAL '2 minutes' THEN TRUE 
                    ELSE FALSE 
                END as is_currently_active
            FROM users u
            LEFT JOIN user_sessions s ON u.id = s.user_id
            ORDER BY s.last_active DESC NULLS LAST
        `);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch User Activity Error:", error);
        res.status(500).send({ error: 'Failed to fetch user activity.' });
    }
});

// --- Get activity timeline for a specific user (Admin only) ---
app.get('/api/activity/timeline/:userId', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    
    const { userId } = req.params;
    const { limit = 50 } = req.query;
    
    try {
        const result = await pool.query(`
            SELECT action, page, details, ip_address, created_at
            FROM user_activity
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT $2
        `, [userId, parseInt(limit)]);
        
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Timeline Error:", error);
        res.status(500).send({ error: 'Failed to fetch timeline.' });
    }
});

// --- Reset/Delete activity timeline for a specific user (Admin only) ---
app.delete('/api/activity/timeline/:userId', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    
    const { userId } = req.params;
    
    try {
        await pool.query('DELETE FROM user_activity WHERE user_id = $1', [userId]);
        res.status(200).send({ success: true, message: 'Timeline reset successfully' });
    } catch (error) {
        console.error("Reset Timeline Error:", error);
        res.status(500).send({ error: 'Failed to reset timeline.' });
    }
});

// --- Mark user as offline (called on logout/tab close) ---
app.post('/api/activity/offline', async (req, res) => {
    // Support both header auth and query param (for sendBeacon)
    let userId;
    
    try {
        let token = req.headers.authorization?.split(' ')[1] || req.query.token;
        if (!token) {
            return res.status(401).send({ error: 'No token provided' });
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.id;
    } catch (error) {
        return res.status(401).send({ error: 'Invalid token' });
    }
    
    try {
        await pool.query(`
            UPDATE user_sessions SET is_online = FALSE WHERE user_id = $1
        `, [userId]);
        
        await pool.query(`
            INSERT INTO user_activity (user_id, action, page)
            VALUES ($1, 'logout', 'N/A')
        `, [userId]);
        
        res.status(200).send({ success: true });
    } catch (error) {
        console.error("Offline Error:", error);
        res.status(500).send({ error: 'Failed to mark offline.' });
    }
});

// ==========================================
//          T-WORKFLOW ENDPOINTS
// ==========================================

// Fetch unique buyers across existing workflows/tasks
app.get('/api/workflow/buyers', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(`
            SELECT DISTINCT buyer_name FROM (
                SELECT buyer_name FROM tasks WHERE organization = $1 AND buyer_name IS NOT NULL
                UNION
                SELECT buyer_name FROM workflow_orders WHERE organization = $1 AND buyer_name IS NOT NULL
            ) AS combined_buyers
        `, [organization]);
        const names = result.rows.map(r => r.buyer_name).filter(Boolean);
        res.status(200).json(names);
    } catch (error) {
        console.error("Fetch Workflow Buyers Error:", error);
        res.status(500).send({ error: 'Failed to fetch buyers for suggestions.' });
    }
});

// Get all orders for an organization
app.get('/api/workflow/orders', authenticate, async (req, res) => {
    const { organization, role, id: userId } = req.user;
    try {
        let query; let params;
        if (role === 'owner') {
             query = "SELECT o.*, u.name as assigned_to_name FROM workflow_orders o LEFT JOIN users u ON o.assigned_to_user_id = u.id WHERE o.organization = $1 ORDER BY o.created_at DESC";
             params = [organization];
        } else {
             query = "SELECT o.*, u.name as assigned_to_name FROM workflow_orders o LEFT JOIN users u ON o.assigned_to_user_id = u.id WHERE o.organization = $1 AND (o.assigned_to_user_id = $2 OR o.status = 'unassigned') ORDER BY o.created_at DESC";
             params = [organization, userId];
        }
        const ordersResult = await pool.query(query, params);
        const orders = ordersResult.rows;

        if (orders.length > 0) {
            const orderIds = orders.map(o => o.id);
            const itemsResult = await pool.query("SELECT * FROM workflow_items WHERE order_id = ANY($1::int[])", [orderIds]);
            const assignmentsResult = await pool.query(`
                SELECT a.*, COALESCE(ws.name, wjm.name) as assignee_name,
                COALESCE((SELECT SUM(received_pieces) FROM workflow_inwards wi WHERE wi.assignment_id = a.id), 0) as received_pieces
                FROM workflow_assignments a 
                LEFT JOIN workflow_suppliers ws ON a.supplier_id = ws.id 
                LEFT JOIN workflow_job_managers wjm ON a.job_manager_id = wjm.id 
                WHERE a.order_id = ANY($1::int[])
            `, [orderIds]);
            
            orders.forEach(order => {
                const orderItems = itemsResult.rows.filter(item => item.order_id === order.id);
                
                orderItems.forEach(item => {
                    item.assignments = assignmentsResult.rows.filter(a => a.order_item_id === item.id);
                    item.assigned_pieces = item.assignments.reduce((sum, a) => sum + parseInt(a.assigned_pieces || 0), 0);
                });

                order.items = orderItems;
                
                // Calculate dynamic status based on piece assignments
                const totalPieces = orderItems.reduce((sum, item) => sum + parseInt(item.pieces || 0), 0);
                const totalAssigned = orderItems.reduce((sum, item) => sum + item.assigned_pieces, 0);
                
                if (totalPieces > 0 && totalAssigned >= totalPieces) {
                    order.status = 'assigned';
                } else {
                    order.status = 'unassigned';
                }
            });
        }
        
        // Final filter in case the dynamic logic shifted it into/out of owner's view scope
        const filteredOrders = role === 'owner' ? orders : orders.filter(o => o.status === 'unassigned' || o.assigned_to_user_id === userId);
        res.status(200).json(filteredOrders);
    } catch (error) {
        console.error("Fetch Workflow Orders Error:", error);
        res.status(500).send({ error: 'Failed to fetch workflow orders.' });
    }
});

// Create Order
app.post('/api/workflow/orders', authenticate, async (req, res) => {
    const { id: userId, organization, role } = req.user;
    const { orderNumber, buyerName, items } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can create workflow orders.' });
    }
    if (!orderNumber || !items || items.length === 0) {
        return res.status(400).send({ error: 'Order Number and at least one item are required.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const orderResult = await client.query(
            "INSERT INTO workflow_orders (organization, order_number, buyer_name, created_by_user_id, status) VALUES ($1, $2, $3, $4, 'unassigned') RETURNING *",
            [organization, orderNumber, buyerName, userId]
        );
        const newOrder = orderResult.rows[0];

        for (const item of items) {
             await client.query(
                "INSERT INTO workflow_items (order_id, item_name, item_code, size, pieces, cbm) VALUES ($1, $2, $3, $4, $5, $6)",
                [newOrder.id, item.itemName, item.itemCode || '', item.size || '', item.pieces || 0, item.cbm ? parseFloat(item.cbm) : 0]
             );
             // Auto-save to master catalog (ignore if duplicate)
             await client.query(
                `INSERT INTO workflow_item_master (organization, item_name, item_code, size, cbm) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (organization, item_name, item_code, size) DO UPDATE SET cbm = EXCLUDED.cbm`,
                [organization, item.itemName, item.itemCode || '', item.size || '', item.cbm ? parseFloat(item.cbm) : 0]
             );
        }
        await client.query('COMMIT');
        res.status(201).json(newOrder);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Create Workflow Order Error:", error);
        if (error.code === '23505') {
             res.status(409).send({ error: 'An Order with this number already exists.' });
        } else {
             res.status(500).send({ error: 'Failed to create workflow order.' });
        }
    } finally {
        client.release();
    }
});

// Delete Order
app.delete('/api/workflow/orders/:id', authenticate, async (req, res) => {
    const { role, organization } = req.user;
    const { id } = req.params;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete workflow orders.' });
    }

    try {
        const result = await pool.query(
            "DELETE FROM workflow_orders WHERE id = $1 AND organization = $2 RETURNING id",
            [id, organization]
        );
        
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Order not found or access denied.' });
        }
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete Workflow Order Error:", error);
        res.status(500).send({ error: 'Failed to delete workflow order.' });
    }
});

// Assign Pieces endpoint (Partial Assignments)
app.post('/api/workflow/orders/:id/assign_pieces', authenticate, async (req, res) => {
    const { id: userId, organization, role } = req.user;
    const { id: orderId } = req.params;
    const { assignType, assigneeId, assignDate, deliveryDate, note, poNumber, joNumber, assignments } = req.body;
    
    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can assign orders.' });
    }

    if (!assignType || !assigneeId || !assignments || assignments.length === 0) {
        return res.status(400).send({ error: 'Missing required assignment fields.' });
    }

    const assigneeCol = assignType === 'supplier' ? 'supplier_id' : 'job_manager_id';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const split of assignments) {
             if (split.pieces > 0) {
                 await client.query(
                    `INSERT INTO workflow_assignments 
                    (order_id, order_item_id, assign_type, ${assigneeCol}, rate, assign_date, assigned_pieces, delivery_date, note, po_number, jo_number, created_by_user_id) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [orderId, split.orderItemId, assignType, assigneeId, split.rate || 0, assignDate || new Date(), split.pieces, deliveryDate || null, note || '', poNumber || null, joNumber || null, userId]
                 );
             }
        }
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Assign Pieces Error:", error);
        res.status(500).send({ error: 'Failed to assign pieces: ' + error.message });
    } finally {
        client.release();
    }
});

// Bulk Assign Pieces endpoint (Assignments across multiple orders)
app.post('/api/workflow/bulk_assign_pieces', authenticate, async (req, res) => {
    const { id: userId, role } = req.user;
    const { assignType, assigneeId, assignDate, deliveryDate, note, poNumber, joNumber, assignments } = req.body;
    
    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can assign orders.' });
    }

    if (!assignType || !assigneeId || !assignments || assignments.length === 0) {
        return res.status(400).send({ error: 'Missing required assignment fields.' });
    }

    const assigneeCol = assignType === 'supplier' ? 'supplier_id' : 'job_manager_id';

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const split of assignments) {
             if (split.pieces > 0) {
                 await client.query(
                    `INSERT INTO workflow_assignments 
                    (order_id, order_item_id, assign_type, ${assigneeCol}, rate, assign_date, assigned_pieces, delivery_date, note, po_number, jo_number, created_by_user_id) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [split.orderId, split.orderItemId, assignType, assigneeId, split.rate || 0, assignDate || new Date(), split.pieces, deliveryDate || null, note || '', poNumber || null, joNumber || null, userId]
                 );
             }
        }
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Bulk Assign Pieces Error:", error);
        res.status(500).send({ error: 'Failed to assign pieces: ' + error.message });
    } finally {
        client.release();
    }
});

// ==========================================
//          T-WORKFLOW INWARDS & INVENTORY
// ==========================================

app.post('/api/workflow/inwards', authenticate, async (req, res) => {
    const { id: userId, organization } = req.user;
    const { date, challanNo, items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).send({ error: 'Missing inward items.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const item of items) {
            if (item.receivedPieces > 0) {
                await client.query(
                    `INSERT INTO workflow_inwards 
                    (organization, assignment_id, date, challan_no, received_pieces, created_by_user_id) 
                    VALUES ($1, $2, $3, $4, $5, $6)`,
                    [organization, item.assignmentId, date || new Date(), challanNo || '', item.receivedPieces, userId]
                );
            }
        }
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Inward Record Error:", error);
        res.status(500).send({ error: 'Failed to record inward: ' + error.message });
    } finally {
        client.release();
    }
});

app.get('/api/workflow/inventory', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(`
            SELECT 
                wi.item_name, 
                wi.item_code, 
                wi.size, 
                SUM(winw.received_pieces) as total_pieces
            FROM workflow_inwards winw
            JOIN workflow_assignments wa ON winw.assignment_id = wa.id
            JOIN workflow_items wi ON wa.order_item_id = wi.id
            WHERE winw.organization = $1
            GROUP BY wi.item_name, wi.item_code, wi.size
            ORDER BY wi.item_name ASC
        `, [organization]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Inventory Error:", error);
        res.status(500).send({ error: 'Failed to fetch inventory.' });
    }
});

// ==========================================
//          T-WORKFLOW SUPPLIERS ENDPOINTS
// ==========================================

app.get('/api/workflow/suppliers', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            "SELECT * FROM workflow_suppliers WHERE organization = $1 ORDER BY name ASC",
            [organization]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Suppliers Error:", error);
        res.status(500).send({ error: 'Failed to fetch suppliers.' });
    }
});

app.post('/api/workflow/suppliers', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { name, phone, email, address } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can manage suppliers.' });
    }

    if (!name) return res.status(400).send({ error: 'Supplier name is required.' });

    try {
        const result = await pool.query(
            `INSERT INTO workflow_suppliers (organization, name, phone, email, address) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [organization, name, phone || null, email || null, address || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).send({ error: 'Supplier already exists.' });
        }
        console.error("Create Supplier Error:", error);
        res.status(500).send({ error: 'Failed to create supplier.' });
    }
});

app.delete('/api/workflow/suppliers/:id', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { id } = req.params;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete suppliers.' });
    }

    try {
        await pool.query(
            "DELETE FROM workflow_suppliers WHERE id = $1 AND organization = $2",
            [id, organization]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete Supplier Error:", error);
        res.status(500).send({ error: 'Failed to delete supplier.' });
    }
});

// ==========================================
//       T-WORKFLOW JOB MANAGERS ENDPOINTS
// ==========================================

app.get('/api/workflow/job-managers', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            "SELECT * FROM workflow_job_managers WHERE organization = $1 ORDER BY name ASC",
            [organization]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Job Managers Error:", error);
        res.status(500).send({ error: 'Failed to fetch job managers.' });
    }
});

app.post('/api/workflow/job-managers', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { name, phone, email, address } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can manage job managers.' });
    }

    if (!name) return res.status(400).send({ error: 'Job Manager name is required.' });

    try {
        const result = await pool.query(
            `INSERT INTO workflow_job_managers (organization, name, phone, email, address) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [organization, name, phone || null, email || null, address || null]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).send({ error: 'Job Manager already exists.' });
        }
        console.error("Create Job Manager Error:", error);
        res.status(500).send({ error: 'Failed to create job manager.' });
    }
});

app.delete('/api/workflow/job-managers/:id', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { id } = req.params;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete job managers.' });
    }

    try {
        await pool.query(
            "DELETE FROM workflow_job_managers WHERE id = $1 AND organization = $2",
            [id, organization]
        );
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete Job Manager Error:", error);
        res.status(500).send({ error: 'Failed to delete job manager.' });
    }
});

// ==========================================
//          T-WORKFLOW ITEM MASTER ENDPOINTS
// ==========================================

// Get all master items for org
app.get('/api/workflow/item-master', authenticate, async (req, res) => {
    const { organization } = req.user;
    try {
        const result = await pool.query(
            "SELECT * FROM workflow_item_master WHERE organization = $1 ORDER BY created_at DESC",
            [organization]
        );
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Item Master Error:", error);
        res.status(500).send({ error: 'Failed to fetch items.' });
    }
});

// Bulk create master items
app.post('/api/workflow/item-master/bulk', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { items } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can import items.' });
    }
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).send({ error: 'No items provided for import.' });
    }

    const client = await pool.connect();
    let importedCount = 0;
    try {
        await client.query('BEGIN');
        for (const item of items) {
            const { itemName, itemCode, size, cbm } = item;
            if (!itemName) continue; // Skip invalid rows
            const result = await client.query(
                `INSERT INTO workflow_item_master (organization, item_name, item_code, size, cbm) 
                 VALUES ($1, $2, $3, $4, $5) 
                 ON CONFLICT (organization, item_name, item_code, size) DO UPDATE SET cbm = EXCLUDED.cbm
                 RETURNING id`,
                [organization, itemName, itemCode || '', size || '', cbm ? parseFloat(cbm) : 0]
            );
            if (result.rowCount > 0) importedCount++;
        }
        await client.query('COMMIT');
        res.status(201).json({ success: true, count: importedCount });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Bulk Import Items Error:", error);
        res.status(500).send({ error: 'Failed to import items.' });
    } finally {
        client.release();
    }
});

// Create a new master item
app.post('/api/workflow/item-master', authenticate, async (req, res) => {
    const { organization, role } = req.user;
    const { itemName, itemCode, size, cbm } = req.body;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can create items.' });
    }
    if (!itemName) {
        return res.status(400).send({ error: 'Item Name is required.' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO workflow_item_master (organization, item_name, item_code, size, cbm) 
             VALUES ($1, $2, $3, $4, $5) 
             ON CONFLICT (organization, item_name, item_code, size) DO UPDATE SET cbm = EXCLUDED.cbm
             RETURNING *`,
            [organization, itemName, itemCode || '', size || '', cbm ? parseFloat(cbm) : 0]
        );
        if (result.rows.length === 0) {
            return res.status(409).send({ error: 'This item already exists.' });
        }
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error("Create Item Master Error:", error);
        res.status(500).send({ error: 'Failed to create item.' });
    }
});

// Delete a master item
app.delete('/api/workflow/item-master/:id', authenticate, async (req, res) => {
    const { role } = req.user;
    const { id } = req.params;

    if (role !== 'owner') {
        return res.status(403).send({ error: 'Only owners can delete items.' });
    }

    try {
        await pool.query("DELETE FROM workflow_item_master WHERE id = $1", [id]);
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Delete Item Master Error:", error);
        res.status(500).send({ error: 'Failed to delete item.' });
    }
});

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});