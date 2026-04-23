// ============================================
// routes/productRoutes.js - Product Routes
// ============================================
const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  addProduct,
  updateProductStage,
  getProduct,
  getAllProducts,
  getQRCode,
  getDashboardAnalytics,
  verifyBlockchainTransaction
} = require('../controllers/productController');

// === PUBLIC ROUTES (No auth required) ===
router.get('/track/:id', getProduct);                          // Track any product by ID
router.get('/qr/:id', getQRCode);                              // Get QR code
router.get('/verify/:txHash', verifyBlockchainTransaction);    // Verify blockchain tx

// === PRIVATE ROUTES (Auth required) ===
router.get('/all', protect, getAllProducts);                    // Get all products
router.get('/analytics/dashboard', protect, getDashboardAnalytics); // Dashboard stats

// Add product (Farmer and Admin only)
router.post('/add', protect, authorize('Farmer', 'Admin'), addProduct);

// Update stage (Farmer, Distributor, Retailer, Admin)
router.post('/update', protect,
  authorize('Farmer', 'Distributor', 'Retailer', 'Admin'),
  updateProductStage
);

// Get single product (authenticated users)
router.get('/:id', protect, getProduct);

module.exports = router;
