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
app.use(express.urlencoded({ extended: true })); // Added to correctly parse form submissions and prevent registration lookup bugs
app.use(express.static(path.join(__dirname, 'public')));
app.use(require('cors')());

// Initialize database
const db = new EduDatabase();

async function startServer() {
  try {
    await db.initialize();
  } catch (err) {
    console.error('Failed to initialize database during startup:', err);
  }

  // Setup API routes
  setupRoutes(app, db);

  // Direct Auth Routing for Login & Register using your custom EduDatabase instance
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { fullName, email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Check if user already exists
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists with this email' });
      }

      // Register user in your database store using Mongoose method
      const newUser = await db.createUser(email, password, fullName || 'Trader');

      return res.status(200).json({
        success: true,
        token: 'crainee_token_' + newUser.id,
        redirect: '/dashboard'
      });
    } catch (err) {
      console.error('Registration error:', err);
      return res.status(500).json({ error: 'Internal server error during registration' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      // Verify credentials against your database implementation
      const user = await db.getUserByEmail(email);
      if (!user || !db.verifyPassword(user, password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      return res.status(200).json({
        success: true,
        token: 'crainee_token_' + user.id,
        redirect: '/dashboard'
      });
    } catch (err) {
      console.error('Login error:', err);
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
}

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down gracefully...');
  AutoPilotService.stop();
  AutoMaintenanceService.stop();
  await db.close();
  server.close(() => process.exit(0));
});

module.exports = { app, server, wss, db };
