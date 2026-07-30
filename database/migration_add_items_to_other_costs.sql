-- Add items column to other_costs table
ALTER TABLE `other_costs` ADD COLUMN `items` JSON NULL AFTER `notes`;
