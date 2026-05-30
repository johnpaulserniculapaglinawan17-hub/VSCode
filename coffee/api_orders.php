<?php
header('Content-Type: application/json');
require_once 'db_config.php';

$action = sanitize($_POST['action'] ?? '');

if ($action === 'submitOrder') {
  $customerId = intval($_POST['customerId'] ?? 0);
  $customerName = sanitize($_POST['customerName'] ?? '');
  $orderType = sanitize($_POST['orderType'] ?? '');
  $itemsJson = $_POST['items'] ?? '';
  $subtotal = floatval($_POST['subtotal'] ?? 0);
  $tax = floatval($_POST['tax'] ?? 0);
  $total = floatval($_POST['total'] ?? 0);

  if (!$customerId || !$customerName || !$orderType || !$itemsJson) {
    sendResponse(false, 'Missing required order data.');
  }

  $allowedTypes = ['Pickup', 'Delivery'];
  if (!in_array($orderType, $allowedTypes, true)) {
    sendResponse(false, 'Order type is invalid.');
  }

  $itemsData = json_decode($itemsJson, true);
  if (!is_array($itemsData) || json_last_error() !== JSON_ERROR_NONE) {
    sendResponse(false, 'Invalid order data format.');
  }

  $calculatedSubtotal = 0;
  foreach ($itemsData as $item) {
    if (!isset($item['id'], $item['name'], $item['price'], $item['quantity'])) {
      sendResponse(false, 'Order items must include id, name, price, and quantity.');
    }
    $calculatedSubtotal += floatval($item['price']) * intval($item['quantity']);
  }

  $taxRate = 0.07;
  $calculatedTax = round($calculatedSubtotal * $taxRate, 2);
  $calculatedTotal = round($calculatedSubtotal + $calculatedTax, 2);

  if (abs($calculatedSubtotal - $subtotal) > 0.01 || abs($calculatedTax - $tax) > 0.01 || abs($calculatedTotal - $total) > 0.01) {
    sendResponse(false, 'Order totals do not match calculated values.');
  }

  $items = json_encode($itemsData, JSON_UNESCAPED_UNICODE);
  if ($items === false) {
    sendResponse(false, 'Unable to encode order items.');
  }

  $orderId = 'order-' . time() . '-' . mt_rand(1000, 9999);
  $stmt = $conn->prepare('INSERT INTO orders (order_id, customer_id, customer_name, order_type, items, subtotal, tax, total, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, "new")');
  $stmt->bind_param('sisssddd', $orderId, $customerId, $customerName, $orderType, $items, $subtotal, $tax, $total);

  if ($stmt->execute()) {
    sendResponse(true, 'Order placed successfully.', ['orderId' => $orderId]);
  }

  sendResponse(false, 'Error placing order.');
}

if ($action === 'getOrders') {
  $stmt = $conn->prepare('SELECT order_id, customer_name, order_type, items, subtotal, tax, total, status, placed_at FROM orders ORDER BY placed_at DESC');
  $stmt->execute();
  $result = $stmt->get_result();
  $orders = [];

  while ($row = $result->fetch_assoc()) {
    $row['items'] = json_decode($row['items'], true);
    $orders[] = $row;
  }

  sendResponse(true, 'Orders retrieved.', $orders);
}

if ($action === 'updateStatus') {
  $orderId = sanitize($_POST['orderId'] ?? '');
  $newStatus = sanitize($_POST['newStatus'] ?? '');

  if (!$orderId || !$newStatus) {
    sendResponse(false, 'Missing order information.');
  }

  $allowedStatuses = ['new', 'preparing', 'ready', 'completed'];
  if (!in_array($newStatus, $allowedStatuses, true)) {
    sendResponse(false, 'Invalid status.');
  }

  $stmt = $conn->prepare('UPDATE orders SET status = ? WHERE order_id = ?');
  $stmt->bind_param('ss', $newStatus, $orderId);

  if ($stmt->execute()) {
    if ($stmt->affected_rows === 0) {
      sendResponse(false, 'Order not found or status unchanged.');
    }
    sendResponse(true, 'Order status updated successfully.', ['orderId' => $orderId, 'status' => $newStatus]);
  }

  sendResponse(false, 'Unable to update status.');
}

sendResponse(false, 'Invalid action.');
?>
