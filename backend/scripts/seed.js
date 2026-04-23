// ============================================
// scripts/seed.js — Demo Data Seeder
// Run: node scripts/seed.js
// ============================================
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// We'll import models directly
const connectDB = async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/supplychain');
  console.log('✅ MongoDB connected');
};

const seed = async () => {
  await connectDB();

  const User = require('../models/User');
  const Product = require('../models/Product');

  // Clear existing data
  await User.deleteMany({});
  await Product.deleteMany({});
  console.log('🗑️  Cleared existing data');

  // ── Demo Users ──────────────────────────────
  const users = [
    { username: 'farmer1',  fullName: 'Rajesh Kumar',       email: 'farmer@demo.com',   password: 'password123', role: 'Farmer',      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000' },
    { username: 'dist1',    fullName: 'Mumbai Logistics',    email: 'dist@demo.com',     password: 'password123', role: 'Distributor', stellarPublicKey: 'GDEMO2DIST0000000000000000000000000000000000000000000000' },
    { username: 'retail1',  fullName: 'SuperMart Pune',      email: 'retail@demo.com',   password: 'password123', role: 'Retailer',    stellarPublicKey: 'GDEMO3RETAIL00000000000000000000000000000000000000000000' },
    { username: 'customer1',fullName: 'Priya Sharma',        email: 'customer@demo.com', password: 'password123', role: 'Customer',    stellarPublicKey: 'GDEMO4CUSTOMER0000000000000000000000000000000000000000' },
    { username: 'admin',    fullName: 'System Administrator',email: 'admin@demo.com',    password: 'password123', role: 'Admin',       stellarPublicKey: 'GDEMO5ADMIN00000000000000000000000000000000000000000000' },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await User.create(u);
    createdUsers.push(user);
    console.log(`👤 Created user: ${u.username} (${u.role})`);
  }

  const farmer = createdUsers[0];

  // ── Demo Products ────────────────────────────
  const products = [
    {
      productId: 'RICE-2024-001',
      name: 'Organic Basmati Rice',
      category: 'Grains',
      origin: 'Amritsar, Punjab',
      description: 'Premium long-grain basmati rice, organically grown',
      quantity: 500, unit: 'kg', pricePerUnit: 85,
      currentStage: 'Delivered',
      currentLocation: 'SuperMart, Pune',
      createdBy: farmer._id,
      createdByUsername: farmer.username,
      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000',
      trackingHistory: [
        { stage: 'Harvested',  location: 'Amritsar, Punjab',   updatedBy: farmer._id, updatedByRole: 'Farmer',      updatedByUsername: 'farmer1', notes: 'Fresh harvest, Grade A quality',       txStatus: 'Confirmed', blockchainTxHash: 'abc123tx1', timestamp: new Date('2024-01-10') },
        { stage: 'Processing', location: 'Amritsar Mill',       updatedBy: farmer._id, updatedByRole: 'Farmer',      updatedByUsername: 'farmer1', notes: 'Milling and cleaning completed',       txStatus: 'Confirmed', blockchainTxHash: 'abc123tx2', timestamp: new Date('2024-01-12') },
        { stage: 'Packaged',   location: 'Amritsar Warehouse',  updatedBy: farmer._id, updatedByRole: 'Farmer',      updatedByUsername: 'farmer1', notes: 'Packed in 25kg bags',                  txStatus: 'Confirmed', blockchainTxHash: 'abc123tx3', timestamp: new Date('2024-01-14') },
        { stage: 'In Transit', location: 'NH-44, Delhi',        updatedBy: createdUsers[1]._id, updatedByRole: 'Distributor', updatedByUsername: 'dist1', notes: 'Truck TN-01-2345', txStatus: 'Confirmed', blockchainTxHash: 'abc123tx4', timestamp: new Date('2024-01-16') },
        { stage: 'Warehouse',  location: 'Delhi Distribution Hub', updatedBy: createdUsers[1]._id, updatedByRole: 'Distributor', updatedByUsername: 'dist1', notes: 'Cold storage maintained', txStatus: 'Confirmed', blockchainTxHash: 'abc123tx5', timestamp: new Date('2024-01-18') },
        { stage: 'Retailer',   location: 'SuperMart, Pune',     updatedBy: createdUsers[2]._id, updatedByRole: 'Retailer',    updatedByUsername: 'retail1', notes: 'Quality check passed. On shelf.', txStatus: 'Confirmed', blockchainTxHash: 'abc123tx6', timestamp: new Date('2024-01-20') },
        { stage: 'Delivered',  location: 'SuperMart, Pune',     updatedBy: createdUsers[2]._id, updatedByRole: 'Retailer',    updatedByUsername: 'retail1', notes: 'Sold to customer',               txStatus: 'Confirmed', blockchainTxHash: 'abc123tx7', timestamp: new Date('2024-01-22') },
      ]
    },
    {
      productId: 'WHEAT-2024-002',
      name: 'Punjab Hard Wheat',
      category: 'Grains',
      origin: 'Ludhiana, Punjab',
      quantity: 1000, unit: 'kg', pricePerUnit: 28,
      currentStage: 'In Transit',
      currentLocation: 'Nagpur Checkpoint',
      createdBy: farmer._id,
      createdByUsername: farmer.username,
      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000',
      trackingHistory: [
        { stage: 'Harvested',  location: 'Ludhiana, Punjab',    updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'High protein wheat, 12.5% protein', txStatus: 'Confirmed', blockchainTxHash: 'def456tx1', timestamp: new Date('2024-01-15') },
        { stage: 'Packaged',   location: 'Ludhiana Warehouse',  updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: '50kg gunny bags',                   txStatus: 'Confirmed', blockchainTxHash: 'def456tx2', timestamp: new Date('2024-01-17') },
        { stage: 'In Transit', location: 'Nagpur Checkpoint',   updatedBy: createdUsers[1]._id, updatedByRole: 'Distributor', updatedByUsername: 'dist1', notes: 'On route to Hyderabad', txStatus: 'Confirmed', blockchainTxHash: 'def456tx3', timestamp: new Date('2024-01-19') },
      ]
    },
    {
      productId: 'MANGO-2024-003',
      name: 'Alphonso Mangoes',
      category: 'Fruits',
      origin: 'Ratnagiri, Maharashtra',
      quantity: 200, unit: 'boxes', pricePerUnit: 1200,
      currentStage: 'Retailer',
      currentLocation: 'FreshMart, Bangalore',
      createdBy: farmer._id,
      createdByUsername: farmer.username,
      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000',
      trackingHistory: [
        { stage: 'Harvested',  location: 'Ratnagiri, MH',       updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'GI tagged Alphonso, picked at right ripeness', txStatus: 'Confirmed', blockchainTxHash: 'ghi789tx1', timestamp: new Date('2024-01-18'), temperature: '18°C' },
        { stage: 'Packaged',   location: 'Ratnagiri Cold Store', updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'Ripening chamber treatment done',              txStatus: 'Confirmed', blockchainTxHash: 'ghi789tx2', timestamp: new Date('2024-01-20'), temperature: '14°C' },
        { stage: 'In Transit', location: 'Mumbai Port',          updatedBy: createdUsers[1]._id, updatedByRole: 'Distributor', updatedByUsername: 'dist1', notes: 'Refrigerated truck',     txStatus: 'Confirmed', blockchainTxHash: 'ghi789tx3', timestamp: new Date('2024-01-21'), temperature: '12°C' },
        { stage: 'Retailer',   location: 'FreshMart, Bangalore', updatedBy: createdUsers[2]._id, updatedByRole: 'Retailer', updatedByUsername: 'retail1', notes: 'Premium display shelf', txStatus: 'Confirmed', blockchainTxHash: 'ghi789tx4', timestamp: new Date('2024-01-23'), temperature: '10°C' },
      ]
    },
    {
      productId: 'MILK-2024-004',
      name: 'Fresh Organic Milk',
      category: 'Dairy',
      origin: 'Anand, Gujarat',
      quantity: 5000, unit: 'liter', pricePerUnit: 55,
      currentStage: 'Processing',
      currentLocation: 'AMUL Dairy Plant, Anand',
      createdBy: farmer._id,
      createdByUsername: farmer.username,
      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000',
      trackingHistory: [
        { stage: 'Harvested',  location: 'Anand, Gujarat',           updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'Morning collection, fat content 3.8%', txStatus: 'Confirmed', blockchainTxHash: 'jkl012tx1', timestamp: new Date('2024-01-22'), temperature: '4°C' },
        { stage: 'Processing', location: 'AMUL Dairy Plant, Anand',  updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'Pasteurization in progress',             txStatus: 'Pending',   blockchainTxHash: null,        timestamp: new Date('2024-01-22'), temperature: '72°C' },
      ]
    },
    {
      productId: 'TOMATO-2024-005',
      name: 'Cherry Tomatoes',
      category: 'Vegetables',
      origin: 'Nashik, Maharashtra',
      quantity: 300, unit: 'kg', pricePerUnit: 65,
      currentStage: 'Harvested',
      currentLocation: 'Nashik, Maharashtra',
      createdBy: farmer._id,
      createdByUsername: farmer.username,
      stellarPublicKey: 'GDEMO1FARMER000000000000000000000000000000000000000000000',
      trackingHistory: [
        { stage: 'Harvested',  location: 'Nashik, Maharashtra',  updatedBy: farmer._id, updatedByRole: 'Farmer', updatedByUsername: 'farmer1', notes: 'Vine-ripened, pesticide-free', txStatus: 'Confirmed', blockchainTxHash: 'mno345tx1', timestamp: new Date('2024-01-23') },
      ]
    },
  ];

  for (const p of products) {
    await Product.create(p);
    console.log(`📦 Created product: ${p.productId} — ${p.name} [${p.currentStage}]`);
  }

  console.log('\n✅ Seed complete!');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Demo Login Credentials:');
  console.log('  farmer1   / password123  → Farmer');
  console.log('  dist1     / password123  → Distributor');
  console.log('  retail1   / password123  → Retailer');
  console.log('  customer1 / password123  → Customer');
  console.log('  admin     / password123  → Admin');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await mongoose.disconnect();
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
