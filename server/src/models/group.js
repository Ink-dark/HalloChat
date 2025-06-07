const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  avatar: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
  isEncrypted: { type: Boolean, default: false }
});

// 验证消息是否属于该群组
groupSchema.methods.validateMessage = function(messageId) {
  return this.lastMessage.toString() === messageId.toString();
};

module.exports = mongoose.model('Group', groupSchema);