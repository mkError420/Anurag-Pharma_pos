<?php
/**
 * Salary Controller - Staff Salary & Payroll Management
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class SalaryController {

    /**
     * Auto-ensure DB migration on invocation
     */
    public static function ensureSchema() {
        try {
            $pdo = DB::getConnection();
            
            // Check if base_salary column exists in users
            $stmt = $pdo->query("SHOW COLUMNS FROM `users` LIKE 'base_salary'");
            if (!$stmt->fetch()) {
                $pdo->exec("ALTER TABLE `users`
                    ADD COLUMN `base_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `allowed_sections`,
                    ADD COLUMN `salary_type` ENUM('monthly', 'daily', 'hourly') NOT NULL DEFAULT 'monthly' AFTER `base_salary`,
                    ADD COLUMN `daily_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `salary_type`,
                    ADD COLUMN `hourly_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `daily_rate`,
                    ADD COLUMN `overtime_rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `hourly_rate`
                ");
            }

            // Check staff_salaries table
            $pdo->exec("CREATE TABLE IF NOT EXISTS `staff_salaries` (
              `id` INT AUTO_INCREMENT,
              `shop_id` INT NOT NULL,
              `user_id` INT NOT NULL,
              `month` VARCHAR(7) NOT NULL,
              `salary_date` DATE NOT NULL,
              `base_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `working_days` INT NOT NULL DEFAULT 0,
              `present_days` INT NOT NULL DEFAULT 0,
              `absent_days` INT NOT NULL DEFAULT 0,
              `late_days` INT NOT NULL DEFAULT 0,
              `half_days` INT NOT NULL DEFAULT 0,
              `total_working_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
              `overtime_hours` DECIMAL(8,2) NOT NULL DEFAULT 0.00,
              `overtime_pay` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `attendance_deduction` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `bonus` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `net_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `paid_amount` DECIMAL(10,2) NOT NULL DEFAULT 0.00,
              `payment_method` ENUM('cash', 'card', 'mobile_pay', 'bank_transfer', 'other') NOT NULL DEFAULT 'cash',
              `notes` TEXT NULL,
              `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
              `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (`id`),
              INDEX `idx_staff_salaries_shop_month` (`shop_id`, `month`),
              INDEX `idx_staff_salaries_user` (`user_id`),
              CONSTRAINT `fk_staff_salaries_shop`
                FOREIGN KEY (`shop_id`)
                REFERENCES `shops` (`id`)
                ON DELETE CASCADE
                ON UPDATE CASCADE,
              CONSTRAINT `fk_staff_salaries_user`
                FOREIGN KEY (`user_id`)
                REFERENCES `users` (`id`)
                ON DELETE CASCADE
                ON UPDATE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;");

        } catch (\Exception $e) {
            error_log('Salary schema migration error: ' . $e->getMessage());
        }
    }

    public static function listSalaries() {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);

        self::ensureSchema();

        $shopId = Auth::$shopId;
        if (Auth::$user['role'] === 'super_admin' && isset($_GET['shop_id'])) {
            $shopId = (int)$_GET['shop_id'];
        }

        $month = $_GET['month'] ?? null;
        $userId = $_GET['user_id'] ?? null;
        $startDate = $_GET['start_date'] ?? null;
        $endDate = $_GET['end_date'] ?? null;

        try {
            $sql = 'SELECT s.*, u.name as staff_name, u.email as staff_email, u.role as staff_role 
                    FROM staff_salaries s 
                    JOIN users u ON s.user_id = u.id 
                    WHERE ' . ($shopId ? 's.shop_id = ?' : '1=1');
            $params = $shopId ? [$shopId] : [];

            if (!empty($month)) {
                $sql .= ' AND s.month = ?';
                $params[] = $month;
            }

            if (!empty($userId)) {
                $sql .= ' AND s.user_id = ?';
                $params[] = (int)$userId;
            }

            if (!empty($startDate) && !empty($endDate)) {
                $sql .= ' AND s.salary_date BETWEEN ? AND ?';
                $params[] = $startDate;
                $params[] = $endDate;
            }

            $sql .= ' ORDER BY s.salary_date DESC, s.id DESC';

            $stmt = DB::query($sql, $params);
            $salaries = $stmt->fetchAll();

            foreach ($salaries as &$s) {
                $s['id'] = (int)$s['id'];
                $s['shop_id'] = (int)$s['shop_id'];
                $s['user_id'] = (int)$s['user_id'];
                $s['base_salary'] = (float)$s['base_salary'];
                $s['working_days'] = (int)$s['working_days'];
                $s['present_days'] = (int)$s['present_days'];
                $s['absent_days'] = (int)$s['absent_days'];
                $s['late_days'] = (int)$s['late_days'];
                $s['half_days'] = (int)$s['half_days'];
                $s['total_working_hours'] = (float)$s['total_working_hours'];
                $s['overtime_hours'] = (float)$s['overtime_hours'];
                $s['overtime_pay'] = (float)$s['overtime_pay'];
                $s['attendance_deduction'] = (float)$s['attendance_deduction'];
                $s['bonus'] = (float)$s['bonus'];
                $s['net_salary'] = (float)$s['net_salary'];
                $s['paid_amount'] = (float)$s['paid_amount'];
            }

            header('Content-Type: application/json');
            echo json_encode($salaries);

        } catch (\Exception $e) {
            error_log('Fetch salaries error: ' . $e->getMessage());
            Auth::jsonError('Server error retrieving salary payments.', 500);
        }
    }

    public static function calculateSalary() {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);

        self::ensureSchema();

        $shopId = Auth::$shopId;
        if (Auth::$user['role'] === 'super_admin' && isset($_GET['shop_id'])) {
            $shopId = (int)$_GET['shop_id'];
        }

        $userId = $_GET['user_id'] ?? null;
        $month = $_GET['month'] ?? date('Y-m'); // Format: YYYY-MM

        if (empty($userId) || empty($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            Auth::jsonError('Valid user_id and month (YYYY-MM) are required.', 400);
        }

        try {
            // Get staff user details
            $stmt = DB::query('SELECT id, shop_id, name, email, role, base_salary, salary_type, daily_rate, hourly_rate, overtime_rate_per_hour FROM users WHERE id = ?', [(int)$userId]);
            $staff = $stmt->fetch();

            if (!$staff) {
                Auth::jsonError('Staff member not found.', 404);
            }

            $effectiveShopId = $shopId ?: $staff['shop_id'];

            // Get shop standard working hours per day
            try {
                $stmtShop = DB::query('SELECT standard_working_hours FROM shops WHERE id = ?', [$effectiveShopId]);
                $shopRow = $stmtShop->fetch();
                $stdHoursPerDay = (float)($shopRow['standard_working_hours'] ?? 10.0);
            } catch (\Exception $e) {
                // Column doesn't exist yet, use default
                error_log('Standard working hours column not found: ' . $e->getMessage());
                $stdHoursPerDay = 10.0;
            }
            if ($stdHoursPerDay <= 0) $stdHoursPerDay = 10.0;

            // Determine total days in month
            $daysInMonth = (int)date('t', strtotime($month . '-01'));

            // Query attendance summary for user in that month
            try {
                $stmtAtt = DB::query(
                    'SELECT 
                        COUNT(*) as total_records,
                        SUM(CASE WHEN status = "present" THEN 1 ELSE 0 END) as present_days,
                        SUM(CASE WHEN status = "absent" THEN 1 ELSE 0 END) as absent_days,
                        SUM(CASE WHEN status = "late" THEN 1 ELSE 0 END) as late_days,
                        SUM(CASE WHEN status = "half_day" THEN 1 ELSE 0 END) as half_day_days,
                        GROUP_CONCAT(CONCAT(date, \'|\', check_in_time, \'|\', check_out_time, \'|\', status) ORDER BY date SEPARATOR \'||\') as att_details
                     FROM attendance 
                     WHERE shop_id = ? AND user_id = ? AND DATE_FORMAT(date, "%Y-%m") = ?',
                    [$effectiveShopId, (int)$userId, $month]
                );
                $attRow = $stmtAtt->fetch();
            } catch (\Exception $e) {
                // If attendance table doesn't exist, return default values
                error_log('Attendance table query failed: ' . $e->getMessage());
                $attRow = [
                    'total_records' => 0,
                    'present_days' => 0,
                    'absent_days' => 0,
                    'late_days' => 0,
                    'half_day_days' => 0,
                    'att_details' => null
                ];
            }

            $presentDays = (int)($attRow['present_days'] ?? 0);
            $absentDays = (int)($attRow['absent_days'] ?? 0);
            $lateDays = (int)($attRow['late_days'] ?? 0);
            $halfDays = (int)($attRow['half_day_days'] ?? 0);
            $totalRecords = (int)($attRow['total_records'] ?? 0);

            // Calculate total working hours and overtime hours
            $totalMinutes = 0;
            $totalOvertimeMinutes = 0;

            if (!empty($attRow['att_details'])) {
                $records = explode('||', $attRow['att_details']);
                foreach ($records as $rec) {
                    $parts = explode('|', $rec);
                    if (count($parts) >= 3 && !empty($parts[1]) && !empty($parts[2])) {
                        $in = explode(':', $parts[1]);
                        $out = explode(':', $parts[2]);
                        if (count($in) >= 2 && count($out) >= 2) {
                            $inMins = intval($in[0]) * 60 + intval($in[1]);
                            $outMins = intval($out[0]) * 60 + intval($out[1]);
                            $workedMins = max(0, $outMins - $inMins);
                            $totalMinutes += $workedMins;

                            $stdMins = $stdHoursPerDay * 60;
                            if ($workedMins > $stdMins) {
                                $totalOvertimeMinutes += ($workedMins - $stdMins);
                            }
                        }
                    }
                }
            }

            $totalWorkingHours = round($totalMinutes / 60, 2);
            $overtimeHours = round($totalOvertimeMinutes / 60, 2);

            // Salary calculations based on settings
            $baseSalary = (float)$staff['base_salary'];
            $dailyRate = (float)$staff['daily_rate'];
            $hourlyRate = (float)$staff['hourly_rate'];
            $overtimeRate = (float)$staff['overtime_rate_per_hour'];
            $salaryType = $staff['salary_type'] ?? 'monthly';

            if ($dailyRate <= 0 && $baseSalary > 0) {
                $dailyRate = round($baseSalary / $daysInMonth, 2);
            }

            if ($overtimeRate <= 0 && $hourlyRate > 0) {
                $overtimeRate = $hourlyRate * 1.5; // default 1.5x overtime if not specified
            } else if ($overtimeRate <= 0 && $dailyRate > 0) {
                $overtimeRate = round(($dailyRate / $stdHoursPerDay) * 1.25, 2);
            }

            $overtimePay = round($overtimeHours * $overtimeRate, 2);

            // Deduction calculation:
            // Full absent day = 1 full daily rate
            // Half day = 0.5 daily rate deduction
            $attendanceDeduction = round(($absentDays * $dailyRate) + ($halfDays * 0.5 * $dailyRate), 2);

            $netSalary = max(0, round($baseSalary - $attendanceDeduction + $overtimePay, 2));

            // Check if already paid for this month
            $stmtPaid = DB::query('SELECT id, salary_date, net_salary, paid_amount FROM staff_salaries WHERE shop_id = ? AND user_id = ? AND month = ?', [$effectiveShopId, (int)$userId, $month]);
            $existingPayment = $stmtPaid->fetch();

            header('Content-Type: application/json');
            echo json_encode([
                'user_id' => (int)$staff['id'],
                'staff_name' => $staff['name'],
                'staff_email' => $staff['email'],
                'staff_role' => $staff['role'],
                'month' => $month,
                'days_in_month' => $daysInMonth,
                'salary_type' => $salaryType,
                'base_salary' => $baseSalary,
                'daily_rate' => $dailyRate,
                'hourly_rate' => $hourlyRate,
                'overtime_rate_per_hour' => $overtimeRate,
                'working_days' => $totalRecords,
                'present_days' => $presentDays,
                'absent_days' => $absentDays,
                'late_days' => $lateDays,
                'half_days' => $halfDays,
                'total_working_hours' => $totalWorkingHours,
                'overtime_hours' => $overtimeHours,
                'overtime_pay' => $overtimePay,
                'attendance_deduction' => $attendanceDeduction,
                'bonus' => 0.00,
                'net_salary' => $netSalary,
                'already_paid' => $existingPayment ? true : false,
                'existing_payment' => $existingPayment ?: null
            ]);

        } catch (\Exception $e) {
            error_log('Calculate salary error: ' . $e->getMessage());
            Auth::jsonError('Server error calculating staff salary.', 500);
        }
    }

    public static function createSalary($requestData) {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);

        self::ensureSchema();

        $shopId = Auth::$shopId;
        if (Auth::$user['role'] === 'super_admin' && isset($requestData['shop_id'])) {
            $shopId = (int)$requestData['shop_id'];
        }

        $userId = (int)($requestData['user_id'] ?? 0);
        $month = $requestData['month'] ?? date('Y-m');
        $salaryDate = $requestData['salary_date'] ?? date('Y-m-d');
        $baseSalary = (float)($requestData['base_salary'] ?? 0);
        $workingDays = (int)($requestData['working_days'] ?? 0);
        $presentDays = (int)($requestData['present_days'] ?? 0);
        $absentDays = (int)($requestData['absent_days'] ?? 0);
        $lateDays = (int)($requestData['late_days'] ?? 0);
        $halfDays = (int)($requestData['half_days'] ?? 0);
        $totalWorkingHours = (float)($requestData['total_working_hours'] ?? 0);
        $overtimeHours = (float)($requestData['overtime_hours'] ?? 0);
        $overtimePay = (float)($requestData['overtime_pay'] ?? 0);
        $attendanceDeduction = (float)($requestData['attendance_deduction'] ?? 0);
        $bonus = (float)($requestData['bonus'] ?? 0);
        $netSalary = (float)($requestData['net_salary'] ?? 0);
        $paidAmount = (float)($requestData['paid_amount'] ?? 0);
        $paymentMethod = $requestData['payment_method'] ?? 'cash';
        $notes = $requestData['notes'] ?? null;

        if (empty($userId) || empty($month) || empty($salaryDate) || $paidAmount <= 0) {
            Auth::jsonError('Please select staff, month, payment date, and enter a positive paid amount.', 400);
        }

        $validMethods = ['cash', 'card', 'mobile_pay', 'bank_transfer', 'other'];
        if (!in_array($paymentMethod, $validMethods)) {
            $paymentMethod = 'cash';
        }

        try {
            DB::beginTransaction();

            // Verify user belongs to shop
            $stmtUser = DB::query('SELECT shop_id FROM users WHERE id = ?', [$userId]);
            $uRow = $stmtUser->fetch();
            if (!$uRow) {
                DB::rollBack();
                Auth::jsonError('Staff member not found.', 404);
            }

            $targetShopId = $shopId ?: $uRow['shop_id'];

            // Insert salary payment record
            DB::query(
                'INSERT INTO staff_salaries (
                    shop_id, user_id, month, salary_date, base_salary, working_days,
                    present_days, absent_days, late_days, half_days, total_working_hours,
                    overtime_hours, overtime_pay, attendance_deduction, bonus, net_salary,
                    paid_amount, payment_method, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [
                    $targetShopId, $userId, $month, $salaryDate, $baseSalary, $workingDays,
                    $presentDays, $absentDays, $lateDays, $halfDays, $totalWorkingHours,
                    $overtimeHours, $overtimePay, $attendanceDeduction, $bonus, $netSalary,
                    $paidAmount, $paymentMethod, $notes
                ]
            );

            $salaryId = DB::lastInsertId();

            DB::commit();

            header('Content-Type: application/json');
            http_response_code(201);
            echo json_encode([
                'message' => 'Staff salary payment recorded successfully.',
                'salary_id' => (int)$salaryId
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Create salary error: ' . $e->getMessage());
            Auth::jsonError('Server error processing salary payment.', 500);
        }
    }

    public static function updateSalary($id, $requestData) {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);

        self::ensureSchema();

        $salaryId = (int)$id;
        $shopId = Auth::$shopId;

        $salaryDate = $requestData['salary_date'] ?? date('Y-m-d');
        $bonus = (float)($requestData['bonus'] ?? 0);
        $attendanceDeduction = (float)($requestData['attendance_deduction'] ?? 0);
        $netSalary = (float)($requestData['net_salary'] ?? 0);
        $paidAmount = (float)($requestData['paid_amount'] ?? 0);
        $paymentMethod = $requestData['payment_method'] ?? 'cash';
        $notes = $requestData['notes'] ?? null;

        if ($paidAmount <= 0) {
            Auth::jsonError('Paid amount must be greater than zero.', 400);
        }

        try {
            DB::beginTransaction();

            $stmt = DB::query('SELECT id FROM staff_salaries WHERE id = ? ' . ($shopId ? 'AND shop_id = ?' : ''), $shopId ? [$salaryId, $shopId] : [$salaryId]);
            if (!$stmt->fetch()) {
                DB::rollBack();
                Auth::jsonError('Salary payment record not found.', 404);
            }

            DB::query(
                'UPDATE staff_salaries SET 
                    salary_date = ?, bonus = ?, attendance_deduction = ?, net_salary = ?, paid_amount = ?, payment_method = ?, notes = ?
                 WHERE id = ?',
                [$salaryDate, $bonus, $attendanceDeduction, $netSalary, $paidAmount, $paymentMethod, $notes, $salaryId]
            );

            DB::commit();

            header('Content-Type: application/json');
            echo json_encode(['message' => 'Salary payment record updated successfully.']);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Update salary error: ' . $e->getMessage());
            Auth::jsonError('Server error updating salary payment.', 500);
        }
    }

    public static function deleteSalary($id) {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);

        self::ensureSchema();

        $salaryId = (int)$id;
        $shopId = Auth::$shopId;

        try {
            DB::beginTransaction();

            $stmt = DB::query('SELECT id FROM staff_salaries WHERE id = ? ' . ($shopId ? 'AND shop_id = ?' : ''), $shopId ? [$salaryId, $shopId] : [$salaryId]);
            if (!$stmt->fetch()) {
                DB::rollBack();
                Auth::jsonError('Salary record not found.', 404);
            }

            DB::query('DELETE FROM staff_salaries WHERE id = ?', [$salaryId]);

            DB::commit();

            header('Content-Type: application/json');
            echo json_encode(['message' => 'Salary payment record deleted successfully.']);

        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Delete salary error: ' . $e->getMessage());
            Auth::jsonError('Server error deleting salary record.', 500);
        }
    }
}
