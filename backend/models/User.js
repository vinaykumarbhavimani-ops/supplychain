// ============================================
// models/User.js - User Schema & Model
// ============================================
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User Schema
 * Supports 4 roles: Farmer, Distributor, Retailer, Customer
 */
const userSchema = new mongoose.Schema({
  // Unique username for login
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },

  // Full name of the user
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true
  },

  // Email address
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Invalid email format']
  },

  // Hashed password (never store plain text!)
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },

  // Role determines what actions user can perform
  role: {
    type: String,
    enum: ['Farmer', 'Distributor', 'Retailer', 'Customer', 'Admin'],
    default: 'Customer'
  },

  // Stellar wallet associated with this user
  stellarPublicKey: {
    type: String,
    default: null
  },

  // Private key stored encrypted (in production, use proper HSM)
  // For demo purposes - in production NEVER store private keys in DB
  stellarPrivateKey: {
    type: String,
    default: null,
    select: false // Never return this field by default
  },

  // Whether the Stellar account has been funded via Friendbot
  stellarFunded: {
    type: Boolean,
    default: false
  },

  // Account active status
  isActive: {
    type: Boolean,
    default: true
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  lastLogin: {
    type: Date,
    default: null
  }
});

// ============================================
// Middleware: Hash password before saving
// ============================================
userSchema.pre('save', async function(next) {
  // Only hash if password was modified
  if (!this.isModified('password')) return next();

  try {
    // Generate salt with 12 rounds (higher = more secure but slower)
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ============================================
// Methods
// ============================================

// Compare entered password with stored hash
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Return user data without sensitive fields
userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.stellarPrivateKey;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
