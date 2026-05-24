const express = require('express');
const router = express.Router();
const promotionController = require('../controllers/promotionController');
const { protect } = require('../middleware/auth');

router.get('/eligible/:classId', protect, promotionController.getEligible);
router.get('/history/:studentId', protect, promotionController.getHistory);
router.get('/year/:year', protect, promotionController.getByYear);
router.post('/promote-one', protect, promotionController.promoteOne);
router.post('/promote-class', protect, promotionController.promoteClass);

module.exports = router;