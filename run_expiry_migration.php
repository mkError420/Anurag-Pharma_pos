<?php
// Run migration to add expiry_date columns to products and purchase_order_items
require_once 'backend/config/db.php';

try {
    echo "Starting migration: Add expiry_date columns...\n\n";

    // Add expiry_date to products table
    $colCheck = DB::query("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'expiry_date'");
    $row = $colCheck->fetch();
    if ((int)$row['cnt'] === 0) {
        DB::query("ALTER TABLE `products` ADD COLUMN `expiry_date` DATE NULL DEFAULT NULL AFTER `low_stock_threshold`");
        echo "✓ Added expiry_date to products table.\n";
    } else {
        echo "- expiry_date already exists in products table (skipped).\n";
    }

    // Add expiry_date to purchase_order_items table
    $colCheck2 = DB::query("SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'purchase_order_items' AND COLUMN_NAME = 'expiry_date'");
    $row2 = $colCheck2->fetch();
    if ((int)$row2['cnt'] === 0) {
        DB::query("ALTER TABLE `purchase_order_items` ADD COLUMN `expiry_date` DATE NULL DEFAULT NULL AFTER `subtotal`");
        echo "✓ Added expiry_date to purchase_order_items table.\n";
    } else {
        echo "- expiry_date already exists in purchase_order_items table (skipped).\n";
    }

    echo "\nMigration completed successfully!\n";

} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
