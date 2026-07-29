-- Migration: Add Staff Salary Settings to Users & Create Staff Salaries Table
USE `multitenant_pos`;

-- 1. Add salary fields to users table if they don't exist
ALTER TABLE `users`
ADD COLUMN `base_salary` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `allowed_sections`,
ADD COLUMN `salary_type` ENUM('monthly', 'daily', 'hourly') NOT NULL DEFAULT 'monthly' AFTER `base_salary`,
ADD COLUMN `daily_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `salary_type`,
ADD COLUMN `hourly_rate` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `daily_rate`,
ADD COLUMN `overtime_rate_per_hour` DECIMAL(10,2) NOT NULL DEFAULT 0.00 AFTER `hourly_rate`;

-- 2. Create staff_salaries table for recording salary payments/disbursals
CREATE TABLE IF NOT EXISTS `staff_salaries` (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
