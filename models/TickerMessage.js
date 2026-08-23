// models/TickerMessage.js
const mongoose = require('mongoose');

const tickerMessageSchema = new mongoose.Schema({
  message: { type: String, required: true, trim: true },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.TickerMessage || mongoose.model('TickerMessage', tickerMessageSchema);
