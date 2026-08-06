-- Migration for Website Content Management
-- Adds tables for hero_slides and team_members

-- -----------------------------------------------------
-- Table `hero_slides`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `hero_slides` (
  `id` INT AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `subtitle` VARCHAR(255) NULL,
  `description` TEXT NULL,
  `button_text` VARCHAR(100) NULL,
  `button_link` VARCHAR(500) NULL,
  `image_url` VARCHAR(500) NOT NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_hero_slides_order` (`display_order`),
  INDEX `idx_hero_slides_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------
-- Table `team_members`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `team_members` (
  `id` INT AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `role` VARCHAR(255) NOT NULL,
  `bio` TEXT NULL,
  `image_url` VARCHAR(500) NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `status` ENUM('active', 'inactive') DEFAULT 'active',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_team_members_order` (`display_order`),
  INDEX `idx_team_members_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
