<?php
$sqlFile = __DIR__ . '/database/if0_42333746_mk_pos.sql';
if (!file_exists($sqlFile)) {
    die("SQL file not found.");
}
$content = file_get_contents($sqlFile);

// Fix users table
$content = preg_replace(
    '/(CREATE TABLE `users` \(.*?`is_archived` tinyint\(1\) NOT NULL DEFAULT 0)(\n\)) /s',
    "$1,\n  `allowed_sections` text DEFAULT NULL$2 ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;",
    $content
);

// Fix products table
$content = preg_replace(
    '/(CREATE TABLE `products` \(.*?`shop_id` int\(11\) NOT NULL)(\n\)) /s', // Wait, products has many columns. Let's just find the end of the CREATE TABLE.
    "", // Need a better regex
    $content
);
