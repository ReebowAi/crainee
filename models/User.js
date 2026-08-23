const mongoose = require('mongoose');

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

module.exports = mongoose.model('User', userSchema);
