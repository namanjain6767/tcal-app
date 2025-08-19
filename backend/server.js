// server.js

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');

const app = express();

// --- Middleware ---
app.use(cors({ origin: 'http://localhost:5173' })); 
app.use(express.json()); 
app.set('trust proxy', true); // Necessary to get the correct IP address

// --- Firebase Admin SDK Initialization ---
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

// --- Authentication Middleware ---
const authenticate = async (req, res, next) => {
    const token = req.headers.authorization?.split('Bearer ')[1];
    if (!token) {
        return res.status(401).send({ error: 'Unauthorized: No token provided' });
    }
    try {
        const decodedToken = await auth.verifyIdToken(token);
        req.user = decodedToken;
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
        const userRecord = await auth.createUser({ email, password });
        await db.collection('users').doc(userRecord.uid).set({
            email: userRecord.email,
            name: name,
            surname: surname,
            phone: phone,
            isAdmin: false, 
            allowedIp: null, // NEW: Initialize allowedIp field
        });
        res.status(201).send({ uid: userRecord.uid, message: 'User created successfully' });
    } catch (error) {
        res.status(400).send({ error: error.message });
    }
});

// UPDATED: Record Login Activity and Check IP
app.post('/api/login-activity', authenticate, async (req, res) => {
    const { uid } = req.user;
    const ip = req.ip; 
    try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (!userDoc.exists()) {
            return res.status(404).send({ error: 'User not found in database' });
        }
        const userData = userDoc.data();
        
        // IP Check Logic
        if (userData.allowedIp && userData.allowedIp !== ip) {
            return res.status(403).send({ error: 'Access from this IP address is not allowed.' });
        }

        // If check passes, record the login activity
        await db.collection('users').doc(uid).update({
            lastLoginIp: ip,
            lastLoginTime: admin.firestore.FieldValue.serverTimestamp()
        });
        res.status(200).send({ message: 'Login activity recorded' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to record login activity' });
    }
});


// Get all users from Firestore to include all data (admin only)
app.get('/api/users', authenticate, async (req, res) => {
    try {
        const usersSnapshot = await db.collection('users').get();
        const users = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data()
        }));
        res.status(200).json(users);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Delete a user (admin only)
app.delete('/api/users/:uid', authenticate, async (req, res) => {
    const { uid } = req.params;
    try {
        await auth.deleteUser(uid);
        await db.collection('users').doc(uid).delete();
        res.status(200).send({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// --- NEW: Endpoint to set a user's allowed IP (admin only) ---
app.post('/api/users/:uid/lock-ip', authenticate, async (req, res) => {
    const requesterUid = req.user.uid;
    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    if (!requesterDoc.exists() || !requesterDoc.data().isAdmin) {
        return res.status(403).send({ error: 'Forbidden: Admin access required' });
    }

    const { uid } = req.params;
    const { ipAddress } = req.body;

    try {
        await db.collection('users').doc(uid).update({
            allowedIp: ipAddress || null // Store null if the IP address is cleared
        });
        res.status(200).send({ message: 'IP lock updated successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to update IP lock' });
    }
});


// --- Report Endpoints ---

// Save a report
app.post('/api/reports', authenticate, async (req, res) => {
    const { uid } = req.user;
    const { reportData, fileName } = req.body;
    try {
        const report = {
            data: reportData,
            fileName: fileName,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        await db.collection('users').doc(uid).collection('reports').add(report);
        res.status(201).send({ message: 'Report saved successfully' });
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Get all reports for a user
app.get('/api/reports', authenticate, async (req, res) => {
    const { uid } = req.user;
    try {
        const reportsSnapshot = await db.collection('users').doc(uid).collection('reports').orderBy('createdAt', 'desc').get();
        const reports = reportsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

// Delete a specific report
app.delete('/api/reports/:reportId', authenticate, async (req, res) => {
    const { uid } = req.user;
    const { reportId } = req.params;
    try {
        await db.collection('users').doc(uid).collection('reports').doc(reportId).delete();
        res.status(200).send({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).send({ error: 'Failed to delete report' });
    }
});


// --- Start the Server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
