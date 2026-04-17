const router = require('express').Router();
const { 
  getHabits, 
  createHabit, 
  getHabit, 
  updateHabit, 
  deleteHabit, 
  checkinHabit,
  getHabitsByUser,
  getStats
} = require('../controllers/habitController');

const { protect: authMiddleware } = require('../middleware/authMiddleware');

// Admin Authorization Middleware
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
      next();
  } else {
      res.status(403).json({ success: false, message: "Access denied. Admins only." });
  }
};

// Protect all habit routes
router.use(authMiddleware);

// 1. Specific static-like routes (Must be first)
router.get('/stats', getStats);

// 2. Collection routes
router.route('/')
  .get(getHabits)
  .post(createHabit);

// 3. Admin-specific routes
router.get('/user/:userId', isAdmin, getHabitsByUser);
// 4. Instance routes (Parameterized)
router.route('/:id')
  .get(getHabit)
  .put(updateHabit)
  .delete(deleteHabit);

// 5. Action routes
router.post('/:id/checkin', checkinHabit);

module.exports = router;