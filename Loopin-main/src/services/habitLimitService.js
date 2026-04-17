const Habit = require('../models/Habit');

const FREE_HABIT_LIMIT = 3;

function getUserType(user) {
  return user && user.isPremium === true ? 'PREMIUM_USER' : 'FREE_USER';
}

function getLimitByUserType(userType) {
  return userType === 'PREMIUM_USER' ? null : FREE_HABIT_LIMIT;
}

function buildLimitState({ userType, habitCount }) {
  const limit = getLimitByUserType(userType);
  const canCreate = limit === null ? true : habitCount < limit;

  return {
    userType,
    isPremium: userType === 'PREMIUM_USER',
    habitCount,
    limit,
    canCreate,
    remaining: limit === null ? null : Math.max(0, limit - habitCount)
  };
}

async function getHabitLimitStateForUser({ userId, user }) {
  const habitCount = await Habit.countDocuments({ userId, isActive: true });
  const userType = getUserType(user);

  return buildLimitState({ userType, habitCount });
}

module.exports = {
  FREE_HABIT_LIMIT,
  getUserType,
  getLimitByUserType,
  buildLimitState,
  getHabitLimitStateForUser
};
