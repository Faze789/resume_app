// ============================================================================
// Data Models - Adapted from existing Supabase types for local-first storage
// ============================================================================

export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance' | 'remote';
export type ExperienceLevel = 'entry' | 'mid' | 'senior' | 'lead' | 'executive';
export type ProficiencyLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';
export type ResumeSectionType =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'projects'
  | 'certifications'
  | 'languages'
  | 'awards'
  | 'custom';

// ============================================================================
// Resume Content Types
// ============================================================================

export type ResumePersonalInfo = {
  full_name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
};

export type ResumeExperienceItem = {
  id: string;
  title: string;
  organization: string;
  location?: string;
  start_date: string;
  end_date?: string;
  is_current?: boolean;
  description?: string;
  bullets: string[];
  skills_used?: string[];
};

export type ResumeEducationItem = {
  id: string;
  title: string;
  organization: string;
  location?: string;
  start_date: string;
  end_date?: string;
  description?: string;
  bullets?: string[];
};

export type ResumeSkillCategory = {
  id: string;
  category: string;
  skills: string[];
};

export type ResumeProjectItem = {
  id: string;
  title: string;
  description?: string;
  url?: string;
  bullets: string[];
  skills_used?: string[];
};

export type ResumeCertificationItem = {
  id: string;
  title: string;
  organization: string;
  date?: string;
  url?: string;
};

export type ResumeSection = {
  type: ResumeSectionType;
  title: string;
  items: (
    | ResumeExperienceItem
    | ResumeEducationItem
    | ResumeSkillCategory
    | ResumeProjectItem
    | ResumeCertificationItem
    | Record<string, any>
  )[];
};

export type ResumeContent = {
  personal_info: ResumePersonalInfo;
  summary: string;
  sections: ResumeSection[];
};

export type ResumeStyleConfig = {
  font_family: string;
  font_size: number;
  color_primary: string;
  color_accent: string;
  margin: 'narrow' | 'normal' | 'wide';
  spacing: 'compact' | 'comfortable' | 'spacious';
};

// ============================================================================
// User Profile
// ============================================================================

export type UserProfile = {
  id: string;
  full_name: string;
  email: string;
  resume_url: string | null;
  phone: string | null;
  location: string | null;
  bio: string | null;
  headline: string | null;
  skills: string[];
  experience_years: number;
  desired_salary_min: number | null;
  desired_salary_max: number | null;
  desired_job_types: JobType[];
  desired_locations: string[];
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_url: string | null;
  is_open_to_work: boolean;
  onboarding_complete: boolean;
  parse_confidence: Record<string, { score: number; reason: string }> | null;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// Resume
// ============================================================================

export type Resume = {
  id: string;
  user_id: string;
  title: string;
  version: number;
  is_primary: boolean;
  content: ResumeContent;
  section_order: ResumeSectionType[];
  template_id: string;
  style_config: ResumeStyleConfig;
  last_ats_score: number | null;
  raw_text: string | null;
  created_at: string;
  updated_at: string;
};

// ============================================================================
// Job Listing
// ============================================================================

export type JobListing = {
  id: string;
  title: string;
  company_name: string;
  company_logo_url: string | null;
  description: string;
  requirements: string[];
  skills_required: string[];
  location: string | null;
  is_remote: boolean;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  source_platform: string;
  source_url: string | null;
  external_id: string;
  is_active: boolean;
  posted_at: string;
  metadata: Record<string, any>;
  created_at: string;
};

export type JobLocality = 'city' | 'national' | 'remote' | 'international' | 'unknown';

export type JobMatch = {
  job_id: string;
  match_score: number;
  matched_skills: string[];
  match_reasons: string[];
  locality: JobLocality;
};

export type SavedJob = {
  id: string;
  user_id: string;
  job_id: string;
  job_data: JobListing | null;
  notes: string | null;
  created_at: string;
};

// ============================================================================
// ATS Analysis
// ============================================================================

export type ATSSuggestion = {
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  section?: string;
  currentText?: string;
  suggestedText?: string;
  estimatedImpact?: 'high' | 'medium' | 'low';
  source?: 'algorithmic' | 'semantic' | 'both';
};

export type ATSAnalysis = {
  id: string;
  resume_id: string;
  job_id: string | null;
  job_description: string | null;
  job_title: string | null;
  overall_score: number;
  keyword_score: number;
  skills_score: number;
  experience_score: number;
  education_score: number;
  formatting_score: number;
  matched_keywords: string[];
  missing_keywords: string[];
  skill_gaps: string[];
  suggestions: ATSSuggestion[];
  analysis_detail: Record<string, any>;
  created_at: string;
};

// ============================================================================
// App Settings
// ============================================================================

export type AppSettings = {
  groq_api_key: string | null;
  gemini_api_key: string | null;
  rapidapi_key: string | null;
  jooble_api_key: string | null;
  searchapi_key: string | null;
  adzuna_app_id: string | null;
  adzuna_app_key: string | null;
  preferred_ai_model: string;
  last_job_refresh: string | null;
  theme_mode: 'light' | 'dark' | 'system';
};

// ============================================================================
// Job Search Filters
// ============================================================================

export type JobFilters = {
  query?: string;
  location?: string;
  job_type?: JobType;
  experience_level?: ExperienceLevel;
  is_remote?: boolean;
  salary_min?: number;
  salary_max?: number;
  skills?: string[];
  source_platform?: string;
};

// ============================================================================
// Parsed Resume Data (from AI)
// ============================================================================

export type ConfidenceScores = Record<string, { score: number; reason: string }>;

export type ParsedResumeData = {
  profile: Partial<UserProfile>;
  resume_content: ResumeContent;
  raw_text: string;
  confidence: ConfidenceScores | null;
};

// ============================================================================
// Defaults
// ============================================================================

export const DEFAULT_STYLE_CONFIG: ResumeStyleConfig = {
  font_family: 'Arial',
  font_size: 11,
  color_primary: '#1a56db',
  color_accent: '#6366f1',
  margin: 'normal',
  spacing: 'comfortable',
};

export const DEFAULT_SECTION_ORDER: ResumeSectionType[] = [
  'summary',
  'experience',
  'education',
  'skills',
  'projects',
  'certifications',
];

export const DEFAULT_SETTINGS: AppSettings = {
  groq_api_key: process.env.EXPO_PUBLIC_GROQ_API_KEY ?? null,
  gemini_api_key: process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? null,
  rapidapi_key: null,
  jooble_api_key: null,
  searchapi_key: null,
  adzuna_app_id: null,
  adzuna_app_key: null,
  preferred_ai_model: 'llama-3.3-70b-versatile',
  last_job_refresh: null,
  theme_mode: 'light',
};
