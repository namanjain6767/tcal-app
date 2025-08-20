// server.js

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

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

// --- Serve static files from the disk ---
const reportsDirectory = '/var/data/reports';
app.use('/reports', express.static(reportsDirectory));


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

// --- Helper function to generate XLSX buffer ---
const generateXLSXBuffer = (dataToExport) => {
    const groupedByThickness = {};
    for (const key in dataToExport) {
        const [t, l, w] = key.split('-');
        const count = dataToExport[key];
        if (!groupedByThickness[t]) groupedByThickness[t] = {};
        if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
        groupedByThickness[t][l][w] = count;
    }
    const wb = XLSX.utils.book_new();
    for (const thickness in groupedByThickness) {
        const sheetData = groupedByThickness[thickness];
        const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
        const allWidths = new Set();
        allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
        const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
        const matrix = [['Length \\ Width', ...sortedWidths, 'Total', 'CFT']];
        const colTotals = new Array(sortedWidths.length).fill(0);
        let sheetTotalCFT = 0;
        allLengths.forEach(length => {
            let rowTotal = 0;
            const row = [parseFloat(length)];
            let weightedWidthSum = 0;
            sortedWidths.forEach((width, index) => {
                const count = sheetData[length][width] || 0;
                row.push(count);
                rowTotal += count;
                colTotals[index] += count;
                weightedWidthSum += parseFloat(width) * count;
            });
            row.push(rowTotal);
            const rowCFT = (parseFloat(thickness) * parseFloat(length) * weightedWidthSum) / 144;
            row.push(parseFloat(rowCFT.toFixed(4)));
            sheetTotalCFT += rowCFT;
            matrix.push(row);
        });
        const totalRow = ['Total'];
        let grandTotal = 0;
        colTotals.forEach(total => {
            totalRow.push(total);
            grandTotal += total;
        });
        totalRow.push(grandTotal);
        totalRow.push(parseFloat(sheetTotalCFT.toFixed(4)));
        matrix.push(totalRow);
        const ws = XLSX.utils.aoa_to_sheet(matrix);
        XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
    }
    return XLSX.write(wb, { bookType: 'xlsx', type: 'buffer' });
};


// --- API Endpoints ---
// (User endpoints remain the same)

// --- UPDATED: Report Endpoints ---
app.post('/api/reports', authenticate, async (req, res) => {
    const userId = req.user.id;
    const { reportData, fileName } = req.body;
    try {
        const xlsxBuffer = generateXLSXBuffer(reportData);
        const filePath = path.join(reportsDirectory, fileName);
        fs.writeFileSync(filePath, xlsxBuffer);

        const serviceUrl = 'https://tcal-app-backend.onrender.com'; // Replace with your actual Render URL
        const fileUrl = `${serviceUrl}/reports/${fileName}`;

        await pool.query(
            'INSERT INTO reports (user_id, file_name, file_url, report_data) VALUES ($1, $2, $3, $4)',
            [userId, fileName, fileUrl, reportData]
        );
        res.status(201).send({ message: 'Report saved successfully', fileUrl });
    } catch (error) {
        console.error("Save Report Error:", error);
        res.status(500).send({ error: 'Failed to save report.' });
    }
});

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

app.delete('/api/reports/:id', authenticate, async (req, res) => {
    const userId = req.user.id;
    const reportId = req.params.id;
    try {
        const result = await pool.query('SELECT file_name FROM reports WHERE id = $1 AND user_id = $2', [reportId, userId]);
        if (result.rows.length > 0) {
            const fileName = result.rows[0].file_name;
            const filePath = path.join(reportsDirectory, fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); // Delete the file from disk
            }
        }
        
        await pool.query('DELETE FROM reports WHERE id = $1 AND user_id = $2', [reportId, userId]);
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
