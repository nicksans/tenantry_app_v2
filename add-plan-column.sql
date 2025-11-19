-- Add plan column to user_profiles table
-- Run this in your Supabase SQL Editor

-- Add plan column with default value of 'free'
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';

-- Add a check constraint to ensure plan is either 'free' or 'pro'
ALTER TABLE user_profiles 
ADD CONSTRAINT check_plan_type CHECK (plan IN ('free', 'pro'));

-- Optional: Update existing users to have 'free' plan if they don't have one set
UPDATE user_profiles 
SET plan = 'free' 
WHERE plan IS NULL;

