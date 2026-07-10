const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { authenticate } = require('../middleware/auth');
const upload = require('../middleware/multer');

router.post('/upload', authenticate, upload.single('file'), fileController.uploadFile);

module.exports = router;