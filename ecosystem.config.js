/**
 * Crainee Production PM2 Cluster Configuration
 * Designed for 24/7/365 unattended server execution.
 */

module.exports = {
  apps: [
    {
      name: 'crainee-core',
      script: './server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      max_memory_restart: '500M',
      autorestart: true,
      restart_delay: 3000,
      exp_backoff_restart_delay: 100,
      watch: false,
      ignore_watch: ['node_modules', 'data', 'logs'],
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true
    }
  ]
};
