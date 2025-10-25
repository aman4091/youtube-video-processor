-- Python scripts table (for VastAI workspace)
-- Run this in Supabase SQL Editor

-- Create the table
CREATE TABLE IF NOT EXISTS python_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_python_scripts_order ON python_scripts(order_index);
CREATE INDEX IF NOT EXISTS idx_python_scripts_default ON python_scripts(is_default) WHERE is_default = true;

-- Enable Row Level Security
ALTER TABLE python_scripts ENABLE ROW LEVEL SECURITY;

-- Create policy for public access (simple 2-user app)
CREATE POLICY "Allow all operations on python_scripts" ON python_scripts
  FOR ALL USING (true) WITH CHECK (true);
