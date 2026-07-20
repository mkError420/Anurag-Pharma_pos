<?php
// Run migration to recalculate customer due_balance
require_once 'backend/config/db.php';

try {
    echo "Starting migration to recalculate customer due_balance...\n";
    echo "Calculation: Sales Transactions Due only\n\n";
    
    // Recalculate customer due_balance
    $sql = "UPDATE customers c SET due_balance = (
        COALESCE((
            SELECT SUM(s.due_amount) 
            FROM sales s 
            WHERE s.customer_id = c.id AND s.shop_id = c.shop_id AND s.due_amount > 0
        ), 0)
    ) WHERE shop_id IN (SELECT id FROM shops)";
    
    $stmt = DB::query($sql);
    $affectedRows = $stmt->rowCount();
    
    echo "Updated $affectedRows customer records\n";
    
    // Verify the recalculation
    $verifySql = "SELECT 
        c.id,
        c.name,
        c.shop_id,
        c.due_balance as total_due_balance_receivable,
        (SELECT SUM(s.due_amount) FROM sales s WHERE s.customer_id = c.id AND s.shop_id = c.shop_id AND s.due_amount > 0) as sales_transactions_due
    FROM customers c
    ORDER BY c.shop_id, c.id";
    
    $stmt = DB::query($verifySql);
    $results = $stmt->fetchAll();
    
    echo "\nVerification Results:\n";
    echo str_repeat("-", 80) . "\n";
    printf("%-5s %-20s %-8s %-25s %-25s\n", "ID", "Name", "Shop", "Total Due (Receivable)", "Sales Transactions Due");
    echo str_repeat("-", 80) . "\n";
    
    foreach ($results as $row) {
        printf("%-5s %-20s %-8s %-25s %-25s\n", 
            $row['id'], 
            substr($row['name'], 0, 18), 
            $row['shop_id'], 
            number_format($row['total_due_balance_receivable'], 2), 
            number_format($row['sales_transactions_due'], 2)
        );
    }
    
    echo "\nMigration completed successfully!\n";
    echo "Due Balance (Receivable) now matches Sales Transactions Due\n";
    
} catch (Exception $e) {
    echo "Error during migration: " . $e->getMessage() . "\n";
    exit(1);
}
