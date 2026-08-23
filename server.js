// server.js - Main entry point
const express = require('express');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const cors = require('cors');
const { EduDatabase } = require('./database/db'); 
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
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors());

// Initialize database
const db = new EduDatabase();

async function startServer() {
  try {
    await db.initialize();
  } catch (err) {
    console.error('Failed to initialize database during startup:', err);
    process.exit(1);
  }

  // Setup API routes (Handles authentication, users, etc. securely)
  setupRoutes(app, db);

  // Setup WebSocket for real-time data
  setupWebSocket(wss, db);

  // Start market simulation (randomized price movements)
  startMarketSimulator(wss, db);

  // Initialize zero-touch background autonomy and self-maintenance engines safely
  try {
    ErrorSentinel.init();
    AutoPilotService.start();
    AutoMaintenanceService.start();
  } catch (err) {
    console.warn('Warning: Background autonomy service initialization error:', err);
  }

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
  try {
    AutoPilotService.stop();
    AutoMaintenanceService.stop();
    if (db && typeof db.close === 'function') {
      await db.close();
    }
  } catch (err) {
    console.error('Error during graceful shutdown cleanup:', err);
  }
  server.close(() => process.exit(0));
});

module.exports = { app, server, wss, db };
