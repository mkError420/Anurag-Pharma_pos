<?php
/**
 * Backup Controller
 * Provides Shop-wise and Global Database SQL Dump / Backup capabilities for Super Admin.
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class BackupController {

    /**
     * Export database backup as an SQL dump file.
     * Can export for a specific shop (shop-wise) or all shops (full backup).
     *
     * @param int|string|null $shopId
     */
    public static function exportShopDatabase($shopId = null) {
        Auth::authenticate();
        Auth::authorize(['super_admin']);

        // Check if shopId provided via query string if not passed as arg
        if ($shopId === null || $shopId === '') {
            $shopId = $_GET['shop_id'] ?? 'all';
        }

        $isShopSpecific = ($shopId !== 'all' && $shopId !== 'full' && (int)$shopId > 0);
        $targetShop = null;

        try {
            $pdo = DB::getConnection();

            if ($isShopSpecific) {
                $stmt = $pdo->prepare("SELECT * FROM shops WHERE id = ?");
                $stmt->execute([(int)$shopId]);
                $targetShop = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$targetShop) {
                    Auth::jsonError("Shop with ID #{$shopId} not found.", 404);
                }
            }

            // Generate filename
            $dateStr = date('Y-m-d_H-i-s');
            if ($isShopSpecific) {
                $cleanShopName = preg_replace('/[^a-zA-Z0-9_-]/', '_', strtolower($targetShop['name']));
                $cleanShopName = substr($cleanShopName, 0, 30);
                $filename = "shop_{$shopId}_{$cleanShopName}_database_{$dateStr}.sql";
            } else {
                $filename = "pos_full_database_backup_{$dateStr}.sql";
            }

            // Clean output buffer completely to prevent corrupted headers/lines
            while (ob_get_level()) {
                ob_end_clean();
            }

            // Set HTTP headers for file download
            header('Content-Type: application/sql; charset=utf-8');
            header('Content-Disposition: attachment; filename="' . $filename . '"');
            header('Pragma: no-cache');
            header('Expires: 0');
            header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
            header('Content-Description: File Transfer');

            // Open output stream
            $out = fopen('php://output', 'w');

            // Output SQL Header
            $adminUser = Auth::$user;
            $adminEmail = $adminUser['email'] ?? 'super_admin';
            $adminName = $adminUser['name'] ?? 'Super Admin';

            $headerText = "-- =============================================================\n";
            $headerText .= "-- POS Multi-Tenant System - Database Backup SQL Dump\n";
            if ($isShopSpecific) {
                $headerText .= "-- Scope: Shop-Wise Database Export\n";
                $headerText .= "-- Shop ID: #{$targetShop['id']}\n";
                $headerText .= "-- Shop Name: {$targetShop['name']}\n";
                $headerText .= "-- Shop Email: {$targetShop['email']}\n";
                $headerText .= "-- Shop Phone: " . ($targetShop['phone'] ?? 'N/A') . "\n";
            } else {
                $headerText .= "-- Scope: Complete Multi-Tenant System Database Export\n";
            }
            $headerText .= "-- Exported By: {$adminName} ({$adminEmail})\n";
            $headerText .= "-- Export Date: " . date('Y-m-d H:i:s T') . "\n";
            $headerText .= "-- PHP Version: " . PHP_VERSION . "\n";
            $headerText .= "-- =============================================================\n\n";

            $headerText .= "SET FOREIGN_KEY_CHECKS = 0;\n";
            $headerText .= "SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';\n";
            $headerText .= "SET AUTOCOMMIT = 0;\n";
            $headerText .= "START TRANSACTION;\n";
            $headerText .= "SET time_zone = '+06:00';\n";
            $headerText .= "SET NAMES utf8mb4;\n\n";

            fwrite($out, $headerText);

            // Preferred topological order of tables for clean restoration
            $tableOrder = [
                'shops',
                'users',
                'suppliers',
                'products',
                'inventory_batches',
                'inventory_adjustments',
                'customers',
                'sales',
                'sale_items',
                'due_payments',
                'customer_returns',
                'purchase_orders',
                'purchase_order_items',
                'supplier_returns',
                'cost_price_logs',
                'other_costs',
                'other_sales',
                'wastages',
                'held_bills',
                'manual_orders',
                'manual_order_items',
                'attendance',
                'attendance_logs',
                'staff_salaries',
                'investments',
                'pricing_plans',
                'subscriptions',
                'hero_slides',
                'team_members',
                'contact_information',
                'contact_messages'
            ];

            // Get all existing database tables
            $stmt = $pdo->query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
            $allTables = $stmt->fetchAll(PDO::FETCH_COLUMN);

            // Sort existing tables prioritizing topological order
            $orderedTables = [];
            foreach ($tableOrder as $t) {
                if (in_array($t, $allTables)) {
                    $orderedTables[] = $t;
                }
            }
            // Append any tables not in our explicit order list
            foreach ($allTables as $t) {
                if (!in_array($t, $orderedTables)) {
                    $orderedTables[] = $t;
                }
            }

            $tablesProcessed = 0;
            $totalRowsExported = 0;

            foreach ($orderedTables as $table) {
                // Determine columns of this table
                $colStmt = $pdo->query("SHOW COLUMNS FROM `$table`");
                $columns = $colStmt->fetchAll(PDO::FETCH_ASSOC);
                $colNames = array_column($columns, 'Field');
                $hasShopId = in_array('shop_id', $colNames);

                // For shop-specific export, skip system-only tables that have no shop_id and are not 'shops'
                if ($isShopSpecific) {
                    if ($table !== 'shops' && !$hasShopId) {
                        continue; // Skip global website/system tables with no shop relation
                    }
                }

                // Table Header Comment
                fwrite($out, "\n-- -------------------------------------------------------------\n");
                fwrite($out, "-- Table structure for table `{$table}`\n");
                fwrite($out, "-- -------------------------------------------------------------\n\n");

                // Get CREATE TABLE definition
                $createStmt = $pdo->query("SHOW CREATE TABLE `$table`");
                $createRow = $createStmt->fetch(PDO::FETCH_NUM);
                if ($createRow && isset($createRow[1])) {
                    $createSql = $createRow[1];
                    // Make CREATE TABLE IF NOT EXISTS
                    $createSql = preg_replace('/^CREATE TABLE/i', 'CREATE TABLE IF NOT EXISTS', $createSql);
                    fwrite($out, "DROP TABLE IF EXISTS `{$table}`;\n");
                    fwrite($out, $createSql . ";\n\n");
                }

                // Prepare query to fetch rows
                $sql = "SELECT * FROM `$table`";
                $params = [];

                if ($isShopSpecific) {
                    if ($table === 'shops') {
                        $sql .= " WHERE id = ?";
                        $params = [(int)$shopId];
                    } elseif ($hasShopId) {
                        $sql .= " WHERE shop_id = ?";
                        $params = [(int)$shopId];
                    }
                }

                $queryStmt = $pdo->prepare($sql);
                $queryStmt->execute($params);

                $rowCount = 0;
                $batch = [];
                $batchSize = 50; // Write in chunks of 50 rows

                fwrite($out, "--\n-- Dumping data for table `{$table}`\n--\n");

                while ($row = $queryStmt->fetch(PDO::FETCH_ASSOC)) {
                    $rowCount++;
                    $totalRowsExported++;

                    // Format values safely
                    $escapedValues = [];
                    foreach ($row as $col => $val) {
                        if ($val === null) {
                            $escapedValues[] = 'NULL';
                        } elseif (is_numeric($val) && !preg_match('/^0[0-9]/', (string)$val)) {
                            $escapedValues[] = $val;
                        } else {
                            $escapedValues[] = $pdo->quote((string)$val);
                        }
                    }

                    $batch[] = "(" . implode(', ', $escapedValues) . ")";

                    if (count($batch) >= $batchSize) {
                        $colsFormatted = '`' . implode('`, `', array_keys($row)) . '`';
                        fwrite($out, "INSERT INTO `{$table}` ({$colsFormatted}) VALUES\n" . implode(",\n", $batch) . ";\n\n");
                        $batch = [];
                    }
                }

                // Flush remaining rows
                if (!empty($batch)) {
                    $colsFormatted = '`' . implode('`, `', $colNames) . '`';
                    fwrite($out, "INSERT INTO `{$table}` ({$colsFormatted}) VALUES\n" . implode(",\n", $batch) . ";\n\n");
                }

                if ($rowCount === 0) {
                    fwrite($out, "-- (No rows found for table `{$table}` in this scope)\n\n");
                }

                $tablesProcessed++;
            }

            // Output SQL Footer
            $footerText = "\n-- =============================================================\n";
            $footerText .= "-- Summary:\n";
            $footerText .= "-- Total Tables Processed: {$tablesProcessed}\n";
            $footerText .= "-- Total Data Rows Exported: {$totalRowsExported}\n";
            $footerText .= "-- Export finished at " . date('Y-m-d H:i:s T') . "\n";
            $footerText .= "-- =============================================================\n\n";
            $footerText .= "COMMIT;\n";
            $footerText .= "SET FOREIGN_KEY_CHECKS = 1;\n";

            fwrite($out, $footerText);
            fclose($out);
            exit;

        } catch (\Exception $e) {
            error_log('Database export error: ' . $e->getMessage());
            // If headers have not sent yet, return JSON error
            if (!headers_sent()) {
                Auth::jsonError('Database export failed: ' . $e->getMessage(), 500);
            } else {
                echo "\n-- ERROR: Export failed due to server error: " . $e->getMessage();
            }
            exit;
        }
    }

    /**
     * Get statistics & preview metrics for a shop's database backup.
     *
     * @param int|string $shopId
     */
    public static function getShopBackupStats($shopId) {
        Auth::authenticate();
        Auth::authorize(['super_admin']);

        $isShopSpecific = ($shopId !== 'all' && (int)$shopId > 0);

        try {
            $pdo = DB::getConnection();

            if ($isShopSpecific) {
                $stmt = $pdo->prepare("SELECT id, name, email, phone, status, created_at FROM shops WHERE id = ?");
                $stmt->execute([(int)$shopId]);
                $shop = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$shop) {
                    Auth::jsonError("Shop #{$shopId} not found.", 404);
                }
            } else {
                $shop = [
                    'id' => 'all',
                    'name' => 'All Tenant Shops',
                    'email' => 'system@codexxa.com',
                    'status' => 'active',
                    'created_at' => date('Y-m-d')
                ];
            }

            // List of tables to count
            $tablesToCount = [
                'products' => 'Products',
                'sales' => 'Sales Transactions',
                'sale_items' => 'Sale Items',
                'customers' => 'Customers',
                'suppliers' => 'Suppliers',
                'purchase_orders' => 'Purchase Orders',
                'users' => 'Staff & Users',
                'other_costs' => 'Other Costs',
                'other_sales' => 'Other Sales',
                'wastages' => 'Wastage Records',
                'held_bills' => 'Held Bills',
                'inventory_batches' => 'Inventory Batches',
                'inventory_adjustments' => 'Stock Adjustments',
                'attendance' => 'Attendance Records',
                'staff_salaries' => 'Salary Records',
                'due_payments' => 'Due Payments'
            ];

            $counts = [];
            $totalRecords = 0;

            foreach ($tablesToCount as $table => $label) {
                try {
                    if ($isShopSpecific) {
                        $stmt = $pdo->prepare("SELECT COUNT(*) FROM `$table` WHERE shop_id = ?");
                        $stmt->execute([(int)$shopId]);
                    } else {
                        $stmt = $pdo->query("SELECT COUNT(*) FROM `$table`");
                    }
                    $c = (int)$stmt->fetchColumn();
                    $counts[$table] = [
                        'label' => $label,
                        'count' => $c
                    ];
                    $totalRecords += $c;
                } catch (\Exception $ex) {
                    // Table might not exist yet
                }
            }

            // Add shop itself if specific
            if ($isShopSpecific) {
                $totalRecords += 1;
            } else {
                $shopCount = (int)$pdo->query("SELECT COUNT(*) FROM `shops`")->fetchColumn();
                $totalRecords += $shopCount;
                $counts['shops'] = [
                    'label' => 'Total Shops',
                    'count' => $shopCount
                ];
            }

            header('Content-Type: application/json');
            echo json_encode([
                'shop' => $shop,
                'total_records' => $totalRecords,
                'breakdown' => $counts,
                'estimated_size_kb' => round(max(2, $totalRecords * 0.45), 1)
            ]);

        } catch (\Exception $e) {
            error_log('Get backup stats error: ' . $e->getMessage());
            Auth::jsonError('Failed to calculate backup stats: ' . $e->getMessage(), 500);
        }
    }
}
