const User = require('../models/User');
const Friendship = require('../models/Friendship');
const Habit = require('../models/Habit');
const { notifyUser } = require('../services/notificationService');

// @desc    Search users by username
exports.searchUsers = async (req, res) => {
  try {
    const { username } = req.query;
    
    // 1. Find the users
    const users = await User.find({
      username: { $regex: username, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('username _id avatar');

    // 2. Check friendship status for each found user
    const usersWithStatus = await Promise.all(users.map(async (user) => {
      const friendship = await Friendship.findOne({
        users: { $all: [req.user._id, user._id] }
      });

      return {
        _id: user._id,
        username: user.username,
        avatar: user.avatar,
        friendshipStatus: friendship ? friendship.status : null,
        isRequester: friendship ? friendship.requester.toString() === req.user._id.toString() : false
      };
    }));

    res.status(200).json({ success: true, data: usersWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Send friend request
exports.sendRequest = async (req, res) => {
  try {
    const recipientId = req.params.recipientId;
    const senderId = req.user._id.toString();

    if (recipientId === senderId) {
      return res.status(400).json({ success: false, message: "You cannot add yourself." });
    }

    // 1. Check if ANY friendship exists between these two people
    // $all ensures we find the document regardless of ID order
    const existing = await Friendship.findOne({
      users: { $all: [senderId, recipientId] }
    });

    if (existing) {
      const msg = existing.status === 'accepted' 
        ? "You are already friends!" 
        : "A friend request is already pending.";
      return res.status(400).json({ success: false, message: msg });
    }

    // 2. Create the new friendship
    // We store them in a sorted array so it's predictable
    const userIds = [senderId, recipientId].sort();

    const newFriendship = new Friendship({
      users: userIds,
      requester: req.user._id,
      status: 'pending'
    });

    await newFriendship.save();
    res.status(201).json({ success: true, message: 'Friend request sent! 🚀' });
  } catch (error) {
    console.error("Friend Request Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Handle (Accept/Reject) Request
exports.handleRequest = async (req, res) => {
  const { senderId, action } = req.body;
  try {
    if (action === 'accept') {
      await Friendship.findOneAndUpdate(
        { users: { $all: [req.user._id, senderId] } },
        { status: 'accepted' }
      );
      return res.json({ success: true, message: 'Friend added! 🌱' });
    }
    await Friendship.findOneAndDelete({ users: { $all: [req.user._id, senderId] } });
    res.json({ success: true, message: 'Request removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    List Friends & Update Streaks
exports.getFriends = async (req, res) => {
  try {
    const friendships = await Friendship.find({
      users: req.user._id,
      status: 'accepted'
    }).populate('users', 'username avatar');

    const friendsWithStreaks = await Promise.all(friendships.map(async (f) => {
      const friend = f.users.find(u => u._id.toString() !== req.user._id.toString());
      if (!friend) return null; 

      const today = new Date().setHours(0,0,0,0);
      const yesterday = new Date(today - 24 * 60 * 60 * 1000).setHours(0,0,0,0);
      const lastUpdate = f.lastStreakUpdate ? new Date(f.lastStreakUpdate).setHours(0,0,0,0) : null;

      // Check if both users checked in today
      const userHabit = await Habit.findOne({ userId: req.user._id, lastCheckin: { $gte: today } });
      const friendHabit = await Habit.findOne({ userId: friend._id, lastCheckin: { $gte: today } });

      if (userHabit && friendHabit) {
          if (lastUpdate !== today) {
              f.streak += 1;
              f.lastStreakUpdate = new Date();
              await f.save();
          }
      } else if (lastUpdate && lastUpdate < yesterday) {
          f.streak = 0;
          await f.save();
      }

      return {
        _id: friend._id,
        username: friend.username,
        avatar: friend.avatar,
        streak: f.streak
      };
    }));

    res.json({ success: true, data: friendsWithStreaks.filter(f => f !== null) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Remove a friend
exports.unfriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const friendship = await Friendship.findOneAndDelete({
      users: { $all: [req.user._id, friendId] }
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Friend removed. Shared streaks have been reset. 🗑️'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Get my pending friend requests
exports.getMyRequests = async (req, res) => {
  try {
    const requests = await Friendship.find({
      users: req.user._id, // Find friendships involving the user
      status: 'pending',
      requester: { $ne: req.user._id } // Where the user is NOT the one who sent it (meaning you are the recipient)
    }).populate('requester', 'username avatar'); 

    const formattedRequests = requests.map(r => ({
      _id: r._id,
      sender: r.requester 
    }));

    res.json({ success: true, requests: formattedRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Cancel a sent friend request
exports.cancelRequest = async (req, res) => {
  try {
    const { recipientId } = req.params;
    const friendship = await Friendship.findOneAndDelete({
      users: { $all: [req.user._id, recipientId] },
      status: 'pending',
      requester: req.user._id
    });

    if (!friendship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Pending request not found or you are not the requester.' 
    });
    }

    res.status(200).json({ success: true, message: 'Friend request cancelled. ❌' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
}; // <--- MAKE SURE THIS BRACE IS HERE

// @desc    Poke a friend to remind them to check in
exports.pokeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const senderId = req.user._id;
    const senderName = req.user.username || 'Your friend';

    const friendship = await Friendship.findOne({
      users: { $all: [senderId, friendId] },
      status: 'accepted'
    });

    if (!friendship) {
      return res.status(404).json({ success: false, message: 'Friendship not found.' });
    }

    // Use Optional Chaining (?.) to prevent the .toString() crash
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const lastSender = friendship.lastPoke?.sender?.toString(); // Safely get sender
    const lastTime = friendship.lastPoke?.timestamp;

    if (lastSender === senderId.toString() && lastTime > oneHourAgo) {
      return res.status(400).json({ success: false, message: 'Wait a bit before poking again! ⏳' });
    }

    // Update the poke info
    friendship.lastPoke = {
      sender: senderId,
      timestamp: new Date()
    };

    await friendship.save();

    const receiver = await User.findById(friendId).select('email subscription').lean();
    if (receiver) {
      await notifyUser(
        receiver,
        'You got poked! 👉',
        `${senderName} poked you. Keep your streak alive!`
      );
    }

    res.status(200).json({ 
      success: true, 
      message: 'Poke sent successfully! 👉'
    });
  } catch (error) {
    // This is where your error was being caught
    res.status(500).json({ success: false, message: error.message });
  }
};
// @desc    Check for any incoming pokes
exports.checkPokes = async (req, res) => {
  try {
    const userId = req.user._id;
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pokes = await Friendship.find({
      users: userId,
      status: 'accepted',
      'lastPoke.sender': { $ne: userId },
      'lastPoke.timestamp': { $gt: yesterday }
    }).populate('lastPoke.sender', 'username');

    const formattedPokes = pokes.map(p => ({
      from: p.lastPoke.sender.username,
      at: p.lastPoke.timestamp
    }));

    res.json({ success: true, pokes: formattedPokes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};