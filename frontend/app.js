// ============================================
// app.js - ChainTrace Frontend Application
// Blockchain-Based Supply Chain Tracking System
// ============================================

// ============================================
// CONFIGURATION
// ============================================
const API_BASE = 'http://localhost:5000/api';

// Application state
const state = {
  user: null,
  token: null,
  products: [],
  stageChart: null
};

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  // Start the clock
  updateClock();
  setInterval(updateClock, 1000);

  // Simulate loading then show app
  setTimeout(() => {
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');

    // Check if user is already logged in
    const savedToken = localStorage.getItem('sc_token');
    const savedUser = localStorage.getItem('sc_user');

    if (savedToken && savedUser) {
      try {
        state.token = savedToken;
        state.user = JSON.parse(savedUser);
        enterApp();
      } catch {
        showLoginPage();
      }
    } else {
      showLoginPage();
    }
  }, 2200);
});

// ============================================
// CLOCK
// ============================================
function updateClock() {
  const el = document.getElementById('topbar-time');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('en-IN', { hour12: false });
  }
}

// ============================================
// AUTH: LOGIN
// ============================================
async function handleLogin(event) {
  event.preventDefault();

  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  if (!username || !password) {
    showError('login-error', 'Please enter username and password');
    return;
  }

  setButtonLoading(btn, true);
  hideEl('login-error');

  try {
    const res = await apiFetch('/auth/login', 'POST', { username, password }, false);

    if (res.success) {
      state.token = res.token;
      state.user = res.user;

      // Persist to localStorage
      localStorage.setItem('sc_token', res.token);
      localStorage.setItem('sc_user', JSON.stringify(res.user));

      showToast(`Welcome back, ${res.user.fullName}! 🎉`, 'success');
      enterApp();
    } else {
      showError('login-error', res.message || 'Login failed');
    }

  } catch (err) {
    showError('login-error', `Connection error: ${err.message}. Make sure the backend is running.`);
  } finally {
    setButtonLoading(btn, false);
  }
}

// ============================================
// AUTH: REGISTER
// ============================================
async function handleRegister(event) {
  event.preventDefault();

  const data = {
    username: document.getElementById('reg-username').value.trim(),
    fullName: document.getElementById('reg-fullname').value.trim(),
    email: document.getElementById('reg-email').value.trim(),
    password: document.getElementById('reg-password').value,
    role: document.getElementById('reg-role').value
  };

  if (!data.role) {
    showError('register-error', 'Please select a role');
    return;
  }

  const btn = document.getElementById('register-btn');
  setButtonLoading(btn, true, 'Creating Account + Stellar Wallet...');
  hideEl('register-error');
  hideEl('register-success');

  try {
    const res = await apiFetch('/auth/register', 'POST', data, false);

    if (res.success) {
      showEl('register-success');
      document.getElementById('register-success').textContent =
        `✅ Account created! Stellar wallet generated: ${res.user.stellarPublicKey?.substring(0,20)}...`;

      // Auto-login after 2 seconds
      setTimeout(() => {
        state.token = res.token;
        state.user = res.user;
        localStorage.setItem('sc_token', res.token);
        localStorage.setItem('sc_user', JSON.stringify(res.user));
        enterApp();
      }, 2000);
    } else {
      showError('register-error', res.message || 'Registration failed');
    }

  } catch (err) {
    showError('register-error', `Error: ${err.message}`);
  } finally {
    setButtonLoading(btn, false, 'Create Account + Generate Wallet');
  }
}

// ============================================
// APP: ENTER MAIN APPLICATION
// ============================================
function enterApp() {
  hideEl('page-login');
  showEl('page-app');

  // Populate user info in sidebar
  const u = state.user;
  document.getElementById('sidebar-name').textContent = u.fullName || u.username;
  document.getElementById('sidebar-role').textContent = u.role;
  document.getElementById('sidebar-avatar').textContent = (u.fullName || u.username)[0].toUpperCase();
  document.getElementById('topbar-username').textContent = u.username;
  document.getElementById('topbar-avatar').textContent = (u.fullName || u.username)[0].toUpperCase();

  // Role-based visibility
  const isAdmin = u.role === 'Admin';
  const isFarmer = u.role === 'Farmer';
  document.getElementById('nav-admin').style.display = isAdmin ? 'flex' : 'none';
  document.getElementById('nav-add').style.display = (isFarmer || isAdmin) ? 'flex' : 'none';

  // Load initial section
  showSection('dashboard');
  loadDashboard();

  // Load all products in background
  loadAllProducts();
  if (isAdmin) loadAdminData();
}

// ============================================
// NAVIGATION
// ============================================
function showSection(sectionName) {
  // Hide all sections
  document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));

  // Show target section
  const target = document.getElementById(`section-${sectionName}`);
  if (target) {
    target.classList.remove('hidden');
    target.classList.add('active');
  }

  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const activeNav = document.querySelector(`[data-section="${sectionName}"]`);
  if (activeNav) activeNav.classList.add('active');

  // Update topbar title
  const titles = {
    'dashboard': 'Dashboard',
    'add-product': 'Add Product',
    'update-status': 'Update Stage',
    'track-product': 'Track Product',
    'all-products': 'All Products',
    'admin': 'Admin Overview',
    'wallet': 'My Wallet'
  };
  document.getElementById('topbar-title').textContent = titles[sectionName] || sectionName;

  // Load section-specific data
  if (sectionName === 'wallet') loadWallet();
  if (sectionName === 'admin') loadAdminData();
  if (sectionName === 'all-products') loadAllProducts();

  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById('sidebar').classList.remove('open');
  }

  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ============================================
// DASHBOARD
// ============================================
async function loadDashboard() {
  try {
    const res = await apiFetch('/products/analytics/dashboard');

    if (res.success) {
      const a = res.analytics;

      // Update stat cards
      animateNumber('stat-total', a.totalProducts || 0);
      animateNumber('stat-delivered', a.byStage?.Delivered || 0);
      animateNumber('stat-transit', a.byStage?.['In Transit'] || 0);
      animateNumber('stat-harvested', a.byStage?.Harvested || 0);

      // Update Stellar network info
      if (a.stellar && a.stellar.success) {
        document.getElementById('net-name').textContent = a.stellar.network || '—';
        document.getElementById('net-ledger').textContent = a.stellar.latestLedger || '—';
        document.getElementById('net-time').textContent = a.stellar.latestLedgerTime
          ? new Date(a.stellar.latestLedgerTime).toLocaleTimeString()
          : '—';
        document.getElementById('net-url').textContent = 'horizon-testnet.stellar.org';
      }

      // Render chart
      renderStageChart(a.byStage || {});

      // Render recent activity
      renderRecentActivity(a.recentProducts || []);
    }
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Could not load dashboard data', 'error');
  }
}

function renderStageChart(byStage) {
  const ctx = document.getElementById('stageChart');
  if (!ctx) return;

  const stages = Object.keys(byStage);
  const counts = Object.values(byStage);

  const colors = {
    Harvested: 'rgba(0,229,255,0.7)',
    Processing: 'rgba(255,184,0,0.7)',
    Packaged: 'rgba(0,102,255,0.7)',
    'In Transit': 'rgba(191,95,255,0.7)',
    Warehouse: 'rgba(255,184,0,0.5)',
    Retailer: 'rgba(0,229,255,0.5)',
    Delivered: 'rgba(0,255,136,0.7)'
  };

  // Destroy existing chart
  if (state.stageChart) state.stageChart.destroy();

  state.stageChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: stages,
      datasets: [{
        data: counts,
        backgroundColor: stages.map(s => colors[s] || 'rgba(255,255,255,0.3)'),
        borderColor: stages.map(s => (colors[s] || 'rgba(255,255,255,0.3)').replace('0.7', '1')),
        borderWidth: 1.5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: '#8baabe',
            font: { family: 'Exo 2', size: 11 },
            padding: 12
          }
        }
      }
    }
  });
}

function renderRecentActivity(products) {
  const el = document.getElementById('recent-activity');
  if (!products.length) {
    el.innerHTML = '<div class="loading-state">No recent activity</div>';
    return;
  }

  el.innerHTML = products.map(p => `
    <div class="activity-item">
      <div class="activity-dot"></div>
      <div>
        <div class="activity-text">${p.name} <span class="stage-badge stage-${p.currentStage?.replace(/ /g,'-')}">${p.currentStage}</span></div>
        <div class="activity-sub">ID: ${p.productId} · 📍 ${p.currentLocation || p.origin}</div>
      </div>
    </div>
  `).join('');
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let current = 0;
  const step = Math.max(1, Math.floor(target / 20));
  const timer = setInterval(() => {
    current = Math.min(current + step, target);
    el.textContent = current;
    if (current >= target) clearInterval(timer);
  }, 50);
}

// ============================================
// ADD PRODUCT
// ============================================
async function handleAddProduct(event) {
  event.preventDefault();

  const productData = {
    productId: document.getElementById('prod-id').value.trim().toUpperCase(),
    name: document.getElementById('prod-name').value.trim(),
    category: document.getElementById('prod-category').value,
    origin: document.getElementById('prod-origin').value.trim(),
    description: document.getElementById('prod-desc').value.trim(),
    quantity: parseFloat(document.getElementById('prod-qty').value),
    unit: document.getElementById('prod-unit').value,
    pricePerUnit: parseFloat(document.getElementById('prod-price').value) || 0,
    expiryDate: document.getElementById('prod-expiry').value || null
  };

  if (!productData.productId || !productData.name || !productData.origin || !productData.quantity) {
    showError('add-product-error', 'Please fill all required fields (Product ID, Name, Origin, Quantity)');
    return;
  }

  const btn = document.getElementById('add-product-btn');
  setButtonLoading(btn, true, '⟳ Recording on Blockchain...');
  hideEl('add-product-error');
  hideEl('add-product-success');

  try {
    const res = await apiFetch('/products/add', 'POST', productData);

    if (res.success) {
      // Show success message
      const successEl = document.getElementById('add-product-success');
      showEl('add-product-success');
      successEl.innerHTML = `
        ✅ Product <strong>${productData.name}</strong> added!
        ${res.blockchain ? `<br>⛓️ TX: <a href="${res.blockchain.explorerUrl}" target="_blank" style="color:var(--accent)">${res.blockchain.txHash?.substring(0,16)}...</a>` : ''}
      `;

      // Show QR code
      if (res.product?.qrCode) {
        document.getElementById('qr-image').src = res.product.qrCode;
        document.getElementById('qr-product-id').textContent = res.product.productId;
        showEl('qr-preview');
      }

      showToast(`Product ${productData.productId} recorded on blockchain! 🎉`, 'success');
      clearAddForm();
      loadAllProducts();

    } else {
      showError('add-product-error', res.message || 'Failed to add product');
    }

  } catch (err) {
    showError('add-product-error', `Error: ${err.message}`);
  } finally {
    setButtonLoading(btn, false, '⊕ Add Product + Record on Blockchain');
  }
}

function clearAddForm() {
  document.getElementById('add-product-form').reset();
  hideEl('add-product-success');
  hideEl('add-product-error');
  hideEl('qr-preview');
}

// ============================================
// UPDATE STAGE
// ============================================
let selectedStage = '';

function selectStage(stage) {
  selectedStage = stage;
  document.getElementById('selected-stage').value = stage;

  // Update visual selection
  document.querySelectorAll('.stage-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.stage === stage);
  });
}

async function lookupProduct() {
  const productId = document.getElementById('update-prod-id').value.trim().toUpperCase();
  if (!productId) {
    showToast('Enter a Product ID first', 'error');
    return;
  }

  try {
    const res = await apiFetch(`/products/track/${productId}`, 'GET', null, false);

    if (res.success && res.product) {
      const p = res.product;
      document.getElementById('prev-name').textContent = p.name;
      document.getElementById('prev-stage').textContent = p.currentStage;
      document.getElementById('prev-stage').className = `stage-badge stage-${p.currentStage?.replace(/ /g,'-')}`;
      document.getElementById('prev-location').textContent = p.currentLocation || '—';
      document.getElementById('prev-origin').textContent = p.origin;
      showEl('product-preview');
      showToast(`Product found: ${p.name}`, 'success');
    } else {
      hideEl('product-preview');
      showToast(`Product '${productId}' not found`, 'error');
    }
  } catch (err) {
    showToast(`Lookup failed: ${err.message}`, 'error');
  }
}

async function handleUpdateStage(event) {
  event.preventDefault();

  const productId = document.getElementById('update-prod-id').value.trim().toUpperCase();
  const stage = document.getElementById('selected-stage').value;
  const location = document.getElementById('update-location').value.trim();
  const notes = document.getElementById('update-notes').value.trim();
  const temperature = document.getElementById('update-temp').value.trim();

  if (!productId || !stage || !location) {
    showError('update-error', 'Please fill Product ID, select a Stage, and enter Location');
    return;
  }

  const btn = document.getElementById('update-btn');
  setButtonLoading(btn, true, '⟳ Recording on Blockchain...');
  hideEl('update-error');
  hideEl('update-success');
  hideEl('tx-result');

  try {
    const res = await apiFetch('/products/update', 'POST', {
      productId, stage, location, notes, temperature
    });

    if (res.success) {
      showEl('update-success');
      document.getElementById('update-success').textContent =
        `✅ Stage updated to '${stage}' for product ${productId}!`;

      // Show blockchain TX result
      if (res.blockchain) {
        showEl('tx-result');
        const link = document.getElementById('tx-hash-link');
        link.textContent = res.blockchain.txHash;
        link.href = res.blockchain.explorerUrl;
        document.getElementById('tx-memo').textContent = res.blockchain.fullMemo;

        // Animate TX status
        animateTxConfirm();
      }

      showToast(`Stage updated on blockchain! ⛓️`, 'success');
      loadAllProducts();

    } else {
      showError('update-error', res.message || 'Update failed');
    }

  } catch (err) {
    showError('update-error', `Error: ${err.message}`);
  } finally {
    setButtonLoading(btn, false, '⟳ Update Stage on Blockchain');
  }
}

function animateTxConfirm() {
  // Animate pending → confirmed
  const statusEl = document.querySelector('.tx-status');
  if (statusEl) {
    statusEl.style.opacity = '0';
    setTimeout(() => {
      statusEl.textContent = '⌛ Pending...';
      statusEl.style.opacity = '1';
      setTimeout(() => {
        statusEl.textContent = '✓ Transaction Confirmed';
        statusEl.style.color = 'var(--green)';
      }, 1500);
    }, 200);
  }
}

// ============================================
// TRACK PRODUCT
// ============================================
async function trackProduct() {
  const productId = document.getElementById('track-input').value.trim().toUpperCase();
  if (!productId) {
    showToast('Enter a Product ID', 'error');
    return;
  }

  hideEl('track-results');
  hideEl('track-not-found');

  try {
    const res = await apiFetch(`/products/track/${productId}`, 'GET', null, false);

    if (res.success && res.product) {
      const p = res.product;
      renderTrackingResults(p, res.blockchainHistory || []);
    } else {
      showEl('track-not-found');
    }

  } catch (err) {
    if (err.message.includes('404') || err.message.includes('not found')) {
      showEl('track-not-found');
    } else {
      showToast(`Error: ${err.message}`, 'error');
    }
  }
}

function renderTrackingResults(product, blockchainHistory) {
  // Header
  document.getElementById('track-display-id').textContent = product.productId;
  document.getElementById('track-display-name').textContent = product.name;
  document.getElementById('track-display-location').textContent = product.currentLocation || '—';
  document.getElementById('track-display-origin').textContent = product.origin;
  document.getElementById('track-display-date').textContent = formatDate(product.createdAt);

  // Current stage badge
  const stageBadge = document.getElementById('track-current-stage');
  stageBadge.textContent = product.currentStage;
  stageBadge.className = `current-stage-badge stage-badge stage-${product.currentStage?.replace(/ /g,'-')}`;

  // QR code
  if (product.qrCode) {
    document.getElementById('track-qr').innerHTML = `<img src="${product.qrCode}" alt="QR Code" />`;
  }

  // Timeline
  renderTimeline(product.trackingHistory || []);

  // Blockchain transactions
  renderBlockchainTxns(blockchainHistory);

  showEl('track-results');
}

function renderTimeline(history) {
  const container = document.getElementById('timeline-container');

  if (!history.length) {
    container.innerHTML = '<div class="loading-state">No tracking history</div>';
    return;
  }

  container.innerHTML = history.map((event, idx) => {
    const isLatest = idx === history.length - 1;
    const isDelivered = event.stage === 'Delivered';

    return `
      <div class="timeline-event">
        <div class="timeline-dot ${isDelivered ? 'delivered' : ''} ${isLatest ? 'latest' : ''}">
          ${isDelivered ? '✓' : (idx + 1)}
        </div>

        <div class="timeline-stage">${event.stage}</div>

        <div class="timeline-details">
          <span class="timeline-detail">📍 ${event.location}</span>
          <span class="timeline-detail">👤 ${event.updatedByUsername} (${event.updatedByRole})</span>
          <span class="timeline-detail">📅 ${formatDate(event.timestamp)}</span>
          ${event.temperature ? `<span class="timeline-detail">🌡 ${event.temperature}</span>` : ''}
        </div>

        ${event.notes ? `<div class="timeline-notes">${event.notes}</div>` : ''}

        ${event.blockchainTxHash ? `
          <div class="timeline-tx">
            <div class="timeline-tx-label">
              ⛓ Blockchain Record
              <span class="tx-status-badge ${event.txStatus?.toLowerCase()}">${event.txStatus}</span>
            </div>
            <a href="https://stellar.expert/explorer/testnet/tx/${event.blockchainTxHash}"
               target="_blank" title="View on Stellar Expert">
              ${event.blockchainTxHash}
            </a>
            ${event.blockchainMemo ? `<div style="font-size:11px;color:var(--text-3);margin-top:4px">${event.blockchainMemo}</div>` : ''}
          </div>
        ` : '<div class="timeline-notes">⚠️ No blockchain record (network unavailable during update)</div>'}
      </div>
    `;
  }).join('');
}

function renderBlockchainTxns(txns) {
  const container = document.getElementById('blockchain-txns');

  if (!txns.length) {
    container.innerHTML = '<div class="loading-state">No blockchain transactions found</div>';
    return;
  }

  container.innerHTML = txns.slice(0, 10).map(tx => `
    <div class="tx-item">
      <div class="tx-item-left">
        <div class="tx-item-hash">
          <a href="${tx.explorerUrl}" target="_blank">${tx.hash}</a>
        </div>
        <div class="tx-item-memo">📝 ${tx.memo || 'No memo'}</div>
      </div>
      <div class="tx-item-time">${formatDate(tx.createdAt)}</div>
    </div>
  `).join('');
}

// ============================================
// ALL PRODUCTS
// ============================================
async function loadAllProducts() {
  try {
    const search = document.getElementById('search-input')?.value || '';
    const stage = document.getElementById('stage-filter')?.value || '';

    let url = '/products/all?';
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (stage) url += `stage=${encodeURIComponent(stage)}&`;

    const res = await apiFetch(url);

    if (res.success) {
      state.products = res.products;
      renderProductsGrid(res.products);
    }
  } catch (err) {
    document.getElementById('products-grid').innerHTML =
      `<div class="loading-state">Error loading products: ${err.message}</div>`;
  }
}

function renderProductsGrid(products) {
  const grid = document.getElementById('products-grid');

  if (!products.length) {
    grid.innerHTML = `
      <div style="grid-column:1/-1">
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No Products Found</h3>
          <p>Add your first product to start tracking!</p>
        </div>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(p => `
    <div class="product-card" onclick="quickTrack('${p.productId}')">
      <div class="product-card-header">
        <div class="product-card-id">${p.productId}</div>
        <div class="stage-badge stage-${p.currentStage?.replace(/ /g,'-')}">${p.currentStage}</div>
      </div>
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-meta">
        <span>🌾 ${p.origin}</span>
        <span>📍 ${p.currentLocation || p.origin}</span>
        <span>⚖ ${p.quantity} ${p.unit}</span>
        <span>🏷 ${p.category}</span>
      </div>
      <div class="product-card-footer">
        <span class="product-card-date">📅 ${formatDate(p.createdAt)}</span>
        <span style="font-size:11px;color:var(--text-3)">by ${p.createdByUsername}</span>
      </div>
    </div>
  `).join('');
}

function filterProducts() {
  loadAllProducts();
}

function quickTrack(productId) {
  document.getElementById('track-input').value = productId;
  showSection('track-product');
  trackProduct();
}

// ============================================
// ADMIN
// ============================================
async function loadAdminData() {
  try {
    // Load users
    const usersRes = await apiFetch('/auth/users');
    if (usersRes.success) renderUsersTable(usersRes.users);

    // Load all products for admin table
    const prodsRes = await apiFetch('/products/all?limit=50');
    if (prodsRes.success) renderAdminProductsTable(prodsRes.products);

  } catch (err) {
    console.error('Admin load error:', err.message);
  }
}

function renderUsersTable(users) {
  const tbody = document.getElementById('users-table-body');
  tbody.innerHTML = users.map(u => `
    <tr>
      <td><strong>${u.username}</strong></td>
      <td>${u.fullName}</td>
      <td><span class="stage-badge stage-${u.role}">${u.role}</span></td>
      <td>${u.email}</td>
      <td class="font-mono" style="font-size:10px">${u.stellarPublicKey ? u.stellarPublicKey.substring(0,16) + '...' : '—'}</td>
      <td>${formatDate(u.createdAt)}</td>
    </tr>
  `).join('');
}

function renderAdminProductsTable(products) {
  const tbody = document.getElementById('admin-products-body');
  tbody.innerHTML = products.map(p => `
    <tr>
      <td class="font-mono">${p.productId}</td>
      <td><strong>${p.name}</strong></td>
      <td>${p.origin}</td>
      <td><span class="stage-badge stage-${p.currentStage?.replace(/ /g,'-')}">${p.currentStage}</span></td>
      <td>${p.createdByUsername}</td>
      <td>${formatDate(p.createdAt)}</td>
      <td>
        <button onclick="quickTrack('${p.productId}')" class="btn-refresh" style="font-size:11px;padding:4px 10px;">
          🔍 Track
        </button>
      </td>
    </tr>
  `).join('');
}

// ============================================
// WALLET
// ============================================
async function loadWallet() {
  if (!state.user?.stellarPublicKey) return;

  try {
    const res = await apiFetch('/auth/wallet');

    if (res.success) {
      const balance = res.wallet.balances?.[0]?.balance || '0';
      document.getElementById('wallet-balance').textContent = parseFloat(balance).toLocaleString();
      document.getElementById('wallet-pubkey').textContent = state.user.stellarPublicKey;

      // Set explorer link
      const explorerLink = document.getElementById('stellar-explorer-link');
      explorerLink.href = `https://stellar.expert/explorer/testnet/account/${state.user.stellarPublicKey}`;
    }
  } catch (err) {
    document.getElementById('wallet-balance').textContent = 'Error';
  }
}

function copyKey() {
  const key = state.user?.stellarPublicKey;
  if (key) {
    navigator.clipboard.writeText(key).then(() => {
      showToast('Public key copied to clipboard!', 'success');
    });
  }
}

// ============================================
// LOGOUT
// ============================================
function logout() {
  state.token = null;
  state.user = null;
  state.products = [];
  localStorage.removeItem('sc_token');
  localStorage.removeItem('sc_user');

  showEl('page-login');
  hideEl('page-app');
  showLogin();
  showToast('Logged out successfully', 'info');
}

// ============================================
// LOGIN/REGISTER TOGGLE
// ============================================
function showRegister() {
  hideEl('login-form-card');
  showEl('register-form-card');
}

function showLogin() {
  showEl('login-form-card');
  hideEl('register-form-card');
}

function showLoginPage() {
  showEl('page-login');
  hideEl('page-app');
}

function fillDemo(username, password) {
  document.getElementById('login-username').value = username;
  document.getElementById('login-password').value = password;
}

function togglePassword(inputId) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
}

// ============================================
// MODAL
// ============================================
function openModal(content) {
  document.getElementById('modal-content').innerHTML = content;
  showEl('modal-overlay');
}
function closeModal() {
  hideEl('modal-overlay');
}

// ============================================
// API HELPER
// ============================================
async function apiFetch(endpoint, method = 'GET', body = null, requiresAuth = true) {
  const url = API_BASE + endpoint;
  const headers = { 'Content-Type': 'application/json' };

  if (requiresAuth && state.token) {
    headers['Authorization'] = `Bearer ${state.token}`;
  }

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const response = await fetch(url, options);
  const data = await response.json();

  // Handle auth errors
  if (response.status === 401) {
    logout();
    throw new Error('Session expired. Please login again.');
  }

  if (!response.ok && !data) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
}

// ============================================
// UI HELPERS
// ============================================
function showEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('hidden');
}

function hideEl(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showError(id, msg) {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = '❌ ' + msg;
    el.classList.remove('hidden');
  }
}

function setButtonLoading(btn, isLoading, loadingText) {
  if (!btn) return;
  const textEl = btn.querySelector('.btn-text');
  const loaderEl = btn.querySelector('.btn-loader');

  if (isLoading) {
    btn.disabled = true;
    if (textEl) textEl.classList.add('hidden');
    if (loaderEl) {
      loaderEl.classList.remove('hidden');
      if (loadingText) loaderEl.textContent = loadingText;
    }
  } else {
    btn.disabled = false;
    if (textEl) textEl.classList.remove('hidden');
    if (loaderEl) loaderEl.classList.add('hidden');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type]}</span><span>${message}</span>`;

  container.appendChild(toast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'none';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

// ============================================
// KEYBOARD SHORTCUTS
// ============================================
document.addEventListener('keydown', (e) => {
  // Press Enter to track when focused on track input
  if (e.key === 'Enter' && document.activeElement?.id === 'track-input') {
    trackProduct();
  }
  // Escape to close modal
  if (e.key === 'Escape') closeModal();
});

// ============================================
// SEED DEMO DATA (helper function for testing)
// ============================================
// Call this from console: seedDemoData()
window.seedDemoData = async function() {
  console.log('🌱 Seeding demo data...');
  console.log('Use the UI to register users and add products.');
  console.log('Or use these API calls:');
  console.log(`
  // Register a farmer:
  fetch('${API_BASE}/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'farmer1',
      fullName: 'Rajesh Kumar',
      email: 'farmer@example.com',
      password: 'password123',
      role: 'Farmer'
    })
  }).then(r => r.json()).then(console.log);
  `);
};

console.log('🚀 ChainTrace initialized. Type seedDemoData() for demo instructions.');
