-- =============================================================================
-- Tab Empire (TapEmpire) Production Database Schema & Migrations
-- Target Engine: MySQL 8.0.39+ / InnoDB / utf8mb4_unicode_ci
-- Environment: Shared Hosting / cPanel / Cloud MySQL
-- =============================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

-- -----------------------------------------------------------------------------
-- 1. Table: roles
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `slug` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_slug` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 2. Table: permissions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `permissions`;
CREATE TABLE `permissions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `action` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_perm` (`role_id`, `module`, `action`),
  CONSTRAINT `fk_perm_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 3. Table: admin_users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `admin_users`;
CREATE TABLE `admin_users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` BIGINT UNSIGNED NOT NULL,
  `username` VARCHAR(64) NOT NULL,
  `email` VARCHAR(191) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `status` ENUM('active', 'inactive', 'banned') NOT NULL DEFAULT 'active',
  `last_login_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_admin_email` (`email`),
  UNIQUE KEY `uq_admin_username` (`username`),
  KEY `idx_admin_role` (`role_id`),
  CONSTRAINT `fk_admin_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 4. Table: users
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `telegram_id` BIGINT NOT NULL,
  `username` VARCHAR(128) NULL,
  `first_name` VARCHAR(128) NOT NULL,
  `last_name` VARCHAR(128) NULL,
  `avatar_url` VARCHAR(512) NULL,
  `language_code` VARCHAR(12) NOT NULL DEFAULT 'en',
  `referral_code` VARCHAR(32) NOT NULL,
  `referred_by` BIGINT UNSIGNED NULL,
  `status` ENUM('active', 'flagged', 'banned') NOT NULL DEFAULT 'active',
  `is_premium` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_users_telegram_id` (`telegram_id`),
  UNIQUE KEY `uq_users_referral_code` (`referral_code`),
  KEY `idx_users_referred_by` (`referred_by`),
  KEY `idx_users_status` (`status`),
  CONSTRAINT `fk_users_referred_by` FOREIGN KEY (`referred_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 5. Table: game_profiles
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `game_profiles`;
CREATE TABLE `game_profiles` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `level` INT UNSIGNED NOT NULL DEFAULT 1,
  `current_xp` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_taps` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `daily_streak` INT UNSIGNED NOT NULL DEFAULT 1,
  `last_daily_claim_date` DATE NULL,
  `last_sequence` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `last_tap_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_profiles_user_id` (`user_id`),
  KEY `idx_profiles_level` (`level`),
  KEY `idx_profiles_current_xp` (`current_xp`),
  CONSTRAINT `fk_profiles_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 6. Table: balances
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `balances`;
CREATE TABLE `balances` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `coins` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `available_balance` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `pending_withdrawal` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_earned` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `total_withdrawn` BIGINT UNSIGNED NOT NULL DEFAULT 0,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_balances_user_id` (`user_id`),
  KEY `idx_balances_coins` (`coins`),
  CONSTRAINT `fk_balances_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 7. Table: energy_states
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `energy_states`;
CREATE TABLE `energy_states` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `current_energy` INT UNSIGNED NOT NULL DEFAULT 1000,
  `max_energy` INT UNSIGNED NOT NULL DEFAULT 1000,
  `regen_rate` INT UNSIGNED NOT NULL DEFAULT 1,
  `regen_interval_seconds` INT UNSIGNED NOT NULL DEFAULT 3,
  `last_energy_updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_energy_user_id` (`user_id`),
  CONSTRAINT `fk_energy_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 8. Table: levels
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `levels`;
CREATE TABLE `levels` (
  `level` INT UNSIGNED NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `xp_required` BIGINT UNSIGNED NOT NULL,
  `tap_multiplier` INT UNSIGNED NOT NULL DEFAULT 1,
  `max_energy` INT UNSIGNED NOT NULL DEFAULT 1000,
  `energy_regen_rate` INT UNSIGNED NOT NULL DEFAULT 1,
  `daily_reward_multiplier` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 9. Table: user_levels
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_levels`;
CREATE TABLE `user_levels` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `level` INT UNSIGNED NOT NULL,
  `unlocked_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_level` (`user_id`, `level`),
  KEY `idx_user_levels_level` (`level`),
  CONSTRAINT `fk_user_levels_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_levels_level` FOREIGN KEY (`level`) REFERENCES `levels` (`level`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 10. Table: daily_rewards
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `daily_rewards`;
CREATE TABLE `daily_rewards` (
  `day` INT UNSIGNED NOT NULL,
  `reward_coins` INT UNSIGNED NOT NULL,
  `reward_xp` INT UNSIGNED NOT NULL,
  `is_special` TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`day`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 11. Table: daily_reward_claims
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `daily_reward_claims`;
CREATE TABLE `daily_reward_claims` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `day` INT UNSIGNED NOT NULL,
  `claim_date` DATE NOT NULL,
  `reward_coins` INT UNSIGNED NOT NULL,
  `reward_xp` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_claim_date` (`user_id`, `claim_date`),
  KEY `idx_claims_user_day` (`user_id`, `day`),
  CONSTRAINT `fk_claims_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 12. Table: boosts
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `boosts`;
CREATE TABLE `boosts` (
  `id` VARCHAR(64) NOT NULL,
  `name` VARCHAR(128) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `type` ENUM('full_energy', 'turbo', 'double_profit', 'auto_bot') NOT NULL,
  `multiplier` INT UNSIGNED NOT NULL DEFAULT 1,
  `duration_seconds` INT UNSIGNED NOT NULL DEFAULT 0,
  `cost` INT UNSIGNED NOT NULL DEFAULT 0,
  `is_free` TINYINT(1) NOT NULL DEFAULT 0,
  `daily_limit` INT UNSIGNED NOT NULL DEFAULT 3,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 13. Table: user_boosts
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_boosts`;
CREATE TABLE `user_boosts` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `boost_id` VARCHAR(64) NOT NULL,
  `activated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `expires_at` TIMESTAMP NOT NULL,
  `multiplier` INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  KEY `idx_user_boosts_active` (`user_id`, `expires_at`),
  CONSTRAINT `fk_user_boosts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_user_boosts_boost` FOREIGN KEY (`boost_id`) REFERENCES `boosts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 14. Table: tasks
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` VARCHAR(64) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `description` VARCHAR(255) NOT NULL,
  `category` ENUM('telegram', 'social', 'in_game', 'partner') NOT NULL,
  `reward_coins` INT UNSIGNED NOT NULL DEFAULT 1000,
  `reward_xp` INT UNSIGNED NOT NULL DEFAULT 50,
  `url` VARCHAR(512) NULL,
  `verification_type` ENUM('instant', 'telegram_channel', 'telegram_group', 'manual_code') NOT NULL DEFAULT 'instant',
  `verification_payload` VARCHAR(255) NULL,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 15. Table: task_completions
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `task_completions`;
CREATE TABLE `task_completions` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `task_id` VARCHAR(64) NOT NULL,
  `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_task` (`user_id`, `task_id`),
  KEY `idx_task_completions_user` (`user_id`),
  CONSTRAINT `fk_task_comp_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_comp_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 16. Table: referrals
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `referrals`;
CREATE TABLE `referrals` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `referrer_id` BIGINT UNSIGNED NOT NULL,
  `referred_id` BIGINT UNSIGNED NOT NULL,
  `tier` TINYINT UNSIGNED NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_referred_user` (`referred_id`),
  KEY `idx_referrer_tier` (`referrer_id`, `tier`),
  CONSTRAINT `fk_ref_referrer` FOREIGN KEY (`referrer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_ref_referred` FOREIGN KEY (`referred_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 17. Table: withdrawal_methods
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `withdrawal_methods`;
CREATE TABLE `withdrawal_methods` (
  `id` VARCHAR(32) NOT NULL,
  `name` VARCHAR(64) NOT NULL,
  `network` VARCHAR(64) NOT NULL,
  `symbol` VARCHAR(16) NOT NULL,
  `min_amount` BIGINT UNSIGNED NOT NULL DEFAULT 10000,
  `fee_percent` DECIMAL(5,2) NOT NULL DEFAULT 5.00,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 18. Table: withdrawals
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `withdrawals`;
CREATE TABLE `withdrawals` (
  `id` VARCHAR(32) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `method_id` VARCHAR(32) NOT NULL,
  `destination_address` VARCHAR(128) NOT NULL,
  `amount` BIGINT UNSIGNED NOT NULL,
  `fee` BIGINT UNSIGNED NOT NULL,
  `net_amount` BIGINT UNSIGNED NOT NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'processing') NOT NULL DEFAULT 'pending',
  `rejection_reason` VARCHAR(255) NULL,
  `tx_hash` VARCHAR(128) NULL,
  `processed_by` BIGINT UNSIGNED NULL,
  `processed_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_withdrawals_user` (`user_id`),
  KEY `idx_withdrawals_status` (`status`),
  KEY `idx_withdrawals_created` (`created_at`),
  CONSTRAINT `fk_w_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_w_method` FOREIGN KEY (`method_id`) REFERENCES `withdrawal_methods` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_w_admin` FOREIGN KEY (`processed_by`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 19. Table: transactions (Double-Entry Ledger)
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `type` ENUM('tap', 'task', 'daily_reward', 'referral', 'boost', 'withdraw', 'refund', 'bonus', 'admin_adjustment') NOT NULL,
  `amount` BIGINT NOT NULL,
  `balance_before` BIGINT UNSIGNED NOT NULL,
  `balance_after` BIGINT UNSIGNED NOT NULL,
  `reference` VARCHAR(255) NOT NULL,
  `metadata_json` JSON NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_tx_user_created` (`user_id`, `created_at`),
  KEY `idx_tx_type` (`type`),
  CONSTRAINT `fk_tx_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 20. Table: anti_cheat_events
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `anti_cheat_events`;
CREATE TABLE `anti_cheat_events` (
  `id` VARCHAR(64) NOT NULL,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `username` VARCHAR(128) NOT NULL,
  `type` ENUM('duplicate_nonce', 'speed_hack', 'timestamp_skew', 'energy_tamper', 'impossible_score', 'ip_abuse') NOT NULL,
  `severity` ENUM('low', 'medium', 'high', 'critical') NOT NULL,
  `details` TEXT NOT NULL,
  `client_ip` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  `status` ENUM('flagged', 'banned', 'reviewed', 'cleared') NOT NULL DEFAULT 'flagged',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_ac_user` (`user_id`),
  KEY `idx_ac_type_status` (`type`, `status`),
  KEY `idx_ac_created` (`created_at`),
  CONSTRAINT `fk_ac_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 21. Table: notifications
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT UNSIGNED NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `type` ENUM('system', 'reward', 'referral', 'withdrawal') NOT NULL DEFAULT 'system',
  `is_read` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_notif_user_read` (`user_id`, `is_read`),
  CONSTRAINT `fk_notif_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 22. Table: settings
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `settings`;
CREATE TABLE `settings` (
  `setting_key` VARCHAR(64) NOT NULL,
  `setting_value` TEXT NOT NULL,
  `category` VARCHAR(32) NOT NULL DEFAULT 'general',
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`setting_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------------------------
-- 23. Table: audit_logs
-- -----------------------------------------------------------------------------
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `admin_user_id` BIGINT UNSIGNED NULL,
  `action` VARCHAR(64) NOT NULL,
  `target_type` VARCHAR(64) NOT NULL,
  `target_id` VARCHAR(64) NOT NULL,
  `details_json` JSON NULL,
  `ip_address` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_audit_admin` (`admin_user_id`),
  KEY `idx_audit_target` (`target_type`, `target_id`),
  CONSTRAINT `fk_audit_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `admin_users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =============================================================================
-- SEED DATA
-- =============================================================================

INSERT INTO `roles` (`id`, `slug`, `name`, `description`) VALUES
(1, 'super_admin', 'Super Administrator', 'Full system access'),
(2, 'moderator', 'Game Moderator', 'Access to anti-cheat and user flags');

INSERT INTO `levels` (`level`, `name`, `xp_required`, `tap_multiplier`, `max_energy`, `energy_regen_rate`, `daily_reward_multiplier`) VALUES
(1, 'Bronze Miner', 0, 1, 1000, 1, 1.00),
(2, 'Silver Miner', 500, 2, 1500, 2, 1.20),
(3, 'Gold Miner', 2000, 3, 2000, 3, 1.50),
(4, 'Platinum Miner', 6000, 4, 3000, 4, 2.00),
(5, 'Diamond Miner', 15000, 5, 4000, 5, 2.50),
(6, 'Master Overlord', 40000, 7, 6000, 7, 3.00),
(7, 'Empire Legend', 100000, 10, 10000, 10, 5.00);

INSERT INTO `daily_rewards` (`day`, `reward_coins`, `reward_xp`, `is_special`) VALUES
(1, 500, 25, 0),
(2, 1000, 50, 0),
(3, 2500, 100, 0),
(4, 5000, 200, 0),
(5, 10000, 400, 0),
(6, 25000, 800, 0),
(7, 100000, 2500, 1);

INSERT INTO `boosts` (`id`, `name`, `description`, `type`, `multiplier`, `duration_seconds`, `cost`, `is_free`, `daily_limit`) VALUES
('boost_full_energy', 'Full Tank Recharger', 'Instantly refills energy to 100% capacity', 'full_energy', 1, 0, 0, 1, 3),
('boost_turbo_tap', 'Turbo Overdrive 5x', '5x Coin multiplier on all taps for 30 seconds', 'turbo', 5, 30, 2500, 0, 10),
('boost_double_profit', 'Supercharged Core 2x', '2x Coin multiplier for 5 minutes', 'turbo', 2, 300, 8000, 0, 5),
('boost_auto_bot', 'Auto-Tap Drone Protocol', 'Passively mines coins while offline for 1 hour', 'auto_bot', 1, 3600, 20000, 0, 2);

INSERT INTO `tasks` (`id`, `title`, `description`, `category`, `reward_coins`, `reward_xp`, `url`, `verification_type`, `verification_payload`, `is_active`) VALUES
('task_tg_channel', 'Join Official Empire Channel', 'Subscribe to our announcements channel for alpha updates', 'telegram', 5000, 100, 'https://t.me/telegram', 'telegram_channel', '@telegram', 1),
('task_tg_group', 'Join Miner Chat Group', 'Connect with fellow miners and trade strategies', 'telegram', 5000, 100, 'https://t.me/telegram', 'telegram_group', '@telegram', 1),
('task_twitter_follow', 'Follow Empire on X / Twitter', 'Follow the project founder on social media', 'social', 3000, 60, 'https://twitter.com', 'instant', NULL, 1),
('task_youtube_sub', 'Subscribe to YouTube Series', 'Watch the Web3 mining tutorials and subscribe', 'social', 7500, 150, 'https://youtube.com', 'instant', NULL, 1),
('task_invite_3', 'Recruit 3 Miners', 'Share your referral link with 3 active friends', 'in_game', 15000, 300, NULL, 'instant', NULL, 1);

INSERT INTO `withdrawal_methods` (`id`, `name`, `network`, `symbol`, `min_amount`, `fee_percent`, `is_active`) VALUES
('USDT_TRC20', 'Tether USD (TRC-20)', 'TRON Network', 'USDT', 10000, 5.00, 1),
('TON', 'The Open Network (TON)', 'TON Blockchain', 'TON', 25000, 3.00, 1);

INSERT INTO `settings` (`setting_key`, `setting_value`, `category`, `description`) VALUES
('game_name', 'TapEmpire', 'gameplay', 'Application brand title'),
('coin_name', 'Empire Coin', 'economy', 'In-game virtual currency name'),
('coin_symbol', 'EPC', 'economy', 'In-game virtual currency ticker'),
('max_taps_per_second', '12', 'anticheat', 'Strict rate limit for taps per second (12 TPS)'),
('min_withdrawal', '10000', 'finance', 'Minimum coin threshold for payout requests'),
('withdrawal_fee_percent', '5', 'finance', 'Fee deducted from user withdrawal in percent'),
('referral_l1_percent', '10', 'referral', 'Tier 1 direct referral percentage'),
('referral_l2_percent', '3', 'referral', 'Tier 2 indirect referral percentage'),
('referral_l3_percent', '1', 'referral', 'Tier 3 network referral percentage'),
('maintenance_mode', 'false', 'system', 'Global maintenance switch');

SET FOREIGN_KEY_CHECKS = 1;
COMMIT;
