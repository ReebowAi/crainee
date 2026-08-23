// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password_hash: { type: String, required: true },
  full_name: { type: String, trim: true },
  tier: { type: String, default: 'Bronze' },
  virtual_balance: { type: Number, default: 10000.00 },
  created_at: { type: Date, default: Date.now },
  last_login: { type: Date },
  is_admin: { type: Boolean, default: false },
  status: { type: String, default: 'active' }
});

module.exports = mongoose.model('User', userSchema);
