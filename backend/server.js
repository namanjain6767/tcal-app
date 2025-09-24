require('dotenv').config();
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const url = require('url');

const app = express();
const server = http.createServer(app);

const allowedOrigins = [
      'http://localhost:5173',
      'https://draveta.vercel.app'

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

// --- PostgreSQL Database Connection ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// --- JWT Secret Key ---
const JWT_SECRET = process.env.JWT_SECRET;

// --- WebSocket Server Setup ---
const wss = new WebSocket.Server({ server });

const clients = new Map(); // Maps userId to WebSocket connection

wss.on('connection', async (ws, req) => {
    const token = url.parse(req.url, true).query.token;
    if (!token) {
        return ws.close();
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const userId = decoded.id;
        clients.set(userId, ws);

        ws.on('message', async (message) => {
            const data = JSON.parse(message);
            
            if (data.type === 'CFT_UPDATE') {
                try {
                    const result = await pool.query('SELECT id FROM users WHERE organization = $1 AND role = $2', [decoded.organization, 'owner']);
                    result.rows.forEach(owner => {
                        const ownerSocket = clients.get(owner.id);
                        if (ownerSocket && ownerSocket.readyState === WebSocket.OPEN) {
                            ownerSocket.send(JSON.stringify({ 
                                type: 'CFT_UPDATE', 
                                cft: data.cft, 
                                counterId: userId, 
                                counterName: `${decoded.name} ${decoded.surname}` 
                            }));
                        }
                    });
                } catch (dbError) {
                    console.error("WebSocket DB Error:", dbError);
                }
            }
        });

        ws.on('close', () => {
            clients.delete(userId);
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

// --- API Endpoints ---
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

// --- UPDATED Report & Log Endpoints ---
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
            result = await pool.query(
                'SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', 
                [id]
            );
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
            result = await pool.query(
                'SELECT * FROM logs WHERE user_id = $1 ORDER BY created_at DESC', 
                [id]
            );
        }
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Logs Error:", error);
        res.status(500).send({ error: 'Failed to fetch logs.' });
    }
});

// Other endpoints remain the same
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

// --- Start the Server ---
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

