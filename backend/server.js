// ============================================
// server.js - Main Express Server
// Blockchain-Based Supply Chain Tracking System
// ============================================
require('dotenv').config(); // Load .env variables FIRST

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// ============================================
// Connect to MongoDB
// ============================================
connectDB();

// ============================================
// Middleware
// ============================================

// CORS - Allow frontend to communicate with backend
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Request Logger (Simple)
// ============================================
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.url}`);
  next();
});

// ============================================
// API Routes
// ============================================
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));

// ============================================
// Health Check Endpoint
// ============================================
app.get('/api/health', async (req, res) => {
  const stellarService = require('./services/stellarService');
  const networkStatus = await stellarService.getNetworkStatus();

  res.json({
    status: 'OK',
    message: 'Supply Chain API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    stellar: networkStatus,
    version: '1.0.0'
  });
});

// ============================================
// Welcome Route
// ============================================
app.get('/', (req, res) => {
  res.json({
    message: '🌟 Blockchain Supply Chain API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/health',
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        wallet: 'GET /api/auth/wallet'
      },
      products: {
        add: 'POST /api/products/add',
        update: 'POST /api/products/update',
        getAll: 'GET /api/products/all',
        getOne: 'GET /api/products/:id',
        track: 'GET /api/products/track/:id',
        qr: 'GET /api/products/qr/:id',
        analytics: 'GET /api/products/analytics/dashboard',
        verify: 'GET /api/products/verify/:txHash'
      }
    }
  });
});

// ============================================
// 404 Handler
// ============================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route '${req.method} ${req.url}' not found.`
  });
});

// ============================================
// Global Error Handler
// ============================================
app.use((err, req, res, next) => {
  console.error('❌ Unhandled Error:', err.stack);

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// ============================================
// Start Server
// ============================================
app.listen(PORT, () => {
  console.log('\n================================================');
  console.log('  🚀 Supply Chain Tracking System - STARTED');
  console.log('================================================');
  console.log(`  🌐 Server:    http://localhost:${PORT}`);
  console.log(`  🌿 MongoDB:   ${process.env.MONGODB_URI}`);
  console.log(`  ⭐ Stellar:   ${process.env.STELLAR_NETWORK || 'TESTNET'}`);
  console.log(`  🔧 Mode:      ${process.env.NODE_ENV || 'development'}`);
  console.log('================================================\n');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err.message);
  // In production, gracefully shut down:
  // server.close(() => process.exit(1));
});

module.exports = app;
