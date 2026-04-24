<<<<<<< HEAD
# ⛓️ ChainTrace — Blockchain-Based Supply Chain Tracking System

> **Advanced project using Stellar Blockchain + Node.js + MongoDB + Vanilla JS**

A complete, production-style supply chain tracking system where every product update is permanently recorded on the **Stellar Testnet blockchain** with an immutable transaction memo.

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🔐 **User Management** | 4 roles: Farmer, Distributor, Retailer, Customer |
| ⛓️ **Blockchain Recording** | Every stage update recorded on Stellar Testnet |
| 📍 **Real-time Tracking** | Full journey timeline for any product |
| 📱 **QR Code Generation** | Unique QR per product for instant tracking |
| 🔍 **Search & Filter** | Search by ID, filter by stage/location |
| 📊 **Dashboard Analytics** | Charts showing product distribution by stage |
| 💰 **Stellar Wallet** | Auto-generated wallet per user, funded via Friendbot |
| 🌐 **Transaction Verification** | View TX hash on Stellar Expert explorer |
| 📱 **Responsive UI** | Works on mobile + desktop |
| 🌙 **Dark Cyber Theme** | Modern blockchain-inspired UI |

---

## 📁 Project Structure

```
supplychain/
├── backend/
│   ├── server.js              ← Express server entry point
│   ├── package.json           ← Dependencies
│   ├── .env.example           ← Environment variables template
│   ├── config/
│   │   └── db.js              ← MongoDB connection
│   ├── models/
│   │   ├── User.js            ← User schema (with Stellar wallet)
│   │   └── Product.js         ← Product + TrackingHistory schema
│   ├── controllers/
│   │   ├── authController.js  ← Login, register, wallet
│   │   └── productController.js ← Add, update, track, analytics
│   ├── services/
│   │   └── stellarService.js  ← ALL Stellar blockchain operations
│   ├── routes/
│   │   ├── authRoutes.js      ← /api/auth/*
│   │   └── productRoutes.js   ← /api/products/*
│   └── middleware/
│       └── auth.js            ← JWT middleware + role-based access
│
└── frontend/
    ├── index.html             ← Single-page application
    ├── style.css              ← Dark cyber theme CSS
    └── app.js                 ← All frontend JavaScript
```

---

## 🔧 Prerequisites

Install these before starting:

1. **Node.js v18+** — https://nodejs.org
2. **MongoDB** (one of):
   - Local: https://www.mongodb.com/try/download/community
   - Cloud (free): https://www.mongodb.com/cloud/atlas
3. **Git** — https://git-scm.com

---

## 🚀 Setup Instructions (Step by Step)

### Step 1: Clone / Copy the Project

```bash
# Navigate to where you saved the project
cd supplychain/backend
```

### Step 2: Install Backend Dependencies

```bash
cd backend
npm install
```

This installs:
- `express` — Web framework
- `mongoose` — MongoDB ORM
- `@stellar/stellar-sdk` — Stellar blockchain SDK
- `jsonwebtoken` — JWT authentication
- `bcryptjs` — Password hashing
- `qrcode` — QR code generation
- `cors`, `dotenv`, `axios`, `uuid`

### Step 3: Configure Environment Variables

```bash
# Copy the example file
cp .env.example .env

# Edit .env with your values:
nano .env   # (or use any text editor)
```

Your `.env` should look like:

```env
PORT=5000
NODE_ENV=development

# MongoDB (choose one):
MONGODB_URI=mongodb://localhost:27017/supplychain       # Local MongoDB
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/supplychain  # Atlas

# JWT Secret (change this to a random string!)
JWT_SECRET=your_random_secret_here_minimum_32_chars

# Stellar Testnet (no changes needed for development)
STELLAR_NETWORK=TESTNET
STELLAR_HORIZON_URL=https://horizon-testnet.stellar.org

FRONTEND_URL=http://localhost:5500
```

### Step 4: Start MongoDB

**Option A — Local MongoDB:**
```bash
# On Ubuntu/Linux:
sudo systemctl start mongod

# On macOS (with Homebrew):
brew services start mongodb-community

# On Windows:
# Start MongoDB from Services, or run: net start MongoDB
```

**Option B — MongoDB Atlas (Cloud):**
1. Go to https://cloud.mongodb.com
2. Create a free cluster
3. Get the connection string (replace in `.env`)

### Step 5: Start the Backend Server

```bash
# In the backend/ directory:
npm run dev     # Development (auto-restarts on changes)
# OR
npm start       # Production
```

You should see:
```
================================================
  🚀 Supply Chain Tracking System - STARTED
================================================
  🌐 Server:    http://localhost:5000
  🌿 MongoDB:   mongodb://localhost:27017/supplychain
  ⭐ Stellar:   TESTNET
  🔧 Mode:      development
================================================
✅ MongoDB Connected: localhost
🌟 Stellar Service initialized on TESTNET
```

### Step 6: Open the Frontend

The frontend is plain HTML/CSS/JS — no build step needed!

**Option A — VS Code Live Server (Recommended):**
1. Install "Live Server" extension in VS Code
2. Right-click `frontend/index.html`
3. Click "Open with Live Server"
4. Opens at `http://127.0.0.1:5500`

**Option B — Python HTTP Server:**
```bash
cd frontend
python3 -m http.server 5500
# Open http://localhost:5500
```

**Option C — Node.js serve:**
```bash
npm install -g serve
cd frontend
serve -p 5500
```

---

## 👥 Creating Demo Users

After starting the backend, register users through the UI or API:

### Method 1: Use the UI
1. Open the frontend
2. Click "Create Account"
3. Register with role: Farmer
4. Repeat for Distributor, Retailer roles

### Method 2: Use the API (curl)

```bash
# Register a Farmer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "farmer1",
    "fullName": "Rajesh Kumar",
    "email": "farmer@example.com",
    "password": "password123",
    "role": "Farmer"
  }'

# Register a Distributor
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "dist1",
    "fullName": "Mumbai Logistics",
    "email": "dist@example.com",
    "password": "password123",
    "role": "Distributor"
  }'

# Register a Retailer
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "retail1",
    "fullName": "SuperMart Pune",
    "email": "retail@example.com",
    "password": "password123",
    "role": "Retailer"
  }'

# Register Admin
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "fullName": "System Admin",
    "email": "admin@example.com",
    "password": "password123",
    "role": "Admin"
  }'
```

---

## 📦 Example Test Data Flow

### 1. Add a Product (as Farmer)

Login as `farmer1`, then:
- Product ID: `RICE-2024-001`
- Name: `Organic Basmati Rice`
- Category: Grains
- Origin: `Amritsar, Punjab`
- Quantity: `500 kg`
- Price: `₹85/kg`

**What happens behind the scenes:**
1. Product saved to MongoDB
2. Stellar wallet funded via Friendbot
3. Transaction sent to Stellar Testnet with memo:
   `RICE-2024-001|Harvested|Amritsar, Punjab`
4. QR code generated
5. TX hash returned to frontend

### 2. Update Stage (as Distributor)

Login as `dist1`, go to "Update Stage":
- Product ID: `RICE-2024-001`
- Stage: `In Transit`
- Location: `Delhi Hub`
- Notes: `Loaded onto truck TN-01-AB-1234`

**Blockchain memo recorded:**
`RICE-2024-001|In Transit|Delhi Hub`

### 3. Update Again (as Retailer)

Login as `retail1`:
- Stage: `Retailer`
- Location: `SuperMart, Pune`
- Notes: `Quality check passed. Ready for sale.`

### 4. Track Product (anyone)

Go to "Track Product", enter `RICE-2024-001`:
- See full timeline with timestamps
- View all blockchain TX hashes
- Click TX hash to verify on Stellar Expert

---

## 🔌 API Reference

### Authentication

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/register` | Create account + Stellar wallet | None |
| POST | `/api/auth/login` | Login, get JWT token | None |
| GET | `/api/auth/me` | Get current user profile | JWT |
| GET | `/api/auth/wallet` | Get Stellar balance | JWT |
| GET | `/api/auth/users` | All users | Admin |

### Products

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/products/add` | Add product + blockchain record | Farmer/Admin |
| POST | `/api/products/update` | Update stage + blockchain | Farmer/Dist/Retailer |
| GET | `/api/products/all` | All products (with filters) | JWT |
| GET | `/api/products/:id` | Single product details | JWT |
| GET | `/api/products/track/:id` | Track product (public) | None |
| GET | `/api/products/qr/:id` | Get QR code | None |
| GET | `/api/products/analytics/dashboard` | Dashboard stats | JWT |
| GET | `/api/products/verify/:txHash` | Verify blockchain TX | None |

### Example API Requests

```bash
# Add a product (requires Bearer token)
curl -X POST http://localhost:5000/api/products/add \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "WHEAT-001",
    "name": "Punjab Wheat",
    "origin": "Ludhiana, Punjab",
    "quantity": 1000,
    "unit": "kg"
  }'

# Track a product (public, no auth)
curl http://localhost:5000/api/products/track/WHEAT-001

# Get dashboard analytics
curl http://localhost:5000/api/products/analytics/dashboard \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## ⭐ Stellar Blockchain Integration

### How it Works

1. **Wallet Generation**: Each user gets a Stellar keypair on registration
   - Public Key (G...): Safe to share, like a bank account number
   - Private Key (S...): Secret, used to sign transactions

2. **Account Funding**: New accounts are funded via [Friendbot](https://friendbot.stellar.org)
   - Gives 10,000 XLM on Testnet (test money only)

3. **Recording Events**: Each supply chain update creates a Stellar transaction
   - Sends 0.0000001 XLM to self (minimum payment)
   - Attaches memo: `PROD-ID|Stage|Location`
   - Transaction is permanent and immutable

4. **Verification**: TX hashes can be verified at:
   - https://stellar.expert/explorer/testnet/tx/TX_HASH
   - https://horizon-testnet.stellar.org/transactions/TX_HASH

### Stellar SDK Functions Used

```javascript
// Generate wallet
const keypair = StellarSdk.Keypair.random();

// Fund via Friendbot
GET https://friendbot.stellar.org?addr=G...

// Build & send transaction
new StellarSdk.TransactionBuilder(account, { fee, networkPassphrase })
  .addOperation(StellarSdk.Operation.payment({ ... }))
  .addMemo(StellarSdk.Memo.text('RICE-001|Delivered|Pune'))
  .setTimeout(30)
  .build()
  .sign(keypair)
// Submit to Horizon
server.submitTransaction(tx)
```

---

## 🔒 Security Notes

| Feature | Implementation |
|---------|---------------|
| Passwords | Bcrypt hashed (12 rounds) |
| Authentication | JWT tokens (7-day expiry) |
| Role Authorization | Middleware-enforced per route |
| Private Keys | Never sent to frontend |
| Input Validation | Server-side validation on all inputs |
| CORS | Configured for specific origins only |

> ⚠️ **Production Note**: In a real production system, Stellar private keys should be stored in a Hardware Security Module (HSM) or Key Management Service (KMS), not in the database. This project stores them for educational demonstration purposes.

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if MongoDB is running
mongod --version
ps aux | grep mongod

# Check if port 5000 is in use
lsof -i :5000
kill -9 PID
```

### "Cannot connect to Stellar"
- Check internet connection
- Stellar Testnet may be temporarily down
- Try: `curl https://horizon-testnet.stellar.org`

### "Friendbot failed"
- Ensure internet access
- Try: `curl "https://friendbot.stellar.org?addr=YOUR_PUBLIC_KEY"`

### "MongoDB connection failed"
- Ensure MongoDB is running
- Check MONGODB_URI in `.env`
- For Atlas, ensure IP is whitelisted

### Frontend shows "Connection error"
- Ensure backend is running on port 5000
- Check CORS settings in `server.js`
- Open browser console (F12) for errors

---

## 📝 Environment Summary

```
Frontend:   http://localhost:5500    (VS Code Live Server)
Backend:    http://localhost:5000    (Express)
MongoDB:    mongodb://localhost:27017/supplychain
Stellar:    Testnet (horizon-testnet.stellar.org)
```

---

## 🎓 Technologies Used

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript, Chart.js |
| Backend | Node.js, Express.js |
| Database | MongoDB, Mongoose ODM |
| Blockchain | Stellar Network (Testnet), Stellar SDK |
| Auth | JWT (JSON Web Tokens), Bcrypt |
| Other | QRCode.js, CORS, Dotenv |

---

*Built for educational purposes — Advanced Blockchain Supply Chain System*
*Uses Stellar Testnet — No real money involved*
=======
# supplychain
>>>>>>> a022bf5e608bfbf3b318c6f92a0af32028bf66b1

#Images
<img width="1360" height="646" alt="image" src="https://github.com/user-attachments/assets/98989f52-57b7-484c-bdc8-2a9cef377cee" />
<img width="1349" height="638" alt="image" src="https://github.com/user-attachments/assets/3a846ec4-3474-4bae-896f-9eff08732e62" />
<img width="1357" height="641" alt="image" src="https://github.com/user-attachments/assets/32526527-fbdd-44b7-802c-e0bc11d94b69" />
<img width="1339" height="645" alt="image" src="https://github.com/user-attachments/assets/14c3995c-139d-48e1-a40f-1c225ecd1365" />
<img width="1350" height="617" alt="image" src="https://github.com/user-attachments/assets/19304853-bf5c-4814-926a-d83cca18e768" />
<img width="1106" height="577" alt="image" src="https://github.com/user-attachments/assets/1b290e74-c38e-4ce2-b176-db51aacef045" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/2e8ef9c0-826e-436a-b607-c2b6dd6afea8" />
<img width="1366" height="768" alt="image" src="https://github.com/user-attachments/assets/12bfb351-1f6f-4720-bd4c-64daa5b7480e" />
<img width="1360" height="599" alt="image" src="https://github.com/user-attachments/assets/459a7481-2060-4556-8def-6f1fc27bb6f5" />

