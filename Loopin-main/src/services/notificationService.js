const webpush = require('../config/webpush'); // Bug 4 fix: dùng shared instance
require('dotenv').config();
const cron = require('node-cron');
const Habit = require('../models/Habit');
const User = require('../models/User');
const { sendMail } = require('../helpers/mail.helper');
const { emailTemplates } = require('../helpers/emailTemplate.helper');

// Helper: Gửi thông báo song song để không chặn Event Loop
async function notifyUser(user, title, body, emailContent = null) {
  const tasks = [];
  if (user.subscription) {
    tasks.push(webpush.sendNotification(user.subscription, JSON.stringify({ title, body, icon: '/icon.png' })));
  }
  if (user.email) {
    // Nếu có emailContent (HTML), dùng nó; nếu không dùng body (plain text)
    const subject = emailContent ? emailContent.subject : title;
    const html = emailContent ? emailContent.html : body;
    tasks.push(sendMail(user.email, subject, html));
  }
  return Promise.allSettled(tasks); // Chạy song song cả Push và Email
}

module.exports.notifyUser = notifyUser;

// 1. Nhắc nhở theo giờ (Chỉ lấy các Habit cần nhắc vào đúng phút này)
cron.schedule('* * * * *', async () => {
  const currentTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  console.log(`[Cron] ⏱ Per-minute check at ${currentTime}`);
  
  try {
    const habits = await Habit.find({ reminderTime: currentTime }).lean();
    console.log(`[Cron] 🔔 Found ${habits.length} habit(s) to remind at ${currentTime}`);
    
    await Promise.all(habits.map(async (habit) => {
      const user = await User.findById(habit.userId).lean();
      if (user) {
        console.log(`[Cron] 📧 Notifying ${user.email} for habit: ${habit.name}`);
        await notifyUser(
          user, 
          'Loopin Reminder', 
          `It's time for: ${habit.name}!`,
          emailTemplates.habitReminder(habit.name)
        );
      }
    }));
  } catch (err) {
    console.error('Error in per-minute cron:', err);
  }
});


// 2. Cảnh báo mất Streak lúc 22:00
cron.schedule('0 22 * * *', async () => {
  try {
    const habits = await Habit.find({ isCompletedToday: false }).lean();
    await Promise.all(habits.map(async (habit) => {
      const user = await User.findById(habit.userId).lean();
      if (user) {
        await notifyUser(
          user, 
          'Streak Warning!', 
          `Don't forget ${habit.name}, or you'll lose your streak!`,
          emailTemplates.streakWarning(habit.name)
        );
      }
    }));
  } catch (err) {
    console.error('Error in warning cron:', err);
  }
});

// 3. Reset Streak lúc 23:59 (Bug 1 fix: đúng tên biến; Bug 2 fix: updateMany 1 lần thay vì loop + double save)
cron.schedule('59 23 * * *', async () => {
  try {
    const result = await Habit.updateMany(
      { isCompletedToday: false },
      { $set: { streak: 0, isCompletedToday: false } }
    );
    console.log(`Reset ${result.modifiedCount} streaks.`);
  } catch (err) {
    console.error('Error in reset cron:', err);
  }
});