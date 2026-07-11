const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/register', authController.register);
router.post('/verify-registration-otp', authController.verifyRegistrationOTP);
router.post('/resend-registration-otp', authController.resendRegistrationOTP);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/verify-otp', authController.verifyOTP);
router.post('/reset-password', authController.resetPassword);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
