-- 国内商标表
CREATE TABLE IF NOT EXISTS trademarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  products_services TEXT DEFAULT '',
  groups TEXT DEFAULT '',
  registration_date DATE,
  valid_from DATE,
  valid_to DATE,
  application_count INT DEFAULT 0,
  trademark_no TEXT NOT NULL,
  ai_description TEXT DEFAULT '',
  remark TEXT DEFAULT '',
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 国际商标表
CREATE TABLE IF NOT EXISTS international_trademarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  trademark_no TEXT NOT NULL,
  category INT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  registration_date DATE,
  valid_from DATE,
  valid_to DATE,
  cn_items TEXT DEFAULT '',
  local_items TEXT,
  en_items TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_trademarks_category ON trademarks(category);
CREATE INDEX IF NOT EXISTS idx_trademarks_price ON trademarks(price);
CREATE INDEX IF NOT EXISTS idx_trademarks_name ON trademarks(name);
CREATE INDEX IF NOT EXISTS idx_intl_trademarks_country ON international_trademarks(country);
CREATE INDEX IF NOT EXISTS idx_intl_trademarks_category ON international_trademarks(category);

-- RLS (Row Level Security)
ALTER TABLE trademarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE international_trademarks ENABLE ROW LEVEL SECURITY;

-- 公开读取策略
CREATE POLICY "Public read trademarks" ON trademarks FOR SELECT USING (true);
CREATE POLICY "Public read international_trademarks" ON international_trademarks FOR SELECT USING (true);

-- 管理员写入策略 (需要认证)
CREATE POLICY "Auth insert trademarks" ON trademarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update trademarks" ON trademarks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete trademarks" ON trademarks FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth insert international_trademarks" ON international_trademarks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update international_trademarks" ON international_trademarks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth delete international_trademarks" ON international_trademarks FOR DELETE TO authenticated USING (true);

-- 系统设置表
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Auth insert settings" ON settings FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth update settings" ON settings FOR UPDATE TO authenticated USING (true);

-- 默认设置
INSERT INTO settings (key, value) VALUES ('discount_price_threshold', '5000')
ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value) VALUES ('show_discount_tab', 'true')
ON CONFLICT (key) DO NOTHING;
