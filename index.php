<?php
/**
 * Root Index Fallback
 * Serves the React frontend dist application
 */

$distIndex = __DIR__ . '/frontend/dist/index.html';

if (file_exists($distIndex)) {
    readfile($distIndex);
    exit;
} else {
    echo "<h1>Anurag Pharmacy POS</h1><p>Frontend dist is loading...</p>";
}
