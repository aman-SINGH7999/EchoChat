const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});
  
transporter.verify((error) => {
  if (error) {
    console.error(error);
  } else {
    console.log('SMTP OK');
  }
});

module.exports = { transporter };