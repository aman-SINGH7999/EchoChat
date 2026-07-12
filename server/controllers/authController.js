const { User, OTP } = require('../models');
const { hashPassword, comparePassword } = require('../utils/password');
const { generateToken } = require('../utils/jwt');
const { sendOTPEmail, sendWelcomeEmail, sendRegistrationOTPEmail  } = require('../utils/email');

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const register = async (req, res) => {
  try {
    const { email, password, confirmPassword, username } = req.body;

    // Validation
    if (!email || !password || !confirmPassword || !username) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const existingUsername = await User.findOne({ where: { username } });
    if (existingUsername) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() +  10 * 60 * 1000);

    await OTP.destroy({ where: { email } });
    await OTP.create({ email, otp, expires_at: expiresAt });

    console.log("REGISTER HIT");
    console.log("EMAIL:", email);
    console.log("USERNAME:", username);

    const emailSent = await sendRegistrationOTPEmail(email, otp, username);

    console.log("EMAIL SENT RESULT:", emailSent);

    if (!emailSent) {
      await OTP.destroy({ where: { email } });
      return res.status(502).json({ message: 'Failed to send OTP email. Please try again in a moment.' });
    }
   
    res.status(201).json({
      message: 'OTP sent to your email. Please verify to complete registration.'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


// Registration after otp verify
const verifyRegistrationOTP = async (req, res) => {
  try {
    const { email, otp, username, password } = req.body;

    if (!email || !otp || !username || !password) {
      return res.status(400).json({ message: 'Email, OTP, username and password are required' });
    }

    const otpRecord = await OTP.findOne({ where: { email, otp } });
    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > otpRecord.expires_at) {
      await otpRecord.destroy();
      return res.status(400).json({ message: 'OTP expired. Please register again.' });
    }

  
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      await otpRecord.destroy();
      return res.status(409).json({ message: 'User already exists' });
    }

    
    const hashedPassword = await hashPassword(password);
    const user = await User.create({
      email,
      username,
      password: hashedPassword,
      isOnline: true,
      lastSeen: new Date()
    });

    await otpRecord.destroy();
    await sendWelcomeEmail(email, username);

    const token = generateToken(user.id, user.email);

    res.status(201).json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userprofile: user.userprofile
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const resendRegistrationOTP = async (req, res) => {
  try {
    const { email, username } = req.body;
    if (!email || !username) {
      return res.status(400).json({ message: 'Email and username are required' });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await OTP.destroy({ where: { email } });
    await OTP.create({ email, otp, expires_at: expiresAt });

    console.log("REGISTER HIT");
    console.log("EMAIL:", email);
    console.log("USERNAME:", username);

    const emailSent = await sendRegistrationOTPEmail(email, otp, username);

    console.log("EMAIL SENT RESULT:", emailSent);

    if (!emailSent) {
      await OTP.destroy({ where: { email } });
      return res.status(502).json({ message: 'Failed to send OTP email. Please try again in a moment.' });
    }
   
    res.status(201).json({
      message: 'OTP resent to your email'
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Update last seen and online status
    await user.update({ isOnline: true, lastSeen: new Date() });

    const token = generateToken(user.id, user.email);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        userprofile: user.userprofile
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete existing OTP
    await OTP.destroy({ where: { email } });

    // Create new OTP
    await OTP.create({
      email,
      otp,
      expires_at: expiresAt
    });

    // Send OTP email
    const emailSent = await sendOTPEmail(email, otp);

    if (!emailSent) {
      await OTP.destroy({ where: { email } });
      return res.status(502).json({ message: 'Failed to send OTP email. Please try again in a moment.' });
    }
   
    res.status(201).json({
      message: 'OTP sent to your email'
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpRecord = await OTP.findOne({
      where: { email, otp, is_verified: false }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (new Date() > otpRecord.expires_at) {
      await otpRecord.destroy();
      return res.status(400).json({ message: 'OTP expired' });
    }

    await otpRecord.update({ is_verified: true });

    res.json({ message: 'OTP verified successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, password, confirmPassword } = req.body;

    if (!email || !password || !confirmPassword) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    const otpRecord = await OTP.findOne({
      where: { email, is_verified: true }
    });

    if (!otpRecord) {
      return res.status(400).json({ message: 'Please verify OTP first' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const hashedPassword = await hashPassword(password);
    await user.update({ password: hashedPassword });
    await otpRecord.destroy();

    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const logout = async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ isOnline: false, lastSeen: new Date() });
    }
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};


module.exports = {
  register,
  login,
  forgotPassword,
  verifyOTP,
  resetPassword,
  logout,
  verifyRegistrationOTP,
  resendRegistrationOTP
}