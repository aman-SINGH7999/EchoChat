const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { authenticate } = require('../middleware/auth');

router.put('/:messageId', authenticate, messageController.editMessage);
router.delete('/:messageId', authenticate, messageController.deleteMessage);
router.get('/:messageId/history', authenticate, messageController.getMessageHistory);
router.post('/:messageId/reactions', authenticate, messageController.toggleReaction); // NAYA

module.exports = router;