<?php
// Run migration for contact_information table
require_once 'backend/config/db.php';

try {
    echo "Starting migration for contact_information table...\n\n";
    
    // Read the migration SQL file
    $migrationFile = 'database/migration_add_contact_information.sql';
    if (!file_exists($migrationFile)) {
        throw new Exception("Migration file not found: $migrationFile");
    }
    
    $sql = file_get_contents($migrationFile);
    
    // Split by semicolon to handle multiple statements
    $statements = array_filter(array_map('trim', explode(';', $sql)));
    
    foreach ($statements as $statement) {
        if (empty($statement)) continue;
        
        echo "Executing: " . substr($statement, 0, 50) . "...\n";
        DB::query($statement);
        echo "Success.\n";
    }
    
    echo "\nMigration completed successfully!\n";
    echo "The contact_information table has been created with default data.\n";
    
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
