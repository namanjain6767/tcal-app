// server.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const app = express();

// --- CORS Configuration ---
const allowedOrigins = [
    'http://localhost:5173',
    'https://astounding-liger-a7f504.netlify.app'
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
const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });

// --- JWT Secret Key ---
const JWT_SECRET = process.env.JWT_SECRET;

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
// (User endpoints remain the same)

// --- Report Endpoints ---
// (Report endpoints remain the same)


// --- NEW: Draft Endpoints ---

// Get all drafts for a user
app.get('/api/drafts', authenticate, async (req, res) => {
    const userId = req.user.id;
    try {
        const result = await pool.query('SELECT * FROM drafts WHERE user_id = $1 ORDER BY updated_at DESC', [userId]);
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Fetch Drafts Error:", error);
        res.status(500).send({ error: 'Failed to fetch drafts.' });
    }
});

// Create a new draft with a custom name
app.post('/api/drafts', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { draftData } = req.body;
    try {
        // Logic to generate the custom, incrementing draft name
        const today = new Date();
        const dateStr = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}-${today.getFullYear()}`;
        
        const countResult = await pool.query(
            "SELECT COUNT(*) FROM drafts WHERE user_id = $1 AND draft_name LIKE $2",
            [userId, `timber_record_${dateStr}%`]
        );
        const newCount = parseInt(countResult.rows[0].count, 10) + 1;
        const formattedCount = String(newCount).padStart(3, '0');

        const timeStr = today.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).replace(' ', '-');
        const draftName = `timber_record_${dateStr}_${timeStr}_${formattedCount}.xlsx`;

        const result = await pool.query(
            'INSERT INTO drafts (user_id, draft_name, draft_data) VALUES ($1, $2, $3) RETURNING id, draft_name',
            [userId, draftName, draftData]
        );
        res.status(201).send(result.rows[0]);
    } catch (error) {
        console.error("Create Draft Error:", error);
        res.status(500).send({ error: 'Failed to create draft.' });
    }
});

// Update an existing draft
app.put('/api/drafts/:id', authenticate, async (req, res) => {
    const userId = req.user.id;
    const draftId = req.params.id;
    const { draftData } = req.body;
    try {
        const result = await pool.query(
            'UPDATE drafts SET draft_data = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING id',
            [draftData, draftId, userId]
        );
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Draft not found or not owned by user.' });
        }
        res.status(200).send(result.rows[0]);
    } catch (error) {
        console.error("Update Draft Error:", error);
        res.status(500).send({ error: 'Failed to update draft.' });
    }
});

// Delete a draft
app.delete('/api/drafts/:id', authenticate, async (req, res) => {
    const userId = req.user.id;
    const draftId = req.params.id;
    try {
        const result = await pool.query('DELETE FROM drafts WHERE id = $1 AND user_id = $2', [draftId, userId]);
        if (result.rowCount === 0) {
            return res.status(404).send({ error: 'Draft not found or not owned by user.' });
        }
        res.status(200).send({ message: 'Draft deleted successfully' });
    } catch (error) {
        console.error("Delete Draft Error:", error);
        res.status(500).send({ error: 'Failed to delete draft.' });
    }
});


// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
