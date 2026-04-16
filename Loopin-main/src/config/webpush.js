const webpush = require('web-push');
require('dotenv').config();

// Init VAPID credentials một lần duy nhất cho toàn app
webpush.setVapidDetails(
  `mailto:${process.env.EMAIL_USER || 'admin@loopin.app'}`,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

module.exports = webpush;
