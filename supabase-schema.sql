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
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_profiles table for roles
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pose_variations_pose_id ON pose_variations(pose_id);
CREATE INDEX IF NOT EXISTS idx_sequences_name ON sequences(name);
CREATE INDEX IF NOT EXISTS idx_sequences_user_id ON sequences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

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

CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security Policies
-- Enable RLS on all tables
ALTER TABLE IF EXISTS poses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS pose_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_profiles ENABLE ROW LEVEL SECURITY;

-- Poses and variations: Everyone can read, only admins can modify
CREATE POLICY "Everyone can view poses" ON poses FOR SELECT USING (true);
CREATE POLICY "Only admins can insert poses" ON poses FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "Only admins can update poses" ON poses FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "Only admins can delete poses" ON poses FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Everyone can view pose variations" ON pose_variations FOR SELECT USING (true);
CREATE POLICY "Only admins can insert pose variations" ON pose_variations FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "Only admins can update pose variations" ON pose_variations FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);
CREATE POLICY "Only admins can delete pose variations" ON pose_variations FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Sequences: User-specific
CREATE POLICY "Users can view their own sequences" ON sequences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own sequences" ON sequences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sequences" ON sequences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sequences" ON sequences FOR DELETE USING (auth.uid() = user_id);

-- User profiles: Users can view their own, admins can view all
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON user_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all profiles" ON user_profiles FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

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

-- Function to automatically create user profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create admin user (replace with your actual user ID after signing up)
-- You'll need to run this after creating your first admin account
-- UPDATE user_profiles SET role = 'admin' WHERE user_id = 'your-user-id-here';
