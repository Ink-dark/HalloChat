const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, required: true },
  receiverId: { type: mongoose.Schema.Types.ObjectId, required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  status: { 
    type: String, 
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  type: {
    type: String,
    enum: ['text', 'image', 'audio'],
    default: 'text'
  },
  isEncrypted: { type: Boolean, default: false },
  isSelfDestruct: { type: Boolean, default: false },
  groupId: { type: mongoose.Schema.Types.ObjectId },
  channelId: { type: mongoose.Schema.Types.ObjectId }
});

module.exports = mongoose.model('Message', messageSchema);