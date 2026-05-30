const ordersContainer = document.getElementById('orders-container');
const staffUserElement = document.getElementById('staff-user');
const logoutButton = document.getElementById('staff-logout');
const staffPasswordModal = document.getElementById('staff-password-modal');
const staffChangePasswordForm = document.getElementById('staff-change-password-form');
const staffPasswordFeedback = document.getElementById('staff-password-feedback');
const staffChangePasswordBtn = document.getElementById('staff-change-password');
const staffCloseModalBtn = document.getElementById('staff-close-modal');

function getCurrentUser() {
  try {
    const stored = JSON.parse(localStorage.getItem('coffeeUser')) || null;
    if (!stored) {
      return null;
    }
    if (stored.username) {
      return stored;
    }
    if (stored.name) {
      stored.username = stored.name;
      return stored;
    }
    return null;
  } catch (error) {
    return null;
  }
}

async function fetchOrders() {
  const formData = new URLSearchParams();
  formData.append('action', 'getOrders');

  const response = await fetch('api_orders.php', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  return result.success ? result.data : [];
}

async function updateOrderStatus(orderId, newStatus) {
  const formData = new URLSearchParams();
  formData.append('action', 'updateStatus');
  formData.append('orderId', orderId);
  formData.append('newStatus', newStatus);

  const response = await fetch('api_orders.php', {
    method: 'POST',
    body: formData,
  });
  return response.json();
}

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

async function renderOrders() {
  const orders = await fetchOrders();
  if (orders.length === 0) {
    ordersContainer.innerHTML = '<p>No customer orders have been placed yet.</p>';
    return;
  }

  ordersContainer.innerHTML = '';
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
    ordersContainer.appendChild(card);
  });
}

function logout() {
  localStorage.removeItem('coffeeUser');
  window.location.href = 'login.html';
}

function showStaffPasswordFeedback(message, isError) {
  staffPasswordFeedback.textContent = message;
  staffPasswordFeedback.style.display = 'block';
  staffPasswordFeedback.style.background = isError ? '#ffe6dc' : '#f6f4ff';
  staffPasswordFeedback.style.color = isError ? '#8d2a12' : '#2f2b4f';
}

function openStaffPasswordModal() {
  staffPasswordModal.style.display = 'flex';
}

function closeStaffPasswordModal() {
  staffPasswordModal.style.display = 'none';
  staffChangePasswordForm.reset();
  staffPasswordFeedback.style.display = 'none';
}

staffChangePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentUser = getCurrentUser();
  const currentPass = document.getElementById('staff-current-pass').value.trim();
  const newPass = document.getElementById('staff-new-pass').value.trim();
  const confirmPass = document.getElementById('staff-confirm-pass').value.trim();

  if (!currentPass || !newPass || !confirmPass) {
    showStaffPasswordFeedback('Please fill in all fields.', true);
    return;
  }

  if (newPass.length < 4) {
    showStaffPasswordFeedback('New password must be at least 4 characters.', true);
    return;
  }

  if (newPass !== confirmPass) {
    showStaffPasswordFeedback('New passwords do not match.', true);
    return;
  }

  const formData = new URLSearchParams();
  formData.append('action', 'changePassword');
  formData.append('username', currentUser.username);
  formData.append('currentPass', currentPass);
  formData.append('newPass', newPass);
  formData.append('confirmPass', confirmPass);

  const response = await fetch('api_auth.php', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();

  if (!result.success) {
    showStaffPasswordFeedback(result.message || 'Unable to change password.', true);
    return;
  }

  showStaffPasswordFeedback(result.message, false);
  setTimeout(() => {
    logout();
  }, 1500);
});

window.addEventListener('DOMContentLoaded', async () => {
  const currentUser = getCurrentUser();
  if (!currentUser || currentUser.role !== 'staff') {
    window.location.href = 'login.html';
    return;
  }

  staffUserElement.textContent = currentUser.username;
  await renderOrders();
  logoutButton.addEventListener('click', logout);
  staffChangePasswordBtn.addEventListener('click', openStaffPasswordModal);
  staffCloseModalBtn.addEventListener('click', closeStaffPasswordModal);
  staffPasswordModal.addEventListener('click', (e) => {
    if (e.target === staffPasswordModal) closeStaffPasswordModal();
  });

  ordersContainer.addEventListener('click', async (e) => {
    if (!e.target.matches('.status-btn')) {
      return;
    }

    const orderId = e.target.dataset.orderId;
    const select = document.querySelector(`.status-select[data-order-id="${orderId}"]`);
    const newStatus = select?.value;
    if (!orderId || !newStatus) {
      return;
    }

    e.target.textContent = 'Saving...';
    e.target.disabled = true;

    const result = await updateOrderStatus(orderId, newStatus);

    e.target.disabled = false;
    e.target.textContent = 'Save';

    if (!result.success) {
      alert(result.message || 'Failed to update order status.');
      return;
    }

    await renderOrders();
  });
});
