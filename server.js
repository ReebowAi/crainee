const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Explicit Root & Static Files (Must be first to guarantee index.html loads) ---

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Force root URL (/) to explicitly serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- API Endpoints ---

app.get('/api/health', (req, res) => {
    return res.status(200).json({ status: 'ok' });
});

app.get('/api/market/assets', (req, res) => {
    return res.status(200).json({
        success: true,
        assets: [
            { id: 1, name: 'Bitcoin', symbol: 'BTC', price: '65000' },
            { id: 2, name: 'Ethereum', symbol: 'ETH', price: '3500' }
        ]
    });
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }
    return res.status(200).json({
        success: true,
        token: 'sample-jwt-token-xyz123',
        redirect: '/dashboard'
    });
});

app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required for registration.' });
    }
    return res.status(200).json({
        success: true,
        token: 'sample-jwt-token-xyz123',
        redirect: '/dashboard'
    });
});

// --- Dashboard Route ---
app.get('/dashboard', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Dashboard</title></head><body style="background:#05070b;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h1>Welcome to your Crainee Trading Dashboard</h1></body></html>');
});

// Fallback for any other missing routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server on Render's assigned port or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Crainee server running on port ${PORT}`);
});
