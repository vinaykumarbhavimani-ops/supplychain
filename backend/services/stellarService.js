// ============================================
// services/stellarService.js - Stellar Blockchain Layer
// ============================================
// This service handles ALL blockchain operations:
// - Wallet creation
// - Account funding via Friendbot
// - Sending transactions with memos
// - Fetching transaction history
// ============================================

const StellarSdk = require('@stellar/stellar-sdk');
const axios = require('axios');

// ============================================
// Configuration
// ============================================
const NETWORK = process.env.STELLAR_NETWORK || 'TESTNET';
const HORIZON_URL = process.env.STELLAR_HORIZON_URL || 'https://horizon-testnet.stellar.org';
const FRIENDBOT_URL = 'https://friendbot.stellar.org';

// Initialize Stellar server connection
const server = new StellarSdk.Horizon.Server(HORIZON_URL);

// Set network passphrase based on environment
const networkPassphrase = NETWORK === 'TESTNET'
  ? StellarSdk.Networks.TESTNET
  : StellarSdk.Networks.PUBLIC;

console.log(`🌟 Stellar Service initialized on ${NETWORK}`);
console.log(`🔗 Horizon URL: ${HORIZON_URL}`);

// ============================================
// FUNCTION 1: Generate New Stellar Wallet
// Creates a brand new keypair (public + private key)
// ============================================
const generateWallet = () => {
  try {
    // Generate a random keypair
    const keypair = StellarSdk.Keypair.random();

    return {
      publicKey: keypair.publicKey(),   // G... address (safe to share)
      privateKey: keypair.secret()      // S... secret key (NEVER share!)
    };
  } catch (error) {
    throw new Error(`Failed to generate wallet: ${error.message}`);
  }
};

// ============================================
// FUNCTION 2: Fund Account via Friendbot
// Friendbot gives 10,000 XLM on testnet for free
// ============================================
const fundAccount = async (publicKey) => {
  try {
    console.log(`💰 Funding account: ${publicKey}`);

    const response = await axios.get(`${FRIENDBOT_URL}?addr=${publicKey}`, {
      timeout: 15000 // 15 second timeout
    });

    if (response.data && response.data.hash) {
      console.log(`✅ Account funded! TX: ${response.data.hash}`);
      return {
        success: true,
        txHash: response.data.hash,
        message: 'Account funded with 10,000 XLM on testnet'
      };
    }

    return { success: true, message: 'Account funded successfully' };

  } catch (error) {
    // Account might already be funded
    if (error.response && error.response.status === 400) {
      console.log(`⚠️  Account already funded: ${publicKey}`);
      return { success: true, message: 'Account already funded' };
    }
    throw new Error(`Friendbot funding failed: ${error.message}`);
  }
};

// ============================================
// FUNCTION 3: Check Account Balance
// ============================================
const getAccountBalance = async (publicKey) => {
  try {
    const account = await server.loadAccount(publicKey);

    const balances = account.balances.map(b => ({
      asset: b.asset_type === 'native' ? 'XLM' : b.asset_code,
      balance: parseFloat(b.balance).toFixed(4)
    }));

    return { success: true, balances, sequence: account.sequence };

  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { success: false, message: 'Account not found or not funded yet' };
    }
    throw new Error(`Failed to get balance: ${error.message}`);
  }
};

// ============================================
// FUNCTION 4: Record Supply Chain Event on Blockchain
// Sends a transaction with a memo describing the event
// Memo format: "ProductID:X | Stage:Y | Location:Z"
// ============================================
const recordTrackingEvent = async (sourcePrivateKey, productId, stage, location, notes = '') => {
  try {
    // Load source keypair from private key
    const sourceKeypair = StellarSdk.Keypair.fromSecret(sourcePrivateKey);
    const sourcePublicKey = sourceKeypair.publicKey();

    console.log(`📝 Recording event for Product: ${productId}`);
    console.log(`   Stage: ${stage} | Location: ${location}`);

    // Load account details (needed for sequence number)
    const sourceAccount = await server.loadAccount(sourcePublicKey);

    // Build memo text (max 28 bytes for Stellar text memos)
    // We'll truncate if needed
    const memoText = `${productId}|${stage}|${location}`.substring(0, 28);
    console.log(`   Memo: ${memoText}`);

    // Build the transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: StellarSdk.BASE_FEE,           // ~0.00001 XLM base fee
      networkPassphrase: networkPassphrase
    })
      .addOperation(
        // Payment to self (0.0000001 XLM) - just to create a transaction record
        StellarSdk.Operation.payment({
          destination: sourcePublicKey,    // Send to self
          asset: StellarSdk.Asset.native(), // XLM (native asset)
          amount: '0.0000001'              // Minimum amount
        })
      )
      .addMemo(StellarSdk.Memo.text(memoText)) // Attach our tracking data
      .setTimeout(30)                           // Transaction valid for 30 seconds
      .build();

    // Sign the transaction with our private key
    transaction.sign(sourceKeypair);

    // Submit to Stellar network
    const result = await server.submitTransaction(transaction);

    console.log(`✅ Transaction confirmed! Hash: ${result.hash}`);

    return {
      success: true,
      txHash: result.hash,
      memo: memoText,
      ledger: result.ledger,
      // Full memo for display
      fullMemo: `ProductID:${productId} | Stage:${stage} | Location:${location}`,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${result.hash}`
    };

  } catch (error) {
    console.error(`❌ Blockchain transaction failed: ${error.message}`);

    // Handle specific Stellar errors
    if (error.response && error.response.data) {
      const extras = error.response.data.extras;
      if (extras && extras.result_codes) {
        const codes = extras.result_codes;
        if (codes.transaction === 'tx_insufficient_balance') {
          throw new Error('Insufficient XLM balance. Account needs more funds.');
        }
        if (codes.transaction === 'tx_bad_seq') {
          throw new Error('Transaction sequence error. Please retry.');
        }
      }
    }

    throw new Error(`Blockchain error: ${error.message}`);
  }
};

// ============================================
// FUNCTION 5: Fetch Transaction History
// Gets all transactions for a given account
// ============================================
const getTransactionHistory = async (publicKey, limit = 10) => {
  try {
    const transactions = await server
      .transactions()
      .forAccount(publicKey)
      .limit(limit)
      .order('desc')           // Newest first
      .call();

    const formattedTxns = transactions.records.map(tx => ({
      hash: tx.hash,
      ledger: tx.ledger,
      createdAt: tx.created_at,
      memo: tx.memo || 'No memo',
      memoType: tx.memo_type,
      successful: tx.successful,
      feeCharged: tx.fee_charged,
      explorerUrl: `https://stellar.expert/explorer/testnet/tx/${tx.hash}`
    }));

    return {
      success: true,
      count: formattedTxns.length,
      transactions: formattedTxns
    };

  } catch (error) {
    if (error.response && error.response.status === 404) {
      return { success: true, count: 0, transactions: [] };
    }
    throw new Error(`Failed to fetch transactions: ${error.message}`);
  }
};

// ============================================
// FUNCTION 6: Verify Transaction
// Verify a specific transaction exists on blockchain
// ============================================
const verifyTransaction = async (txHash) => {
  try {
    const tx = await server.transactions().transaction(txHash).call();

    return {
      success: true,
      verified: true,
      hash: tx.hash,
      ledger: tx.ledger,
      createdAt: tx.created_at,
      memo: tx.memo || 'No memo',
      successful: tx.successful
    };

  } catch (error) {
    return {
      success: false,
      verified: false,
      message: 'Transaction not found on blockchain'
    };
  }
};

// ============================================
// FUNCTION 7: Get Network Status
// Check if Stellar network is reachable
// ============================================
const getNetworkStatus = async () => {
  try {
    const ledger = await server.ledgers().limit(1).order('desc').call();

    return {
      success: true,
      network: NETWORK,
      horizonUrl: HORIZON_URL,
      latestLedger: ledger.records[0].sequence,
      latestLedgerTime: ledger.records[0].closed_at
    };
  } catch (error) {
    return {
      success: false,
      network: NETWORK,
      error: error.message
    };
  }
};

// ============================================
// Export all functions
// ============================================
module.exports = {
  generateWallet,
  fundAccount,
  getAccountBalance,
  recordTrackingEvent,
  getTransactionHistory,
  verifyTransaction,
  getNetworkStatus
};
