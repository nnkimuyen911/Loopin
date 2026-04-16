const mongoose = require('mongoose');
const User = require('../models/User');
const Habit = require('../models/Habit');

// @desc    Get system-wide stats and all users
// @route   GET /api/admin/dashboard
exports.getAdminDashboard = async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalHabits = await Habit.countDocuments();
        // Get the habit with the longest current streak
        const topStreakHabit = await Habit.findOne({ isActive: true })
            .sort({ streak: -1 }) // Sort by streak descending
            .select('streak');
            const topStreak = topStreakHabit ? topStreakHabit.streak : 0;
        // Check if MongoDB is connected (0 = disconnected, 1 = connected, 2 = connecting)
        const isDbConnected = mongoose.connection.readyState === 1;

        const users = await User.find()
            .select('-password')
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalHabits,
                topStreak,
                // This drives the "System Health" on your frontend
                systemStatus: isDbConnected ? 'Healthy' : 'Degraded'
            },
            users
        });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching admin data", error: error.message });
    }
};

/*
// @desc    Delete a user and their associated habits
// @route   DELETE /api/admin/user/:id
exports.deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Prevent self-deletion
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ success: false, message: "You cannot delete your own admin account." });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        await User.findByIdAndDelete(userId);
        await Habit.deleteMany({ userId: userId });

        res.json({ success: true, message: "User and all their habits deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete user" });
    }
}; */