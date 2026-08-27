<?php
// Standalone CLI migration script for inventory batch tracking
// This script bypasses the web configuration to avoid header conflicts

$host = '127.0.0.1';
$user = 'root';
$pass = '';
$db   = 'multitenant_pos';

try {
    echo "Connecting to database...\n";
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    echo "Connected successfully.\n\n";

    // Read the migration SQL file
    $sqlFile = __DIR__ . '/database/migration_add_inventory_batches.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Migration file not found: $sqlFile");
    }

    $sql = file_get_contents($sqlFile);
    
    // Execute the SQL
    echo "Running migration...\n";
    $pdo->exec($sql);
    
    echo "Migration completed successfully!\n";
    echo "Created table: inventory_batches\n";
    echo "Added column: inventory_batch_id to sale_items\n\n";
    
    // Verify the changes
    echo "Verification:\n";
    echo str_repeat("-", 50) . "\n";
    
    // Check inventory_batches table
    $stmt = $pdo->query("SHOW TABLES LIKE 'inventory_batches'");
    $exists = $stmt->fetch();
    echo "Table 'inventory_batches': " . ($exists ? "✓ Created" : "✗ Not found") . "\n";
    
    // Check sale_items column
    $stmt = $pdo->query("SHOW COLUMNS FROM sale_items LIKE 'inventory_batch_id'");
    $columnExists = $stmt->fetch();
    echo "Column 'inventory_batch_id' in sale_items: " . ($columnExists ? "✓ Added" : "✗ Not found") . "\n";
    
    echo "\nMigration finished!\n";
    
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
