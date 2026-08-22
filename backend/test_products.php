<?php
require_once 'config/db.php';

try {
    // Test basic query
    $stmt = DB::query('SELECT COUNT(*) as count FROM products');
    $count = $stmt->fetch();
    echo "Total products: " . $count['count'] . "\n";
    
    // Test fetching a few products
    $stmt = DB::query('SELECT * FROM products LIMIT 5');
    $products = $stmt->fetchAll();
    
    echo "Sample product data:\n";
    foreach ($products as $p) {
        echo "ID: {$p['id']}, Name: {$p['name']}, SKU: {$p['sku']}\n";
    }
    
    // Test JSON encoding
    $json = json_encode($products, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    if ($json === false) {
        echo "JSON ENCODING ERROR: " . json_last_error_msg() . "\n";
    } else {
        echo "JSON encoding successful. Length: " . strlen($json) . " bytes\n";
        echo "First 500 chars: " . substr($json, 0, 500) . "\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
