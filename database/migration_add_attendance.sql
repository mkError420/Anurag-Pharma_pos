-- Migration: Add Attendance Table
-- This table tracks staff attendance records

USE `multitenant_pos`;

CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT AUTO_INCREMENT,
  `shop_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  `date` DATE NOT NULL,
  `check_in_time` TIME NULL,
  `check_out_time` TIME NULL,
  `status` ENUM('present', 'absent', 'late', 'half_day') NOT NULL DEFAULT 'present',
  `notes` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_date` (`user_id`, `date`),
  INDEX `idx_attendance_shop_date` (`shop_id`, `date`),
  INDEX `idx_attendance_user_date` (`user_id`, `date`),
  CONSTRAINT `fk_attendance_shop`
    FOREIGN KEY (`shop_id`)
    REFERENCES `shops` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,
  CONSTRAINT `fk_attendance_user`
    FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
