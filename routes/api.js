// routes/api.js - REST API endpoints
const path = require('path');
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
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, password, fullName } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }
      const existingUser = await db.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const user = await db.createUser(email, password, fullName || '');
      const token = generateToken(user);
      res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance }, token, redirect: '/dashboard' });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Internal server error during registration' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password required' });
      }

      const user = await db.getUserByEmail(email);
      
      const isPasswordValid = user && (
        (typeof db.verifyPassword === 'function' && db.verifyPassword(user, password)) || 
        user.password === password
      );

      if (!user || !isPasswordValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.status && user.status !== 'active') {
        return res.status(403).json({ error: 'Account suspended' });
      }
      
      try {
        await User.updateOne({ id: user.id }, { $set: { last_login: new Date() } });
      } catch (err) {
        // Non-blocking fallback if timestamp column structure varies
      }

      const token = generateToken(user);
      res.json({ 
        user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance, isAdmin: user.is_admin }, 
        token,
        redirect: user.is_admin ? '/admin' : '/dashboard'
      });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  });

  app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user: { id: user.id, email: user.email, fullName: user.full_name, tier: user.tier, virtualBalance: user.virtual_balance, isAdmin: user.is_admin } });
    } catch (err) {
      res.status(500).json({ error: 'Server error' });
    }
  });

  // ===== MARKET DATA ROUTES =====
  app.get('/api/market/assets', async (req, res) => {
    try {
      const assets = await db.getAllAssets();
      res.json({ assets });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch assets' });
    }
  });

  app.get('/api/market/assets/:id', async (req, res) => {
    try {
      const asset = await db.getAssetById(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      res.json({ asset });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch asset' });
    }
  });

  app.get('/api/market/orderbook/:assetId', async (req, res) => {
    try {
      const { assetId } = req.params;
      const { limit = 50 } = req.query;
      const orderBook = await db.getOrderBook(assetId, parseInt(limit));
      res.json({ orderBook });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch order book' });
    }
  });

  // ===== USER PORTFOLIO ROUTES =====
  app.get('/api/portfolio/holdings', authMiddleware, async (req, res) => {
    try {
      const holdings = await db.getUserHoldings(req.user.id);
      res.json({ holdings });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch holdings' });
    }
  });

  app.get('/api/portfolio/balance', authMiddleware, async (req, res) => {
    try {
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ balance: user.virtual_balance, tier: user.tier });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch balance' });
    }
  });

  app.get('/api/portfolio/transactions', authMiddleware, async (req, res) => {
    try {
      const { limit = 100 } = req.query;
      const transactions = await db.getUserTransactions(req.user.id, parseInt(limit));
      res.json({ transactions });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // ===== TRADING ROUTES =====
  app.post('/api/trading/buy', authMiddleware, async (req, res) => {
    try {
      const { assetId, quantity } = req.body;
      const asset = await db.getAssetById(assetId);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      const totalCost = asset.current_price * quantity;
      
      if (totalCost > user.virtual_balance) {
        return res.status(400).json({ error: 'Insufficient account liquidity' });
      }
      
      await db.updateUserBalance(req.user.id, -totalCost);
      await db.updateHolding(req.user.id, assetId, quantity, asset.current_price);
      await db.recordTransaction(req.user.id, assetId, 'buy', quantity, asset.current_price, totalCost);
      
      const updatedUser = await db.getUserById(req.user.id);
      res.json({ success: true, balance: updatedUser.virtual_balance, executionPrice: asset.current_price });
    } catch (err) {
      console.error('Buy execution error:', err);
      res.status(500).json({ error: 'Trade execution failed' });
    }
  });

  app.post('/api/trading/sell', authMiddleware, async (req, res) => {
    try {
      const { assetId, quantity } = req.body;
      const asset = await db.getAssetById(assetId);
      if (!asset) return res.status(404).json({ error: 'Asset not found' });
      
      const holdings = await db.getUserHoldings(req.user.id);
      const holding = holdings.find(h => h.asset_id === assetId);
      
      if (!holding || holding.quantity < quantity) {
        return res.status(400).json({ error: 'Insufficient asset holdings' });
      }
      
      const totalValue = asset.current_price * quantity;
      
      await db.updateUserBalance(req.user.id, totalValue);
      await db.updateHolding(req.user.id, assetId, -quantity, asset.current_price);
      await db.recordTransaction(req.user.id, assetId, 'sell', quantity, asset.current_price, totalValue);
      
      const updatedUser = await db.getUserById(req.user.id);
      res.json({ success: true, balance: updatedUser.virtual_balance, executionPrice: asset.current_price });
    } catch (err) {
      console.error('Sell execution error:', err);
      res.status(500).json({ error: 'Trade execution failed' });
    }
  });

  // ===== WITHDRAWAL ROUTES (with blocking) =====
  app.post('/api/withdrawal/request', authMiddleware, async (req, res) => {
    try {
      const { amount, bankName } = req.body;
      const user = await db.getUserById(req.user.id);
      if (!user) return res.status(404).json({ error: 'User not found' });
      
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount required' });
      }
      
      if (amount > user.virtual_balance) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      
      const block = await db.checkWithdrawalBlock(user.tier, amount);
      
      if (block) {
        await db.recordTransaction(req.user.id, null, 'withdrawal_blocked', 0, 0, amount, 'blocked', block.error_message, {
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
      
      await db.updateUserBalance(req.user.id, -amount);
      await db.recordTransaction(req.user.id, null, 'withdrawal', 0, 0, amount, 'completed', null, {
        bankName: bankName || 'Unknown Institution'
      });
      
      const maskedEmail = user.email.replace(/(.{2}).*(@.*)/, '$1***$2');
      const tickerMsg = `Account ${maskedEmail} executed settlement of $${amount.toLocaleString()} via ${bankName || 'External Institution'}`;
      await db.addTickerMessage(tickerMsg);
      
      const updatedUser = await db.getUserById(req.user.id);
      res.json({ success: true, balance: updatedUser.virtual_balance, message: 'Settlement executed successfully' });
    } catch (err) {
      console.error('Withdrawal error:', err);
      res.status(500).json({ error: 'Withdrawal processing failed' });
    }
  });

  // ===== ADMIN ROUTES =====
  app.get('/api/admin/users', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const users = await db.getAllUsers();
      res.json({ users });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  app.get('/api/admin/dashboard/stats', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const UserModal = mongoose.model('User');
      const TransactionModal = mongoose.model('Transaction');
      const AssetModal = mongoose.model('Asset');

      const totalUsersCount = await UserModal.countDocuments({ is_admin: 0 });
      const balanceAgg = await UserModal.aggregate([
        { $match: { is_admin: 0 } },
        { $group: { _id: null, total: { $sum: '$virtual_balance' } } }
      ]);
      const totalVirtualBalance = balanceAgg.length > 0 ? balanceAgg[0].total : 0;
      const totalTransactions = await TransactionModal.countDocuments();
      const blockedWithdrawals = await TransactionModal.countDocuments({ type: 'withdrawal_blocked' });
      const activeAssets = await AssetModal.countDocuments();
      
      const tierDistribution = await UserModal.aggregate([
        { $match: { is_admin: 0 } },
        { $group: { _id: '$tier', count: { $sum: 1 } } },
        { $project: { tier: '$_id', count: 1, _id: 0 } }
      ]);

      const stats = {
        totalUsers: totalUsersCount,
        totalVirtualBalance,
        totalTransactions,
        blockedWithdrawals,
        activeAssets,
        tierDistribution
      };
      res.json({ stats });
    } catch (err) {
      console.error('Admin stats error:', err);
      res.status(500).json({ error: 'Failed to fetch admin statistics' });
    }
  });

  app.post('/api/admin/users/:id/tier', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { tier } = req.body;
      const validTiers = ['Bronze', 'Silver', 'Gold', 'VIP'];
      if (!validTiers.includes(tier)) {
        return res.status(400).json({ error: 'Invalid tier' });
      }
      const user = await db.updateUserTier(id, tier);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user tier' });
    }
  });

  app.post('/api/admin/users/:id/balance', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;
      if (typeof amount !== 'number') {
        return res.status(400).json({ error: 'Valid amount required' });
      }
      const user = await db.updateUserBalance(id, amount);
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json({ user });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update user balance' });
    }
  });

  // Admin settings
  app.get('/api/admin/settings', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const settings = await db.getSettings();
      res.json({ settings });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch settings' });
    }
  });

  app.put('/api/admin/settings/:key', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { key } = req.params;
      const { value } = req.body;
      const setting = await db.updateSetting(key, value);
      if (!setting) return res.status(404).json({ error: 'Setting not found' });
      res.json({ setting });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update setting' });
    }
  });

  // Withdrawal blocks management
  app.get('/api/admin/withdrawal-blocks', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const blocks = await db.getWithdrawalBlocks();
      res.json({ blocks });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch withdrawal blocks' });
    }
  });

  app.post('/api/admin/withdrawal-blocks', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { tier, minAmount, maxAmount, errorMessage, complianceMessage } = req.body;
      if (!tier || !errorMessage) {
        return res.status(400).json({ error: 'Tier and error message required' });
      }
      const block = await db.addWithdrawalBlock(tier, minAmount || 0, maxAmount || 999999999, errorMessage, complianceMessage || '');
      res.json({ block });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create withdrawal block' });
    }
  });

  app.put('/api/admin/withdrawal-blocks/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      const block = await db.updateWithdrawalBlock(id, req.body);
      if (!block) return res.status(404).json({ error: 'Block not found' });
      res.json({ block });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update withdrawal block' });
    }
  });

  app.delete('/api/admin/withdrawal-blocks/:id', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { id } = req.params;
      await db.deleteWithdrawalBlock(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete withdrawal block' });
    }
  });

  // Ticker messages
  app.get('/api/ticker/messages', async (req, res) => {
    try {
      const tickers = await db.getActiveTickers();
      res.json({ messages: tickers.map(t => t.message) });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch tickers' });
    }
  });

  app.post('/api/admin/ticker/add', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'Message required' });
      const id = await db.addTickerMessage(message);
      res.json({ success: true, id });
    } catch (err) {
      res.status(500).json({ error: 'Failed to add ticker message' });
    }
  });

  app.post('/api/admin/ticker/generate', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const count = req.body.count || 5;
      const messages = [];
      for (let i = 0; i < count; i++) {
        const msg = db.generateAITickerMessage();
        await db.addTickerMessage(msg);
        messages.push(msg);
      }
      res.json({ messages });
    } catch (err) {
      res.status(500).json({ error: 'Failed to generate tickers' });
    }
  });

  // All transactions (admin view)
  app.get('/api/admin/transactions', authMiddleware, adminMiddleware, async (req, res) => {
    try {
      const { limit = 500 } = req.query;
      const transactions = await db.getAllTransactions(parseInt(limit));
      res.json({ transactions });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  // Smart Frontend Asset and Page Routing Fallback
  app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'admin.html'));
  });

  app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
  });

  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
  });
}

module.exports = { setupRoutes, authMiddleware, adminMiddleware };
