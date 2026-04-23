// ============================================
// routes/authRoutes.js - Authentication Routes
// ============================================
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  register,
  login,
  getMe,
  getWalletInfo,
  getAllUsers
} = require('../controllers/authController');

// Public routes
router.post('/register', register);      // POST /api/auth/register
router.post('/login', login);            // POST /api/auth/login

// Private routes (require valid JWT)
router.get('/me', protect, getMe);                           // GET /api/auth/me
router.get('/wallet', protect, getWalletInfo);               // GET /api/auth/wallet

// Admin only routes
router.get('/users', protect, authorize('Admin'), getAllUsers); // GET /api/auth/users

module.exports = router;
