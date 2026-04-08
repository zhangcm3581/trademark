-- ============================================================
-- 001: 引入多租户 (tenant) 字段
--
-- 目的：
--   biaoxiaosheng.com       -> tenant = 'vip' (默认，现有数据全部归此)
--   app.biaoxiaosheng.com   -> tenant = 'app' (新客户群)
--
-- 兼容性：
--   * 使用 ALGORITHM=INSTANT，秒级完成，不重写表
--   * 使用动态 SQL 保证脚本可重复执行（MySQL 8.x 不支持 ADD COLUMN IF NOT EXISTS）
--   * 旧代码尚未部署时，老 API 仍可正常工作（不读 tenant 列）
--
-- 回滚：
--   旧代码对 tenant 列无感知，回滚代码即可；如需彻底回滚
--   DDL，需单独准备 DROP COLUMN 脚本（不在本文件内，避免误操作）。
-- ============================================================

USE trademark;

DELIMITER $$

-- ------------------------------------------------------------
-- 工具过程：幂等地添加列 / 索引 / 修改主键
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS __mig_001_add_column$$
CREATE PROCEDURE __mig_001_add_column(
  IN p_table VARCHAR(64),
  IN p_column VARCHAR(64),
  IN p_def VARCHAR(255)
)
BEGIN
  DECLARE cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO cnt FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND COLUMN_NAME = p_column;
  IF cnt = 0 THEN
    SET @sql := CONCAT('ALTER TABLE ', p_table, ' ADD COLUMN ', p_column, ' ', p_def, ', ALGORITHM=INSTANT');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DROP PROCEDURE IF EXISTS __mig_001_add_index$$
CREATE PROCEDURE __mig_001_add_index(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_cols VARCHAR(255)
)
BEGIN
  DECLARE cnt INT DEFAULT 0;
  SELECT COUNT(*) INTO cnt FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = p_table
      AND INDEX_NAME = p_index;
  IF cnt = 0 THEN
    SET @sql := CONCAT('CREATE INDEX ', p_index, ' ON ', p_table, ' (', p_cols, ')');
    PREPARE stmt FROM @sql;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END$$

DELIMITER ;

-- ------------------------------------------------------------
-- 1) trademarks
-- ------------------------------------------------------------
CALL __mig_001_add_column('trademarks', 'tenant', 'VARCHAR(32) NOT NULL DEFAULT ''vip'' AFTER id');
CALL __mig_001_add_index ('trademarks', 'idx_tenant_category', 'tenant, category');
CALL __mig_001_add_index ('trademarks', 'idx_tenant_price',    'tenant, price');
CALL __mig_001_add_index ('trademarks', 'idx_tenant_created',  'tenant, created_at');

-- ------------------------------------------------------------
-- 2) international_trademarks
-- ------------------------------------------------------------
CALL __mig_001_add_column('international_trademarks', 'tenant', 'VARCHAR(32) NOT NULL DEFAULT ''vip'' AFTER id');
CALL __mig_001_add_index ('international_trademarks', 'idx_tenant_category', 'tenant, category');
CALL __mig_001_add_index ('international_trademarks', 'idx_tenant_country',  'tenant, country');
CALL __mig_001_add_index ('international_trademarks', 'idx_tenant_created',  'tenant, created_at');

-- ------------------------------------------------------------
-- 3) settings: 主键由 (key) 改为 (tenant, key)
-- ------------------------------------------------------------
SET @has_tenant := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'settings'
    AND COLUMN_NAME = 'tenant'
);

SET @sql := IF(@has_tenant = 0,
  'ALTER TABLE settings
     ADD COLUMN tenant VARCHAR(32) NOT NULL DEFAULT ''vip'' AFTER `key`,
     DROP PRIMARY KEY,
     ADD PRIMARY KEY (tenant, `key`)',
  'DO 0'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ------------------------------------------------------------
-- 4) 为 'app' 租户初始化默认设置（从 vip 复制，独立维护）
-- ------------------------------------------------------------
INSERT IGNORE INTO settings (tenant, `key`, `value`)
  SELECT 'app', `key`, `value` FROM settings WHERE tenant = 'vip';

-- ------------------------------------------------------------
-- 清理临时过程
-- ------------------------------------------------------------
DROP PROCEDURE IF EXISTS __mig_001_add_column;
DROP PROCEDURE IF EXISTS __mig_001_add_index;
