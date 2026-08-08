-- Migration for Inventory Batch/Lot Tracking with Expiry Dates
-- This enables tracking of product stock by purchase batch with individual expiry dates

-- -----------------------------------------------------
-- Table `inventory_batches`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `inventory_batches` (
  `id` INT AUTO_INCREMENT,
  `shop_id` INT NOT NULL,
  `product_id` INT NOT NULL,
  `purchase_order_item_id` INT NULL,
  `batch_number` VARCHAR(50) NOT NULL,
  `quantity` INT NOT NULL DEFAULT 0,
  `cost_price` DECIMAL(10,2) NOT NULL,
  `expiry_date` DATE NULL,
  `received_date` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` ENUM('active', 'expired', 'depleted') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_batch_number` (`batch_number`),
  INDEX `idx_batches_shop_product` (`shop_id`, `product_id`),
  INDEX `idx_batches_expiry` (`expiry_date`),
  INDEX `idx_batches_status` (`status`),
  CONSTRAINT `fk_batches_shop`
    FOREIGN KEY (`shop_id`)
    REFERENCES `shops` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_product`
    FOREIGN KEY (`product_id`)
    REFERENCES `products` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_batches_po_item`
    FOREIGN KEY (`purchase_order_item_id`)
    REFERENCES `purchase_order_items` (`id`)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Add batch tracking to sale_items for tracking which batch was used
-- -----------------------------------------------------
SET @column_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'sale_items'
  AND COLUMN_NAME = 'inventory_batch_id'
);

SET @sql = IF(@column_exists = 0,
  'ALTER TABLE `sale_items`
   ADD COLUMN `inventory_batch_id` INT NULL AFTER `product_id`,
   ADD INDEX `idx_sale_items_batch` (`inventory_batch_id`),
   ADD CONSTRAINT `fk_sale_items_batch`
     FOREIGN KEY (`inventory_batch_id`)
     REFERENCES `inventory_batches` (`id`)
     ON DELETE SET NULL
     ON UPDATE CASCADE',
  'SELECT ''Column inventory_batch_id already exists in sale_items'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
