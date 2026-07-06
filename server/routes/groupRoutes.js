const express = require('express');
const router = express.Router();
const groupController = require('../controllers/groupController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.put('/:chatId/image', authenticate, upload.single('file'), groupController.updateGroupImage);
router.post('/:chatId/members', authenticate, groupController.addMembers);
router.put('/:chatId/members/:memberId/promote', authenticate, groupController.promoteToAdmin);
router.put('/:chatId/members/:memberId/deactivate', authenticate, groupController.deactivateMember);

module.exports = router;