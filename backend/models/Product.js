// ============================================
// models/Product.js - Product & Tracking Schema
// ============================================
const mongoose = require('mongoose');

// ============================================
// Tracking Event Sub-Schema
// Embedded in Product for fast retrieval
// ============================================
const trackingEventSchema = new mongoose.Schema({
  // Supply chain stage
  stage: {
    type: String,
    enum: ['Harvested', 'Processing', 'Packaged', 'In Transit', 'Warehouse', 'Retailer', 'Delivered'],
    required: true
  },

  // Physical location at this stage
  location: {
    type: String,
    required: true,
    trim: true
  },

  // Who performed this update
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Role of the person who updated
  updatedByRole: {
    type: String,
    required: true
  },

  // Username for quick display
  updatedByUsername: {
    type: String,
    required: true
  },

  // Additional notes
  notes: {
    type: String,
    trim: true,
    default: ''
  },

  // Temperature (for cold chain tracking)
  temperature: {
    type: String,
    default: null
  },

  // Blockchain transaction hash for this update
  blockchainTxHash: {
    type: String,
    default: null
  },

  // Blockchain memo stored in the transaction
  blockchainMemo: {
    type: String,
    default: null
  },

  // Transaction status on blockchain
  txStatus: {
    type: String,
    enum: ['Pending', 'Confirmed', 'Failed'],
    default: 'Pending'
  },

  // When this event occurred
  timestamp: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// ============================================
// Main Product Schema
// ============================================
const productSchema = new mongoose.Schema({
  // Unique product identifier (e.g., PROD-2024-001)
  productId: {
    type: String,
    required: [true, 'Product ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },

  // Product name
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },

  // Category of product
  category: {
    type: String,
    enum: ['Grains', 'Vegetables', 'Fruits', 'Dairy', 'Meat', 'Seafood', 'Packaged', 'Other'],
    default: 'Other'
  },

  // Origin location (where it was produced/grown)
  origin: {
    type: String,
    required: [true, 'Origin is required'],
    trim: true
  },

  // Description of the product
  description: {
    type: String,
    trim: true,
    default: ''
  },

  // Quantity and unit
  quantity: {
    type: Number,
    required: true,
    min: [0, 'Quantity cannot be negative']
  },

  unit: {
    type: String,
    enum: ['kg', 'g', 'liter', 'units', 'boxes', 'tons'],
    default: 'kg'
  },

  // Price per unit
  pricePerUnit: {
    type: Number,
    default: 0
  },

  // Current stage in supply chain
  currentStage: {
    type: String,
    enum: ['Harvested', 'Processing', 'Packaged', 'In Transit', 'Warehouse', 'Retailer', 'Delivered'],
    default: 'Harvested'
  },

  // Current location
  currentLocation: {
    type: String,
    default: ''
  },

  // Who created this product (Farmer)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  createdByUsername: {
    type: String,
    required: true
  },

  // Stellar wallet created for this product's tracking
  stellarPublicKey: {
    type: String,
    default: null
  },

  // Private key for this product's wallet (for demo only!)
  stellarPrivateKey: {
    type: String,
    default: null,
    select: false
  },

  // QR code data URL (base64 encoded image)
  qrCode: {
    type: String,
    default: null
  },

  // All tracking events (full history)
  trackingHistory: [trackingEventSchema],

  // Product image URL (optional)
  imageUrl: {
    type: String,
    default: null
  },

  // Whether product is active
  isActive: {
    type: Boolean,
    default: true
  },

  // Expiry date (for perishables)
  expiryDate: {
    type: Date,
    default: null
  },

  // Timestamps (auto-managed)
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// ============================================
// Indexes for Fast Retrieval
// ============================================
productSchema.index({ productId: 1 });         // Fast lookup by product ID
productSchema.index({ currentStage: 1 });       // Filter by stage
productSchema.index({ createdBy: 1 });          // Filter by farmer
productSchema.index({ currentLocation: 1 });    // Filter by location
productSchema.index({ createdAt: -1 });         // Sort by newest

// ============================================
// Middleware: Update 'updatedAt' on save
// ============================================
productSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// ============================================
// Virtual: Get latest tracking event
// ============================================
productSchema.virtual('latestEvent').get(function() {
  if (this.trackingHistory && this.trackingHistory.length > 0) {
    return this.trackingHistory[this.trackingHistory.length - 1];
  }
  return null;
});

module.exports = mongoose.model('Product', productSchema);
