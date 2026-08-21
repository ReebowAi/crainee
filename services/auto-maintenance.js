/**
 * Crainee Auto-Maintenance & System Hygiene Engine
 * Executes automated database cleanup, log rotation, and storage optimization.
 */

import fs from 'fs';
import path from 'path';
import db from '../database/db.js';

class AutoMaintenanceService {
  constructor() {
    this.timer = null;
  }

  start() {
    console.log('[Maintenance] Auto-maintenance supervisor online. Routine sanitation scheduled.');

    // Run maintenance every 12 hours
    this.timer = setInterval(() => {
      this.executeRoutineMaintenance();
    }, 43200000);

    // Also run an initial check 30 seconds after server boot
    setTimeout(() => {
      this.executeRoutineMaintenance();
    }, 30000);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('[Maintenance] Auto-maintenance supervisor paused.');
  }

  executeRoutineMaintenance() {
    const timestamp = new Date().toISOString();
    console.log(`[Maintenance] Starting scheduled system hygiene protocol at ${timestamp}`);

    try {
      this.optimizeDatabase();
      this.pruneStaleAuditLogs();
      this.rotateSystemLogs();
      console.log('[Maintenance] System hygiene protocol completed successfully.');
    } catch (err) {
      console.error('[Maintenance Error] Routine maintenance encountered an anomaly:', err.message);
    }
  }

  optimizeDatabase() {
    console.log('[Maintenance] Optimizing SQLite database indices and reclaiming space...');
    try {
      // Analyze tables to optimize query performance
      db.exec('ANALYZE;');
      // Reclaim unused space from deleted or modified rows
      db.exec('VACUUM;');
      console.log('[Maintenance] Database vacuum and analysis complete.');
    } catch (err) {
      console.error('[Maintenance Error] Database optimization failed:', err.message);
    }
  }

  pruneStaleAuditLogs() {
    console.log('[Maintenance] Checking transaction audit logs and system cache tables...');
    try {
      // Keep transaction logs clean by retaining the last 10,000 global records
      const checkStmt = db.prepare('SELECT COUNT(*) as count FROM transactions');
      const { count } = checkStmt.get();

      if (count > 10000) {
        db.exec(`
          DELETE FROM transactions 
          WHERE id NOT IN (
            SELECT id FROM transactions ORDER BY created_at DESC LIMIT 10000
          )
        `);
        console.log(`[Maintenance] Pruned excess transaction logs. Maintained latest 10,000 records.`);
      } else {
        console.log('[Maintenance] Transaction log count is within safe limits.');
      }
    } catch (err) {
      console.error('[Maintenance Error] Audit log pruning failed:', err.message);
    }
  }

  rotateSystemLogs() {
    console.log('[Maintenance] Inspecting server log sizes for rotation...');
    const logDir = path.join(process.cwd(), 'logs');
    
    if (!fs.existsSync(logDir)) return;

    try {
      const files = fs.readdirNames ? fs.readdirSync(logDir) : fs.readdirSync(logDir);
      
      for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        
        // If a log file exceeds 10MB, archive or truncate it to prevent disk space exhaustion
        const maxSizeMB = 10;
        if (stats.size > maxSizeMB * 1024 * 1024) {
          const archivePath = `${filePath}.${Date.now()}.bak`;
          fs.renameSync(filePath, archivePath);
          console.log(`[Maintenance] Rotated oversized log file: ${file} -> archived as .bak`);
        }
      }
    } catch (err) {
      console.error('[Maintenance Error] Log rotation failed:', err.message);
    }
  }
}

export default new AutoMaintenanceService();
