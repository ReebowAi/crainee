// models/WithdrawalBlock.js
const mongoose = require('mongoose');

const withdrawalBlockSchema = new mongoose.Schema({
  tier: { type: String, required: true, enum: ['Bronze', 'Silver', 'Gold', 'VIP', 'all'], index: true },
  min_amount: { type: Number, default: 0 },
  max_amount: { type: Number, default: 999999999 },
  error_message: { type: String, required: true },
  compliance_message: { type: String },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.models.WithdrawalBlock || mongoose.model('WithdrawalBlock', withdrawalBlockSchema);
