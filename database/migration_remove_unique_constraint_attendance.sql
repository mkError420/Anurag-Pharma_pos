-- Migration: Remove unique constraint to allow multiple attendance records per day
-- This enables support for shifting duty times with multiple check-in/check-out pairs

USE `multitenant_pos`;

-- Remove the unique constraint on user_id and date
ALTER TABLE `attendance` DROP INDEX `uq_user_date`;
