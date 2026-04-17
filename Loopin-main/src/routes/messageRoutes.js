const router = require('express').Router();
const { protect } = require('../middleware/authMiddleware');
const { getThread, sendMessage } = require('../controllers/messageController');

router.use(protect);

router.get('/thread/:otherUserId', getThread);
router.post('/thread/:otherUserId', sendMessage);

module.exports = router;

