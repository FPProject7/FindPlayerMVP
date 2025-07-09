-- Database migration to add video_url column to posts table
-- Run this script on your PostgreSQL database

-- Add video_url column to posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN posts.video_url IS 'URL to the video file stored in S3 for this post';

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'posts' AND column_name = 'video_url'; 