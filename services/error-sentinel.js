/**
 * Crainee Error Sentinel & Self-Recovery Engine
 * Prevents server crashes from unexpected runtime exceptions.
 */

import fs from 'fs';
import path from 'path';

class ErrorSentinel {
  init() {
    process.on('uncaughtException', (err) => {
      this.logError('UNCAUGHT_EXCEPTION', err);
      // Prevent crash by gracefully logging and keeping process alive
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.logError('UNHANDLED_REJECTION', reason);
    });

    console.log('[Sentinel] Error guardian active. Zero-crash protection engaged.');
  }

  logError(type, error) {
    const timestamp = new Date().toISOString();
    const errorLog = `[${timestamp}] [${type}] ${error.stack || error.message || error}\n`;
    
    console.error(`[Sentinel Recovery] Caught anomaly: ${error.message || error}`);

    try {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      fs.appendFileSync(path.join(logDir, 'sentinel.log'), errorLog);
    } catch (writeErr) {
      // Fallback if disk write fails
      console.error('[Sentinel Error] Could not write to error log file:', writeErr.message);
    }
  }
}

export default new ErrorSentinel();
