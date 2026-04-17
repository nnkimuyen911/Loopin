const User = require('../models/User');
const { generateLearningRoadmap } = require('../services/learningRoadmapService');

const ALLOWED_PAYMENT_METHODS = new Set(['mastercard', 'apple-pay']);

function normalizeSubscription(user) {
  const raw = (user && user.subscription) || {};
  const plan = raw.plan || 'monthly';

  // Backward-compatible field mapping for old/new subscription shapes.
  const startDate = raw.startDate || raw.startedAt || null;
  const expirationDate = raw.expirationDate || raw.nextBillingAt || null;

  const now = new Date();
  const parsedExpiration = expirationDate ? new Date(expirationDate) : null;
  const isExpired = !!parsedExpiration && !Number.isNaN(parsedExpiration.getTime()) && now > parsedExpiration;
  const isPremium = !!user.isPremium && !isExpired;

  return {
    isPremium,
    isExpired,
    plan,
    startDate,
    expirationDate
  };
}

async function markExpiredIfNeeded(user, normalized) {
  if (!user || !normalized.isExpired) return;

  // Keep persisted account state aligned with derived expiration state.
  if (user.isPremium === true) {
    user.isPremium = false;
  }

  if (user.subscription && user.subscription.status !== 'expired') {
    user.subscription.status = 'expired';
  }

  await user.save();
}

exports.upgradeToPremium = async (req, res) => {
  try {
    const { userId, paymentMethod } = req.body || {};

    if (!userId || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: 'userId and paymentMethod are required.'
      });
    }

    const normalizedMethod = String(paymentMethod).trim().toLowerCase();
    if (!ALLOWED_PAYMENT_METHODS.has(normalizedMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Unsupported payment method.'
      });
    }

    const requesterId = req.user && req.user._id ? req.user._id.toString() : null;
    const isOwner = requesterId === String(userId);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only upgrade your own account.'
      });
    }

    const now = new Date();
    const nextBilling = new Date(now);
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    const user = await User.findByIdAndUpdate(
      userId,
      {
        isPremium: true,
        subscription: {
          status: 'active',
          plan: 'monthly',
          paymentMethod: normalizedMethod,
          amount: 1.99,
          currency: 'USD',
          startDate: now,
          expirationDate: nextBilling,
          // Keep old keys for compatibility with any existing callers.
          startedAt: now,
          nextBillingAt: nextBilling
        }
      },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Premium upgraded successfully.',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isPremium: user.isPremium,
          subscription: user.subscription
        }
      }
    });
  } catch (error) {
    console.error('upgradeToPremium error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upgrade to premium.'
    });
  }
};

exports.getSubscription = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'userId is required.'
      });
    }

    const requesterId = req.user && req.user._id ? req.user._id.toString() : null;
    const isOwner = requesterId === String(userId);
    const isAdmin = req.user && req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'You can only access your own subscription.'
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.'
      });
    }

    const normalized = normalizeSubscription(user);
    await markExpiredIfNeeded(user, normalized);

    return res.status(200).json({
      success: true,
      isPremium: normalized.isPremium,
      isExpired: normalized.isExpired,
      plan: normalized.plan,
      startDate: normalized.startDate,
      expirationDate: normalized.expirationDate
    });
  } catch (error) {
    console.error('getSubscription error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch subscription.'
    });
  }
};

exports.generateLearningRoadmap = async (req, res) => {
  try {
    const isPremium = !!(req.user && req.user.isPremium === true);

    if (!isPremium) {
      return res.status(403).json({
        success: false,
        code: 'PREMIUM_REQUIRED',
        title: 'Premium Feature',
        message: 'Unlock Smart Learning Assistant to automatically build your roadmap.',
        cta: 'Upgrade Now'
      });
    }

    const roadmap = generateLearningRoadmap(req.body || {});
    return res.status(200).json(roadmap);
  } catch (error) {
    const message = error && error.message ? error.message : 'Failed to generate roadmap.';
    return res.status(400).json({
      success: false,
      message
    });
  }
};
