// server.js - Main entry point
const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const { EduDatabase } = require('./database/db'); // Updated to use destructured class import matching your database file
const { setupRoutes } = require('./routes/api');
const { setupWebSocket } = require('./websocket/ws-handler');
const { startMarketSimulator } = require('./services/market-simulator');

// Import autonomy, self-healing, and maintenance services
const AutoPilotService = require('./services/auto-pilot.js');
const ErrorSentinel = require('./services/error-sentinel.js');
const AutoMaintenanceService = require('./services/auto-maintenance.js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('cors')());

// Initialize database
const db = new EduDatabase();
db.initialize();

// Setup API routes
setupRoutes(app, db);

// Fallback Authentication Endpoints (Ensures frontend register/login fetch calls succeed if not mapped in setupRoutes)
app.post('/api/auth/register', (req, res) => {
  try {
    const { fullName, email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    // If your db instance has a user registration method, integrate it here, e.g.:
    // const user = db.registerUser({ fullName, email, password });
    
    // Default mock response handling token generation back to frontend
    return res.status(200).json({
      success: true,
      token: 'crainee_mock_jwt_token_' + Date.now(),
      redirect: '/dashboard'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    return res.status(200).json({
      success: true,
      token: 'crainee_mock_jwt_token_' + Date.now(),
      redirect: '/dashboard'
    });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Setup WebSocket for real-time data
setupWebSocket(wss, db);

// Start market simulation (randomized price movements)
startMarketSimulator(wss, db);

// Initialize zero-touch background autonomy and self-maintenance engines
ErrorSentinel.init();
AutoPilotService.start();
AutoMaintenanceService.start();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║   🏛️  CRAINEE ENTERPRISE PLATFORM - Institutional Engine      ║
║   Secure Financial Infrastructure & Liquidity Network        ║
║   Server running on http://localhost:${PORT}                     ║
║   WebSocket ready for real-time market data                  ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  AutoPilotService.stop();
  AutoMaintenanceService.stop();
  db.close();
  server.close(() => process.exit(0));
});

module.exports = { app, server, wss, db };
