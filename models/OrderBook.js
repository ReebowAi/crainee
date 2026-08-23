// models/OrderBook.js
const mongoose = require('mongoose');

const orderBookSchema = new mongoose.Schema({
  asset_id: { type: String, required: true, index: true },
  side: { type: String, required: true, enum: ['buy', 'sell'] },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
  is_system: { type: Boolean, default: true }, // true = simulated, false = real user
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.OrderBook || mongoose.model('OrderBook', orderBookSchema);
