const express = require('express');
const mongoose = require('mongoose');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cookieParser());
const PORT = process.env.PORT || 3001;

// --- 1. MIDDLEWARE (Must be before Routes) ---
app.use(cors());
app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

// --- 2. API ROUTES ---
const authRoutes = require('./routes/authRoutes');
const habitRoutes = require('./routes/habitRoutes');
const userRoutes = require('./routes/userRoutes');
const leaderboardRoutes = require('./routes/leaderboardRoutes'); 
const friendshipRoutes = require('./routes/friendshipRoutes'); 
const adminRoutes = require('./routes/adminRoutes');
const messageRoutes = require('./routes/messageRoutes');
const premiumRoutes = require('./routes/premiumRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/habits', habitRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/friendships', friendshipRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api', premiumRoutes);
// --- 3. STATIC FILES & PAGES ---
app.use(express.static(path.join(__dirname, '../public')));

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../public/login.html')));
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, '../public/signup.html')));
app.get('/home', (req, res) => res.sendFile(path.join(__dirname, '../public/home.html')));
app.get('/premium-payment', (req, res) => res.sendFile(path.join(__dirname, '../public/premium-payment.html')));
app.get('/ranking', (req, res) => res.sendFile(path.join(__dirname, '../public/ranking.html')));
app.get('/friends', (req, res) => res.sendFile(path.join(__dirname, '../public/friends.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../public/adminhome.html')));
app.get('/u/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/friend-profile.html')));
app.get('/chat/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/chat.html')));
// --- 4. SERVICES & DATABASE ---
require('./services/notificationService');
const startCronJobs = require('./cronJobs');
startCronJobs();
// Connect to MongoDB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📱 Open http://localhost:${PORT} in your browser`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('⚠️  Starting server without database...');
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (No DB)`);
    });
  });
// Removed: duplicate /api/test-notification route that was missing webpush import.
// Use POST /api/users/test-notification instead (defined in userRoutes.js).