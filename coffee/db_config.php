<?php
// XAMPP MySQL database configuration
// Make sure Apache + MySQL are running in XAMPP before using the app.
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'coffee_shop');

mysqli_report(MYSQLI_REPORT_OFF);
$conn = new mysqli(DB_HOST, DB_USER, DB_PASS, '', DB_PORT);

if ($conn->connect_error) {
  die(json_encode(['success' => false, 'message' => 'Database connection failed: ' . $conn->connect_error]));
}

if (!$conn->select_db(DB_NAME)) {
  $createDbSql = "CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
  if (!$conn->query($createDbSql)) {
    die(json_encode(['success' => false, 'message' => 'Failed to create database: ' . $conn->error]));
  }
  $conn->select_db(DB_NAME);
}

$conn->set_charset('utf8mb4');

$createUsersTable = "CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('customer', 'staff') DEFAULT 'customer',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

$createOrdersTable = "CREATE TABLE IF NOT EXISTS orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  customer_id INT NOT NULL,
  customer_name VARCHAR(100) NOT NULL,
  order_type ENUM('Pickup', 'Delivery') NOT NULL,
  items JSON NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'new',
  placed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4";

if (!$conn->query($createUsersTable) || !$conn->query($createOrdersTable)) {
  die(json_encode(['success' => false, 'message' => 'Failed to create tables: ' . $conn->error]));
}

$defaultStaffPassword = password_hash('staff123', PASSWORD_DEFAULT);
$staffInsert = $conn->prepare('INSERT IGNORE INTO users (username, password, role) VALUES (?, ?, "staff")');
$staffUsername = 'staff';
$staffInsert->bind_param('ss', $staffUsername, $defaultStaffPassword);
$staffInsert->execute();
$staffInsert->close();

// Function to sanitize input
function sanitize($input) {
  global $conn;
  return $conn->real_escape_string(trim($input));
}

// Function to send JSON response
function sendResponse($success, $message, $data = null) {
  header('Content-Type: application/json');
  $response = ['success' => $success, 'message' => $message];
  if ($data !== null) {
    $response['data'] = $data;
  }
  echo json_encode($response);
  exit();
}
?>
