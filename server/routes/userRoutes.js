const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.get('/profile', authenticate, userController.getProfile);
router.put('/profile', authenticate, userController.updateProfile);
router.post('/profile/upload', authenticate, upload.single('file'), userController.uploadProfilePicture);
router.get('/search', authenticate, userController.searchUsers);
router.get('/:userId', authenticate, userController.getUserById);

module.exports = router;
