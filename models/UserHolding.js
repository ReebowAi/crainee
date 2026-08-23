// models/UserHolding.js
const mongoose = require('mongoose');

const userHoldingSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  asset_id: { type: String, required: true, index: true },
  quantity: { type: Number, default: 0 },
  avg_buy_price: { type: Number, default: 0 }
});

userHoldingSchema.index({ user_id: 1, asset_id: 1 }, { unique: true });

module.exports = mongoose.models.UserHolding || mongoose.model('UserHolding', userHoldingSchema);
