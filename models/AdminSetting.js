// models/AdminSetting.js
const mongoose = require('mongoose');

const adminSettingSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, index: true },
  value: { type: String, required: true },
  description: { type: String },
  updated_at: { type: Date, default: Date.now }
});

// Automatically update the updated_at timestamp on save
adminSettingSchema.pre('save', function(next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.models.AdminSetting || mongoose.model('AdminSetting', adminSettingSchema);
