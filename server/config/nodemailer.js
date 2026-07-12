const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,   
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000  
});
  
transporter.verify((error) => {
  if (error) {
    console.error('❌ SMTP connection failed (production):', error.message);
  } else {
    console.log('✅ SMTP server is ready (production)');
  }
});


module.exports = { transporter };