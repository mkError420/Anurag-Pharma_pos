<?php
/**
 * Script to generate a clean zip file for cPanel deployment.
 * This avoids zipping node_modules and .git which trigger antivirus scanners.
 */

$zipFile = 'cpanel_upload_ready.zip';
$sourceDir = __DIR__;

if (file_exists($zipFile)) {
    unlink($zipFile);
}

$zip = new ZipArchive();
if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
    die("Failed to create zip file.\n");
}

$itemsToInclude = [
    'backend',
    'frontend/dist',
    'frontend/index.html',
    '.htaccess'
];

echo "Generating clean zip file for deployment...\n";

foreach ($itemsToInclude as $item) {
    $itemPath = $sourceDir . '/' . $item;
    
    if (is_dir($itemPath)) {
        // Add directory and its contents
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($itemPath),
            RecursiveIteratorIterator::LEAVES_ONLY
        );

        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($sourceDir) + 1);
                $zip->addFile($filePath, str_replace('\\', '/', $relativePath));
            }
        }
        echo "Added directory: $item\n";
    } elseif (is_file($itemPath)) {
        // Add single file
        $relativePath = substr($itemPath, strlen($sourceDir) + 1);
        $zip->addFile($itemPath, str_replace('\\', '/', $relativePath));
        echo "Added file: $item\n";
    } else {
        echo "Warning: $item not found.\n";
    }
}

$zip->close();

echo "\n=======================================================\n";
echo "SUCCESS! Created 'cpanel_upload_ready.zip' in your project root.\n";
echo "Upload THIS file to your cPanel File Manager.\n";
echo "=======================================================\n";
?>
