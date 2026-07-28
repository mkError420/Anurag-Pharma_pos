-- Migration to add standard_working_hours column to shops table
-- This allows shop admins to configure the standard working hours (default 8 hours)
-- for overtime calculation

USE `multitenant_pos`;

ALTER TABLE `shops`
ADD COLUMN `standard_working_hours` DECIMAL(4,2) NOT NULL DEFAULT 8.00 AFTER `tax_rate`,
ADD INDEX `idx_shops_standard_hours` (`standard_working_hours`);
