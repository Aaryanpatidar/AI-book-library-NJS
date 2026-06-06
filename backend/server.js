
require("dotenv").config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const path = require('path');
const rateLimit = require('express-rate-limit');


const authRoutes = require('./routes/auth');
const bookRoutes = require('./routes/books');
const chatRoutes = require('./routes/chat');


const app = express();

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000, 
  max: 20,
  message: { success: false, message: 'Too many chat requests. Please slow down.' },
});

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "https://ai-book-library.netlify.app"
];

app.use(cors({
  origin: function (origin, callback) {
    console.log("Request Origin:", origin);

    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.log("Blocked by CORS:", origin);
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(globalLimiter);

app.use(
  '/uploads',
  express.static(path.join(__dirname, process.env.UPLOAD_DIR || 'uploads'))
);

app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chat', chatLimiter, chatRoutes);

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const PORT = parseInt(process.env.PORT) || 5000;

mongoose
  .connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`AI Book Library API ready`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

module.exports = app;
