const mongoose = require('mongoose');

const HabitSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Habit name is required'],
    trim: true,
    maxlength: [100, 'Habit name cannot exceed 100 characters']
  },
  goal: {
    unit: { 
    type: String, 
    enum: ['times', 'minutes', 'hours'], 
    default: 'times' 
  },
  value: { 
    type: Number, 
    default: 1 
  }
},
 
  icon: {
    type: String,
    default: '✨'
  },
  color: {
    type: String,
    enum: ['blue', 'pink', 'yellow', 'purple', 'green'],
    default: 'blue'
  },
  streak: {
    type: Number,
    default: 0
  },
  lastCheckin: {
    type: Date,
    default: null
  },
  checkinHistory: [{
    date: {
      type: Date,
      required: true
    },
    completed: {
      type: Boolean,
      default: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isCheckedInToday: { 
    type: Boolean, 
    default: false 
  },
  reminderTime: { type: String },
  motivation: { type: String },
  checkInDates: [{
    type: String
  }]

});


// Method to check in for today
HabitSchema.methods.checkin = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const lastCheckinDate = this.lastCheckin ? new Date(this.lastCheckin) : null;
  if (lastCheckinDate) {
    lastCheckinDate.setHours(0, 0, 0, 0);
  }

  // Check if already checked in today
  if (lastCheckinDate && lastCheckinDate.getTime() === today.getTime()) {
    return { alreadyCheckedIn: true, streak: this.streak };
  }
  if (!this.checkInDates.includes(todayStr)) {
    this.checkInDates.push(todayStr);
  }

  // Check if streak continues (checked in yesterday)
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (lastCheckinDate && lastCheckinDate.getTime() === yesterday.getTime()) {
    this.streak += 1;
  } else if (!lastCheckinDate || lastCheckinDate.getTime() < yesterday.getTime()) {
    this.streak = 1; // Reset streak
  }

  this.lastCheckin = new Date();
  this.isCheckedInToday = true;
  this.checkinHistory.push({ date: new Date(), completed: true });

  return { alreadyCheckedIn: false, streak: this.streak };
};

// Check if checked in today
HabitSchema.methods.hasCheckedInToday = function() {  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (!this.lastCheckin) return false;
  
  const lastCheckinDate = new Date(this.lastCheckin);
  lastCheckinDate.setHours(0, 0, 0, 0);
  
  return today.getTime() === lastCheckinDate.getTime();
};
// Reset streak nếu bỏ lỡ ngày
HabitSchema.methods.resetStreakIfMissed = async function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!this.lastCheckin) return false;

  const lastCheckinDate = new Date(this.lastCheckin);
  lastCheckinDate.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  // Nếu ngày cuối cùng không phải hôm nay hoặc hôm qua → reset streak
  if (lastCheckinDate.getTime() < yesterday.getTime()) {
    this.streak = 0;
    this.isCheckedInToday = false;
    await this.save(); // QUAN TRỌNG: Lưu vào database
    return true;
  }
  return false;
};
HabitSchema.index({ reminderTime: 1 });

module.exports = mongoose.model('Habit', HabitSchema);
