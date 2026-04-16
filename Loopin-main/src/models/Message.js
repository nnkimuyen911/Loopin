const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  from: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  to: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: true, trim: true, maxlength: 2000 },
  createdAt: { type: Date, default: Date.now, index: true }
});

MessageSchema.index({ from: 1, to: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
