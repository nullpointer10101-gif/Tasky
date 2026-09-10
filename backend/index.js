require('dotenv').config();

// Global crash protection to keep server always alive
process.on('uncaughtException', (err) => {
  console.error('[CRASH PREVENTION] Uncaught Exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRASH PREVENTION] Unhandled Rejection:', reason?.message || reason);
});

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db');
const bot = require('./bot');
const { startAutoApproveAI } = require('./autoApproveAI');
const { startMiningJob } = require('./jobs/updateMiningLevels');
const { startFakeLeaderboardJob } = require('./jobs/fakeLeaderboardJob');
const { startDepositWatcher } = require('./services/depositWatcher');
const { startAutoPayoutProcessor } = require('./services/autoPayoutService');

const app = express();
app.use(cors({
  origin: '*',
  allowedHeaders: ['Content-Type', 'Authorization', 'x-admin-password']
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory tracker for active users and recent logs
global.onlineUsers = new Map();
global.recentLogs = [];

const mapPathToAction = (path, method) => {
  if (path.includes('/register')) return 'Registered Account';
  if (path.includes('/checkin')) return 'Claimed Daily Check-in';
  if (path.includes('/spin/play')) return 'Played Spin Wheel';
  if (path.includes('/tasks/complete')) return 'Completed a Task';
  if (path.includes('/tasks') && method === 'GET') return 'Viewed Tasks List';
  if (path.includes('/mining/start')) return 'Started Mining Session';
  if (path.includes('/mining/claim')) return 'Claimed Mining Rewards';
  if (path.includes('/wallet/bind')) return 'Bound Wallet Address';
  if (path.includes('/gram/start-watch')) return 'Watching Gram Ad';
  if (path.includes('/gram/watch-ad')) return 'Watched Gram Ad';
  if (path.includes('/gram/claim')) return 'Claimed 0.02 GRAM Bounty';
  if (path.includes('/gram/save-address')) return 'Updated Gram Wallet';
  if (path.includes('/offerwall/claim')) return 'Completed Offerwall Task';
  if (path.includes('/upload')) return 'Uploaded Proof Image';
  return `Visited ${path}`;
};

app.use((req, res, next) => {
  let telegramId = req.body?.telegram_id || req.query?.telegram_id;

  if (!telegramId && req.path) {
    const match = req.path.match(/\/(\d{5,15})\b/);
    if (match) {
      telegramId = match[1];
    }
  }

  if (telegramId) {
    const action = mapPathToAction(req.path, req.method);
    const tidStr = telegramId.toString();

    // Always mark user as online immediately (so they show as active)
    global.onlineUsers.set(tidStr, {
      timestamp: Date.now(),
      lastAction: action
    });

    // Only log the action to recentLogs AFTER the response is sent
    // and only if it was a successful response (2xx). This prevents
    // false "Watched Gram Ad" entries from rate-limited / failed requests.
    res.on('finish', () => {
      const statusCode = res.statusCode;
      if (statusCode >= 200 && statusCode < 300) {
        const entry = {
          telegram_id: tidStr,
          action,
          timestamp: Date.now()
        };
        global.recentLogs.unshift(entry);
        if (global.recentLogs.length > 50) {
          global.recentLogs.pop();
        }
        // Update the lastAction to the confirmed successful action
        global.onlineUsers.set(tidStr, {
          timestamp: Date.now(),
          lastAction: action
        });
      }
    });
  }
  next();
});

// Cleanup old online users every minute
setInterval(() => {
  const now = Date.now();
  for (const [id, data] of global.onlineUsers.entries()) {
    const timestamp = typeof data === 'object' ? data.timestamp : data;
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutes
      global.onlineUsers.delete(id);
    }
  }
}, 60000);

const PORT = process.env.PORT || 3000;

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'Tasky Bot Backend is running', db: global.dbConnected ? 'connected' : 'disconnected' });
});
app.get('/api/health', (req, res) => {
  res.json({ status: 'Tasky Bot Backend is running', db: global.dbConnected ? 'connected' : 'disconnected' });
});

// TonConnect Manifest (Strictly required for Telegram @wallet, Tonkeeper, MyTonWallet)
app.get('/tonconnect-manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    url: 'https://tasky3.onrender.com',
    name: 'TASKY',
    iconUrl: 'https://tasky3.onrender.com/assets/tasky-coin-CftrDQ6_.jpg',
    termsOfUseUrl: 'https://tasky3.onrender.com',
    privacyPolicyUrl: 'https://tasky3.onrender.com'
  });
});

// Global Maintenance Middleware (Skip /api/admin) with 15s in-memory cache
let _lastMaintenanceCheck = 0;
let _cachedMaintenanceActive = false;

app.use(async (req, res, next) => {
  if (req.path.startsWith('/api/admin')) {
    return next();
  }

  const now = Date.now();
  if (global.dbConnected && now - _lastMaintenanceCheck > 15000) {
    _lastMaintenanceCheck = now;
    try {
      const { pool } = require('./db');
      const { rows } = await pool.query("SELECT value FROM system_settings WHERE key = 'maintenance'");
      _cachedMaintenanceActive = Boolean(rows.length > 0 && rows[0].value && rows[0].value.active);
    } catch (e) {
      console.error('Maintenance check error:', e.message);
    }
  }

  if (_cachedMaintenanceActive) {
    return res.status(503).json({ error: 'MAINTENANCE_MODE', message: 'Tasky is currently under maintenance. We will be back shortly!' });
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
app.use('/api/gram-currency', require('./routes/gram_currency'));
app.use('/api/ads/postback', require('./routes/postback'));
app.use('/api/postback', require('./routes/postback'));
app.use('/api/nft', require('./routes/nft'));
app.use('/api/offerwall', require('./routes/offerwall'));
app.use('/api/admin', require('./routes/admin'));

// Always start Express first — DB failure won't block the UI
// Serve Admin Panel Static Build directly from Backend (No Vercel deployment limit!)
const adminDistPath = fs.existsSync(path.join(__dirname, 'public/admin')) 
  ? path.join(__dirname, 'public/admin') 
  : path.join(__dirname, '../admin-frontend/dist');

if (fs.existsSync(adminDistPath)) {
  app.use('/admin', express.static(adminDistPath));
  app.get('/admin*', (req, res) => {
    res.sendFile(path.join(adminDistPath, 'index.html'));
  });
}

// Serve Miniapp Static Build directly from Backend (Bypasses Vercel 100/day limit!)
const miniappDistPath = fs.existsSync(path.join(__dirname, 'public/app')) 
  ? path.join(__dirname, 'public/app') 
  : path.join(__dirname, '../miniapp/dist');

if (fs.existsSync(miniappDistPath)) {
  app.use(express.static(miniappDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/admin') || req.path.startsWith('/uploads') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(miniappDistPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Test UI: http://localhost:${PORT}/test.html`);
  console.log(`Admin Panel Live: http://localhost:${PORT}/admin`);
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
    startDepositWatcher();
    startAutoPayoutProcessor();
  })
  .catch((err) => {
    console.error('Database connection failed:', err.message);
    console.warn('Server running without DB — API routes will fail until DB is available.');
  });
