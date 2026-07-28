-- Migration: Add Archive Flag to Attendance Table
-- This allows attendance records to be archived when a month ends

USE `multitenant_pos`;

ALTER TABLE `attendance`
ADD COLUMN `is_archived` TINYINT(1) NOT NULL DEFAULT 0 AFTER `notes`,
ADD INDEX `idx_attendance_archived` (`is_archived`);
