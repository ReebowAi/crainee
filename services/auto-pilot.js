// services/auto-pilot.js - Background automation engine
const { EduDatabase } = require('../database/db');

class AutoPilotService {
  constructor() {
    this.intervalId = null;
    this.db = new EduDatabase();
  }

  start() {
    console.log('[AutoPilot] Zero-touch background engine started.');
    
    // Run automated tasks every 60 seconds
    this.intervalId = setInterval(() => {
      try {
        this.runMaintenanceTick();
      } catch (err) {
        console.error('[AutoPilot] Error during maintenance tick:', err.message);
      }
    }, 60000);
  }

  runMaintenanceTick() {
    // Generate dynamic ticker messages or background data health checks
    const activeTickers = this.db.getActiveTickers();
    if (activeTickers.length < 5) {
      const newMsg = this.db.generateAITickerMessage();
      this.db.addTickerMessage(newMsg);
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.db) {
      this.db.close();
    }
    console.log('[AutoPilot] Service stopped.');
  }
}

// Export as a singleton-style object using CommonJS
module.exports = new AutoPilotService();
