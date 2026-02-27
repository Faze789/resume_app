-- ============================================================================
-- Migration 014: Supabase Integration Support
-- - Add resume_url to profiles
-- - Add job_data JSONB to saved_jobs for dead-link protection
-- - Make saved_jobs.job_id nullable (frontend jobs come from external APIs)
-- - Create "resumes" storage bucket (private, PDF only)
-- - Storage RLS policies for resumes bucket
-- - UPDATE policy for saved_jobs
-- ============================================================================

-- 1. Add resume_url to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- 2. Add job_data JSONB to saved_jobs (stores full job object)
ALTER TABLE saved_jobs ADD COLUMN IF NOT EXISTS job_data JSONB;

-- 3. Make job_id nullable (external API jobs don't exist in job_listings)
ALTER TABLE saved_jobs ALTER COLUMN job_id DROP NOT NULL;

-- Drop existing FK and re-add with ON DELETE SET NULL
ALTER TABLE saved_jobs DROP CONSTRAINT IF EXISTS saved_jobs_job_id_fkey;
ALTER TABLE saved_jobs ADD CONSTRAINT saved_jobs_job_id_fkey
  FOREIGN KEY (job_id) REFERENCES job_listings(id) ON DELETE SET NULL;

-- Drop the old unique index (job_id can be null now) and recreate
DROP INDEX IF EXISTS idx_saved_jobs_unique;
CREATE UNIQUE INDEX idx_saved_jobs_unique ON saved_jobs (user_id, job_id)
  WHERE job_id IS NOT NULL;

-- 4. UPDATE policy for saved_jobs (existing policies: SELECT, INSERT, DELETE)
CREATE POLICY saved_jobs_update_own ON saved_jobs
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. Create private "resumes" storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('resumes', 'resumes', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- 6. Storage RLS policies for resumes bucket
CREATE POLICY "Users upload own resumes" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users read own resumes" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users update own resumes" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users delete own resumes" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'resumes'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
