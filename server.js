const express = require('express');
const path = require('path');
const app = express();

// Middleware to parse JSON and URL-encoded form data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// --- API Auth Endpoints ---

// Login API Endpoint
app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;

    // Basic validation check (replace with your database check)
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

    return res.status(200).json({
        success: true,
        token: 'sample-jwt-token-xyz123',
        redirect: '/dashboard'
    });
});

// --- Dashboard & Protected Route Handlers ---

app.get('/dashboard', (req, res) => {
    // You can serve a dashboard.html file here or a simple response for now
    res.send('<!DOCTYPE html><html><head><title>Dashboard</title></head><body style="background:#05070b;color:#fff;font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;"><h1>Welcome to your Crainee Trading Dashboard</h1></body></html>');
});

// Fallback to index.html for root or missing routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server on Render's assigned port or fallback to 3000 locally
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Crainee server running on port ${PORT}`);
});
