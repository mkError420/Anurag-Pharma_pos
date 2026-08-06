<?php
// Run migration to create hero_slides and team_members tables
require_once 'backend/config/db.php';

try {
    echo "Starting migration to create website content tables...\n\n";
    
    // Read the migration SQL file
    $sqlFile = __DIR__ . '/database/migration_add_website_content.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Migration file not found: $sqlFile");
    }
    
    $sql = file_get_contents($sqlFile);
    
    // Execute the SQL
    $pdo = DB::getConnection();
    $pdo->exec($sql);
    
    echo "Migration completed successfully!\n";
    echo "Created tables: hero_slides, team_members\n\n";
    
    // Verify the tables were created
    echo "Verification:\n";
    echo str_repeat("-", 50) . "\n";
    
    $tables = ['hero_slides', 'team_members'];
    foreach ($tables as $table) {
        $stmt = $pdo->query("SHOW TABLES LIKE '$table'");
        $exists = $stmt->fetch();
        echo "Table '$table': " . ($exists ? "✓ Created" : "✗ Not found") . "\n";
    }
    
    echo "\nMigration finished!\n";
    
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
