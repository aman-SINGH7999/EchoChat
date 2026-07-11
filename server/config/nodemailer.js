const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,          
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  pool: true,             
  maxConnections: 3,
  maxMessages: 50,
  connectionTimeout: 15000,   
  greetingTimeout: 15000,
  socketTimeout: 20000
});

  
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ SMTP connection failed:', error.message);
    } else {
      console.log('✅ SMTP server is ready to send emails');
    }
  });

module.exports = { transporter };