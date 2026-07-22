<?php
/**
 * Transaction Controller - Unified All Transactions API
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class TransactionController {

    public static function listTransactions() {
        Auth::authenticate();
        Auth::enforceTenant();
        Auth::authorize(['super_admin', 'shop_admin', 'shop_staff']);

        $shopId = Auth::$shopId;
        $hasShop = $shopId !== null;

        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;
        $type = $_GET['type'] ?? 'all';
        $search = trim($_GET['search'] ?? '');

        try {
            $transactions = [];

            // 1. Purchase Orders (Purchases)
            if ($type === 'all' || $type === 'purchase') {
                $sql = "SELECT 
                            CONCAT('PO-', po.id) AS ref_id,
                            po.id AS raw_id,
                            'purchase' AS type,
                            DATE_FORMAT(COALESCE(po.order_date, po.created_at), '%Y-%m-%d %H:%i:%s') AS date,
                            COALESCE(s.name, 'Direct Purchase') AS party_name,
                            COALESCE(po.notes, CONCAT('Purchase Order #', po.id)) AS description,
                            po.total_amount AS amount,
                            po.paid_amount AS paid_amount,
                            po.due_amount AS due_amount,
                            po.status AS status,
                            po.payment_basis AS payment_method,
                            'Product Purchase' AS category
                        FROM purchase_orders po
                        LEFT JOIN suppliers s ON po.supplier_id = s.id
                        WHERE " . ($hasShop ? 'po.shop_id = ?' : '1=1');
                $params = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND DATE(COALESCE(po.order_date, po.created_at)) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                $stmt = DB::query($sql, $params);
                $poRows = $stmt->fetchAll();
                foreach ($poRows as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // 2. Sales
            if ($type === 'all' || $type === 'sales') {
                $sql = "SELECT 
                            CONCAT('SALE-', sa.id) AS ref_id,
                            sa.id AS raw_id,
                            'sales' AS type,
                            DATE_FORMAT(sa.created_at, '%Y-%m-%d %H:%i:%s') AS date,
                            COALESCE(c.name, 'Walk-in Customer') AS party_name,
                            CONCAT('POS Sale #', sa.id) AS description,
                            sa.final_amount AS amount,
                            sa.paid_amount AS paid_amount,
                            sa.due_amount AS due_amount,
                            'completed' AS status,
                            sa.payment_method AS payment_method,
                            'POS Sale' AS category
                        FROM sales sa
                        LEFT JOIN customers c ON sa.customer_id = c.id
                        WHERE " . ($hasShop ? 'sa.shop_id = ?' : '1=1');
                $params = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND DATE(sa.created_at) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                $stmt = DB::query($sql, $params);
                $saleRows = $stmt->fetchAll();
                foreach ($saleRows as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // 3. Due Transactions (Customer & Supplier Dues)
            if ($type === 'all' || $type === 'due') {
                // Customer Dues from Sales
                $sql1 = "SELECT 
                            CONCAT('DUE-SALE-', sa.id) AS ref_id,
                            sa.id AS raw_id,
                            'due' AS type,
                            DATE_FORMAT(sa.created_at, '%Y-%m-%d %H:%i:%s') AS date,
                            COALESCE(c.name, 'Walk-in Customer') AS party_name,
                            CONCAT('Customer Due (Sale #', sa.id, ')') AS description,
                            sa.due_amount AS amount,
                            sa.paid_amount AS paid_amount,
                            sa.due_amount AS due_amount,
                            'due' AS status,
                            sa.payment_method AS payment_method,
                            'Customer Due' AS category
                        FROM sales sa
                        LEFT JOIN customers c ON sa.customer_id = c.id
                        WHERE sa.due_amount > 0 AND " . ($hasShop ? 'sa.shop_id = ?' : '1=1');
                $params1 = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql1 .= " AND DATE(sa.created_at) BETWEEN ? AND ?";
                    $params1[] = $startDate;
                    $params1[] = $endDate;
                }

                $stmt1 = DB::query($sql1, $params1);
                foreach ($stmt1->fetchAll() as $row) {
                    $transactions[] = self::formatRow($row);
                }

                // Supplier Dues from Purchase Orders
                $sql2 = "SELECT 
                            CONCAT('DUE-PO-', po.id) AS ref_id,
                            po.id AS raw_id,
                            'due' AS type,
                            DATE_FORMAT(COALESCE(po.order_date, po.created_at), '%Y-%m-%d %H:%i:%s') AS date,
                            COALESCE(s.name, 'Supplier') AS party_name,
                            CONCAT('Supplier Due (PO #', po.id, ')') AS description,
                            po.due_amount AS amount,
                            po.paid_amount AS paid_amount,
                            po.due_amount AS due_amount,
                            'due' AS status,
                            po.payment_basis AS payment_method,
                            'Supplier Due' AS category
                        FROM purchase_orders po
                        LEFT JOIN suppliers s ON po.supplier_id = s.id
                        WHERE po.due_amount > 0 AND " . ($hasShop ? 'po.shop_id = ?' : '1=1');
                $params2 = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql2 .= " AND DATE(COALESCE(po.order_date, po.created_at)) BETWEEN ? AND ?";
                    $params2[] = $startDate;
                    $params2[] = $endDate;
                }

                $stmt2 = DB::query($sql2, $params2);
                foreach ($stmt2->fetchAll() as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // 4. Wastage
            if ($type === 'all' || $type === 'wastage') {
                $sql = "SELECT 
                            CONCAT('WAST-', w.id) AS ref_id,
                            w.id AS raw_id,
                            'wastage' AS type,
                            DATE_FORMAT(COALESCE(w.adjusted_at, w.created_at), '%Y-%m-%d %H:%i:%s') AS date,
                            COALESCE(p.name, 'Product Wastage') AS party_name,
                            CONCAT('Wastage: ', w.quantity, ' ', COALESCE(p.unit, 'pcs'), ' (', w.reason, ')') AS description,
                            w.cost_loss AS amount,
                            0.00 AS paid_amount,
                            0.00 AS due_amount,
                            'loss' AS status,
                            'N/A' AS payment_method,
                            'Inventory Loss' AS category
                        FROM wastages w
                        LEFT JOIN products p ON w.product_id = p.id
                        WHERE " . ($hasShop ? 'w.shop_id = ?' : '1=1');
                $params = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND DATE(COALESCE(w.adjusted_at, w.created_at)) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                $stmt = DB::query($sql, $params);
                foreach ($stmt->fetchAll() as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // 5. Other Cost
            if ($type === 'all' || $type === 'other_cost') {
                $sql = "SELECT 
                            CONCAT('COST-', oc.id) AS ref_id,
                            oc.id AS raw_id,
                            'other_cost' AS type,
                            DATE_FORMAT(COALESCE(oc.cost_date, oc.created_at), '%Y-%m-%d %H:%i:%s') AS date,
                            oc.title AS party_name,
                            COALESCE(oc.notes, oc.title) AS description,
                            oc.amount AS amount,
                            oc.amount AS paid_amount,
                            0.00 AS due_amount,
                            'expense' AS status,
                            'cash' AS payment_method,
                            'Other Expense' AS category
                        FROM other_costs oc
                        WHERE " . ($hasShop ? 'oc.shop_id = ?' : '1=1');
                $params = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND DATE(COALESCE(oc.cost_date, oc.created_at)) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                $stmt = DB::query($sql, $params);
                foreach ($stmt->fetchAll() as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // 6. Other Sales
            if ($type === 'all' || $type === 'other_sales') {
                $sql = "SELECT 
                            CONCAT('OSALE-', os.id) AS ref_id,
                            os.id AS raw_id,
                            'other_sales' AS type,
                            DATE_FORMAT(COALESCE(os.sale_date, os.created_at), '%Y-%m-%d %H:%i:%s') AS date,
                            os.title AS party_name,
                            COALESCE(os.notes, os.title) AS description,
                            os.amount AS amount,
                            os.amount AS paid_amount,
                            0.00 AS due_amount,
                            'income' AS status,
                            'cash' AS payment_method,
                            'Other Income' AS category
                        FROM other_sales os
                        WHERE " . ($hasShop ? 'os.shop_id = ?' : '1=1');
                $params = $hasShop ? [$shopId] : [];

                if (!empty($startDate) && !empty($endDate)) {
                    $sql .= " AND DATE(COALESCE(os.sale_date, os.created_at)) BETWEEN ? AND ?";
                    $params[] = $startDate;
                    $params[] = $endDate;
                }

                $stmt = DB::query($sql, $params);
                foreach ($stmt->fetchAll() as $row) {
                    $transactions[] = self::formatRow($row);
                }
            }

            // Search filter if provided
            if (!empty($search)) {
                $searchLower = strtolower($search);
                $transactions = array_filter($transactions, function($t) use ($searchLower) {
                    return strpos(strtolower($t['ref_id']), $searchLower) !== false ||
                           strpos(strtolower($t['party_name']), $searchLower) !== false ||
                           strpos(strtolower($t['description']), $searchLower) !== false ||
                           strpos(strtolower($t['category']), $searchLower) !== false ||
                           strpos(strtolower($t['payment_method']), $searchLower) !== false;
                });
                $transactions = array_values($transactions);
            }

            // Sort by date DESC
            usort($transactions, function($a, $b) {
                return strtotime($b['date']) - strtotime($a['date']);
            });

            // Summary Totals
            $summary = [
                'total_sales' => 0.0,
                'total_purchase' => 0.0,
                'total_due' => 0.0,
                'total_wastage' => 0.0,
                'total_other_cost' => 0.0,
                'total_other_sales' => 0.0,
                'count' => count($transactions)
            ];

            foreach ($transactions as $t) {
                switch ($t['type']) {
                    case 'sales':
                        $summary['total_sales'] += $t['amount'];
                        break;
                    case 'purchase':
                        $summary['total_purchase'] += $t['amount'];
                        break;
                    case 'due':
                        $summary['total_due'] += $t['due_amount'];
                        break;
                    case 'wastage':
                        $summary['total_wastage'] += $t['amount'];
                        break;
                    case 'other_cost':
                        $summary['total_other_cost'] += $t['amount'];
                        break;
                    case 'other_sales':
                        $summary['total_other_sales'] += $t['amount'];
                        break;
                }
            }

            header('Content-Type: application/json');
            echo json_encode([
                'summary' => $summary,
                'transactions' => $transactions
            ]);

        } catch (\Exception $e) {
            error_log('Fetch transactions error: ' . $e->getMessage());
            Auth::jsonError('Server error retrieving transactions list: ' . $e->getMessage(), 500);
        }
    }

    private static function formatRow($row) {
        return [
            'ref_id' => $row['ref_id'],
            'raw_id' => (int)$row['raw_id'],
            'type' => $row['type'],
            'date' => $row['date'],
            'party_name' => $row['party_name'],
            'description' => $row['description'],
            'amount' => (float)$row['amount'],
            'paid_amount' => (float)$row['paid_amount'],
            'due_amount' => (float)$row['due_amount'],
            'status' => $row['status'],
            'payment_method' => $row['payment_method'],
            'category' => $row['category']
        ];
    }
}
