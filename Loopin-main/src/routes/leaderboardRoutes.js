const express = require('express');
const router = express.Router();
const Habit = require('../models/Habit');
const Friendship = require('../models/Friendship');
const { protect } = require('../middleware/authMiddleware');
// @route   GET /api/leaderboard
// @desc    Get top rankings (Global or Friends)
router.get('/', protect, async (req, res) => {
    try {
        const { filter } = req.query; // 'global' or 'friends'
        let targetUserIds = [];

        if (filter === 'friends') {
            // 1. Get list of accepted friends
            const friendships = await Friendship.find({
                users: req.user._id,
                status: 'accepted'
            });

            // 2. Extract friend IDs and include the current user
            targetUserIds = friendships.map(f => 
                f.users.find(id => id.toString() !== req.user._id.toString())
            );
            targetUserIds.push(req.user._id);
        }

        // 3. Aggregate Rankings
// Change this line to ensure it handles the 'undefined' case (Global by default)
    const matchStage = filter === 'friends' 
        ? { $match: { userId: { $in: targetUserIds } } } 
         : { $match: { streak: { $gt: 0 } } };
        const rankings = await Habit.aggregate([
            matchStage,
            {
                $group: {
                    _id: "$userId", 
                    bestStreak: { $max: "$streak" } 
                }
            },
            {
                $lookup: {
                    from: "users", 
                    localField: "_id",
                    foreignField: "_id",
                    as: "userDetails"
                }
            },
            { $unwind: "$userDetails" },
            {
                $project: {
                    _id: 0,
                    username: "$userDetails.username",
                    avatar: "$userDetails.avatar", 
                    longestStreak: "$bestStreak"
                }
            },
            { $sort: { longestStreak: -1 } },
            { $limit: 10 }
        ]);

        res.status(200).json({
            success: true,
            data: rankings
        });
    } catch (error) {
        console.error("Leaderboard Error:", error);
        res.status(500).json({ success: false, message: "Could not fetch rankings" });
    }
});

module.exports = router;