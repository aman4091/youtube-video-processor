-- YouTube Video Processor Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  videos_per_day INTEGER NOT NULL DEFAULT 16,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Source channels table
CREATE TABLE IF NOT EXISTS source_channels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel_url TEXT NOT NULL,
  min_duration_seconds INTEGER NOT NULL DEFAULT 0,
  reference_audio_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shared settings table (for API keys, etc.)
CREATE TABLE IF NOT EXISTS shared_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Supadata API keys table
CREATE TABLE IF NOT EXISTS supadata_api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Videos table
CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_id UUID NOT NULL REFERENCES source_channels(id) ON DELETE CASCADE,
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  views BIGINT NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL,
  thumbnail_url TEXT,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily schedule table
CREATE TABLE IF NOT EXISTS daily_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id UUID NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  position INTEGER NOT NULL,
  transcript TEXT,
  transcript_chars INTEGER,
  processed_script TEXT,
  processed_chars INTEGER,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, scheduled_date, position)
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_source_channels_user_id ON source_channels(user_id);
CREATE INDEX IF NOT EXISTS idx_videos_channel_id ON videos(channel_id);
CREATE INDEX IF NOT EXISTS idx_videos_views ON videos(views DESC);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_user_date ON daily_schedule(user_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_daily_schedule_status ON daily_schedule(status);
CREATE INDEX IF NOT EXISTS idx_supadata_keys_active ON supadata_api_keys(is_active, priority);

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE source_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE supadata_api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE python_scripts ENABLE ROW LEVEL SECURITY;

-- Public access policies (since this is a simple 2-user app)
-- In production, you'd want more restrictive policies

CREATE POLICY "Allow all operations on users" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_settings" ON user_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on source_channels" ON source_channels
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on shared_settings" ON shared_settings
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on supadata_api_keys" ON supadata_api_keys
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on videos" ON videos
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_schedule" ON daily_schedule
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on python_scripts" ON python_scripts
  FOR ALL USING (true) WITH CHECK (true);

-- Create initial default users (you can modify usernames)
INSERT INTO users (username) VALUES ('User1'), ('User2')
ON CONFLICT (username) DO NOTHING;

-- Create default user settings
INSERT INTO user_settings (user_id, videos_per_day)
SELECT id, 16 FROM users
ON CONFLICT (user_id) DO NOTHING;

-- Python scripts table (for VastAI workspace)
CREATE TABLE IF NOT EXISTS python_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create default shared settings placeholders
INSERT INTO shared_settings (key, value) VALUES
  ('youtube_api_key', ''),
  ('vastai_api_key', ''),
  ('telegram_bot_token', ''),
  ('telegram_chat_id', ''),
  ('vastai_commands', ''),
  ('prompt_template', '')
ON CONFLICT (key) DO NOTHING;
