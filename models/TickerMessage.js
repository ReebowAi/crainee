const mongoose = require('mongoose');

const tickerMessageSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  message: { type: String, required: true },
  is_active: { type: Number, default: 1 },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('TickerMessage', tickerMessageSchema);
