const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');

// Chat room routes
router.post('/private-chat', authenticate, chatController.createPrivateChat);
router.post('/group-chat', authenticate, chatController.createGroupChat);
router.get('/', authenticate, chatController.getChats);
router.get('/:chatId', authenticate, chatController.getChat);

// Message routes
router.get('/:chatId/messages', authenticate, chatController.getMessages);
router.post('/:chatId/messages', authenticate, chatController.sendMessage);
router.delete('/messages/:messageId', authenticate, chatController.deleteMessage);

// Reaction routes
router.post('/messages/:messageId/reactions', authenticate, chatController.addReaction);

module.exports = router;
