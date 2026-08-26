// routes/api.js - Main API routes handler
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { EduDatabase } = require('../database/db');

function setupRoutes(app, db) {
  const JWT_SECRET = process.env.JWT_SECRET || 'crainee-secure-fallback-secret';

  // CRITICAL FIX: Ensure cookie-parser is used so req.cookies works for authentication
  app.use(cookieParser());

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

  // User Login Endpoint (Fixes login network & communication errors)
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }

      const user = await db.getUserByEmail(email);
      if (!user || !db.verifyPassword(user, password)) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      // Generate JWT Token
      const tokenPayload = { id: user.id, email: user.email, is_admin: user.is_admin, tier: user.tier };
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '24h' });

      // Set secure HTTP-only cookie
      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      });

      res.json({ 
        success: true, 
        message: 'Logged in successfully', 
        token, 
        user: { id: user.id, email: user.email, full_name: user.full_name, tier: user.tier, virtual_balance: user.virtual_balance, is_admin: user.is_admin } 
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  // Check Current Session Endpoint
  app.get('/api/auth/session', authenticateToken, async (req, res) => {
    try {
      const user = await db.getUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ authenticated: true, user });
    } catch (err) {
      console.error('Session check error:', err);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // User Logout Endpoint
  app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
  });
}

module.exports = { setupRoutes };
