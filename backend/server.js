// server.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg'); // PostgreSQL client

const app = express();

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json()); 
app.set('trust proxy', true);

// --- PostgreSQL Database Connection ---
// UPDATE THIS LINE with your local database details
const connectionString = 'postgres://tcal_user:admin123@localhost:5432/tcal_db';

const pool = new Pool({
  connectionString,
});

// --- JWT Secret Key ---
const JWT_SECRET = 'your-super-secret-key-that-should-be-long-and-random';


// --- Authentication Middleware ---
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).send({ error: 'Unauthorized: No token provided' });
    }
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).send({ error: 'Unauthorized: Invalid token' });
    }
};


// --- API Endpoints ---

// User registration
app.post('/api/register', async (req, res) => {
    const { email, password, name, surname, phone } = req.body;
    if (!email || !password || !name || !surname || !phone) {
        return res.status(400).send({ error: 'All fields are required.' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (email, password_hash, name, surname, phone) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [email, hashedPassword, name, surname, phone]
        );
        res.status(201).send({ id: result.rows[0].id, message: 'User created successfully' });
    } catch (error) {
        console.error("Registration Error:", error);
        if (error.code === '23505') {
            return res.status(409).send({ error: 'An account with this email already exists.' });
        }
        res.status(500).send({ error: 'Failed to register user.' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const ip = req.ip;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);
        if (!isPasswordValid) {
            return res.status(401).send({ error: 'Invalid credentials' });
        }

        if (user.allowed_ip && user.allowed_ip !== ip) {
            return res.status(403).send({ error: 'Access from this IP address is not allowed.' });
        }

        await pool.query('UPDATE users SET last_login_ip = $1 WHERE id = $2', [ip, user.id]);

        const token = jwt.sign(
            { id: user.id, isAdmin: user.is_admin, name: user.name, surname: user.surname },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.status(200).send({ token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).send({ error: 'Login failed.' });
    }
});

// Get all users (admin only)
app.get('/api/users', authenticate, async (req, res) => {
    if (!req.user.isAdmin) return res.status(403).send({ error: 'Forbidden' });
    try {
        const result = await pool.query('SELECT id, name, surname, email, last_login_ip, allowed_ip FROM users');
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Users Error:", error);
        res.status(500).send({ error: 'Failed to fetch users.' });
    }
});

// Delete a user (admin only)
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

// Set a user's allowed IP (admin only)
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

// --- Report Endpoints ---

// Save a report
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

// Get all reports for a user
app.get('/api/reports', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query('SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC', [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Reports Error:", error);
        res.status(500).send({ error: 'Failed to fetch reports.' });
    }
});

// Delete a specific report
app.delete('/api/reports/:id', authenticate, async (req, res) => {
    const userId = req.user.id;
    const reportId = req.params.id;
    try {
        const result = await pool.query('DELETE FROM reports WHERE id = $1 AND user_id = $2', [reportId, userId]);
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Report not found or not owned by user.' });
        }
        res.status(200).send({ message: 'Report deleted successfully' });
    } catch (error) {
        console.error("Delete Report Error:", error);
        res.status(500).send({ error: 'Failed to delete report.' });
    }
});


// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
