<?php
/**
 * reset_migration.php
 * 
 * Run this ONCE on the server to force migrations to re-run.
 * Access via: https://anuragpharma.top/reset_migration.php
 * 
 * DELETE THIS FILE after running!
 */

// Simple security check
$secret = $_GET['key'] ?? '';
if ($secret !== 'anurag_reset_2024') {
    http_response_code(403);
    die('Forbidden. Use ?key=anurag_reset_2024');
}

$lockFile = __DIR__ . '/backend/config/.migration_lock';

if (file_exists($lockFile)) {
    if (unlink($lockFile)) {
        echo "&#10003; Migration lock deleted. Migrations will re-run on next API call.<br>";
    } else {
        echo "&#10007; Failed to delete migration lock file.<br>";
    }
} else {
    echo "- Migration lock file not found (already reset or never created).<br>";
}

// Now trigger migrations by loading db.php
echo "<br>Running migrations now...<br>";
try {
    require_once __DIR__ . '/backend/config/db.php';
    DB::getConnection(); // triggers runMigrations()
    echo "&#10003; Migrations completed successfully!<br>";
    echo "<br><strong>Action required:</strong> Please DELETE this file (reset_migration.php) from your server now!<br>";
} catch (Exception $e) {
    echo "&#10007; Migration error: " . htmlspecialchars($e->getMessage()) . "<br>";
}
