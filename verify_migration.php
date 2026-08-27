<?php
// Verification script for inventory_batch_id column
require 'backend/config/db.php';

try {
    $pdo = DB::getConnection();
    
    // Check if inventory_batch_id column exists in sale_items
    $stmt = $pdo->query("SHOW COLUMNS FROM sale_items LIKE 'inventory_batch_id'");
    $columnExists = $stmt->fetch();
    
    if ($columnExists) {
        echo "SUCCESS: Column 'inventory_batch_id' exists in sale_items table.\n";
    } else {
        echo "ERROR: Column 'inventory_batch_id' does NOT exist in sale_items table.\n";
    }
    
    // Check if inventory_batches table exists
    $stmt = $pdo->query("SHOW TABLES LIKE 'inventory_batches'");
    $tableExists = $stmt->fetch();
    
    if ($tableExists) {
        echo "SUCCESS: Table 'inventory_batches' exists.\n";
    } else {
        echo "ERROR: Table 'inventory_batches' does NOT exist.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
