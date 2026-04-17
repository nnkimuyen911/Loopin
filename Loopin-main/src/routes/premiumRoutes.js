const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { upgradeToPremium, getSubscription, generateLearningRoadmap } = require('../controllers/premiumController');

router.post('/upgrade-to-premium', protect, upgradeToPremium);
router.get('/subscription/:userId', protect, getSubscription);
router.post('/learning-roadmap', protect, generateLearningRoadmap);

module.exports = router;
