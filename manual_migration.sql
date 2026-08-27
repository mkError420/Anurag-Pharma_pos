-- Manual migration to add inventory_batch_id column to sale_items table
-- Run this SQL directly on your production database (anuragpos-353134317baa)

-- Check if column exists, if not add it
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'anuragpos-353134317baa'
  AND TABLE_NAME = 'sale_items'
  AND COLUMN_NAME = 'inventory_batch_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `sale_items`
   ADD COLUMN `inventory_batch_id` INT NULL AFTER `product_id`,
   ADD INDEX `idx_sale_items_batch` (`inventory_batch_id`)',
  'SELECT ''Column inventory_batch_id already exists in sale_items'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify
SELECT 'Migration completed' AS status;
