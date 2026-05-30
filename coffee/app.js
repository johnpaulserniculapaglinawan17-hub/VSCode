const appState = {
  currentView: 'auth',
  currentUser: null,
  order: {},
  menuItems: [
    { id: 'espresso', name: 'Espresso', description: 'Strong and bold single shot of coffee.', price: 2.50, image: 'OIP.webp' },
    { id: 'latte', name: 'Latte', description: 'Espresso blended with steamed milk and topped with light foam, creamy and mild.', price: 4.50, image: 'OIP (1).webp' },
    { id: 'cappuccino', name: 'Cappuccino', description: 'Creamy cappuccino with milk foam.', price: 4.75, image: 'OIP (2).webp' },
    { id: 'macchiato', name: 'Macchiato', description: 'Espresso topped with a small amount of milk foam, keeping the coffee strong.', price: 3.75, image: 'OIP (3).webp' },
    { id: 'icedcoffee', name: 'Iced Coffee', description: 'Chilled brewed coffee served over ice.', price: 4.00, image: 'OIP (4).webp' },
    { id: 'coldbrew', name: 'Cold Brew', description: 'Coffee steeped in cold water for hours, producing smooth low-acid flavor.', price: 5.25, image: 'OIP (5).webp' },
  ],
};

const views = {
  auth: document.getElementById('view-auth'),
  ordering: document.getElementById('view-ordering'),
  staff: document.getElementById('view-staff'),
};
const authForms = {
  login: document.getElementById('login-form'),
  register: document.getElementById('register-form'),
  staff: document.getElementById('staff-login-form'),
};
const authFeedback = {
  login: document.getElementById('login-feedback'),
  register: document.getElementById('register-feedback'),
  staff: document.getElementById('staff-login-feedback'),
};
const topUserPanel = document.getElementById('top-user-panel');
const topUserLabel = document.getElementById('top-user-label');
const openPasswordButton = document.getElementById('open-password');
const logoutButton = document.getElementById('top-logout');
const passwordModal = document.getElementById('password-modal');
const closeModalButton = document.getElementById('close-modal');
const changePasswordForm = document.getElementById('change-password-form');
const passwordFeedback = document.getElementById('password-feedback');

const drinkGrid = document.getElementById('drink-grid');
const orderList = document.getElementById('order-list');
const subtotalElement = document.getElementById('order-subtotal');
const taxElement = document.getElementById('order-tax');
const totalElement = document.getElementById('order-total');
const orderFeedback = document.getElementById('order-feedback');
const placeOrderButton = document.getElementById('place-order');

const staffOrdersContainer = document.getElementById('orders-container');

function showView(viewName) {
  appState.currentView = viewName;
  Object.entries(views).forEach(([name, section]) => {
    section.style.display = name === viewName ? 'block' : 'none';
  });

  if (viewName === 'auth') {
    topUserPanel.style.display = 'none';
  } else {
    topUserPanel.style.display = 'flex';
  }
}

function setAuthTab(tabName) {
  Object.values(authForms).forEach((form) => {
    form.style.display = 'none';
  });
  authForms[tabName].style.display = 'grid';
  Object.values(authFeedback).forEach((feedback) => {
    feedback.style.display = 'none';
  });
}

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

function getCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('coffeeUser')) || null;
    if (!stored) return null;
    if (stored.username) return stored;
    if (stored.name) {
      stored.username = stored.name;
      return stored;
    }
    return null;
  } catch (error) {
    return null;
  }
}

function setCurrentUser(user) {
  appState.currentUser = user;
  localStorage.setItem('coffeeUser', JSON.stringify(user));
}

function clearCurrentUser() {
  appState.currentUser = null;
  localStorage.removeItem('coffeeUser');
}

function showFeedback(element, message, isError = true) {
  element.textContent = message;
  element.style.display = 'block';
  element.style.background = isError ? '#ffe7e7' : '#eef4ff';
  element.style.color = isError ? '#8c1616' : '#2c3f70';
}

function clearFeedbackElements() {
  [...Object.values(authFeedback), orderFeedback, passwordFeedback].forEach((element) => {
    element.style.display = 'none';
  });
}

function buildMenu() {
  drinkGrid.innerHTML = '';
  appState.menuItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'drink-card';
    card.innerHTML = `
      <div class="drink-info">
        <img class="drink-image" src="${item.image}" alt="${item.name}" />
        <div>
          <h3>${item.name}</h3>
          <p>${item.description}</p>
          <div class="quantity-control">
            <label for="qty-${item.id}">Qty</label>
            <input type="number" id="qty-${item.id}" min="0" value="0" data-id="${item.id}" />
          </div>
        </div>
      </div>
      <div class="drink-meta">
        <div class="price">${formatCurrency(item.price)}</div>
      </div>
    `;
    drinkGrid.appendChild(card);
  });
  drinkGrid.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener('input', handleQuantityChange);
  });
}

function handleQuantityChange(event) {
  const input = event.target;
  const itemId = input.dataset.id;
  const value = Math.max(0, Math.floor(Number(input.value) || 0));
  input.value = value;
  if (value > 0) {
    appState.order[itemId] = value;
  } else {
    delete appState.order[itemId];
  }
  refreshSummary();
}

function refreshSummary() {
  orderList.innerHTML = '';
  let subtotal = 0;
  Object.entries(appState.order).forEach(([id, quantity]) => {
    const item = appState.menuItems.find((menuItem) => menuItem.id === id);
    if (!item) return;
    const itemTotal = item.price * quantity;
    subtotal += itemTotal;

    const line = document.createElement('li');
    line.innerHTML = `<span>${item.name} × ${quantity}</span><strong>${formatCurrency(itemTotal)}</strong>`;
    orderList.appendChild(line);
  });

  const tax = parseFloat((subtotal * 0.07).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  subtotalElement.textContent = formatCurrency(subtotal);
  taxElement.textContent = formatCurrency(tax);
  totalElement.textContent = formatCurrency(total);
}

async function apiPost(url, data) {
  const response = await fetch(url, {
    method: 'POST',
    body: data,
  });
  return response.json();
}

async function submitOrder() {
  clearFeedbackElements();
  if (!appState.currentUser || !appState.currentUser.username) {
    setView('auth');
    return;
  }
  if (Object.keys(appState.order).length === 0) {
    showFeedback(orderFeedback, 'Please add at least one drink to your order.', true);
    return;
  }

  const items = Object.entries(appState.order).map(([id, qty]) => {
    const item = appState.menuItems.find((menuItem) => menuItem.id === id);
    return { id, name: item.name, price: item.price, quantity: qty };
  });
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = parseFloat((subtotal * 0.07).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));
  const orderType = document.querySelector('input[name="order-type"]:checked')?.value || 'Pickup';

  const formData = new URLSearchParams();
  formData.append('action', 'submitOrder');
  formData.append('customerId', appState.currentUser.id);
  formData.append('customerName', appState.currentUser.username);
  formData.append('orderType', orderType);
  formData.append('items', JSON.stringify(items));
  formData.append('subtotal', subtotal.toFixed(2));
  formData.append('tax', tax.toFixed(2));
  formData.append('total', total.toFixed(2));

  const result = await apiPost('api_orders.php', formData);
  if (!result.success) {
    showFeedback(orderFeedback, result.message || 'Failed to place order.', true);
    return;
  }

  appState.order = {};
  drinkGrid.querySelectorAll('input[type="number"]').forEach((input) => { input.value = 0; });
  refreshSummary();
  showFeedback(orderFeedback, `Thanks, ${appState.currentUser.username}! Your ${orderType} order was placed.`, false);
}

async function loginUser(username, password, roleType = 'customer') {
  const formData = new URLSearchParams();
  formData.append('action', 'login');
  formData.append('username', username);
  formData.append('password', password);
  return apiPost('api_auth.php', formData);
}

async function registerUser(username, password, confirm) {
  const formData = new URLSearchParams();
  formData.append('action', 'register');
  formData.append('username', username);
  formData.append('password', password);
  formData.append('confirm', confirm);
  return apiPost('api_auth.php', formData);
}

async function changePassword(currentPass, newPass, confirmPass) {
  const formData = new URLSearchParams();
  formData.append('action', 'changePassword');
  formData.append('username', appState.currentUser.username);
  formData.append('currentPass', currentPass);
  formData.append('newPass', newPass);
  formData.append('confirmPass', confirmPass);
  return apiPost('api_auth.php', formData);
}

async function fetchOrders() {
  const formData = new URLSearchParams();
  formData.append('action', 'getOrders');
  const result = await apiPost('api_orders.php', formData);
  return result.success ? result.data : [];
}

async function updateOrderStatus(orderId, newStatus) {
  const formData = new URLSearchParams();
  formData.append('action', 'updateStatus');
  formData.append('orderId', orderId);
  formData.append('newStatus', newStatus);
  return apiPost('api_orders.php', formData);
}

async function renderStaffOrders() {
  staffOrdersContainer.innerHTML = '<p>Loading orders…</p>';
  const orders = await fetchOrders();
  if (!orders.length) {
    staffOrdersContainer.innerHTML = '<p>No orders have been placed yet.</p>';
    return;
  }
  staffOrdersContainer.innerHTML = '';
  orders.forEach((order) => {
    const card = document.createElement('div');
    card.className = 'order-card';
    card.innerHTML = `
      <div class="order-card-header">
        <div>
          <strong>Order ID:</strong> ${order.order_id}<br />
          <strong>Customer:</strong> ${order.customer_name}
        </div>
        <div>
          <strong>${order.order_type}</strong><br />
          <small>${new Date(order.placed_at).toLocaleString()}</small>
        </div>
      </div>
      <div class="order-items">
        ${order.items.map(item => `<div class="order-item"><span>${item.quantity} × ${item.name}</span><strong>${formatCurrency(item.price * item.quantity)}</strong></div>`).join('')}
      </div>
      <div class="order-summary-list">
        <div><span>Subtotal</span><strong>${formatCurrency(order.subtotal)}</strong></div>
        <div><span>Tax</span><strong>${formatCurrency(order.tax)}</strong></div>
        <div><span>Total</span><strong>${formatCurrency(order.total)}</strong></div>
      </div>
      <div class="order-status"><span>Status:</span> ${order.status}</div>
      <div class="status-actions">
        <label for="status-${order.order_id}">Update status</label>
        <div class="status-controls">
          <select id="status-${order.order_id}" class="status-select" data-order-id="${order.order_id}">
            ${['new', 'preparing', 'ready', 'completed'].map(status => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status.charAt(0).toUpperCase() + status.slice(1)}</option>`).join('')}
          </select>
          <button type="button" class="status-btn" data-order-id="${order.order_id}">Save</button>
        </div>
      </div>
    `;
    staffOrdersContainer.appendChild(card);
  });
}

function setupAuthTabs() {
  document.querySelectorAll('[data-auth-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      setAuthTab(button.dataset.authTab);
    });
  });
}

function setView(viewKey) {
  showView(viewKey);
  if (viewKey === 'ordering') {
    buildMenu();
    refreshSummary();
  }
  if (viewKey === 'staff') {
    renderStaffOrders();
  }
}

function showUserPanel() {
  if (!appState.currentUser) {
    topUserPanel.style.display = 'none';
    return;
  }
  topUserPanel.style.display = 'flex';
  topUserLabel.textContent = `Signed in as ${appState.currentUser.username}`;
}

async function handleLogin(event, roleType = 'customer') {
  event.preventDefault();
  clearFeedbackElements();
  const form = event.target;
  const username = form.querySelector('input[type="text"]').value.trim();
  const password = form.querySelector('input[type="password"]').value.trim();
  if (!username || !password) {
    showFeedback(authFeedback[roleType], 'Enter both username and password.', true);
    return;
  }
  const result = await loginUser(username, password, roleType);
  if (!result.success || (roleType === 'staff' && result.data.role !== 'staff')) {
    showFeedback(authFeedback[roleType], 'Invalid credentials.', true);
    return;
  }
  setCurrentUser(result.data);
  showUserPanel();
  setView(result.data.role === 'staff' ? 'staff' : 'ordering');
}

async function handleRegister(event) {
  event.preventDefault();
  clearFeedbackElements();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const confirm = document.getElementById('reg-password-confirm').value.trim();
  if (!username || !password || !confirm) {
    showFeedback(authFeedback.register, 'Please complete all fields.', true);
    return;
  }
  if (password.length < 4) {
    showFeedback(authFeedback.register, 'Password must be at least 4 characters.', true);
    return;
  }
  if (password !== confirm) {
    showFeedback(authFeedback.register, 'Passwords do not match.', true);
    return;
  }
  const result = await registerUser(username, password, confirm);
  if (!result.success) {
    showFeedback(authFeedback.register, result.message || 'Registration failed.', true);
    return;
  }
  setCurrentUser(result.data);
  showUserPanel();
  setView('ordering');
}

async function handleChangePassword(event) {
  event.preventDefault();
  clearFeedbackElements();
  const currentPass = document.getElementById('current-pass').value.trim();
  const newPass = document.getElementById('new-pass').value.trim();
  const confirmPass = document.getElementById('confirm-pass').value.trim();
  if (!currentPass || !newPass || !confirmPass) {
    showFeedback(passwordFeedback, 'Please fill in all fields.', true);
    return;
  }
  if (newPass.length < 4) {
    showFeedback(passwordFeedback, 'New password must be at least 4 characters.', true);
    return;
  }
  if (newPass !== confirmPass) {
    showFeedback(passwordFeedback, 'New passwords do not match.', true);
    return;
  }
  const result = await changePassword(currentPass, newPass, confirmPass);
  if (!result.success) {
    showFeedback(passwordFeedback, result.message || 'Unable to change password.', true);
    return;
  }
  showFeedback(passwordFeedback, result.message, false);
  setTimeout(() => {
    closePasswordModal();
    clearCurrentUser();
    setView('auth');
  }, 1400);
}

function openPasswordModal() {
  passwordModal.style.display = 'flex';
}

function closePasswordModal() {
  passwordModal.style.display = 'none';
  changePasswordForm.reset();
  passwordFeedback.style.display = 'none';
}

function logout() {
  clearCurrentUser();
  setView('auth');
}

function initializeApp() {
  setupAuthTabs();
  authForms.login.addEventListener('submit', (event) => handleLogin(event, 'login'));
  authForms.register.addEventListener('submit', handleRegister);
  authForms.staff.addEventListener('submit', (event) => handleLogin(event, 'staff'));
  placeOrderButton.addEventListener('click', submitOrder);
  openPasswordButton.addEventListener('click', openPasswordModal);
  logoutButton.addEventListener('click', logout);
  closeModalButton.addEventListener('click', closePasswordModal);
  passwordModal.addEventListener('click', (event) => {
    if (event.target === passwordModal) {
      closePasswordModal();
    }
  });
  changePasswordForm.addEventListener('submit', handleChangePassword);

  appState.currentUser = getCurrentUser();
  if (appState.currentUser) {
    showUserPanel();
    setView(appState.currentUser.role === 'staff' ? 'staff' : 'ordering');
  } else {
    setAuthTab('login');
    setView('auth');
  }
}

initializeApp();
