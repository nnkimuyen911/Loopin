const mongoose = require('mongoose');

const FriendshipSchema = new mongoose.Schema({
  users: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted'],
    default: 'pending'
  },
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  streak: {
    type: Number,
    default: 0
  },
  lastStreakUpdate: {
    type: Date,
    default: null
  },
  lastPoke: {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

FriendshipSchema.index({ users: 1 });

module.exports = mongoose.model('Friendship', FriendshipSchema);