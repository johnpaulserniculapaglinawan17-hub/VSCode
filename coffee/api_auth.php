<?php
header('Content-Type: application/json');
require_once 'db_config.php';

function hashPassword($password) {
  return password_hash($password, PASSWORD_DEFAULT);
}

function verifyPassword($password, $storedHash) {
  if (password_verify($password, $storedHash)) {
    return true;
  }
  return md5($password) === $storedHash;
}

$action = sanitize($_POST['action'] ?? '');

if ($action === 'register') {
  $username = sanitize($_POST['username'] ?? '');
  $password = trim($_POST['password'] ?? '');
  $confirm = trim($_POST['confirm'] ?? '');

  if (!$username || !$password || !$confirm) {
    sendResponse(false, 'Please complete all fields.');
  }

  if (strlen($password) < 4) {
    sendResponse(false, 'Password must be at least 4 characters.');
  }

  if ($password !== $confirm) {
    sendResponse(false, 'Passwords do not match.');
  }

  $stmt = $conn->prepare('SELECT id FROM users WHERE username = ?');
  $stmt->bind_param('s', $username);
  $stmt->execute();
  $result = $stmt->get_result();
  if ($result->num_rows > 0) {
    sendResponse(false, 'Username already taken. Choose another.');
  }

  $newPassword = hashPassword($password);
  $stmt = $conn->prepare('INSERT INTO users (username, password, role) VALUES (?, ?, "customer")');
  $stmt->bind_param('ss', $username, $newPassword);

  if ($stmt->execute()) {
    sendResponse(true, 'Account created successfully.', ['id' => $stmt->insert_id, 'username' => $username, 'role' => 'customer']);
  }

  sendResponse(false, 'Error creating account.');
}

if ($action === 'login') {
  $username = sanitize($_POST['username'] ?? '');
  $password = trim($_POST['password'] ?? '');

  if (!$username || !$password) {
    sendResponse(false, 'Enter both username and password.');
  }

  $stmt = $conn->prepare('SELECT id, username, role, password FROM users WHERE username = ?');
  $stmt->bind_param('s', $username);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    sendResponse(false, 'Invalid username or password.');
  }

  $user = $result->fetch_assoc();
  if (!verifyPassword($password, $user['password'])) {
    sendResponse(false, 'Invalid username or password.');
  }

  if (!password_verify($password, $user['password'])) {
    $updatedHash = hashPassword($password);
    $updateStmt = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
    $updateStmt->bind_param('si', $updatedHash, $user['id']);
    $updateStmt->execute();
    $updateStmt->close();
  }

  unset($user['password']);
  sendResponse(true, 'Login successful.', $user);
}

if ($action === 'changePassword') {
  $username = sanitize($_POST['username'] ?? '');
  $currentPass = trim($_POST['currentPass'] ?? '');
  $newPass = trim($_POST['newPass'] ?? '');
  $confirmPass = trim($_POST['confirmPass'] ?? '');

  if (!$username || !$currentPass || !$newPass || !$confirmPass) {
    sendResponse(false, 'Please fill in all fields.');
  }

  if (strlen($newPass) < 4) {
    sendResponse(false, 'New password must be at least 4 characters.');
  }

  if ($newPass !== $confirmPass) {
    sendResponse(false, 'New passwords do not match.');
  }

  $stmt = $conn->prepare('SELECT id, password FROM users WHERE username = ?');
  $stmt->bind_param('s', $username);
  $stmt->execute();
  $result = $stmt->get_result();

  if ($result->num_rows === 0) {
    sendResponse(false, 'Current password is incorrect.');
  }

  $user = $result->fetch_assoc();
  if (!verifyPassword($currentPass, $user['password'])) {
    sendResponse(false, 'Current password is incorrect.');
  }

  $newHash = hashPassword($newPass);
  $stmt = $conn->prepare('UPDATE users SET password = ? WHERE id = ?');
  $stmt->bind_param('si', $newHash, $user['id']);

  if ($stmt->execute()) {
    sendResponse(true, 'Password updated successfully. Please log in again.');
  }

  sendResponse(false, 'Error updating password.');
}

sendResponse(false, 'Invalid action.');
?>
