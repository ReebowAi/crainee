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

  // ===== WITHDRAWAL ROUTES (with blocking) =====
  app.post('/api/withdrawal/request', authMiddleware, (req, res) => {
    const { amount, bankName } = req.body;
    const user = db.getUserById(req.user.id);
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    
    if (amount > user.virtual_balance) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }
    
    // Check withdrawal blocks
    const block = db.checkWithdrawalBlock(user.tier, amount);
    
    if (block) {
      // Record blocked transaction
      db.recordTransaction(req.user.id, null, 'withdrawal_blocked', 0, 0, amount, 'blocked', block.error_message, {
        compliance_message: block.compliance_message,
        tier: user.tier,
        bankName: bankName || 'Unknown Institution'
      });
      
      return res.status(403).json({
        blocked: true,
        error: block.error_message,
        complianceMessage: block.compliance_message,
        tier: user.tier,
        attemptedAmount: amount
      });
    }
    
    // Process withdrawal (enterprise simulation - deduct balance)
    db.db.prepare('UPDATE users SET virtual_balance = virtual_balance - ? WHERE id = ?').run(amount, req.user.id);
    
    db.recordTransaction(req.user.id, null, 'withdrawal', 0, 0, amount, 'completed', null, {
      bankName: bankName || 'Unknown Institution'
    });
    
    // Generate ticker message for other users
    const maskedEmail = user.email.replace(/(.{2}).*(@.*)/, '$1***$2');
    const tickerMsg = `Account ${maskedEmail} executed settlement of $${amount.toLocaleString()} via ${bankName || 'External Institution'}`;
    db.addTickerMessage(tickerMsg);
    
    const updatedUser = db.getUserById(req.user.id);
    res.json({ success: true, balance: updatedUser.virtual_balance, message: 'Settlement executed successfully' });
  });

  // ===== ADMIN ROUTES =====
  app.get('/api/admin/users', authMiddleware, adminMiddleware, (req, res) => {
    const users = db.getAllUsers();
    res.json({ users });
  });

  app.get('/api/admin/dashboard/stats', authMiddleware, adminMiddleware, (req, res) => {
    const stats = {
      totalUsers: db.db.prepare('SELECT COUNT(*) as count FROM users WHERE is_admin = 0').get().count,
      totalVirtualBalance: db.db.prepare('SELECT SUM(virtual_balance) as total FROM users WHERE is_admin = 0').get().total || 0,
      totalTransactions: db.db.prepare('SELECT COUNT(*) as count FROM transactions').get().count,
      blockedWithdrawals: db.db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type = 'withdrawal_blocked'").get().count,
      activeAssets: db.db.prepare("SELECT COUNT(*) as count FROM assets").get().count,
      tierDistribution: db.db.prepare(`
        SELECT tier, COUNT(*) as count FROM users WHERE is_admin = 0 GROUP BY tier
      `).all()
    };
    res.json({ stats });
  });

  app.post('/api/admin/users/:id/tier', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { tier } = req.body;
    const validTiers = ['Bronze', 'Silver', 'Gold', 'VIP'];
    if (!validTiers.includes(tier)) {
      return res.status(400).json({ error: 'Invalid tier' });
    }
    const user = db.updateUserTier(id, tier);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });

  app.post('/api/admin/users/:id/balance', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    const { amount } = req.body;
    if (typeof amount !== 'number') {
      return res.status(400).json({ error: 'Valid amount required' });
    }
    const user = db.updateUserBalance(id, amount);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ user });
  });

  // Admin settings
  app.get('/api/admin/settings', authMiddleware, adminMiddleware, (req, res) => {
    const settings = db.getSettings();
    res.json({ settings });
  });

  app.put('/api/admin/settings/:key', authMiddleware, adminMiddleware, (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const setting = db.updateSetting(key, value);
    if (!setting) return res.status(404).json({ error: 'Setting not found' });
    res.json({ setting });
  });

  // Withdrawal blocks management
  app.get('/api/admin/withdrawal-blocks', authMiddleware, adminMiddleware, (req, res) => {
    const blocks = db.getWithdrawalBlocks();
    res.json({ blocks });
  });

  app.post('/api/admin/withdrawal-blocks', authMiddleware, adminMiddleware, (req, res) => {
    const { tier, minAmount, maxAmount, errorMessage, complianceMessage } = req.body;
    if (!tier || !errorMessage) {
      return res.status(400).json({ error: 'Tier and error message required' });
    }
    const block = db.addWithdrawalBlock(tier, minAmount || 0, maxAmount || 999999999, errorMessage, complianceMessage || '');
    res.json({ block });
  });

  app.put('/api/admin/withdrawal-blocks/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    const block = db.updateWithdrawalBlock(id, req.body);
    if (!block) return res.status(404).json({ error: 'Block not found' });
    res.json({ block });
  });

  app.delete('/api/admin/withdrawal-blocks/:id', authMiddleware, adminMiddleware, (req, res) => {
    const { id } = req.params;
    db.deleteWithdrawalBlock(id);
    res.json({ success: true });
  });

  // Ticker messages
  app.get('/api/ticker/messages', (req, res) => {
    const tickers = db.getActiveTickers();
    res.json({ messages: tickers.map(t => t.message) });
  });

  app.post('/api/admin/ticker/add', authMiddleware, adminMiddleware, (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message required' });
    const id = db.addTickerMessage(message);
    res.json({ success: true, id });
  });

  app.post('/api/admin/ticker/generate', authMiddleware, adminMiddleware, (req, res) => {
    const count = req.body.count || 5;
    const messages = [];
    for (let i = 0; i < count; i++) {
      const msg = db.generateAITickerMessage();
      db.addTickerMessage(msg);
      messages.push(msg);
    }
    res.json({ messages });
  });

  // All transactions (admin view)
  app.get('/api/admin/transactions', authMiddleware, adminMiddleware, (req, res) => {
    const { limit = 500 } = req.query;
    const transactions = db.getAllTransactions(parseInt(limit));
    res.json({ transactions });
  });

  // Serve frontend for all other routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
}

module.exports = { setupRoutes, authMiddleware, adminMiddleware };
