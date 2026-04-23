// ============================================
// controllers/productController.js - Product Logic
// ============================================
const Product = require('../models/Product');
const User = require('../models/User');
const stellarService = require('../services/stellarService');
const QRCode = require('qrcode');

/**
 * @route   POST /api/products/add
 * @desc    Add a new product + create blockchain wallet
 * @access  Private (Farmer, Admin)
 */
const addProduct = async (req, res) => {
  try {
    const {
      productId, name, category, origin, description,
      quantity, unit, pricePerUnit, expiryDate
    } = req.body;

    // Validate required fields
    if (!productId || !name || !origin || !quantity) {
      return res.status(400).json({
        success: false,
        message: 'Required fields: productId, name, origin, quantity'
      });
    }

    // Check if product ID already exists
    const existing = await Product.findOne({ productId: productId.toUpperCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: `Product ID '${productId}' already exists. Choose a unique ID.`
      });
    }

    // Get user's private key for blockchain transaction
    const userWithKey = await User.findById(req.user._id).select('+stellarPrivateKey');

    if (!userWithKey.stellarPrivateKey) {
      return res.status(400).json({
        success: false,
        message: 'No Stellar wallet found for your account.'
      });
    }

    // === BLOCKCHAIN: Record product creation ===
    let blockchainResult = null;
    try {
      blockchainResult = await stellarService.recordTrackingEvent(
        userWithKey.stellarPrivateKey,
        productId.toUpperCase(),
        'Harvested',
        origin
      );
      console.log(`⛓️  Product ${productId} recorded on blockchain`);
    } catch (blockchainError) {
      console.warn(`⚠️  Blockchain record failed: ${blockchainError.message}`);
      // Continue even if blockchain fails (graceful degradation)
    }

    // === GENERATE QR CODE ===
    const qrData = JSON.stringify({
      productId: productId.toUpperCase(),
      name,
      origin,
      trackUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}?track=${productId.toUpperCase()}`
    });

    let qrCode = null;
    try {
      qrCode = await QRCode.toDataURL(qrData, {
        width: 200,
        margin: 2,
        color: { dark: '#00E5FF', light: '#0A0A1A' } // Cyber theme colors
      });
    } catch (qrError) {
      console.warn('QR generation failed:', qrError.message);
    }

    // === CREATE PRODUCT IN DATABASE ===
    const product = await Product.create({
      productId: productId.toUpperCase(),
      name,
      category: category || 'Other',
      origin,
      description: description || '',
      quantity: parseFloat(quantity),
      unit: unit || 'kg',
      pricePerUnit: parseFloat(pricePerUnit) || 0,
      currentStage: 'Harvested',
      currentLocation: origin,
      createdBy: req.user._id,
      createdByUsername: req.user.username,
      stellarPublicKey: userWithKey.stellarPublicKey,
      stellarPrivateKey: userWithKey.stellarPrivateKey,
      qrCode,
      expiryDate: expiryDate || null,
      // Add initial tracking event
      trackingHistory: [{
        stage: 'Harvested',
        location: origin,
        updatedBy: req.user._id,
        updatedByRole: req.user.role,
        updatedByUsername: req.user.username,
        notes: `Product created by ${req.user.fullName}`,
        blockchainTxHash: blockchainResult ? blockchainResult.txHash : null,
        blockchainMemo: blockchainResult ? blockchainResult.fullMemo : null,
        txStatus: blockchainResult ? 'Confirmed' : 'Pending',
        timestamp: new Date()
      }]
    });

    res.status(201).json({
      success: true,
      message: `Product '${name}' added successfully!`,
      product: {
        ...product.toObject(),
        stellarPrivateKey: undefined // Never send private key to frontend
      },
      blockchain: blockchainResult
    });

  } catch (error) {
    console.error('Add product error:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({
      success: false,
      message: `Failed to add product: ${error.message}`
    });
  }
};

/**
 * @route   POST /api/products/update
 * @desc    Update product stage in supply chain + record on blockchain
 * @access  Private (Farmer, Distributor, Retailer)
 */
const updateProductStage = async (req, res) => {
  try {
    const { productId, stage, location, notes, temperature } = req.body;

    if (!productId || !stage || !location) {
      return res.status(400).json({
        success: false,
        message: 'Required: productId, stage, location'
      });
    }

    // Valid stage transitions
    const stageOrder = ['Harvested', 'Processing', 'Packaged', 'In Transit', 'Warehouse', 'Retailer', 'Delivered'];

    if (!stageOrder.includes(stage)) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage. Valid stages: ${stageOrder.join(', ')}`
      });
    }

    // Find the product
    const product = await Product.findOne({ productId: productId.toUpperCase() }).select('+stellarPrivateKey');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `Product '${productId}' not found. Check the product ID.`
      });
    }

    // Check if already delivered
    if (product.currentStage === 'Delivered') {
      return res.status(400).json({
        success: false,
        message: 'This product has already been delivered. No further updates allowed.'
      });
    }

    // Validate stage progression (can't go backward)
    const currentIndex = stageOrder.indexOf(product.currentStage);
    const newIndex = stageOrder.indexOf(stage);

    if (newIndex <= currentIndex) {
      return res.status(400).json({
        success: false,
        message: `Invalid stage progression. Current: '${product.currentStage}'. Cannot go back to '${stage}'.`
      });
    }

    // Get user private key for blockchain transaction
    const userWithKey = await User.findById(req.user._id).select('+stellarPrivateKey');

    // === BLOCKCHAIN: Record this tracking event ===
    let blockchainResult = null;
    try {
      blockchainResult = await stellarService.recordTrackingEvent(
        userWithKey.stellarPrivateKey || product.stellarPrivateKey,
        productId.toUpperCase(),
        stage,
        location
      );
      console.log(`⛓️  Stage update recorded on blockchain: ${stage}`);
    } catch (blockchainError) {
      console.warn(`⚠️  Blockchain failed: ${blockchainError.message}`);
    }

    // === UPDATE DATABASE ===
    // Create tracking event
    const trackingEvent = {
      stage,
      location,
      updatedBy: req.user._id,
      updatedByRole: req.user.role,
      updatedByUsername: req.user.username,
      notes: notes || '',
      temperature: temperature || null,
      blockchainTxHash: blockchainResult ? blockchainResult.txHash : null,
      blockchainMemo: blockchainResult ? blockchainResult.fullMemo : null,
      txStatus: blockchainResult ? 'Confirmed' : 'Pending',
      timestamp: new Date()
    };

    // Push event to tracking history
    product.trackingHistory.push(trackingEvent);
    product.currentStage = stage;
    product.currentLocation = location;

    await product.save();

    res.json({
      success: true,
      message: `Product updated to '${stage}' successfully!`,
      product: {
        productId: product.productId,
        name: product.name,
        currentStage: product.currentStage,
        currentLocation: product.currentLocation
      },
      trackingEvent,
      blockchain: blockchainResult
    });

  } catch (error) {
    console.error('Update stage error:', error.message);
    res.status(500).json({
      success: false,
      message: `Failed to update stage: ${error.message}`
    });
  }
};

/**
 * @route   GET /api/products/:id
 * @desc    Get full product details + tracking history
 * @access  Public (anyone can track)
 */
const getProduct = async (req, res) => {
  try {
    const productId = req.params.id.toUpperCase();

    const product = await Product.findOne({ productId })
      .populate('createdBy', 'username fullName role email');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: `No product found with ID '${productId}'. Please check the ID and try again.`
      });
    }

    // Optionally fetch blockchain transaction history
    let blockchainHistory = [];
    if (product.stellarPublicKey) {
      try {
        const txResult = await stellarService.getTransactionHistory(product.stellarPublicKey, 20);
        blockchainHistory = txResult.transactions || [];
      } catch (err) {
        console.warn('Could not fetch blockchain history:', err.message);
      }
    }

    res.json({
      success: true,
      product: {
        ...product.toObject(),
        stellarPrivateKey: undefined  // Never expose private key
      },
      blockchainHistory
    });

  } catch (error) {
    console.error('Get product error:', error.message);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve product: ${error.message}`
    });
  }
};

/**
 * @route   GET /api/products/all
 * @desc    Get all products with optional filters
 * @access  Private
 */
const getAllProducts = async (req, res) => {
  try {
    const { stage, location, search, page = 1, limit = 20 } = req.query;

    // Build filter query
    let filter = { isActive: true };

    if (stage) filter.currentStage = stage;
    if (location) filter.currentLocation = { $regex: location, $options: 'i' };
    if (search) {
      filter.$or = [
        { productId: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { origin: { $regex: search, $options: 'i' } }
      ];
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .select('-stellarPrivateKey -trackingHistory')  // Exclude heavy fields for list view
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Calculate analytics
    const analytics = await Product.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$currentStage',
          count: { $sum: 1 }
        }
      }
    ]);

    const stageCounts = {};
    analytics.forEach(item => { stageCounts[item._id] = item.count; });

    res.json({
      success: true,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      products,
      analytics: {
        total,
        byStage: stageCounts,
        delivered: stageCounts['Delivered'] || 0,
        inTransit: stageCounts['In Transit'] || 0,
        harvested: stageCounts['Harvested'] || 0
      }
    });

  } catch (error) {
    console.error('Get all products error:', error.message);
    res.status(500).json({
      success: false,
      message: `Failed to retrieve products: ${error.message}`
    });
  }
};

/**
 * @route   GET /api/products/qr/:id
 * @desc    Get QR code for a product
 * @access  Public
 */
const getQRCode = async (req, res) => {
  try {
    const product = await Product.findOne({
      productId: req.params.id.toUpperCase()
    }).select('qrCode productId name');

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Regenerate QR if missing
    if (!product.qrCode) {
      const qrData = JSON.stringify({ productId: product.productId, name: product.name });
      product.qrCode = await QRCode.toDataURL(qrData);
      await product.save();
    }

    res.json({
      success: true,
      productId: product.productId,
      name: product.name,
      qrCode: product.qrCode
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/products/analytics/dashboard
 * @desc    Get dashboard analytics
 * @access  Private
 */
const getDashboardAnalytics = async (req, res) => {
  try {
    const [stageAnalytics, categoryAnalytics, recentProducts, totalProducts] = await Promise.all([
      // Count by stage
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$currentStage', count: { $sum: 1 } } }
      ]),
      // Count by category
      Product.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      // Recent 5 products
      Product.find({ isActive: true })
        .select('-stellarPrivateKey -trackingHistory -qrCode')
        .sort({ createdAt: -1 })
        .limit(5),
      // Total count
      Product.countDocuments({ isActive: true })
    ]);

    // Get network status
    const networkStatus = await stellarService.getNetworkStatus();

    res.json({
      success: true,
      analytics: {
        totalProducts,
        byStage: stageAnalytics.reduce((acc, cur) => {
          acc[cur._id] = cur.count;
          return acc;
        }, {}),
        byCategory: categoryAnalytics.reduce((acc, cur) => {
          acc[cur._id] = cur.count;
          return acc;
        }, {}),
        recentProducts,
        stellar: networkStatus
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/products/verify/:txHash
 * @desc    Verify a blockchain transaction
 * @access  Public
 */
const verifyBlockchainTransaction = async (req, res) => {
  try {
    const result = await stellarService.verifyTransaction(req.params.txHash);
    res.json({ success: true, ...result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  addProduct,
  updateProductStage,
  getProduct,
  getAllProducts,
  getQRCode,
  getDashboardAnalytics,
  verifyBlockchainTransaction
};
