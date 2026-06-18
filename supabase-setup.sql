-- ==================== 用户表 ====================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  avatar VARCHAR(20) DEFAULT '👤',
  level INTEGER DEFAULT 1,
  exp INTEGER DEFAULT 0,
  stars INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 汉字解锁记录表 ====================
CREATE TABLE unlocked_chars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  char_name VARCHAR(10) NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, char_name)
);

-- ==================== 答题记录表 ====================
CREATE TABLE guess_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  char_name VARCHAR(10) NOT NULL,
  is_correct BOOLEAN NOT NULL,
  attempts INTEGER DEFAULT 0,
  guessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 每日签到表 ====================
CREATE TABLE daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  consecutive_days INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)
);

-- ==================== 每日任务表 ====================
CREATE TABLE daily_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL,
  target_count INTEGER NOT NULL,
  current_count INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  task_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, task_type, task_date)
);

-- ==================== 成就表 ====================
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  achievement_type VARCHAR(50) NOT NULL,
  achievement_name VARCHAR(100) NOT NULL,
  icon VARCHAR(50) NOT NULL,
  description TEXT,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_type)
);

-- ==================== 汉字接龙记录表 ====================
CREATE TABLE dragon_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_code VARCHAR(20) UNIQUE NOT NULL,
  creator_id UUID REFERENCES users(id) ON DELETE SET NULL,
  words TEXT[] NOT NULL,
  current_word VARCHAR(20) NOT NULL,
  last_char VARCHAR(10) NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==================== 索引优化 ====================
CREATE INDEX idx_unlocked_chars_user ON unlocked_chars(user_id);
CREATE INDEX idx_guess_records_user ON guess_records(user_id);
CREATE INDEX idx_daily_checkins_user ON daily_checkins(user_id);
CREATE INDEX idx_daily_tasks_user ON daily_tasks(user_id);
CREATE INDEX idx_achievements_user ON achievements(user_id);
CREATE INDEX idx_dragon_games_code ON dragon_games(game_code);
CREATE INDEX idx_dragon_games_active ON dragon_games(is_active);

-- ==================== 启用 Row Level Security (RLS) ====================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE unlocked_chars ENABLE ROW LEVEL SECURITY;
ALTER TABLE guess_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dragon_games ENABLE ROW LEVEL SECURITY;

-- ==================== RLS 策略 ====================
-- 用户表：允许所有操作（简化版本）
CREATE POLICY "Users can manage their own data" ON users
  FOR ALL USING (true);

-- 解锁记录：用户只能操作自己的记录
CREATE POLICY "Users can manage their own unlocked chars" ON unlocked_chars
  FOR ALL USING (auth.uid()::text = user_id::text);

-- 答题记录：用户只能操作自己的记录
CREATE POLICY "Users can manage their own guess records" ON guess_records
  FOR ALL USING (auth.uid()::text = user_id::text);

-- 签到记录：用户只能操作自己的记录
CREATE POLICY "Users can manage their own checkins" ON daily_checkins
  FOR ALL USING (auth.uid()::text = user_id::text);

-- 每日任务：用户只能操作自己的记录
CREATE POLICY "Users can manage their own tasks" ON daily_tasks
  FOR ALL USING (auth.uid()::text = user_id::text);

-- 成就：用户只能操作自己的记录
CREATE POLICY "Users can manage their own achievements" ON achievements
  FOR ALL USING (auth.uid()::text = user_id::text);

-- 接龙游戏：允许所有人查看和创建
CREATE POLICY "Anyone can view dragon games" ON dragon_games
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create dragon games" ON dragon_games
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update dragon games" ON dragon_games
  FOR UPDATE USING (true);