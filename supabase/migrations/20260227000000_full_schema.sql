-- ============================================================================
-- COMPLETE DATABASE SCHEMA
-- Job Portal & ATS Dashboard - Production Ready
-- Execute this entire file in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- 1. CUSTOM ENUM TYPES
-- ============================================================================

CREATE TYPE job_type AS ENUM (
  'full_time', 'part_time', 'contract', 'internship', 'freelance', 'remote'
);

CREATE TYPE experience_level AS ENUM (
  'entry', 'mid', 'senior', 'lead', 'executive'
);

CREATE TYPE application_status AS ENUM (
  'draft', 'applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'
);

CREATE TYPE notification_type AS ENUM (
  'job_match', 'ats_update', 'application_update', 'system'
);

CREATE TYPE proficiency_level AS ENUM (
  'beginner', 'intermediate', 'advanced', 'expert'
);

CREATE TYPE resume_section_type AS ENUM (
  'summary', 'experience', 'education', 'skills', 'projects',
  'certifications', 'languages', 'awards', 'publications', 'volunteer', 'custom'
);

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  email           text NOT NULL,
  phone           text,
  location        text,
  bio             text,
  avatar_url      text,
  headline        text,
  skills          text[] DEFAULT '{}',
  experience_years integer DEFAULT 0,
  desired_salary_min numeric(12,2),
  desired_salary_max numeric(12,2),
  desired_job_types job_type[] DEFAULT '{}',
  desired_locations text[] DEFAULT '{}',
  linkedin_url    text,
  github_url      text,
  portfolio_url   text,
  is_open_to_work boolean DEFAULT true,
  onboarding_complete boolean DEFAULT false,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  deleted_at      timestamptz
);

-- Job Listings
CREATE TABLE job_listings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title             text NOT NULL,
  company_name      text NOT NULL,
  company_logo_url  text,
  description       text NOT NULL,
  requirements      text[] DEFAULT '{}',
  skills_required   text[] DEFAULT '{}',
  location          text,
  is_remote         boolean DEFAULT false,
  salary_min        numeric(12,2),
  salary_max        numeric(12,2),
  salary_currency   text DEFAULT 'USD',
  job_type          job_type NOT NULL DEFAULT 'full_time',
  experience_level  experience_level NOT NULL DEFAULT 'mid',
  source_platform   text,
  source_url        text,
  external_id       text,
  is_active         boolean DEFAULT true,
  posted_at         timestamptz DEFAULT now(),
  expires_at        timestamptz,
  metadata          jsonb DEFAULT '{}',
  search_vector     tsvector,
  created_at        timestamptz DEFAULT now() NOT NULL,
  updated_at        timestamptz DEFAULT now() NOT NULL,
  deleted_at        timestamptz
);

-- Resumes
CREATE TABLE resumes (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title           text NOT NULL DEFAULT 'Untitled Resume',
  version         integer NOT NULL DEFAULT 1,
  is_primary      boolean DEFAULT false,
  content         jsonb NOT NULL DEFAULT '{"personal_info":{},"summary":"","sections":[]}',
  section_order   resume_section_type[] DEFAULT ARRAY['summary','experience','education','skills','projects']::resume_section_type[],
  template_id     text DEFAULT 'classic',
  style_config    jsonb DEFAULT '{"font_family":"Inter","font_size":11,"color_primary":"#1a1a2e","color_accent":"#4361ee","margin":"normal","spacing":"comfortable"}',
  last_ats_score  numeric(5,2),
  last_ats_job_id uuid REFERENCES job_listings(id) ON DELETE SET NULL,
  raw_text        text,
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  deleted_at      timestamptz
);

-- Job Applications
CREATE TABLE job_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  resume_id       uuid REFERENCES resumes(id) ON DELETE SET NULL,
  status          application_status NOT NULL DEFAULT 'draft',
  cover_letter    text,
  applied_at      timestamptz,
  notes           text,
  interview_dates timestamptz[],
  metadata        jsonb DEFAULT '{}',
  created_at      timestamptz DEFAULT now() NOT NULL,
  updated_at      timestamptz DEFAULT now() NOT NULL,
  deleted_at      timestamptz
);

-- Saved Jobs
CREATE TABLE saved_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id      uuid NOT NULL REFERENCES job_listings(id) ON DELETE CASCADE,
  notes       text,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- Notifications
CREATE TABLE notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       text NOT NULL,
  body        text NOT NULL,
  data        jsonb DEFAULT '{}',
  is_read     boolean DEFAULT false,
  read_at     timestamptz,
  created_at  timestamptz DEFAULT now() NOT NULL
);

-- ATS Analyses
CREATE TABLE ats_analyses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_id         uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_id            uuid REFERENCES job_listings(id) ON DELETE SET NULL,
  job_description   text,
  job_title         text,
  overall_score     numeric(5,2) NOT NULL,
  keyword_score     numeric(5,2) NOT NULL,
  skills_score      numeric(5,2) NOT NULL,
  experience_score  numeric(5,2) NOT NULL,
  education_score   numeric(5,2) NOT NULL,
  formatting_score  numeric(5,2) NOT NULL,
  matched_keywords  text[] DEFAULT '{}',
  missing_keywords  text[] DEFAULT '{}',
  skill_gaps        text[] DEFAULT '{}',
  suggestions       jsonb DEFAULT '[]',
  analysis_detail   jsonb DEFAULT '{}',
  created_at        timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Profiles
CREATE INDEX idx_profiles_active ON profiles (id) WHERE deleted_at IS NULL;
CREATE INDEX idx_profiles_skills ON profiles USING GIN (skills);
CREATE INDEX idx_profiles_location ON profiles (location) WHERE deleted_at IS NULL;

-- Job Listings
CREATE UNIQUE INDEX idx_job_listings_source_unique ON job_listings (source_platform, external_id) WHERE external_id IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_job_listings_skills ON job_listings USING GIN (skills_required);
CREATE INDEX idx_job_listings_filters ON job_listings (job_type, experience_level, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_job_listings_search ON job_listings USING GIN (search_vector);
CREATE INDEX idx_job_listings_salary ON job_listings (salary_min, salary_max) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_job_listings_location ON job_listings (location) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_job_listings_posted ON job_listings (posted_at DESC) WHERE is_active = true AND deleted_at IS NULL;
CREATE INDEX idx_job_listings_metadata ON job_listings USING GIN (metadata);

-- Resumes
CREATE INDEX idx_resumes_user ON resumes (user_id) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX idx_resumes_primary_unique ON resumes (user_id) WHERE is_primary = true AND deleted_at IS NULL;
CREATE INDEX idx_resumes_content ON resumes USING GIN (content);

-- Applications
CREATE UNIQUE INDEX idx_applications_user_job_unique ON job_applications (user_id, job_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_user_status ON job_applications (user_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_job ON job_applications (job_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_applications_applied ON job_applications (user_id, applied_at DESC) WHERE deleted_at IS NULL;

-- Saved Jobs
CREATE UNIQUE INDEX idx_saved_jobs_unique ON saved_jobs (user_id, job_id);
CREATE INDEX idx_saved_jobs_user ON saved_jobs (user_id, created_at DESC);

-- Notifications
CREATE INDEX idx_notifications_user ON notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications (user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_type ON notifications (user_id, type, created_at DESC);

-- ATS
CREATE INDEX idx_ats_user ON ats_analyses (user_id, created_at DESC);
CREATE INDEX idx_ats_resume ON ats_analyses (resume_id, created_at DESC);
CREATE INDEX idx_ats_score ON ats_analyses (user_id, overall_score DESC);
CREATE INDEX idx_ats_cache ON ats_analyses (resume_id, job_id, created_at DESC) WHERE job_id IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ats_analyses ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY profiles_select_own ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Job Listings (public read for authenticated users)
CREATE POLICY job_listings_select_active ON job_listings FOR SELECT TO authenticated USING (is_active = true AND deleted_at IS NULL);

-- Resumes
CREATE POLICY resumes_select_own ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY resumes_insert_own ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_update_own ON resumes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_delete_own ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Applications
CREATE POLICY applications_select_own ON job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY applications_insert_own ON job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY applications_update_own ON job_applications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY applications_delete_own ON job_applications FOR DELETE USING (auth.uid() = user_id AND status = 'draft');

-- Saved Jobs
CREATE POLICY saved_jobs_select_own ON saved_jobs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY saved_jobs_insert_own ON saved_jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY saved_jobs_delete_own ON saved_jobs FOR DELETE USING (auth.uid() = user_id);

-- Notifications
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY notifications_update_own ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY notifications_delete_own ON notifications FOR DELETE USING (auth.uid() = user_id);

-- ATS
CREATE POLICY ats_select_own ON ats_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY ats_insert_own ON ats_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY ats_delete_own ON ats_analyses FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- 5. TRIGGER FUNCTIONS
-- ============================================================================

-- Auto updated_at
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_job_listings_updated_at BEFORE UPDATE ON job_listings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_resumes_updated_at BEFORE UPDATE ON resumes FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON job_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Full-text search vector
CREATE OR REPLACE FUNCTION update_job_search_vector() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.company_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(array_to_string(NEW.skills_required, ' '), '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.location, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_job_listings_search_vector
  BEFORE INSERT OR UPDATE OF title, company_name, description, skills_required, location
  ON job_listings FOR EACH ROW EXECUTE FUNCTION update_job_search_vector();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Set applied_at on status change
CREATE OR REPLACE FUNCTION handle_application_status_change() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'applied' AND (OLD.status IS NULL OR OLD.status = 'draft') THEN
    NEW.applied_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_application_status_change
  BEFORE UPDATE OF status ON job_applications FOR EACH ROW EXECUTE FUNCTION handle_application_status_change();

-- Notification on application status change
CREATE OR REPLACE FUNCTION notify_application_status_change() RETURNS TRIGGER AS $$
DECLARE job_title text; company text;
BEGIN
  IF OLD.status IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT j.title, j.company_name INTO job_title, company FROM job_listings j WHERE j.id = NEW.job_id;
    INSERT INTO notifications (user_id, type, title, body, data) VALUES (
      NEW.user_id, 'application_update', 'Application Status Updated',
      format('Your application for %s at %s is now: %s', coalesce(job_title, 'Unknown'), coalesce(company, 'Unknown'), replace(NEW.status::text, '_', ' ')),
      jsonb_build_object('application_id', NEW.id, 'job_id', NEW.job_id, 'old_status', OLD.status, 'new_status', NEW.status, 'screen', 'ApplicationDetail')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_application_status
  AFTER UPDATE OF status ON job_applications FOR EACH ROW EXECUTE FUNCTION notify_application_status_change();

-- Enforce single primary resume
CREATE OR REPLACE FUNCTION enforce_single_primary_resume() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE resumes SET is_primary = false WHERE user_id = NEW.user_id AND id != NEW.id AND is_primary = true AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_enforce_primary_resume
  BEFORE INSERT OR UPDATE OF is_primary ON resumes FOR EACH ROW WHEN (NEW.is_primary = true) EXECUTE FUNCTION enforce_single_primary_resume();

-- Extract raw text from resume JSONB
CREATE OR REPLACE FUNCTION extract_resume_raw_text() RETURNS TRIGGER AS $$
DECLARE sections jsonb; section jsonb; item jsonb; bullet text; result text := '';
BEGIN
  result := result || coalesce(NEW.content->'personal_info'->>'full_name', '') || ' ';
  result := result || coalesce(NEW.content->>'summary', '') || ' ';
  sections := NEW.content->'sections';
  IF sections IS NOT NULL AND jsonb_typeof(sections) = 'array' THEN
    FOR section IN SELECT * FROM jsonb_array_elements(sections) LOOP
      result := result || coalesce(section->>'title', '') || ' ';
      IF section->'items' IS NOT NULL AND jsonb_typeof(section->'items') = 'array' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(section->'items') LOOP
          result := result || coalesce(item->>'title', '') || ' ';
          result := result || coalesce(item->>'organization', '') || ' ';
          result := result || coalesce(item->>'description', '') || ' ';
          IF item->'bullets' IS NOT NULL AND jsonb_typeof(item->'bullets') = 'array' THEN
            FOR bullet IN SELECT * FROM jsonb_array_elements_text(item->'bullets') LOOP
              result := result || bullet || ' ';
            END LOOP;
          END IF;
          IF item->'skills' IS NOT NULL AND jsonb_typeof(item->'skills') = 'array' THEN
            result := result || array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'skills')), ' ') || ' ';
          END IF;
          IF item->'skills_used' IS NOT NULL AND jsonb_typeof(item->'skills_used') = 'array' THEN
            result := result || array_to_string(ARRAY(SELECT jsonb_array_elements_text(item->'skills_used')), ' ') || ' ';
          END IF;
        END LOOP;
      END IF;
    END LOOP;
  END IF;
  NEW.raw_text := trim(result);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_extract_resume_text
  BEFORE INSERT OR UPDATE OF content ON resumes FOR EACH ROW EXECUTE FUNCTION extract_resume_raw_text();

-- Notification on ATS analysis complete
CREATE OR REPLACE FUNCTION notify_ats_analysis_complete() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, body, data) VALUES (
    NEW.user_id, 'ats_update', 'ATS Analysis Complete',
    format('Your resume scored %s%%. %s keywords matched, %s missing.',
      round(NEW.overall_score, 0), array_length(NEW.matched_keywords, 1), array_length(NEW.missing_keywords, 1)),
    jsonb_build_object('analysis_id', NEW.id, 'resume_id', NEW.resume_id, 'job_id', NEW.job_id, 'score', NEW.overall_score, 'screen', 'ATSResult')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_notify_ats_complete
  AFTER INSERT ON ats_analyses FOR EACH ROW EXECUTE FUNCTION notify_ats_analysis_complete();

-- ============================================================================
-- 6. RPC FUNCTIONS
-- ============================================================================

-- Full-text job search with filters
CREATE OR REPLACE FUNCTION search_jobs(
  search_query text DEFAULT NULL, filter_skills text[] DEFAULT NULL,
  filter_job_type job_type DEFAULT NULL, filter_experience experience_level DEFAULT NULL,
  filter_location text DEFAULT NULL, filter_salary_min numeric DEFAULT NULL,
  filter_salary_max numeric DEFAULT NULL, filter_remote boolean DEFAULT NULL,
  sort_by text DEFAULT 'posted_at', sort_order text DEFAULT 'desc',
  page_limit integer DEFAULT 20, page_offset integer DEFAULT 0
) RETURNS TABLE (
  id uuid, title text, company_name text, company_logo_url text, description text,
  skills_required text[], location text, is_remote boolean, salary_min numeric, salary_max numeric,
  salary_currency text, job_type job_type, experience_level experience_level,
  source_platform text, source_url text, posted_at timestamptz, metadata jsonb,
  relevance_score real, total_count bigint
) AS $$
DECLARE tsquery_val tsquery;
BEGIN
  IF search_query IS NOT NULL AND search_query != '' THEN
    tsquery_val := plainto_tsquery('english', search_query);
  END IF;
  RETURN QUERY
  WITH filtered AS (
    SELECT j.id, j.title, j.company_name, j.company_logo_url, j.description,
      j.skills_required, j.location, j.is_remote, j.salary_min, j.salary_max,
      j.salary_currency, j.job_type, j.experience_level, j.source_platform,
      j.source_url, j.posted_at, j.metadata,
      CASE WHEN tsquery_val IS NOT NULL THEN ts_rank(j.search_vector, tsquery_val) ELSE 0 END AS relevance_score
    FROM job_listings j
    WHERE j.is_active = true AND j.deleted_at IS NULL
      AND (tsquery_val IS NULL OR j.search_vector @@ tsquery_val)
      AND (filter_skills IS NULL OR j.skills_required && filter_skills)
      AND (filter_job_type IS NULL OR j.job_type = filter_job_type)
      AND (filter_experience IS NULL OR j.experience_level = filter_experience)
      AND (filter_location IS NULL OR j.location ILIKE '%' || filter_location || '%')
      AND (filter_salary_min IS NULL OR j.salary_max >= filter_salary_min)
      AND (filter_salary_max IS NULL OR j.salary_min <= filter_salary_max)
      AND (filter_remote IS NULL OR j.is_remote = filter_remote)
  )
  SELECT f.id, f.title, f.company_name, f.company_logo_url, f.description,
    f.skills_required, f.location, f.is_remote, f.salary_min, f.salary_max,
    f.salary_currency, f.job_type, f.experience_level, f.source_platform,
    f.source_url, f.posted_at, f.metadata, f.relevance_score::real,
    count(*) OVER()::bigint AS total_count
  FROM filtered f
  ORDER BY
    CASE WHEN sort_by = 'relevance' AND sort_order = 'desc' THEN f.relevance_score END DESC,
    CASE WHEN sort_by = 'relevance' AND sort_order = 'asc' THEN f.relevance_score END ASC,
    CASE WHEN sort_by = 'salary' AND sort_order = 'desc' THEN f.salary_max END DESC,
    CASE WHEN sort_by = 'salary' AND sort_order = 'asc' THEN f.salary_min END ASC,
    CASE WHEN sort_by = 'posted_at' AND sort_order = 'desc' THEN f.posted_at END DESC,
    CASE WHEN sort_by = 'posted_at' AND sort_order = 'asc' THEN f.posted_at END ASC,
    f.posted_at DESC
  LIMIT page_limit OFFSET page_offset;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Job recommendations
CREATE OR REPLACE FUNCTION get_job_recommendations(p_user_id uuid, p_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid, title text, company_name text, company_logo_url text, description text,
  skills_required text[], location text, is_remote boolean, salary_min numeric, salary_max numeric,
  job_type job_type, experience_level experience_level, posted_at timestamptz,
  match_score numeric, matched_skills text[], match_reasons text[]
) AS $$
DECLARE
  user_skills text[]; user_location text; user_exp_years integer;
  user_desired_types job_type[]; user_salary_min numeric; user_salary_max numeric;
  resume_skills text[];
BEGIN
  SELECT p.skills, p.location, p.experience_years, p.desired_job_types, p.desired_salary_min, p.desired_salary_max
  INTO user_skills, user_location, user_exp_years, user_desired_types, user_salary_min, user_salary_max
  FROM profiles p WHERE p.id = p_user_id AND p.deleted_at IS NULL;

  SELECT ARRAY(
    SELECT DISTINCT unnest(
      ARRAY(SELECT jsonb_array_elements_text(item->'skills_used')
        FROM jsonb_array_elements(r.content->'sections') AS section, jsonb_array_elements(section->'items') AS item
        WHERE item->'skills_used' IS NOT NULL AND jsonb_typeof(item->'skills_used') = 'array') ||
      ARRAY(SELECT jsonb_array_elements_text(item->'skills')
        FROM jsonb_array_elements(r.content->'sections') AS section, jsonb_array_elements(section->'items') AS item
        WHERE item->'skills' IS NOT NULL AND jsonb_typeof(item->'skills') = 'array'))
  ) INTO resume_skills
  FROM resumes r WHERE r.user_id = p_user_id AND r.is_primary = true AND r.deleted_at IS NULL;

  user_skills := ARRAY(SELECT DISTINCT lower(s) FROM unnest(coalesce(user_skills, '{}') || coalesce(resume_skills, '{}')) AS s);

  RETURN QUERY
  WITH scored_jobs AS (
    SELECT j.id, j.title, j.company_name, j.company_logo_url, j.description,
      j.skills_required, j.location, j.is_remote, j.salary_min, j.salary_max,
      j.job_type, j.experience_level, j.posted_at,
      CASE WHEN array_length(j.skills_required, 1) > 0 THEN
        (SELECT count(*)::numeric FROM unnest(j.skills_required) AS req WHERE lower(req) = ANY(user_skills))
        / array_length(j.skills_required, 1)::numeric * 40
      ELSE 20 END AS skill_score,
      ARRAY(SELECT req FROM unnest(j.skills_required) AS req WHERE lower(req) = ANY(user_skills)) AS matched_skills,
      CASE WHEN j.is_remote = true THEN 15 WHEN user_location IS NOT NULL AND j.location ILIKE '%' || user_location || '%' THEN 15
        WHEN user_location IS NOT NULL AND j.location IS NOT NULL THEN 5 ELSE 10 END AS location_score,
      CASE WHEN user_desired_types IS NOT NULL AND array_length(user_desired_types, 1) > 0 THEN
        CASE WHEN j.job_type = ANY(user_desired_types) THEN 10 ELSE 2 END ELSE 5 END AS type_score,
      CASE WHEN j.salary_max IS NOT NULL AND user_salary_min IS NOT NULL AND j.salary_max >= user_salary_min THEN 15
        WHEN j.salary_min IS NOT NULL AND user_salary_max IS NOT NULL AND j.salary_min <= user_salary_max THEN 12
        WHEN j.salary_min IS NULL AND j.salary_max IS NULL THEN 8 ELSE 3 END AS salary_score,
      CASE WHEN user_exp_years IS NULL THEN 5
        WHEN user_exp_years <= 2 AND j.experience_level = 'entry' THEN 10
        WHEN user_exp_years BETWEEN 2 AND 5 AND j.experience_level = 'mid' THEN 10
        WHEN user_exp_years BETWEEN 5 AND 8 AND j.experience_level = 'senior' THEN 10
        WHEN user_exp_years BETWEEN 8 AND 12 AND j.experience_level = 'lead' THEN 10
        WHEN user_exp_years > 12 AND j.experience_level = 'executive' THEN 10 ELSE 3 END AS exp_score,
      CASE WHEN j.posted_at >= now() - interval '1 day' THEN 10
        WHEN j.posted_at >= now() - interval '3 days' THEN 8
        WHEN j.posted_at >= now() - interval '7 days' THEN 6
        WHEN j.posted_at >= now() - interval '14 days' THEN 4 ELSE 2 END AS recency_score
    FROM job_listings j
    WHERE j.is_active = true AND j.deleted_at IS NULL
      AND NOT EXISTS (SELECT 1 FROM job_applications a WHERE a.job_id = j.id AND a.user_id = p_user_id AND a.deleted_at IS NULL)
  )
  SELECT sj.id, sj.title, sj.company_name, sj.company_logo_url, sj.description,
    sj.skills_required, sj.location, sj.is_remote, sj.salary_min, sj.salary_max,
    sj.job_type, sj.experience_level, sj.posted_at,
    round(sj.skill_score + sj.location_score + sj.type_score + sj.salary_score + sj.exp_score + sj.recency_score, 2) AS match_score,
    sj.matched_skills,
    ARRAY_REMOVE(ARRAY[
      CASE WHEN sj.skill_score >= 20 THEN 'Strong skill match' END,
      CASE WHEN sj.location_score >= 12 THEN 'Location match' END,
      CASE WHEN sj.type_score >= 8 THEN 'Preferred job type' END,
      CASE WHEN sj.salary_score >= 12 THEN 'Salary in range' END,
      CASE WHEN sj.exp_score >= 8 THEN 'Experience level match' END,
      CASE WHEN sj.recency_score >= 8 THEN 'Recently posted' END
    ], NULL) AS match_reasons
  FROM scored_jobs sj
  WHERE (sj.skill_score + sj.location_score + sj.type_score + sj.salary_score + sj.exp_score + sj.recency_score) >= 30
  ORDER BY (sj.skill_score + sj.location_score + sj.type_score + sj.salary_score + sj.exp_score + sj.recency_score) DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Dashboard statistics
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id uuid) RETURNS jsonb AS $$
DECLARE result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'total_applications', (SELECT count(*) FROM job_applications WHERE user_id = p_user_id AND deleted_at IS NULL),
    'active_applications', (SELECT count(*) FROM job_applications WHERE user_id = p_user_id AND deleted_at IS NULL AND status NOT IN ('rejected', 'withdrawn')),
    'interviews_scheduled', (SELECT count(*) FROM job_applications WHERE user_id = p_user_id AND deleted_at IS NULL AND status = 'interview'),
    'offers_received', (SELECT count(*) FROM job_applications WHERE user_id = p_user_id AND deleted_at IS NULL AND status = 'offer'),
    'saved_jobs_count', (SELECT count(*) FROM saved_jobs WHERE user_id = p_user_id),
    'resumes_count', (SELECT count(*) FROM resumes WHERE user_id = p_user_id AND deleted_at IS NULL),
    'unread_notifications', (SELECT count(*) FROM notifications WHERE user_id = p_user_id AND is_read = false),
    'avg_ats_score', (SELECT round(avg(overall_score), 1) FROM ats_analyses WHERE user_id = p_user_id),
    'applications_by_status', (SELECT coalesce(jsonb_object_agg(status, cnt), '{}') FROM (SELECT status, count(*) as cnt FROM job_applications WHERE user_id = p_user_id AND deleted_at IS NULL GROUP BY status) sub),
    'recent_activity', (SELECT coalesce(jsonb_agg(activity ORDER BY activity_date DESC), '[]') FROM (
      SELECT jsonb_build_object('type', 'application', 'title', j.title, 'company', j.company_name, 'status', a.status, 'date', a.updated_at) AS activity, a.updated_at AS activity_date
      FROM job_applications a JOIN job_listings j ON j.id = a.job_id WHERE a.user_id = p_user_id AND a.deleted_at IS NULL ORDER BY a.updated_at DESC LIMIT 10) sub)
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Mark all notifications read
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id uuid) RETURNS integer AS $$
DECLARE updated_count integer;
BEGIN
  UPDATE notifications SET is_read = true, read_at = now() WHERE user_id = p_user_id AND is_read = false;
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. ENABLE REALTIME
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- ============================================================================
-- 8. SUPABASE STORAGE - Resume PDF Bucket
-- ============================================================================

-- Create the storage bucket for resume PDFs
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resume-files',
  'resume-files',
  false,
  10485760, -- 10MB max per file
  ARRAY['application/pdf']
);

-- RLS: Users can upload their own resume files (path: {user_id}/*)
CREATE POLICY storage_resume_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resume-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can read their own resume files
CREATE POLICY storage_resume_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resume-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can update their own resume files
CREATE POLICY storage_resume_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'resume-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS: Users can delete their own resume files
CREATE POLICY storage_resume_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resume-files'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 9. RESUME FILES TRACKING TABLE
-- ============================================================================

CREATE TABLE resume_files (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  resume_id   uuid REFERENCES resumes(id) ON DELETE SET NULL,
  file_name   text NOT NULL,
  file_size   integer NOT NULL,
  storage_path text NOT NULL,  -- path in Supabase Storage
  mime_type   text NOT NULL DEFAULT 'application/pdf',
  created_at  timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_resume_files_user ON resume_files (user_id, created_at DESC);
CREATE INDEX idx_resume_files_resume ON resume_files (resume_id);

ALTER TABLE resume_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY resume_files_select_own ON resume_files FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY resume_files_insert_own ON resume_files FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY resume_files_delete_own ON resume_files FOR DELETE USING (auth.uid() = user_id);
