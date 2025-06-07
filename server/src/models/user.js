const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatar: { type: String },
  onlineStatus: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
  contacts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Group' }],
  channels: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Channel' }],
  encryptionKey: { type: String }, // 用于端到端加密
  status: { type: String, enum: ['active', 'suspended', 'banned'], default: 'active' },
  registrationIp: { type: String },
  failedLoginAttempts: { type: Number, default: 0 },
  lastFailedLogin: { type: Date },
  isVerified: { type: Boolean, default: false }
});

module.exports = mongoose.model('User', userSchema);