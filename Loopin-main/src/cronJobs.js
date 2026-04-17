const cron = require('node-cron');
const Habit = require('./models/Habit'); 

function startCronJobs() {
  // Reset streak every day at 00:00
  cron.schedule('0 0 * * *', async () => {
    try {
      const habits = await Habit.find({});
      for (let habit of habits) {
        const reset = await habit.resetStreakIfMissed();        
        await habit.save();

        if (reset) {
          console.log(`Habit "${habit.name}" streak reset!`);
          // Your friend's TODO: gửi thông báo push hoặc email cho user
        }
      }
    } catch (err) {
      console.error("Cron job error:", err);
    }
  });
}

module.exports = startCronJobs;