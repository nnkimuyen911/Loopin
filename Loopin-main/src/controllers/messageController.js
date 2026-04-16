const mongoose = require('mongoose');
const Message = require('../models/Message');
const Friendship = require('../models/Friendship');
const User = require('../models/User');
const { notifyUser } = require('../services/notificationService');
const { emailTemplates } = require('../helpers/emailTemplate.helper');

async function ensureFriends(userId, otherUserId) {
  const friendship = await Friendship.findOne({
    users: { $all: [userId, otherUserId] },
    status: 'accepted'
  }).select('_id');
  return Boolean(friendship);
}

// @desc    Get message thread with a friend
// @route   GET /api/messages/thread/:otherUserId
exports.getThread = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    if (otherUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself.' });
    }

    const ok = await ensureFriends(req.user._id, otherUserId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Friends only.' });
    }

    const messages = await Message.find({
      $or: [
        { from: req.user._id, to: otherUserId },
        { from: otherUserId, to: req.user._id }
      ]
    })
      .sort({ createdAt: 1 })
      .limit(300)
      .lean();

    res.json({ success: true, data: { messages } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send message to a friend
// @route   POST /api/messages/thread/:otherUserId
exports.sendMessage = async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const { content } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(otherUserId)) {
      return res.status(400).json({ success: false, message: 'Invalid user id.' });
    }
    if (otherUserId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot message yourself.' });
    }
    const text = String(content || '').trim();
    if (!text) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    const ok = await ensureFriends(req.user._id, otherUserId);
    if (!ok) {
      return res.status(403).json({ success: false, message: 'Friends only.' });
    }

    const msg = await Message.create({
      from: req.user._id,
      to: otherUserId,
      content: text
    });

    try {
      const [sender, receiver] = await Promise.all([
        User.findById(req.user._id).select('username').lean(),
        User.findById(otherUserId).select('email subscription').lean()
      ]);

      if (receiver) {
        const senderName = sender?.username || 'Your friend';
        const messagePreview = text.length > 140 ? `${text.slice(0, 137)}...` : text;
        await notifyUser(
          receiver,
          `New message from ${senderName}`,
          `${senderName}: ${messagePreview}`,
          emailTemplates.newMessage(senderName, messagePreview)
        );
      }
    } catch (notifyError) {
      console.error('[Message] Notification failed:', notifyError.message);
    }

    res.status(201).json({ success: true, data: { message: msg } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

