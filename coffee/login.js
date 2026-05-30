const loginForm = document.getElementById('login-form');
const loginFeedback = document.getElementById('login-feedback');

function showLoginFeedback(message, isError) {
  loginFeedback.textContent = message;
  loginFeedback.style.display = 'block';
  loginFeedback.style.background = isError ? '#ffe7e7' : '#eef4ff';
  loginFeedback.style.color = isError ? '#8c1616' : '#2c3f70';
}

async function loginUser(username, password) {
  const formData = new URLSearchParams();
  formData.append('action', 'login');
  formData.append('username', username);
  formData.append('password', password);

  try {
    const response = await fetch('api_auth.php', {
      method: 'POST',
      body: formData,
    });
    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (err) {
      return { success: false, message: 'Server returned invalid response: ' + text };
    }
  } catch (err) {
    return { success: false, message: 'Network error: ' + err.message };
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value.trim();

  if (!username || !password) {
    showLoginFeedback('Enter both username and password.', true);
    return;
  }

  const result = await loginUser(username, password);
  if (!result.success) {
    showLoginFeedback(result.message, true);
    return;
  }

  localStorage.setItem('coffeeUser', JSON.stringify(result.data));
  window.location.href = result.data.role === 'staff' ? 'staff-dashboard.html' : 'ordering.html';
});

window.addEventListener('DOMContentLoaded', () => {
  const storedUser = localStorage.getItem('coffeeUser');
  if (!storedUser) {
    return;
  }

  try {
    const userData = JSON.parse(storedUser);
    window.location.href = userData.role === 'staff' ? 'staff-dashboard.html' : 'ordering.html';
  } catch (error) {
    localStorage.removeItem('coffeeUser');
  }
});
