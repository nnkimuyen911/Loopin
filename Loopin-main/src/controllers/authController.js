const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Habit = require('../models/Habit');

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// Generate JWT Token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

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

// @desc    Register new user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username, email and password'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: existingUser.email === email 
          ? 'Email already registered' 
          : 'Username already taken'
      });
    }

    // Create user
    const user = await User.create({
      username,
      email,
      password
    });

    // Generate token
    const token = generateToken(user._id);

    // Align signup session initialization with login flow.
    res.cookie('loopin_token', token, getCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Account created successfully! 🎉',
      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        },
        token
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating account',
      error: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1. Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // 2. Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 3. Check password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // 4. Generate token
    const token = generateToken(user._id);

  // 5. SET UP COOKIE
  // The token will be sent implicitly in the 'Set-Cookie' Header
  res.cookie('loopin_token', token, getCookieOptions());

// 6. Response to Client — returns the token so the frontend can store it in localStorage
res.status(200).json({
  success: true,
  message: 'Welcome back! 👋',
  data: {
    token,  // Fix: frontend needs this token to call APIs via the Authorization header
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  }
});
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: error.message
    });
  }
};
// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    const isPetHidden = await getPetHiddenStatus(req.user._id);
    
    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user.toObject(),
          isPetHidden
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching user data'
    });
  }
};

// @desc    Logout user (client-side token removal)
// @route   POST /api/auth/logout
// @access  Public
exports.logout = (req, res) => {
  res.clearCookie('loopin_token');
  res.status(200).json({ success: true, message: 'Logged out successfully' });
};
