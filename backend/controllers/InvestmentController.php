<?php
/**
 * Investment Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class InvestmentController {

    /**
     * GET /investments
     * Get all investments for a shop
     */
    public static function getInvestments() {
        Auth::authenticate();
        Auth::authorize(['super_admin', 'shop_admin']);

        $shopId = Auth::$shopId;
        $hasShop = $shopId !== null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        try {
            $sql = 'SELECT i.*, u.name as created_by_name 
                    FROM investments i 
                    LEFT JOIN users u ON i.created_by = u.id
                    WHERE ' . ($hasShop ? 'i.shop_id = ?' : '1=1');
            $params = $hasShop ? [$shopId] : [];

            if (!empty($startDate) && !empty($endDate)) {
                $sql .= ' AND i.investment_date BETWEEN ? AND ?';
                $params[] = $startDate;
                $params[] = $endDate;
            }

            $sql .= ' ORDER BY i.investment_date DESC, i.created_at DESC';

            $stmt = DB::query($sql, $params);
            $investments = $stmt->fetchAll();

            foreach ($investments as &$inv) {
                $inv['id'] = (int)$inv['id'];
                $inv['shop_id'] = (int)$inv['shop_id'];
                $inv['amount'] = (float)$inv['amount'];
                $inv['created_by'] = (int)$inv['created_by'];
            }

            header('Content-Type: application/json');
            echo json_encode($investments);

        } catch (\Exception $e) {
            error_log('Get investments error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching investments.', 500);
        }
    }

    /**
     * POST /investments
     * Create a new investment
     */
    public static function createInvestment() {
        Auth::authenticate();
        Auth::authorize(['super_admin', 'shop_admin']);

        $shopId = Auth::$shopId;
        $userId = Auth::$user['id'];

        if ($shopId === null) {
            Auth::jsonError('Shop ID required.', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($input['amount']) || empty($input['investment_type']) || empty($input['investment_date'])) {
            Auth::jsonError('Amount, investment type, and investment date are required.', 400);
        }

        try {
            DB::beginTransaction();

            $sql = 'INSERT INTO investments (shop_id, investment_type, amount, description, investor_name, investment_date, created_by) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)';
            
            $params = [
                $shopId,
                $input['investment_type'],
                (float)$input['amount'],
                $input['description'] ?? null,
                $input['investor_name'] ?? null,
                $input['investment_date'],
                $userId
            ];

            DB::query($sql, $params);
            $investmentId = DB::lastInsertId();

            DB::commit();

            header('Content-Type: application/json');
            echo json_encode([
                'id' => (int)$investmentId,
                'message' => 'Investment recorded successfully'
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Create investment error: ' . $e->getMessage());
            Auth::jsonError('Server error creating investment.', 500);
        }
    }

    /**
     * PUT /investments/:id
     * Update an investment
     */
    public static function updateInvestment($id) {
        Auth::authenticate();
        Auth::authorize(['super_admin', 'shop_admin']);

        $shopId = Auth::$shopId;

        if ($shopId === null) {
            Auth::jsonError('Shop ID required.', 400);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        try {
            DB::beginTransaction();

            // Check if investment exists and belongs to shop
            $checkSql = 'SELECT id FROM investments WHERE id = ? AND shop_id = ?';
            $stmt = DB::query($checkSql, [$id, $shopId]);
            
            if (!$stmt->fetch()) {
                DB::rollBack();
                Auth::jsonError('Investment not found.', 404);
            }

            $sql = 'UPDATE investments SET 
                    investment_type = COALESCE(?, investment_type),
                    amount = COALESCE(?, amount),
                    description = COALESCE(?, description),
                    investor_name = COALESCE(?, investor_name),
                    investment_date = COALESCE(?, investment_date)
                    WHERE id = ? AND shop_id = ?';

            $params = [
                $input['investment_type'] ?? null,
                isset($input['amount']) ? (float)$input['amount'] : null,
                $input['description'] ?? null,
                $input['investor_name'] ?? null,
                $input['investment_date'] ?? null,
                $id,
                $shopId
            ];

            DB::query($sql, $params);

            DB::commit();

            header('Content-Type: application/json');
            echo json_encode(['message' => 'Investment updated successfully']);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Update investment error: ' . $e->getMessage());
            Auth::jsonError('Server error updating investment.', 500);
        }
    }

    /**
     * DELETE /investments/:id
     * Delete an investment
     */
    public static function deleteInvestment($id) {
        Auth::authenticate();
        Auth::authorize(['super_admin', 'shop_admin']);

        $shopId = Auth::$shopId;

        if ($shopId === null) {
            Auth::jsonError('Shop ID required.', 400);
        }

        try {
            // Check if investment exists and belongs to shop
            $checkSql = 'SELECT id FROM investments WHERE id = ? AND shop_id = ?';
            $stmt = DB::query($checkSql, [$id, $shopId]);
            
            if (!$stmt->fetch()) {
                Auth::jsonError('Investment not found.', 404);
            }

            $sql = 'DELETE FROM investments WHERE id = ? AND shop_id = ?';
            DB::query($sql, [$id, $shopId]);

            header('Content-Type: application/json');
            echo json_encode(['message' => 'Investment deleted successfully']);

        } catch (\Exception $e) {
            error_log('Delete investment error: ' . $e->getMessage());
            Auth::jsonError('Server error deleting investment.', 500);
        }
    }

    /**
     * GET /investments/summary
     * Get investment summary for analytics
     */
    public static function getInvestmentSummary() {
        Auth::authenticate();
        Auth::authorize(['super_admin', 'shop_admin']);

        $shopId = Auth::$shopId;
        $hasShop = $shopId !== null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        try {
            // Total capital injected
            $injectionSql = 'SELECT COALESCE(SUM(amount), 0) as total_injected
                             FROM investments 
                             WHERE investment_type = "capital_injection" 
                             AND ' . ($hasShop ? 'shop_id = ?' : '1=1');
            $injectionParams = $hasShop ? [$shopId] : [];

            if (!empty($startDate) && !empty($endDate)) {
                $injectionSql .= ' AND investment_date BETWEEN ? AND ?';
                $injectionParams[] = $startDate;
                $injectionParams[] = $endDate;
            }

            $stmt = DB::query($injectionSql, $injectionParams);
            $totalInjected = (float)($stmt->fetchColumn() ?: 0);

            // Total capital withdrawn
            $withdrawalSql = 'SELECT COALESCE(SUM(amount), 0) as total_withdrawn
                              FROM investments 
                              WHERE investment_type = "capital_withdrawal" 
                              AND ' . ($hasShop ? 'shop_id = ?' : '1=1');
            $withdrawalParams = $hasShop ? [$shopId] : [];

            if (!empty($startDate) && !empty($endDate)) {
                $withdrawalSql .= ' AND investment_date BETWEEN ? AND ?';
                $withdrawalParams[] = $startDate;
                $withdrawalParams[] = $endDate;
            }

            $stmt = DB::query($withdrawalSql, $withdrawalParams);
            $totalWithdrawn = (float)($stmt->fetchColumn() ?: 0);

            // Total profit reinvested
            $reinvestedSql = 'SELECT COALESCE(SUM(amount), 0) as total_reinvested
                             FROM investments 
                             WHERE investment_type = "profit_reinvestment" 
                             AND ' . ($hasShop ? 'shop_id = ?' : '1=1');
            $reinvestedParams = $hasShop ? [$shopId] : [];

            if (!empty($startDate) && !empty($endDate)) {
                $reinvestedSql .= ' AND investment_date BETWEEN ? AND ?';
                $reinvestedParams[] = $startDate;
                $reinvestedParams[] = $endDate;
            }

            $stmt = DB::query($reinvestedSql, $reinvestedParams);
            $totalReinvested = (float)($stmt->fetchColumn() ?: 0);

            // Total external investments
            $externalSql = 'SELECT COALESCE(SUM(amount), 0) as total_external
                            FROM investments 
                            WHERE investment_type = "external_investment" 
                            AND ' . ($hasShop ? 'shop_id = ?' : '1=1');
            $externalParams = $hasShop ? [$shopId] : [];

            if (!empty($startDate) && !empty($endDate)) {
                $externalSql .= ' AND investment_date BETWEEN ? AND ?';
                $externalParams[] = $startDate;
                $externalParams[] = $endDate;
            }

            $stmt = DB::query($externalSql, $externalParams);
            $totalExternal = (float)($stmt->fetchColumn() ?: 0);

            // Net capital position
            $netCapital = $totalInjected + $totalReinvested + $totalExternal - $totalWithdrawn;

            // Get investment trend (last 7 days)
            $trendMap = [];
            for ($i = 6; $i >= 0; $i--) {
                $dateStr = date('Y-m-d', strtotime("-$i days"));
                $trendMap[$dateStr] = [
                    'date' => $dateStr,
                    'capital_injection' => 0.0,
                    'capital_withdrawal' => 0.0,
                    'profit_reinvestment' => 0.0,
                    'external_investment' => 0.0,
                    'net_flow' => 0.0
                ];
            }

            $trendSql = 'SELECT DATE_FORMAT(investment_date, "%Y-%m-%d") as date, investment_type, SUM(amount) as amount
                        FROM investments 
                        WHERE ' . ($hasShop ? 'shop_id = ?' : '1=1') . ' 
                        AND investment_date >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
                        GROUP BY DATE_FORMAT(investment_date, "%Y-%m-%d"), investment_type';

            $stmt = DB::query($trendSql, $hasShop ? [$shopId] : []);
            while ($row = $stmt->fetch()) {
                $dt = $row['date'];
                if (isset($trendMap[$dt])) {
                    $trendMap[$dt][$row['investment_type']] = (float)$row['amount'];
                }
            }

            // Calculate net flow for each day
            foreach ($trendMap as &$day) {
                $day['net_flow'] = $day['capital_injection'] + $day['profit_reinvestment'] + $day['external_investment'] - $day['capital_withdrawal'];
            }

            $trend = array_values($trendMap);

            header('Content-Type: application/json');
            echo json_encode([
                'total_capital_injected' => $totalInjected,
                'total_capital_withdrawn' => $totalWithdrawn,
                'total_profit_reinvested' => $totalReinvested,
                'total_external_investment' => $totalExternal,
                'net_capital_position' => $netCapital,
                'trend' => $trend
            ]);

        } catch (\Exception $e) {
            error_log('Investment summary error: ' . $e->getMessage());
            Auth::jsonError('Server error generating investment summary.', 500);
        }
    }
}
