const express = require('express');
const router = express.Router();
const { getAdminDashboard, deleteUser } = require('../controllers/adminController');
const {protect} = require('../middleware/authMiddleware');

const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ success: false, message: "Access denied. Admins only." });
    }
};

// All routes here require being logged in AND being an admin
router.use(protect, isAdmin);

router.get('/dashboard', getAdminDashboard);
/*router.delete('/user/:id', deleteUser); */ // Uncomment if you want to enable user deletion (with caution!)

module.exports = router;