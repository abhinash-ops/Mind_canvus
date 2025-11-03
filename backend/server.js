const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const Post = require('./models/Post');
const path = require('path');
const fs = require('fs');

// Load env from .env if present; fallback to config.env for backward compatibility
(() => {
  const envPath = fs.existsSync(path.join(__dirname, '.env'))
    ? path.join(__dirname, '.env')
    : path.join(__dirname, 'config.env');
  require('dotenv').config({ path: envPath });
})();

const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const commentRoutes = require('./routes/comments');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// CORS configuration
const normalizeOrigin = (origin) => {
  if (!origin) return '';
  try {
    const url = new URL(origin);
    return `${url.protocol}//${url.host}`; // strip path/trailing slash
  } catch {
    return origin.replace(/\/$/, '');
  }
};

const buildAllowedOrigins = () => {
  if (process.env.NODE_ENV === 'production') {
    const envOrigins = (process.env.ALLOWED_ORIGINS || '').split(',')
      .map(s => normalizeOrigin(s.trim()))
      .filter(Boolean);
    return envOrigins.length ? envOrigins : [];
  }
  return ['http://localhost:5173', 'http://localhost:3000'];
};

const allowedOrigins = new Set(buildAllowedOrigins());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser tools
    const normalized = normalizeOrigin(origin);
    let hostname = '';
    try { hostname = new URL(origin).hostname; } catch {}
    const isAllowed = allowedOrigins.has(normalized) || /\.vercel\.app$/.test(hostname);
    callback(isAllowed ? null : new Error('Not allowed by CORS'), isAllowed);
  },
  credentials: true
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan('combined'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/comments', commentRoutes);
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'MindCanvus API is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Database connection
if (!process.env.MONGODB_URI) {
  console.error('Missing MONGODB_URI. Set it in backend/.env or backend/config.env');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    // Start the scheduler after DB connection
    cron.schedule('* * * * *', async () => {
      try {
        const postsToPublish = await Post.getScheduledPostsToPublish();
        for (const post of postsToPublish) {
          post.status = 'published';
          post.publishedAt = new Date();
          await post.save();
          console.log(`Published scheduled post: ${post._id}`);
        }
      } catch (err) {
        console.error('Error in scheduled post publisher:', err);
      }
    });
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

module.exports = app;
