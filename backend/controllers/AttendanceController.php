<?php
/**
 * Attendance Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class AttendanceController {

    public static function createAttendance($requestData) {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin', 'super_admin']);
        
        $currentUserId = Auth::$user['id'];
        $currentUserRole = Auth::$user['role'];
        $shopId = Auth::$user['shop_id'];
        
        // Super admin needs to provide shop_id
        if ($currentUserRole === 'super_admin') {
            if (isset($requestData['shop_id'])) {
                $shopId = (int)$requestData['shop_id'];
            } else {
                Auth::jsonError('Super admin must provide shop_id.', 400);
            }
        }
        
        if ($shopId === null) {
            Auth::jsonError('Attendance can only be marked by shop users.', 403);
        }
        
        // Shop admins can create attendance for other staff in their shop
        // Shop staff can only create their own attendance
        // Super admin can create attendance for any user in the specified shop
        $targetUserId = $requestData['user_id'] ?? $currentUserId;
        
        if ($currentUserRole === 'shop_staff' && $targetUserId != $currentUserId) {
            Auth::jsonError('Staff can only mark their own attendance.', 403);
        }
        
        // Verify the target user belongs to the same shop
        $stmt = DB::query(
            'SELECT id FROM users WHERE id = ? AND shop_id = ?',
            [$targetUserId, $shopId]
        );
        if (!$stmt->fetch()) {
            Auth::jsonError('Target user not found in your shop.', 404);
        }
        
        $date = $requestData['date'] ?? date('Y-m-d');
        $status = $requestData['status'] ?? 'present';
        $notes = $requestData['notes'] ?? null;
        $checkInTime = $requestData['check_in_time'] ?? null;
        $checkOutTime = $requestData['check_out_time'] ?? null;
        
        if (empty($date)) {
            Auth::jsonError('Date is required.', 400);
        }
        
        $validStatuses = ['present', 'absent', 'late', 'half_day'];
        if (!in_array($status, $validStatuses)) {
            Auth::jsonError('Invalid status. Must be one of: present, absent, late, half_day.', 400);
        }
        
        try {
            DB::beginTransaction();
            
            // Insert attendance record (multiple records per day now allowed for shifting duties)
            DB::query(
                'INSERT INTO attendance (shop_id, user_id, date, check_in_time, check_out_time, status, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$shopId, $targetUserId, $date, $checkInTime, $checkOutTime, $status, $notes]
            );
            
            $attendanceId = DB::lastInsertId();
            
            DB::commit();
            
            header('Content-Type: application/json');
            http_response_code(201);
            echo json_encode([
                'message' => 'Attendance marked successfully.',
                'attendance_id' => (int)$attendanceId
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Create attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error marking attendance.', 500);
        }
    }

    public static function updateAttendance($requestData) {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin', 'super_admin']);
        
        $currentUserId = Auth::$user['id'];
        $currentUserRole = Auth::$user['role'];
        $shopId = Auth::$user['shop_id'];
        
        // Super admin needs to provide shop_id
        if ($currentUserRole === 'super_admin') {
            if (isset($requestData['shop_id'])) {
                $shopId = (int)$requestData['shop_id'];
            } else {
                Auth::jsonError('Super admin must provide shop_id.', 400);
            }
        }
        
        if ($shopId === null) {
            Auth::jsonError('Attendance can only be updated by shop users.', 403);
        }
        
        // Shop admins can update attendance for any staff in their shop
        // Shop staff can only update their own attendance
        // Super admin can update attendance for any user in the specified shop
        $targetUserId = $requestData['user_id'] ?? $currentUserId;
        
        if ($currentUserRole === 'shop_staff' && $targetUserId != $currentUserId) {
            Auth::jsonError('Staff can only update their own attendance.', 403);
        }
        
        // Verify the target user belongs to the same shop
        $stmt = DB::query(
            'SELECT id FROM users WHERE id = ? AND shop_id = ?',
            [$targetUserId, $shopId]
        );
        if (!$stmt->fetch()) {
            Auth::jsonError('Target user not found in your shop.', 404);
        }
        
        $date = $requestData['date'] ?? null;
        $status = $requestData['status'] ?? null;
        $notes = $requestData['notes'] ?? null;
        $checkInTime = $requestData['check_in_time'] ?? null;
        $checkOutTime = $requestData['check_out_time'] ?? null;
        
        if (empty($date)) {
            Auth::jsonError('Date is required.', 400);
        }
        
        $validStatuses = ['present', 'absent', 'late', 'half_day'];
        if ($status !== null && !in_array($status, $validStatuses)) {
            Auth::jsonError('Invalid status. Must be one of: present, absent, late, half_day.', 400);
        }
        
        try {
            DB::beginTransaction();
            
            // Check if attendance exists for this user on this date
            $stmt = DB::query(
                'SELECT id FROM attendance WHERE user_id = ? AND date = ? AND shop_id = ?',
                [$targetUserId, $date, $shopId]
            );
            $existing = $stmt->fetch();
            
            if (!$existing) {
                DB::rollBack();
                Auth::jsonError('Attendance record not found for this date.', 404);
            }
            
            // Build update query
            $updateFields = [];
            $queryParams = [];
            
            if ($status !== null) {
                $updateFields[] = 'status = ?';
                $queryParams[] = $status;
            }
            if ($notes !== null) {
                $updateFields[] = 'notes = ?';
                $queryParams[] = $notes;
            }
            if ($checkInTime !== null) {
                $updateFields[] = 'check_in_time = ?';
                $queryParams[] = $checkInTime;
            }
            if ($checkOutTime !== null) {
                $updateFields[] = 'check_out_time = ?';
                $queryParams[] = $checkOutTime;
            }
            
            if (empty($updateFields)) {
                DB::rollBack();
                Auth::jsonError('No fields to update.', 400);
            }
            
            $queryParams[] = $targetUserId;
            $queryParams[] = $date;
            $queryParams[] = $shopId;
            
            DB::query(
                "UPDATE attendance SET " . implode(', ', $updateFields) . " WHERE user_id = ? AND date = ? AND shop_id = ?",
                $queryParams
            );
            
            DB::commit();
            
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Attendance updated successfully.'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Update attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error updating attendance.', 500);
        }
    }

    public static function listAttendance() {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
        // Super admin can filter by shop_id from query param
        if (Auth::$user['role'] === 'super_admin' && isset($_GET['shop_id'])) {
            $shopId = (int)$_GET['shop_id'];
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop admins must have a shop_id.', 403);
        }
        
        $startDate = $_GET['start_date'] ?? date('Y-m-01'); // Default to first day of current month
        $endDate = $_GET['end_date'] ?? date('Y-m-t'); // Default to last day of current month
        $userIdFilter = $_GET['user_id'] ?? null;
        $archived = $_GET['archived'] ?? '0'; // Default to non-archived
        
        try {
            // Auto-archive previous month's attendance when viewing current month
            if ($archived === '0' && $startDate === date('Y-m-01')) {
                $previousMonth = date('Y-m', strtotime('-1 month'));
                DB::query(
                    'UPDATE attendance
                     SET is_archived = 1
                     WHERE shop_id = ? AND DATE_FORMAT(date, "%Y-%m") = ? AND is_archived = 0',
                    [$shopId, $previousMonth]
                );
            }

            // Get shop's standard working hours (default to 10.0 if column doesn't exist yet)
            $standardHours = 10.0;
            try {
                $stmt = DB::query('SELECT standard_working_hours FROM shops WHERE id = ?', [$shopId]);
                $shop = $stmt->fetch();
                if ($shop && isset($shop['standard_working_hours'])) {
                    $standardHours = (float)$shop['standard_working_hours'];
                }
            } catch (\Exception $e) {
                // Column doesn't exist yet, use default
                $standardHours = 10.0;
            }

            $query = '
                SELECT a.*, u.name as user_name, u.email as user_email, u.role as user_role
                FROM attendance a
                JOIN users u ON a.user_id = u.id
                WHERE a.shop_id = ? AND a.date BETWEEN ? AND ? AND a.is_archived = ?
            ';
            $params = [$shopId, $startDate, $endDate, $archived];

            if ($userIdFilter !== null) {
                $query .= ' AND a.user_id = ?';
                $params[] = $userIdFilter;
            }

            $query .= ' ORDER BY a.date DESC, a.check_in_time DESC';

            $stmt = DB::query($query, $params);
            $attendanceList = $stmt->fetchAll();

            // Calculate overtime for each attendance record
            foreach ($attendanceList as &$attendance) {
                $attendance['overtime_hours'] = 0;
                if ($attendance['check_in_time'] && $attendance['check_out_time']) {
                    $checkIn = explode(':', $attendance['check_in_time']);
                    $checkOut = explode(':', $attendance['check_out_time']);
                    if (count($checkIn) === 2 && count($checkOut) === 2) {
                        $inMinutes = intval($checkIn[0]) * 60 + intval($checkIn[1]);
                        $outMinutes = intval($checkOut[0]) * 60 + intval($checkOut[1]);
                        $workedMinutes = max(0, $outMinutes - $inMinutes);
                        $workedHours = $workedMinutes / 60;
                        $overtime = max(0, $workedHours - $standardHours);
                        $attendance['overtime_hours'] = round($overtime, 2);
                    }
                }
            }

            header('Content-Type: application/json');
            echo json_encode($attendanceList);
            
        } catch (\Exception $e) {
            error_log('List attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching attendance records.', 500);
        }
    }

    public static function getMyAttendance() {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin', 'super_admin']);
        
        $userId = Auth::$user['id'];
        $shopId = Auth::$user['shop_id'];
        
        // Super admins don't have shop_id, so they need to provide it via query param
        if (Auth::$user['role'] === 'super_admin') {
            if (isset($_GET['shop_id'])) {
                $shopId = (int)$_GET['shop_id'];
            } else {
                // For super admins without shop_id, return empty or error
                header('Content-Type: application/json');
                echo json_encode([]);
                return;
            }
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop staff must have a shop_id.', 403);
        }
        
        $startDate = $_GET['start_date'] ?? date('Y-m-01');
        $endDate = $_GET['end_date'] ?? date('Y-m-t');
        $archived = $_GET['archived'] ?? '0'; // Default to non-archived
        
        try {
            // Auto-archive previous month's attendance when viewing current month
            if ($archived === '0' && $startDate === date('Y-m-01')) {
                $previousMonth = date('Y-m', strtotime('-1 month'));
                DB::query(
                    'UPDATE attendance 
                     SET is_archived = 1 
                     WHERE shop_id = ? AND DATE_FORMAT(date, "%Y-%m") = ? AND is_archived = 0',
                    [$shopId, $previousMonth]
                );
            }
            
            $stmt = DB::query(
                'SELECT a.*, u.name as user_name, u.email as user_email
                 FROM attendance a
                 JOIN users u ON a.user_id = u.id
                 WHERE a.user_id = ? AND a.shop_id = ? AND a.date BETWEEN ? AND ? AND a.is_archived = ?
                 ORDER BY a.date DESC',
                [$userId, $shopId, $startDate, $endDate, $archived]
            );
            $attendanceList = $stmt->fetchAll();
            
            header('Content-Type: application/json');
            echo json_encode($attendanceList);
            
        } catch (\Exception $e) {
            error_log('Get my attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching attendance records.', 500);
        }
    }

    public static function getTodayAttendance() {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin', 'super_admin']);
        
        $userId = Auth::$user['id'];
        $shopId = Auth::$user['shop_id'];
        
        // Super admins don't have shop_id, so they need to provide it via query param
        if (Auth::$user['role'] === 'super_admin') {
            if (isset($_GET['shop_id'])) {
                $shopId = (int)$_GET['shop_id'];
            } else {
                // For super admins without shop_id, return empty
                header('Content-Type: application/json');
                echo json_encode([]);
                return;
            }
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop users must have a shop_id.', 403);
        }
        
        $today = date('Y-m-d');
        
        try {
            $stmt = DB::query(
                'SELECT a.*, u.name as user_name, u.email as user_email
                 FROM attendance a
                 JOIN users u ON a.user_id = u.id
                 WHERE a.user_id = ? AND a.shop_id = ? AND a.date = ?
                 ORDER BY a.check_in_time ASC',
                [$userId, $shopId, $today]
            );
            $attendanceList = $stmt->fetchAll();
            
            header('Content-Type: application/json');
            echo json_encode($attendanceList);
            
        } catch (\Exception $e) {
            error_log('Get today attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching today\'s attendance.', 500);
        }
    }

    public static function deleteAttendance($attendanceId) {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
        // Super admin can filter by shop_id from query param
        if (Auth::$user['role'] === 'super_admin') {
            if (isset($_GET['shop_id'])) {
                $shopId = (int)$_GET['shop_id'];
            } else {
                Auth::jsonError('Super admin must provide shop_id.', 400);
            }
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop admins must have a shop_id.', 403);
        }
        
        if (empty($attendanceId) || !is_numeric($attendanceId)) {
            Auth::jsonError('Valid attendance ID is required.', 400);
        }
        
        try {
            DB::beginTransaction();
            
            // Verify the attendance record belongs to the admin's shop
            $stmt = DB::query(
                'SELECT id FROM attendance WHERE id = ? AND shop_id = ?',
                [$attendanceId, $shopId]
            );
            $attendance = $stmt->fetch();
            
            if (!$attendance) {
                DB::rollBack();
                Auth::jsonError('Attendance record not found in your shop.', 404);
            }
            
            // Delete the attendance record
            DB::query(
                'DELETE FROM attendance WHERE id = ? AND shop_id = ?',
                [$attendanceId, $shopId]
            );
            
            DB::commit();
            
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Attendance record deleted successfully.'
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Delete attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error deleting attendance record.', 500);
        }
    }

    public static function archiveOldAttendance() {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
        // Super admin can filter by shop_id from query param
        if (Auth::$user['role'] === 'super_admin' && isset($_GET['shop_id'])) {
            $shopId = (int)$_GET['shop_id'];
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop admins must have a shop_id.', 403);
        }
        
        $month = $_GET['month'] ?? null; // Format: YYYY-MM
        
        if (empty($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            Auth::jsonError('Valid month parameter required (format: YYYY-MM).', 400);
        }
        
        try {
            DB::beginTransaction();
            
            // Archive all attendance records for the specified month that are not already archived
            $stmt = DB::query(
                'UPDATE attendance 
                 SET is_archived = 1 
                 WHERE shop_id = ? AND DATE_FORMAT(date, "%Y-%m") = ? AND is_archived = 0',
                [$shopId, $month]
            );
            
            $affectedRows = $stmt->rowCount();
            
            DB::commit();
            
            header('Content-Type: application/json');
            echo json_encode([
                'message' => 'Attendance records archived successfully.',
                'archived_count' => $affectedRows
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            error_log('Archive attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error archiving attendance records.', 500);
        }
    }

    public static function getMonthlyStaffReport() {
        Auth::authenticate();
        Auth::authorize(['shop_admin', 'super_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
        // Super admin can filter by shop_id from query param
        if (Auth::$user['role'] === 'super_admin' && isset($_GET['shop_id'])) {
            $shopId = (int)$_GET['shop_id'];
        }
        
        if ($shopId === null) {
            Auth::jsonError('Shop admins must have a shop_id.', 403);
        }
        
        $month = $_GET['month'] ?? date('Y-m'); // Format: YYYY-MM, default to current month
        
        if (empty($month) || !preg_match('/^\d{4}-\d{2}$/', $month)) {
            Auth::jsonError('Valid month parameter required (format: YYYY-MM).', 400);
        }
        
        try {
            // Get all staff members for this shop
            $stmt = DB::query(
                'SELECT id, name, email, role FROM users WHERE shop_id = ? AND role IN (?, ?) ORDER BY name',
                [$shopId, 'shop_admin', 'shop_staff']
            );
            $staffList = $stmt->fetchAll();
            
            // Check if attendance table exists
            $attendanceTableExists = false;
            try {
                $checkTable = DB::query("SHOW TABLES LIKE 'attendance'");
                $attendanceTableExists = $checkTable->fetch() !== false;
            } catch (\Exception $e) {
                $attendanceTableExists = false;
            }
            
            // Get attendance summary for each staff member for the specified month
            $report = [];
            foreach ($staffList as $staff) {
                $attendanceData = [
                    'total_days' => 0,
                    'present_days' => 0,
                    'absent_days' => 0,
                    'late_days' => 0,
                    'half_day_days' => 0,
                    'attendance_details' => null
                ];
                
                if ($attendanceTableExists) {
                    try {
                        $stmt = DB::query(
                            'SELECT 
                                COUNT(*) as total_days,
                                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as present_days,
                                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as absent_days,
                                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as late_days,
                                SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as half_day_days,
                                GROUP_CONCAT(CONCAT(date, \'|\', check_in_time, \'|\', check_out_time, \'|\', notes) ORDER BY date SEPARATOR \'||\') as attendance_details
                             FROM attendance 
                             WHERE shop_id = ? AND user_id = ? AND DATE_FORMAT(date, "%Y-%m") = ?',
                            ['present', 'absent', 'late', 'half_day', $shopId, $staff['id'], $month]
                        );
                        $attendanceData = $stmt->fetch();
                    } catch (\Exception $e) {
                        // If query fails, use default values
                        error_log('Attendance query failed for staff ' . $staff['id'] . ': ' . $e->getMessage());
                    }
                }
                
                // Calculate total working hours
                $totalMinutes = 0;
                if ($attendanceData['attendance_details']) {
                    $details = explode('||', $attendanceData['attendance_details']);
                    foreach ($details as $detail) {
                        $parts = explode('|', $detail);
                        if (count($parts) >= 3 && $parts[1] && $parts[2]) {
                            $checkIn = explode(':', $parts[1]);
                            $checkOut = explode(':', $parts[2]);
                            if (count($checkIn) === 2 && count($checkOut) === 2) {
                                $inMinutes = intval($checkIn[0]) * 60 + intval($checkIn[1]);
                                $outMinutes = intval($checkOut[0]) * 60 + intval($checkOut[1]);
                                $totalMinutes += max(0, $outMinutes - $inMinutes);
                            }
                        }
                    }
                }
                
                $totalHours = floor($totalMinutes / 60);
                $totalMinutesRemainder = $totalMinutes % 60;
                
                $report[] = [
                    'staff_id' => $staff['id'],
                    'staff_name' => $staff['name'],
                    'staff_email' => $staff['email'],
                    'staff_role' => $staff['role'],
                    'month' => $month,
                    'total_days' => (int)$attendanceData['total_days'],
                    'present_days' => (int)$attendanceData['present_days'],
                    'absent_days' => (int)$attendanceData['absent_days'],
                    'late_days' => (int)$attendanceData['late_days'],
                    'half_day_days' => (int)$attendanceData['half_day_days'],
                    'total_working_hours' => $totalHours > 0 || $totalMinutesRemainder > 0 
                        ? sprintf('%d h %d m', $totalHours, $totalMinutesRemainder) 
                        : '0 h',
                    'attendance_percentage' => $attendanceData['total_days'] > 0 
                        ? round(($attendanceData['present_days'] / $attendanceData['total_days']) * 100, 2) 
                        : 0
                ];
            }
            
            header('Content-Type: application/json');
            echo json_encode($report);
            
        } catch (\Exception $e) {
            error_log('Get monthly staff report error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching monthly staff report.', 500);
        }
    }
}
