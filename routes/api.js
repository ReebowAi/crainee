// routes/api.js - REST API endpoints
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'crainee-enterprise-secret-key-2026';
const JWT_EXPIRY = '24h';

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, tier: user.tier, isAdmin: user.is_admin },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }
  req.user = decoded;
  next();
}

function adminMiddleware(req, res, next) {
  if (!req.user.isAdmin) {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

function setupRoutes(app, db) {
  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ===== AUTH ROUTES =====
  app.post('/api/auth/register', (req, res) => {
    const { email, password, fullName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    if (db.getUserByEmail(email)) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    const user = db.createUser(email, password, fullName || '');
    const token = generateToken(user);
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance }, token });
  });

  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    const user = db.getUserByEmail(email);
    if (!user || !db.verifyPassword(user, password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'Account suspended' });
    }
    db.db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?').run(user.id);
    const token = generateToken(user);
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance, isAdmin: user.is_admin }, token });
  });

  app.get('/api/auth/me', authMiddleware, (req, res) => {
    const user = db.getUserById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance, isAdmin: user.is_admin } });
  });

  // ===== MARKET DATA ROUTES =====
  app.get('/api/market/assets', (req, res) => {
    const assets = db.getAllAssets();
    res.json({ assets });
  });

  app.get('/api/market/assets/:id', (req, res) => {
    const asset = db.getAssetById(req.params.id);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json({ asset });
  });

  app.get('/api/market/orderbook/:assetId', (req, res) => {
    const { assetId } = req.params;
    const { limit = 50 } = req.query;
    const orderBook = db.getOrderBook(assetId, parseInt(limit));
    res.json({ orderBook });
  });

  // ===== USER PORTFOLIO ROUTES =====
  app.get('/api/portfolio/holdings', authMiddleware, (req, res) => {
    const holdings = db.getUserHoldings(req.user.id);
    res.json({ holdings });
  });

  app.get('/api/portfolio/balance', authMiddleware, (req, res) => {
    const user = db.getUserById(req.user.id);
    res.json({ balance: user.virtual_balance, tier: user.tier });
  });

  app.get('/api/portfolio/transactions', authMiddleware, (req, res) => {
    const { limit = 100 } = req.query;
    const transactions = db.getUserTransactions(req.user.id, parseInt(limit));
    res.json({ transactions });
  });

  // ===== TRADING ROUTES =====
  app.post('/api/trading/buy', authMiddleware, (req, res) => {
    const { assetId, quantity } = req.body;
    const asset = db.getAssetById(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    const user = db.getUserById(req.user.id);
    const totalCost = asset.current_price * quantity;
    
    if (totalCost > user.virtual_balance) {
      return res.status(400).json({ error: 'Insufficient account liquidity' });
    }
    
    // Update balance and holdings
    db.db.prepare('UPDATE users SET virtual_balance = virtual_balance - ? WHERE id = ?').run(totalCost, req.user.id);
    db.updateHolding(req.user.id, assetId, quantity, asset.current_price);
    
    // Record transaction
    db.recordTransaction(req.user.id, assetId, 'buy', quantity, asset.current_price, totalCost);
    
    const updatedUser = db.getUserById(req.user.id);
    res.json({ success: true, balance: updatedUser.virtual_balance, executionPrice: asset.current_price });
  });

  app.post('/api/trading/sell', authMiddleware, (req, res) => {
    const { assetId, quantity } = req.body;
    const asset = db.getAssetById(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    
    const holdings = db.getUserHoldings(req.user.id);
    const holding = holdings.find(h => h.asset_id === assetId);
    
    if (!holding || holding.quantity < quantity) {
      return res.status(400).json({ error: 'Insufficient asset holdings' });
    }
    
    const totalValue = asset.current_price * quantity;
    
    // Update balance and holdings
    db.db.prepare('UPDATE users SET virtual_balance = virtual_balance + ? WHERE id = ?').run(totalValue, req.user.id);
    db.updateHolding(req.user.id, assetId, -quantity, asset.current_price);
    
    // Record transaction
    db.recordTransaction(req.user.id, assetId, 'sell', quantity, asset.current_price, totalValue);
    
    const updatedUser = db.getUserById(req.user.id);
    res.json({ success: true, balance: updatedUser.virtual_balance, executionPrice: asset.current_price });
  });
}

module.exports = { setupRoutes, authMiddleware, adminMiddleware };
