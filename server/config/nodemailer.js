const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
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