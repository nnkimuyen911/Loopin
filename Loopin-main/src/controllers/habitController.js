const Habit = require('../models/Habit');
const User = require('../models/User');

async function getPetHiddenStatus(userId) {
  const latestCheckinHabit = await Habit.findOne({
    userId,
    isActive: true,
    lastCheckin: { $ne: null }
  })
    .sort({ lastCheckin: -1 })
    .select('lastCheckin')
    .lean();

  if (!latestCheckinHabit?.lastCheckin) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastCheckinDate = new Date(latestCheckinHabit.lastCheckin);
  lastCheckinDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - lastCheckinDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 3;
}

// @desc    Get all habits for user
exports.getHabits = async (req, res) => {
  try {
    const habits = await Habit.find({ 
      userId: req.user._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    const habitsWithStatus = await Promise.all(habits.map(async (habit) => {
      // Use the method defined in your Habit.js model
      await habit.resetStreakIfMissed(); 
      
      return {
        ...habit.toObject(),
        // Use the helper method from your model
        isCheckedInToday: habit.hasCheckedInToday() 
      };
    }));

    res.status(200).json({
      success: true,
      data: { habits: habitsWithStatus }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching habits', error: error.message });
  }
};

// @desc    Check in to a habit with advanced XP logic
// @route   POST /api/habits/:id/checkin
exports.checkinHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id });

    if (!habit) {
      return res.status(404).json({ success: false, message: 'Habit not found' });
    }

    // 1. Check if already checked in today
    if (habit.hasCheckedInToday()) {
      return res.status(200).json({
        success: true,
        message: 'Already checked in today! 👍',
        data: { 
          habit, 
          alreadyCheckedIn: true 
        }
      });
    }

    // 2. Execute check-in logic (streaks/history)
    const result = habit.checkin(); 
    await habit.save();

    // 3. Advanced XP & Leveling Logic (Integrated from Version 1)
    const user = await User.findById(req.user._id);
    let levelUp = false;
    let xpGained = 10; // Default XP

    if (user) {
      // Apply difficulty multiplier from Version 1
      if (habit.difficulty === 'hard') {
        xpGained = 40;
      }

      user.xp = (user.xp || 0) + xpGained;
      user.level = user.level || 1;

      // Calculate XP threshold
      const xpNeeded = user.level * 100;

      if (user.xp >= xpNeeded) {
        user.level += 1;
        user.xp -= xpNeeded;
        levelUp = true;
        
        // Pet Evolution based on Level
        if (user.level >= 20) user.petType = 'adult';
        else if (user.level >= 10) user.petType = 'teen';
        else if (user.level >= 3) user.petType = 'baby';
      }
      
      await user.save();
    }

    // 4. Return comprehensive response to Frontend
    res.status(200).json({
      success: true,
      message: levelUp 
        ? `🎉 Level Up! You reached level ${user.level}!` 
        : (result.streak > 1 ? `🔥 ${result.streak} day streak!` : 'Checked in! ✨'),
      data: { 
        habit, 
        streak: result.streak,
        xpGained,
        currentXp: user.xp,
        currentLevel: user.level,
        levelUp // Boolean for frontend animations
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error during check-in', 
      error: error.message 
    });
  }
};
// @desc    Get Stats (Updated to match checkinHistory)
exports.getStats = async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.user._id, isActive: true });
    const totalHabits = habits.length;
    const checkedInToday = habits.filter(h => h.hasCheckedInToday()).length;
    const completionRate = totalHabits > 0 ? Math.round((checkedInToday / totalHabits) * 100) : 0;
    
    // Calculate unique days using checkinHistory from your model
    const allDates = habits.flatMap(h => h.checkinHistory.map(entry => 
      new Date(entry.date).toISOString().split('T')[0]
    ));
    const uniqueDates = [...new Set(allDates)];

    const user = await User.findById(req.user._id).select('xp level petType');
    const isPetHidden = await getPetHiddenStatus(req.user._id);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalHabits,
          checkedInToday,
          completionRate,
          totalStreak: habits.reduce((sum, h) => sum + h.streak, 0),
          longestStreak: habits.length > 0 ? Math.max(...habits.map(h => h.streak)) : 0,
          checkInDays: uniqueDates
        },
        user: user
          ? {
              ...user.toObject(),
              isPetHidden
            }
          : null
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
};

// Standard CRUD
exports.getHabit = async (req, res) => {
  try {
    const habit = await Habit.findOne({ _id: req.params.id, userId: req.user._id, isActive: true });
    if (!habit) return res.status(404).json({ success: false, message: 'Habit not found' });
    await habit.resetStreakIfMissed();
    res.json({ success: true, data: habit });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.updateHabit = async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    res.json({ success: true, data: habit });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.deleteHabit = async (req, res) => {
  try {
    await Habit.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    res.json({ success: true, message: 'Habit deleted' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

exports.getHabitsByUser = async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.params.userId, isActive: true });
        res.json({ success: true, data: habits });
    } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};
// @desc    Create new habit
// @route   POST /api/habits
exports.createHabit = async (req, res) => {
  try {
    const { name, goal, icon, color, reminderTime, motivation } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a habit name' });
    }

    const habit = await Habit.create({
      userId: req.user._id,
      name,
      goal: { 
        unit: goal?.unit || 'times', 
        value: goal?.value || 1 
      },
      icon: icon || '✨',
      color: color || 'blue',
      reminderTime,
      motivation
    });

    res.status(201).json({
      success: true,
      message: 'Habit created! 🎉',
      data: { habit }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error creating habit', error: error.message });
  }
};
// @desc    Get habits for a specific user (Admin use)
// @route   GET /api/habits/user/:userId
exports.getHabitsByUser = async (req, res) => {
    try {
        const habits = await Habit.find({ userId: req.params.userId });
        res.status(200).json(habits);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};