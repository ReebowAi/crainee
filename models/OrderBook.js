const mongoose = require('mongoose');

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

module.exports = mongoose.model('OrderBook', orderBookSchema);
