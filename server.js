const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- API Endpoints (Must be declared BEFORE static files and catch-all routes) ---

// Health Check API Endpoint (Used by testing scripts)
app.get('/api/health', (req, res) => {
    return res.status(200).json({ status: 'ok' });
});

// Market Assets API Endpoint (Used by testing scripts)
app.get('/api/market/assets', (req, res) => {
    // TODO: Fetch market assets from your database or external service
    return res.status(200).json({
        success: true,
        assets: [
            { id: 1, name: 'Bitcoin', symbol: 'BTC', price: '65000' },
            { id: 2, name: 'Ethereum', symbol: 'ETH', price: '3500' }
        ]
    });
});

// Login API Endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    // TODO: Validate user credentials against your database here

    // Simulate successful authentication and return a token + redirect path
    return res.status(200).json({
        success: true,
        token: 'sample-jwt-token-xyz123',
        redirect: '/dashboard'
    });
});

// Register API Endpoint
app.post('/api/auth/register', (req, res) => {
    const { fullName, email, password } = req.body;

    if (!fullName || !email || !password) {
        return res.status(400).json({ error: 'All fields are required for registration.' });
    }

    // TODO: Save user to your database here

    // Simulate successful registration and return a token + redirect path
    return res.status(200).json({
        success: true,
        token: 'sample-jwt-token-xyz123',
        redirect: '/dashboard'
    });
});

// --- Frontend & Dashboard Route Handlers ---

// Explicitly serve your login/frontend page at the root URL (/)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Dashboard Route (Matches the redirect target sent by login/register)
app.get('/dashboard', (req, res) => {
    res.send('<!DOCTYPE html><html><head><title>Dashboard</title></head><body style="background:#05070b;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h1>Welcome to your Crainee Trading Dashboard</h1></body></html>');
});

// --- Static Files ---
app.use(express.static(path.join(__dirname, 'public')));

// Fallback for any other missing routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server on Render's assigned port or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Crainee server running on port ${PORT}`);
});
