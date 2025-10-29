-- Supabase Database Schema for Yoga Sequence Builder
-- Run these commands in your Supabase SQL editor

-- Enable Row Level Security
ALTER TABLE IF EXISTS poses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pose_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sequences ENABLE ROW LEVEL SECURITY;

-- Create poses table
CREATE TABLE IF NOT EXISTS poses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create pose_variations table
CREATE TABLE IF NOT EXISTS pose_variations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  pose_id UUID NOT NULL REFERENCES poses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(pose_id, name)
);

-- Create sequences table
CREATE TABLE IF NOT EXISTS sequences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pose_variations_pose_id ON pose_variations(pose_id);
CREATE INDEX IF NOT EXISTS idx_sequences_name ON sequences(name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_poses_updated_at BEFORE UPDATE ON poses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pose_variations_updated_at BEFORE UPDATE ON pose_variations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sequences_updated_at BEFORE UPDATE ON sequences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies (allow all operations for now - you can restrict later)
CREATE POLICY "Allow all operations on poses" ON poses FOR ALL USING (true);
CREATE POLICY "Allow all operations on pose_variations" ON pose_variations FOR ALL USING (true);
CREATE POLICY "Allow all operations on sequences" ON sequences FOR ALL USING (true);

-- Insert some sample data
INSERT INTO poses (name) VALUES 
  ('Downward Dog'),
  ('Warrior I'),
  ('Warrior II'),
  ('Tree Pose'),
  ('Child''s Pose'),
  ('Mountain Pose'),
  ('Forward Fold'),
  ('Cobra Pose'),
  ('Cat Pose'),
  ('Cow Pose')
ON CONFLICT (name) DO NOTHING;

-- Insert sample variations for some poses
INSERT INTO pose_variations (pose_id, name, is_default) 
SELECT p.id, 'Default', true
FROM poses p
WHERE p.name IN ('Downward Dog', 'Warrior I', 'Warrior II', 'Tree Pose', 'Child''s Pose')
ON CONFLICT (pose_id, name) DO NOTHING;

INSERT INTO pose_variations (pose_id, name, is_default) 
SELECT p.id, 'Modified', false
FROM poses p
WHERE p.name IN ('Downward Dog', 'Warrior I')
ON CONFLICT (pose_id, name) DO NOTHING;
