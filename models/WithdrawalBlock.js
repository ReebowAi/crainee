const mongoose = require('mongoose');

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

module.exports = mongoose.model('WithdrawalBlock', withdrawalBlockSchema);
