-- Migration: Add prompt_template, PIN support, and more users
-- Run this in your Supabase SQL Editor

-- 1. Add prompt_template column to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS prompt_template TEXT;

-- 2. Add PIN column to users table for authentication
ALTER TABLE users
ADD COLUMN IF NOT EXISTS pin TEXT DEFAULT '0000';

-- 3. Add 2 more default users (User3, User4)
INSERT INTO users (username, pin)
VALUES
  ('User3', '0000'),
  ('User4', '0000')
ON CONFLICT (username) DO NOTHING;

-- 4. Create user_settings for new users
INSERT INTO user_settings (user_id, videos_per_day)
SELECT id, 16 FROM users WHERE username IN ('User3', 'User4')
ON CONFLICT (user_id) DO NOTHING;

-- 5. Set default PIN for existing users (User1, User2)
UPDATE users SET pin = '0000' WHERE pin IS NULL;
