export const APP_NAME = 'JobMatch';

export const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';

export const AI_MODELS = {
  POWERFUL: 'llama-3.3-70b-versatile',
  BALANCED: 'llama-3.3-70b-versatile',
  FAST: 'llama-3.1-8b-instant',
  VISION: 'llama-3.2-90b-vision-preview',
} as const;

export const JOB_TYPE_LABELS: Record<string, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Internship',
  freelance: 'Freelance',
  remote: 'Remote',
};

export const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry Level',
  mid: 'Mid Level',
  senior: 'Senior',
  lead: 'Lead',
  executive: 'Executive',
};

export const JOB_REFRESH_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export const STORAGE_KEYS = {
  USER_PROFILE: '@jobmatch_user_profile',
  RESUMES: '@jobmatch_resumes',
  JOBS_CACHE: '@jobmatch_jobs_cache',
  SAVED_JOBS: '@jobmatch_saved_jobs',
  JOB_MATCHES: '@jobmatch_job_matches',
  ATS_ANALYSES: '@jobmatch_ats_analyses',
  APP_SETTINGS: '@jobmatch_app_settings',
  AUTH_SESSION: '@jobmatch_auth_session',
  PLATFORM_HEALTH: '@jobmatch_platform_health',
} as const;
