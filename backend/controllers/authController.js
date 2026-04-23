// ============================================
// controllers/authController.js - Authentication Logic
// ============================================
const User = require('../models/User');
const { generateToken } = require('../middleware/auth');
const stellarService = require('../services/stellarService');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user + create Stellar wallet
 * @access  Public
 */
const register = async (req, res) => {
  try {
    const { username, fullName, email, password, role } = req.body;

    // Validate required fields
    if (!username || !fullName || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: username, fullName, email, password, role'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: existingUser.email === email.toLowerCase()
          ? 'Email already registered'
          : 'Username already taken'
      });
    }

    // Generate Stellar wallet for this user
    console.log(`🔑 Generating Stellar wallet for ${username}...`);
    const wallet = stellarService.generateWallet();

    // Create user in database
    const user = await User.create({
      username: username.toLowerCase(),
      fullName,
      email: email.toLowerCase(),
      password,
      role,
      stellarPublicKey: wallet.publicKey,
      stellarPrivateKey: wallet.privateKey  // Stored for demo; use HSM in production
    });

    // Fund the account via Friendbot (testnet only)
    try {
      await stellarService.fundAccount(wallet.publicKey);
      user.stellarFunded = true;
      await user.save();
      console.log(`✅ Wallet funded for user: ${username}`);
    } catch (fundError) {
      console.warn(`⚠️  Could not fund wallet for ${username}: ${fundError.message}`);
      // Don't fail registration if funding fails
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login
    user.lastLogin = Date.now();
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Account created successfully!',
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        stellarPublicKey: user.stellarPublicKey,
        stellarFunded: user.stellarFunded,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Register error:', error.message);

    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during registration. Please try again.'
    });
  }
};

/**
 * @route   POST /api/auth/login
 * @desc    Login user with username/password
 * @access  Public
 */
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Username and password are required'
      });
    }

    // Find user by username (case-insensitive)
    const user = await User.findOne({
      username: username.toLowerCase()
    }).select('+password'); // Include password for comparison

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Contact admin.'
      });
    }

    // Compare password
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = generateToken(user._id);

    // Update last login timestamp
    user.lastLogin = Date.now();
    await user.save();

    res.json({
      success: true,
      message: `Welcome back, ${user.fullName}!`,
      token,
      user: {
        id: user._id,
        username: user.username,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        stellarPublicKey: user.stellarPublicKey,
        stellarFunded: user.stellarFunded,
        lastLogin: user.lastLogin
      }
    });

  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Server error during login. Please try again.'
    });
  }
};

/**
 * @route   GET /api/auth/me
 * @desc    Get current logged-in user profile
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findById(req.user._id).select('-password -stellarPrivateKey');

    res.json({
      success: true,
      user
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/auth/wallet
 * @desc    Get current user's Stellar wallet info & balance
 * @access  Private
 */
const getWalletInfo = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.stellarPublicKey) {
      return res.status(404).json({
        success: false,
        message: 'No Stellar wallet found for this user'
      });
    }

    // Get live balance from Stellar network
    const balanceInfo = await stellarService.getAccountBalance(user.stellarPublicKey);

    res.json({
      success: true,
      wallet: {
        publicKey: user.stellarPublicKey,
        funded: user.stellarFunded,
        ...balanceInfo
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @route   GET /api/auth/users
 * @desc    Get all users (Admin only)
 * @access  Private/Admin
 */
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find()
      .select('-password -stellarPrivateKey')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { register, login, getMe, getWalletInfo, getAllUsers };
