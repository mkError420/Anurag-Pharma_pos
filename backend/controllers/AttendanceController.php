<?php
/**
 * Attendance Controller
 */

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../middleware/auth.php';

class AttendanceController {

    public static function createAttendance($requestData) {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin']);
        
        $userId = Auth::$user['id'];
        $shopId = Auth::$user['shop_id'];
        
        if ($shopId === null) {
            Auth::jsonError('Attendance can only be marked by shop users.', 403);
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
            
            // Check if attendance already exists for this user on this date
            $stmt = DB::query(
                'SELECT id FROM attendance WHERE user_id = ? AND date = ?',
                [$userId, $date]
            );
            $existing = $stmt->fetch();
            
            if ($existing) {
                DB::rollBack();
                Auth::jsonError('Attendance already marked for this date.', 400);
            }
            
            // Insert attendance record
            DB::query(
                'INSERT INTO attendance (shop_id, user_id, date, check_in_time, check_out_time, status, notes) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)',
                [$shopId, $userId, $date, $checkInTime, $checkOutTime, $status, $notes]
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
        Auth::authorize(['shop_staff', 'shop_admin']);
        
        $currentUserId = Auth::$user['id'];
        $currentUserRole = Auth::$user['role'];
        $shopId = Auth::$user['shop_id'];
        
        if ($shopId === null) {
            Auth::jsonError('Attendance can only be updated by shop users.', 403);
        }
        
        // Shop admins can update attendance for any staff in their shop
        // Shop staff can only update their own attendance
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
        Auth::authorize(['shop_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
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
            
            header('Content-Type: application/json');
            echo json_encode($attendanceList);
            
        } catch (\Exception $e) {
            error_log('List attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching attendance records.', 500);
        }
    }

    public static function getMyAttendance() {
        Auth::authenticate();
        Auth::authorize(['shop_staff', 'shop_admin']);
        
        $userId = Auth::$user['id'];
        $shopId = Auth::$user['shop_id'];
        
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
        Auth::authorize(['shop_staff', 'shop_admin']);
        
        $userId = Auth::$user['id'];
        $shopId = Auth::$user['shop_id'];
        
        if ($shopId === null) {
            Auth::jsonError('Shop users must have a shop_id.', 403);
        }
        
        $today = date('Y-m-d');
        
        try {
            $stmt = DB::query(
                'SELECT a.*, u.name as user_name, u.email as user_email
                 FROM attendance a
                 JOIN users u ON a.user_id = u.id
                 WHERE a.user_id = ? AND a.shop_id = ? AND a.date = ?',
                [$userId, $shopId, $today]
            );
            $attendance = $stmt->fetch();
            
            header('Content-Type: application/json');
            echo json_encode($attendance ?: null);
            
        } catch (\Exception $e) {
            error_log('Get today attendance error: ' . $e->getMessage());
            Auth::jsonError('Server error fetching today\'s attendance.', 500);
        }
    }

    public static function deleteAttendance($attendanceId) {
        Auth::authenticate();
        Auth::authorize(['shop_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
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
        Auth::authorize(['shop_admin']);
        
        $shopId = Auth::$user['shop_id'];
        
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
}
