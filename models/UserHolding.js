const mongoose = require('mongoose');

const userHoldingSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  user_id: { type: String, required: true },
  asset_id: { type: String, required: true },
  quantity: { type: Number, default: 0 },
  avg_buy_price: { type: Number, default: 0 }
});
userHoldingSchema.index({ user_id: 1, asset_id: 1 }, { unique: true });

module.exports = mongoose.model('UserHolding', userHoldingSchema);
