const mongoose = require('mongoose');

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: String, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AdminSetting', adminSettingSchema);
