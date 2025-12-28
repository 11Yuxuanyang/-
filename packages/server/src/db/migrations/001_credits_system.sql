-- 积分系统数据库表
-- 执行此 SQL 在 Supabase 中创建积分相关表

-- 1. 用户积分表
CREATE TABLE IF NOT EXISTS user_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance INT NOT NULL DEFAULT 0,              -- 当前积分余额
  total_earned INT NOT NULL DEFAULT 0,         -- 累计获得积分
  total_spent INT NOT NULL DEFAULT 0,          -- 累计消耗积分
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 2. 积分交易记录表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,                   -- 'purchase' | 'consume' | 'daily_signin' | 'register_bonus' | 'refund' | 'monthly_grant'
  amount INT NOT NULL,                         -- 正数增加，负数消耗
  balance_after INT NOT NULL,                  -- 交易后余额
  description VARCHAR(255),                    -- 描述
  metadata JSONB,                              -- 额外信息
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_user ON credit_transactions(user_id, created_at DESC);

-- 3. 会员套餐定义表
CREATE TABLE IF NOT EXISTS membership_plans (
  id VARCHAR(50) PRIMARY KEY,                  -- 'standard', 'advanced', 'super'
  name VARCHAR(100) NOT NULL,                  -- 显示名称
  monthly_credits INT NOT NULL,                -- 每月积分
  price_monthly INT NOT NULL,                  -- 单月价格（分）
  price_monthly_continuous INT NOT NULL,       -- 连续包月价格（分）
  price_yearly INT NOT NULL,                   -- 年付价格（分）
  original_price_monthly INT,                  -- 单月原价（分）
  original_price_yearly INT,                   -- 年付原价（分）
  daily_signin_bonus INT NOT NULL DEFAULT 100, -- 每日签到额外积分
  features JSONB,                              -- 会员权益列表
  sort_order INT DEFAULT 0,                    -- 排序
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 用户会员订阅表
CREATE TABLE IF NOT EXISTS user_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id VARCHAR(50) NOT NULL REFERENCES membership_plans(id),
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active' | 'expired' | 'cancelled'
  billing_cycle VARCHAR(20) NOT NULL,          -- 'monthly' | 'monthly_continuous' | 'yearly'
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  auto_renew BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_memberships_user ON user_memberships(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_memberships_expires ON user_memberships(expires_at) WHERE status = 'active';

-- 5. 积分消耗详情表（关联到具体操作）
CREATE TABLE IF NOT EXISTS credit_consumptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_id UUID REFERENCES credit_transactions(id),
  action_type VARCHAR(30) NOT NULL,            -- 'generate' | 'edit' | 'inpaint' | 'upscale'
  credits_used INT NOT NULL,
  resolution VARCHAR(20),                      -- '720p' | '1K' | '2K' | '4K'
  provider VARCHAR(50),
  request_params JSONB,                        -- 原始请求参数（脱敏）
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_consumptions_user ON credit_consumptions(user_id, created_at DESC);

-- 6. 每日签到记录表
CREATE TABLE IF NOT EXISTS daily_signins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  signin_date DATE NOT NULL,
  credits_earned INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, signin_date)
);
CREATE INDEX IF NOT EXISTS idx_daily_signins_user ON daily_signins(user_id, signin_date DESC);

-- 7. 支付订单表
CREATE TABLE IF NOT EXISTS payment_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_no VARCHAR(64) NOT NULL UNIQUE,        -- 订单号
  plan_id VARCHAR(50) REFERENCES membership_plans(id),
  billing_cycle VARCHAR(20),                   -- 'monthly' | 'monthly_continuous' | 'yearly'
  amount INT NOT NULL,                         -- 支付金额（分）
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending' | 'paid' | 'failed' | 'refunded'
  payment_method VARCHAR(50),                  -- 'wechat' | 'alipay'
  payment_id VARCHAR(255),                     -- 第三方支付单号
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_orders_user ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status, created_at DESC);

-- 插入会员套餐（三种计费周期：单年6.6折、连续包月8.3折、单月原价）
-- 按照参考设计：
-- 标准会员: 4000傻币/月, 单月59, 连续包月49(原59), 单年469(原708)
-- 高级会员: 12000傻币/月, 单月119, 连续包月99(原119), 单年949(原1428)
-- 超级会员: 24500傻币/月, 单月239, 连续包月199(原239), 单年1899(原2868)
INSERT INTO membership_plans (id, name, monthly_credits, price_monthly, price_monthly_continuous, price_yearly, original_price_monthly, original_price_yearly, daily_signin_bonus, features, sort_order) VALUES
('standard', '标准会员', 4000, 5900, 4900, 46900, 5900, 70800, 100, '["每月获得4000傻币", "~4000张生成图片", "登录每日领100傻币", "生图加速", "会员模型生图，商用无忧", "多格式导出(SVG、OBJ等)", "畅享多CN、多Lora生图等高级功能"]', 1),
('advanced', '高级会员', 12000, 11900, 9900, 94900, 11900, 142800, 100, '["每月获得12000傻币", "~12000张生成图片", "登录每日领100傻币", "生图优先加速", "会员模型生图，商用无忧", "多格式导出(SVG、OBJ等)", "畅享多CN、多Lora生图等高级功能"]', 2),
('super', '超级会员', 24500, 23900, 19900, 189900, 23900, 286800, 100, '["每月获得24500傻币", "~24500张生成图片", "登录每日领100傻币", "生图最高优先级", "会员模型生图，商用无忧", "多格式导出(SVG、OBJ等)", "畅享多CN、多Lora生图等高级功能"]', 3)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  monthly_credits = EXCLUDED.monthly_credits,
  price_monthly = EXCLUDED.price_monthly,
  price_monthly_continuous = EXCLUDED.price_monthly_continuous,
  price_yearly = EXCLUDED.price_yearly,
  original_price_monthly = EXCLUDED.original_price_monthly,
  original_price_yearly = EXCLUDED.original_price_yearly,
  daily_signin_bonus = EXCLUDED.daily_signin_bonus,
  features = EXCLUDED.features,
  sort_order = EXCLUDED.sort_order;

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表添加触发器
DROP TRIGGER IF EXISTS update_user_credits_updated_at ON user_credits;
CREATE TRIGGER update_user_credits_updated_at
  BEFORE UPDATE ON user_credits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_memberships_updated_at ON user_memberships;
CREATE TRIGGER update_user_memberships_updated_at
  BEFORE UPDATE ON user_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_payment_orders_updated_at ON payment_orders;
CREATE TRIGGER update_payment_orders_updated_at
  BEFORE UPDATE ON payment_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建新用户时自动初始化积分账户的函数
CREATE OR REPLACE FUNCTION init_user_credits()
RETURNS TRIGGER AS $$
BEGIN
  -- 创建积分账户
  INSERT INTO user_credits (user_id, balance, total_earned)
  VALUES (NEW.id, 50, 50);  -- 新用户赠送 50 积分

  -- 记录交易
  INSERT INTO credit_transactions (user_id, type, amount, balance_after, description)
  VALUES (NEW.id, 'register_bonus', 50, 50, '新用户注册奖励');

  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 users 表添加触发器（如果不存在）
DROP TRIGGER IF EXISTS init_user_credits_trigger ON users;
CREATE TRIGGER init_user_credits_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION init_user_credits();
