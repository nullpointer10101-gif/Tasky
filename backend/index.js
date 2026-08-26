require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
// const bot = require('./bot'); // Uncomment when bot token is configured
const { startAutoApproveAI } = require('./autoApproveAI');
const { startMiningJob } = require('./jobs/updateMiningLevels');
const { startFakeLeaderboardJob } = require('./jobs/fakeLeaderboardJob');

const app = express();
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory tracker for active users (last 5 minutes)
global.onlineUsers = new Map();
app.use((req, res, next) => {
  let telegramId = req.body?.telegram_id || req.query?.telegram_id;
  
  if (!telegramId && req.path) {
    const match = req.path.match(/\/(\d{5,15})\b/);
    if (match) {
      telegramId = match[1];
    }
  }

  if (telegramId) {
    global.onlineUsers.set(telegramId.toString(), Date.now());
  }
  next();
});

// Cleanup old online users every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, time] of global.onlineUsers.entries()) {
    if (now - time > 5 * 60 * 1000) { // 5 minutes
      global.onlineUsers.delete(id);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3000;

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'Tasky Bot Backend is running', db: global.dbConnected ? 'connected' : 'disconnected' });
});

// Global Maintenance Middleware (Skip /api/admin)
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    return next();
  }

  // If DB is connected, check system_settings for maintenance
  if (global.dbConnected) {
    try {
      const { pool } = require('./db');
      const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'maintenance'");
      if (rows.length > 0 && rows[0].value.active) {
        return res.status(503).json({ error: 'MAINTENANCE_MODE', message: 'Tasky is currently under maintenance. We will be back shortly!' });
      }
    } catch (e) {
      console.error('Maintenance check error:', e.message);
    }
  }
  next();
});

// Upload Endpoint
const multer = require('multer');
const fs = require('fs');

const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir)
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

app.post('/api/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }
  // If behind a proxy like Railway, host might not be perfectly localhost:3000 but the url is relative enough.
  // Actually let's just return the absolute local or relative path
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ success: true, url });
});

// Routes
app.use('/api/users', require('./routes/users'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/referral', require('./routes/referral'));
app.use('/api/spin', require('./routes/spin'));
app.use('/api/swap', require('./routes/swap'));
app.use('/api/withdrawal', require('./routes/withdrawal'));
app.use('/api/mining', require('./routes/mining'));
app.use('/api/promo', require('./routes/promo'));
app.use('/api/gram', require('./routes/gram'));
app.use('/api/admin', require('./routes/admin'));

// Always start Express first — DB failure won't block the UI
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test UI: http://localhost:${PORT}/test.html`);
});

// Try DB init separately so crash doesn't kill the Express server
global.dbConnected = false;
initDB()
  .then(() => {
    global.dbConnected = true;
    console.log('Database connected and initialized.');
    // startAutoApproveAI(); // Disabled so tasks show up in Admin Panel
    startMiningJob();
    startFakeLeaderboardJob();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.warn('Server running without DB — API routes will fail until DB is available.');
  });
