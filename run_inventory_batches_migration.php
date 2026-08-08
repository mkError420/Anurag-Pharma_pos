<?php
// Run migration to create inventory_batches table and update sale_items
require_once 'backend/config/db.php';

try {
    echo "Starting migration to add inventory batch tracking...\n\n";
    
    // Read the migration SQL file
    $sqlFile = __DIR__ . '/database/migration_add_inventory_batches.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Migration file not found: $sqlFile");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // Execute the SQL
    $pdo = DB::getConnection();
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
