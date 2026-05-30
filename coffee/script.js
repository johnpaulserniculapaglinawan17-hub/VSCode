const menuItems = [
  { id: 'espresso', name: 'Espresso', description: 'Strong and bold single shot of coffee.', price: 2.50, image: 'OIP.webp' },
  { id: 'latte', name: 'Latte', description: 'Espresso blended with steamed milk and topped with light foam, creamy and mild.', price: 4.50, image: 'OIP (1).webp' },
  { id: 'cappuccino', name: 'Cappuccino', description: 'Creamy cappuccino with milk foam.', price: 4.75, image: 'OIP (2).webp' },
  { id: 'macchiato', name: 'Macchiato', description: 'Espresso topped with a small amount of milk foam, keeping the coffee strong.', price: 3.75, image: 'OIP (3).webp' },
  { id: 'icedcoffee', name: 'Iced Coffee', description: 'Chilled brewed coffee served over ice.', price: 4.00, image: 'OIP (4).webp' },
  { id: 'coldbrew', name: 'Cold Brew', description: 'Coffee steeped in cold water for hours, producing smooth low-acid flavor.', price: 5.25, image: 'OIP (5).webp' },
];

const order = {};
const orderList = document.getElementById('order-list');
const subtotalElement = document.getElementById('order-subtotal');
const taxElement = document.getElementById('order-tax');
const totalElement = document.getElementById('order-total');
const feedbackElement = document.getElementById('order-feedback');
const currentUserElement = document.getElementById('current-user');
const passwordModal = document.getElementById('password-modal');
const changePasswordForm = document.getElementById('change-password-form');
const passwordFeedback = document.getElementById('password-feedback');
const changePasswordBtn = document.getElementById('change-password');
const closeModalBtn = document.getElementById('close-modal');

function formatCurrency(amount) {
  return amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
  });
}

function buildMenu() {
  const menuGrid = document.getElementById('drink-grid');
  menuGrid.innerHTML = '';

  menuItems.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'drink-card';
    card.innerHTML = `
      <div class="drink-info">
        <img class="drink-image" src="${item.image}" alt="${item.name} photo" />
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

    menuGrid.appendChild(card);
  });

  menuGrid.querySelectorAll('input[type="number"]').forEach((input) => {
    input.addEventListener('input', handleQuantityChange);
  });
}

function handleQuantityChange(event) {
  const input = event.target;
  const itemId = input.dataset.id;
  const value = Math.max(0, Math.floor(Number(input.value) || 0));
  input.value = value;

  if (value > 0) {
    order[itemId] = value;
  } else {
    delete order[itemId];
  }

  refreshSummary();
}

function refreshSummary() {
  orderList.innerHTML = '';
  let subtotal = 0;

  Object.entries(order).forEach(([id, quantity]) => {
    const item = menuItems.find((menuItem) => menuItem.id === id);
    if (!item) return;

    const itemTotal = item.price * quantity;
    subtotal += itemTotal;

    const line = document.createElement('li');
    line.innerHTML = `<span>${item.name} × ${quantity}</span><strong>${formatCurrency(itemTotal)}</strong>`;
    orderList.appendChild(line);
  });

  const tax = subtotal * 0.07;
  const total = subtotal + tax;

  subtotalElement.textContent = formatCurrency(subtotal);
  taxElement.textContent = formatCurrency(tax);
  totalElement.textContent = formatCurrency(total);
}

async function submitOrder() {
  const deliveryType = document.querySelector('input[name="order-type"]:checked').value;
  const currentUser = getCurrentUser();

  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }

  if (currentUser.role === 'staff') {
    window.location.href = 'staff-dashboard.html';
    return;
  }

  if (Object.keys(order).length === 0) {
    showFeedback('Please add at least one drink to your order.', true);
    return;
  }

  const items = Object.entries(order).map(([id, qty]) => {
    const item = menuItems.find((menuItem) => menuItem.id === id);
    return { id, name: item.name, price: item.price, quantity: qty };
  });

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = parseFloat((subtotal * 0.07).toFixed(2));
  const total = parseFloat((subtotal + tax).toFixed(2));

  const formData = new URLSearchParams();
  formData.append('action', 'submitOrder');
  formData.append('customerId', currentUser.id);
  formData.append('customerName', currentUser.username);
  formData.append('orderType', deliveryType);
  formData.append('items', JSON.stringify(items));
  formData.append('subtotal', subtotal.toFixed(2));
  formData.append('tax', tax.toFixed(2));
  formData.append('total', total.toFixed(2));

  const response = await fetch('api_orders.php', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();

  if (!result.success) {
    showFeedback(result.message || 'Failed to place order.', true);
    return;
  }

  clearCurrentOrder();
  showFeedback(`Thanks, ${currentUser.username}! Your ${deliveryType} order was placed.`, false);
}

function showFeedback(message, isError) {
  feedbackElement.textContent = message;
  feedbackElement.style.display = 'block';
  feedbackElement.style.background = isError ? '#ffe6dc' : '#f6f4ff';
  feedbackElement.style.color = isError ? '#8d2a12' : '#2f2b4f';
}

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

function clearCurrentOrder() {
  Object.keys(order).forEach((id) => {
    const input = document.querySelector(`[data-id="${id}"]`);
    if (input) {
      input.value = 0;
    }
    delete order[id];
  });
  refreshSummary();
}

function logout() {
  localStorage.removeItem('coffeeUser');
  window.location.href = 'login.html';
}

function showPasswordFeedback(message, isError) {
  passwordFeedback.textContent = message;
  passwordFeedback.style.display = 'block';
  passwordFeedback.style.background = isError ? '#ffe6dc' : '#f6f4ff';
  passwordFeedback.style.color = isError ? '#8d2a12' : '#2f2b4f';
}

function openPasswordModal() {
  passwordModal.style.display = 'flex';
}

function closePasswordModal() {
  passwordModal.style.display = 'none';
  changePasswordForm.reset();
  passwordFeedback.style.display = 'none';
}

changePasswordForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentUser = getCurrentUser();
  const currentPass = document.getElementById('current-pass').value.trim();
  const newPass = document.getElementById('new-pass').value.trim();
  const confirmPass = document.getElementById('confirm-pass').value.trim();

  if (!currentPass || !newPass || !confirmPass) {
    showPasswordFeedback('Please fill in all fields.', true);
    return;
  }

  if (newPass.length < 4) {
    showPasswordFeedback('New password must be at least 4 characters.', true);
    return;
  }

  if (newPass !== confirmPass) {
    showPasswordFeedback('New passwords do not match.', true);
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
    showPasswordFeedback(result.message || 'Unable to change password.', true);
    return;
  }

  showPasswordFeedback(result.message, false);
  setTimeout(() => {
    logout();
  }, 1500);
});

window.addEventListener('DOMContentLoaded', () => {
  const currentUser = getCurrentUser();
  if (!currentUser || !currentUser.username) {
    window.location.href = 'login.html';
    return;
  }

  if (currentUser.role === 'staff') {
    window.location.href = 'staff-dashboard.html';
    return;
  }

  currentUserElement.textContent = currentUser.username;
  buildMenu();
  refreshSummary();
  document.getElementById('place-order').addEventListener('click', submitOrder);
  document.getElementById('logout').addEventListener('click', logout);
  changePasswordBtn.addEventListener('click', openPasswordModal);
  closeModalBtn.addEventListener('click', closePasswordModal);
  passwordModal.addEventListener('click', (e) => {
    if (e.target === passwordModal) closePasswordModal();
  });
});
