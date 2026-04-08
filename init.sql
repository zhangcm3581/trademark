-- 商标展示系统 MySQL 初始化脚本
-- 使用: mysql -u root -p < init.sql

CREATE DATABASE IF NOT EXISTS trademark DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE trademark;

-- 国内商标表
CREATE TABLE IF NOT EXISTS trademarks (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant VARCHAR(32) NOT NULL DEFAULT 'vip',
  name VARCHAR(255) NOT NULL DEFAULT '',
  category INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  products_services TEXT,
  `groups` VARCHAR(500) DEFAULT '',
  registration_date VARCHAR(20) DEFAULT NULL,
  valid_from VARCHAR(20) DEFAULT NULL,
  valid_to VARCHAR(20) DEFAULT NULL,
  application_count INT NOT NULL DEFAULT 0,
  trademark_no VARCHAR(100) DEFAULT '',
  ai_description TEXT,
  remark TEXT,
  image_url LONGTEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_category (category),
  INDEX idx_price (price),
  INDEX idx_name (name),
  INDEX idx_trademark_no (trademark_no),
  INDEX idx_created_at (created_at),
  INDEX idx_tenant_category (tenant, category),
  INDEX idx_tenant_price (tenant, price),
  INDEX idx_tenant_created (tenant, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 国际商标表
CREATE TABLE IF NOT EXISTS international_trademarks (
  id CHAR(36) NOT NULL DEFAULT (UUID()) PRIMARY KEY,
  tenant VARCHAR(32) NOT NULL DEFAULT 'vip',
  country VARCHAR(100) NOT NULL DEFAULT '',
  name VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT,
  trademark_no VARCHAR(100) DEFAULT '',
  category INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  registration_date VARCHAR(20) DEFAULT NULL,
  valid_from VARCHAR(20) DEFAULT NULL,
  valid_to VARCHAR(20) DEFAULT NULL,
  cn_items TEXT,
  local_items TEXT,
  en_items TEXT,
  image_url LONGTEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_country (country),
  INDEX idx_category (category),
  INDEX idx_name (name),
  INDEX idx_created_at (created_at),
  INDEX idx_tenant_category (tenant, category),
  INDEX idx_tenant_country (tenant, country),
  INDEX idx_tenant_created (tenant, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 系统设置表（按租户独立）
CREATE TABLE IF NOT EXISTS settings (
  tenant VARCHAR(32) NOT NULL DEFAULT 'vip',
  `key` VARCHAR(100) NOT NULL,
  `value` TEXT NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (tenant, `key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 管理员用户表
CREATE TABLE IF NOT EXISTS admin_users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 默认设置（vip 租户）
INSERT IGNORE INTO settings (tenant, `key`, `value`) VALUES
  ('vip', 'discount_price_threshold', '5000'),
  ('vip', 'show_discount_tab', 'true'),
  ('vip', 'show_price', 'true');

-- 默认设置（app 租户）
INSERT IGNORE INTO settings (tenant, `key`, `value`) VALUES
  ('app', 'discount_price_threshold', '5000'),
  ('app', 'show_discount_tab', 'true'),
  ('app', 'show_price', 'true');

-- 管理员账号 (密码 hash 由 bcryptjs 生成)
INSERT IGNORE INTO admin_users (username, password_hash) VALUES
  ('admin', '$2b$10$nh.09vXu.zYTJ96J2cb0LeoWXbupd.v1VzwSeiGEtHadpzZOG9P1S'),
  ('xiaoyu', '$2b$10$nh.09vXu.zYTJ96J2cb0LeoWXbupd.v1VzwSeiGEtHadpzZOG9P1S');
