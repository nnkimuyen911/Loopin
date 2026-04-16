const express = require('express');
const router = express.Router();
const User = require('../models/User');
const webpush = require('../config/webpush'); // Bug 4 fix: dùng shared instance
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar } = require('../middleware/avatarUpload');
const Friendship = require('../models/Friendship');
router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});
// Save Push Subscription
router.post('/save-subscription', protect, async (req, res) => {
  try {
    const { userId, subscription } = req.body;
    
    if (!userId || !subscription) {
      return res.status(400).json({ success: false, message: 'User ID and subscription are required' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.subscription = subscription;
    await user.save();

    res.json({ success: true, message: 'Subscription saved successfully' });
  } catch (err) {
    console.error('Error saving subscription:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
// 2. Get User Profile (Fixes the 404 error)
router.get('/profile', protect, async (req, res) => {
  try {
    const userId = req.query.userId; 
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Only allow self (or admin) to read full profile
    if (req.user._id.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Public profile for friends only (limited fields)
router.get('/friend-profile', protect, async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }
    if (req.user._id.toString() === userId.toString()) {
      const me = await User.findById(userId).select('username avatar level xp createdAt');
      return res.json({ success: true, data: me });
    }

    const friendship = await Friendship.findOne({
      users: { $all: [req.user._id, userId] },
      status: 'accepted'
    }).select('_id');

    if (!friendship) {
      return res.status(403).json({ success: false, message: 'Friends only.' });
    }

    const user = await User.findById(userId).select('username avatar level xp createdAt');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 3. Upload profile photo (stores file under /uploads/avatars and sets user.avatar)
router.post('/avatar', protect, (req, res, next) => {
  uploadAvatar.single('avatar')(req, res, (err) => {
    if (err) {
      const msg = err.message || (err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 2 MB or smaller.' : 'Upload failed');
      return res.status(400).json({ success: false, message: msg });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No image file received.' });
    }
    const publicPath = `/uploads/avatars/${req.file.filename}`;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: publicPath },
      { new: true }
    ).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Avatar updated!', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 4. Update User Profile
router.put('/update-profile', protect, async (req, res) => {
  try {
    const { userId, username, email, avatar } = req.body;

    if (!userId || userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
    }

    const updates = {};
    if (username !== undefined) updates.username = username;
    if (email !== undefined) updates.email = email;
    if (avatar !== undefined) updates.avatar = avatar;

    const user = await User.findByIdAndUpdate(userId, updates, { new: true }).select('-password');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, message: 'Profile updated!', data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/test-notification', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user || !user.subscription) {
      return res.status(404).json({ message: 'No subscription found for this user.' });
    }

    const payload = JSON.stringify({
      title: 'Test from Loopin! 🐥',
      body: 'Your notification system is officially working.'
    });

    await webpush.sendNotification(user.subscription, payload);
    res.json({ success: true, message: 'Test notification sent!' });
  } catch (err) {
    console.error('Error sending test notification:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;