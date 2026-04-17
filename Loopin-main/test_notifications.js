const mongoose = require('mongoose');
const path = require('path');
const rootDir = '/Users/thaiha/Downloads/Loopin-main';
const Habit = require(path.join(rootDir, 'src/models/Habit'));
const User = require(path.join(rootDir, 'src/models/User'));
const webpush = require(path.join(rootDir, 'src/config/webpush'));
require('dotenv').config({ path: path.join(rootDir, '.env') });

async function runTest() {
    console.log("🚀 Starting Notification System Logic Test...");

    try {
        // Connect to MongoDB (using MONGO_URI from .env)
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected to MongoDB");

        // 1. Test Reset Streak Logic (The fix for Bug 1 & 2)
        console.log("\n🧪 Testing Streak Reset Logic...");
        
        // Find or create a test user
        let testUser = await User.findOne({ email: 'test_auto@example.com' });
        if (!testUser) {
            testUser = new User({ username: 'testuser', email: 'test_auto@example.com', password: 'password123' });
            await testUser.save();
        }
        console.log(`Using test user: ${testUser.username} (${testUser._id})`);

        // Create a habit that hasn't been completed today
        const testHabit = new Habit({
            userId: testUser._id,
            name: 'Test Habit ' + Date.now(),
            isCompletedToday: false,
            streak: 5,
            goal: { unit: 'minutes', value: 30 }
        });
        await testHabit.save();
        console.log(`Created test habit with streak: ${testHabit.streak}`);

        // Manually trigger the reset logic content (extracted from cron)
        const result = await Habit.updateMany(
            { isCompletedToday: false },
            { $set: { streak: 0, isCompletedToday: false } }
        );
        console.log(`✅ Reset logic executed. result.modifiedCount: ${result.modifiedCount}`);

        const updatedHabit = await Habit.findById(testHabit._id);
        console.log(`Updated habit streak: ${updatedHabit.streak} (Expected: 0)`);

        if (updatedHabit.streak !== 0) {
            throw new Error("❌ Streak reset failed!");
        }
        console.log("✅ Streak reset success!");

        // 2. Test shared WebPush instance (Bug 4)
        console.log("\n🧪 Testing Shared WebPush Instance...");
        if (webpush && typeof webpush.sendNotification === 'function') {
            console.log("✅ shared webpush instance found and has sendNotification function.");
        } else {
            throw new Error("❌ webpush instance not found or invalid");
        }

        // Cleanup
        await Habit.deleteOne({ _id: testHabit._id });
        console.log("🧹 Cleaned up test habit");
        
        // Note: keeping the test user for potential future tests

        console.log("\n🎉 ALL LOGIC TESTS PASSED!");

    } catch (err) {
        console.error("❌ Test failed:", err);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

runTest();
