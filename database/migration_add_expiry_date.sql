-- Migration: Add expiry_date to products and purchase_order_items tables
-- Run this once on your database to enable expiry-date-based inventory splitting

-- -------------------------------------------------------
-- Add expiry_date to products table (if not exists)
-- -------------------------------------------------------
SET @col_products = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'products'
  AND COLUMN_NAME = 'expiry_date'
);

SET @sql_products = IF(@col_products = 0,
  'ALTER TABLE `products` ADD COLUMN `expiry_date` DATE NULL DEFAULT NULL AFTER `low_stock_threshold`',
  'SELECT ''Column expiry_date already exists in products'' AS message'
);

PREPARE stmt FROM @sql_products;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------
-- Add expiry_date to purchase_order_items table (if not exists)
-- -------------------------------------------------------
SET @col_poi = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'purchase_order_items'
  AND COLUMN_NAME = 'expiry_date'
);

SET @sql_poi = IF(@col_poi = 0,
  'ALTER TABLE `purchase_order_items` ADD COLUMN `expiry_date` DATE NULL DEFAULT NULL AFTER `subtotal`',
  'SELECT ''Column expiry_date already exists in purchase_order_items'' AS message'
);

PREPARE stmt FROM @sql_poi;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
