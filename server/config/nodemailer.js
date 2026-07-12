const nodemailer = require('nodemailer');

console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS EXISTS:", !!process.env.EMAIL_PASS);

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  debug: true,
  logger: true
});

(async () => {
  try {
    console.log("VERIFY START");

    await transporter.verify();

    console.log("SMTP READY");
  } catch (err) {
    console.error("SMTP VERIFY ERROR");
    console.error(err);
  }
})();

module.exports = { transporter };