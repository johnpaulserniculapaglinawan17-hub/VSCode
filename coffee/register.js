const registerForm = document.getElementById('register-form');
const registerFeedback = document.getElementById('register-feedback');

function showRegisterFeedback(message, isError) {
  registerFeedback.textContent = message;
  registerFeedback.style.display = 'block';
  registerFeedback.style.background = isError ? '#ffe7e7' : '#eef4ff';
  registerFeedback.style.color = isError ? '#8c1618' : '#2c3f70';
}

async function registerUser(username, password, confirm) {
  const formData = new URLSearchParams();
  formData.append('action', 'register');
  formData.append('username', username);
  formData.append('password', password);
  formData.append('confirm', confirm);

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

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value.trim();
  const confirm = document.getElementById('reg-password-confirm').value.trim();

  if (!username || !password || !confirm) {
    showRegisterFeedback('Please complete all fields.', true);
    return;
  }

  if (password.length < 4) {
    showRegisterFeedback('Password must be at least 4 characters.', true);
    return;
  }

  if (password !== confirm) {
    showRegisterFeedback('Passwords do not match.', true);
    return;
  }

  const result = await registerUser(username, password, confirm);
  if (!result.success) {
    showRegisterFeedback(result.message, true);
    return;
  }

  localStorage.setItem('coffeeUser', JSON.stringify(result.data));
  window.location.href = 'ordering.html';
});

window.addEventListener('DOMContentLoaded', () => {
  const current = localStorage.getItem('coffeeUser');
  if (current) {
    window.location.href = 'ordering.html';
  }
});