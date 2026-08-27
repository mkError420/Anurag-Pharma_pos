<?php
// Direct connection to production database for migration
$host = 'sdb-96.hosting.stackcp.net';
$user = 'anuragpos-353134317baa';
$pass = 'anurag123456@#$';
$db   = 'anuragpos-353134317baa';

try {
    echo "Connecting to production database...\n";
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully.\n\n";

    // Check if column exists
    $stmt = $pdo->query("SHOW COLUMNS FROM sale_items LIKE 'inventory_batch_id'");
    $columnExists = $stmt->fetch();

    if ($columnExists) {
        echo "Column 'inventory_batch_id' already exists in sale_items table.\n";
        echo "No migration needed.\n";
        exit(0);
    }

    echo "Adding inventory_batch_id column to sale_items table...\n";
    
    // Add the column
    $pdo->exec("ALTER TABLE `sale_items` ADD COLUMN `inventory_batch_id` INT NULL AFTER `product_id`");
    $pdo->exec("ALTER TABLE `sale_items` ADD INDEX `idx_sale_items_batch` (`inventory_batch_id`)");
    
    echo "Column added successfully!\n\n";
    
    // Verify
    $stmt = $pdo->query("SHOW COLUMNS FROM sale_items LIKE 'inventory_batch_id'");
    $columnExists = $stmt->fetch();
    
    if ($columnExists) {
        echo "Verification: Column 'inventory_batch_id' exists ✓\n";
    } else {
        echo "Verification failed!\n";
        exit(1);
    }
    
    echo "\nMigration completed successfully!\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    exit(1);
}
