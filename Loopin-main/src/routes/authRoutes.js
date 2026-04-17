const router = require('express').Router();
const { login, signup, getMe, logout } = require('../controllers/authController');
// Use destructuring to pull the 'protect' function out of the exported object
const { protect } = require('../middleware/authMiddleware');

// Public routes
router.post('/signup', signup);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes
// Passing 'protect' ensures Express receives a valid function callback
router.get('/me', protect, getMe); 

module.exports = router;