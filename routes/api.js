// routes/api.js - Main API routes handler
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { EduDatabase } = require('../database/db');

function setupRoutes(app, db) {
  const JWT_SECRET = process.env.JWT_SECRET || 'crainee-secure-fallback-secret';

  // Middleware to authenticate JWT from cookies or headers
  const authenticateToken = (req, res, next) => {
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });
      req.user = user;
      next();
    });
  };

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Get market assets endpoint
  app.get('/api/market/assets', async (req, res) => {
    try {
      const assets = await db.getAllAssets();
      res.json({ assets });
    } catch (err) {
      console.error('Error fetching market assets:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Additional API routes can be registered here as needed...
}

module.exports = { setupRoutes };
