const { resend } = require('../config/resend');


const sendMailWithRetry = async (mailOptions, retries = 2) => {
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: process.env.EMAIL_FROM,
        to: mailOptions.to,
        subject: mailOptions.subject,
        html: mailOptions.html
      });
      if (error) throw new Error(error.message);
      return true;
    } catch (error) {
      console.error(`Email attempt ${attempt} failed:`, error.message);
      if (attempt === retries + 1) return false;
      await new Promise(res => setTimeout(res, 1000 * attempt));
    }
  }
};

const sendOTPEmail = async (email, otp) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset OTP',
      html: `
        <h2>Password Reset Request</h2>
        <p>Your OTP for password reset is:</p>
        <h3>${otp}</h3>
        <p>This OTP is valid for 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `
    };

    return sendMailWithRetry(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const sendWelcomeEmail = async (email, username) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Chat App',
      html: `
        <h2>Welcome, ${username}!</h2>
        <p>Thank you for registering with our Chat Application.</p>
        <p>You can now login and start chatting with your friends.</p>
      `
    };

    return sendMailWithRetry(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

const sendRegistrationOTPEmail = async (email, otp, username) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Verify Your Email - Chat App',
      html: `
        <h2>Welcome, ${username}!</h2>
        <p>Please verify your email. Your OTP is:</p>
        <h3>${otp}</h3>
        <p>This OTP is valid for 10 minutes.</p>
      `
    };
    return sendMailWithRetry(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};



module.exports = {
  sendOTPEmail,
  sendWelcomeEmail,
  sendRegistrationOTPEmail
};
