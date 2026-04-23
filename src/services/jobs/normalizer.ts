import { nowISO, isJobFresh } from '../../utils/date';
import type { NormalizedJob } from './adapters/types';
import type { JobListing, JobType, ExperienceLevel } from '../../types/models';

const VALID_JOB_TYPES: JobType[] = ['full_time', 'part_time', 'contract', 'internship', 'freelance', 'remote'];
const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = ['entry', 'mid', 'senior', 'lead', 'executive'];

function isValidPostedAt(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime()) && d.getFullYear() >= 2020 && d.getTime() <= Date.now() + 86400000;
}

/** Derive a stable, deterministic ID from platform + external_id using dual hashes for collision resistance */
function deriveJobId(platform: string, externalId: string): string {
  const raw = `${platform}:${externalId}`;
  // DJB2 hash
  let h1 = 5381;
  for (let i = 0; i < raw.length; i++) {
    h1 = ((h1 << 5) + h1 + raw.charCodeAt(i)) | 0;
  }
  // FNV-1a hash for second component
  let h2 = 0x811c9dc5;
  for (let i = 0; i < raw.length; i++) {
    h2 ^= raw.charCodeAt(i);
    h2 = Math.imul(h2, 0x01000193) | 0;
  }
  const hex = Math.abs(h1).toString(16).padStart(8, '0') + Math.abs(h2).toString(16).padStart(8, '0');
  return `${platform}-${hex}`;
}

export function normalizeToJobListing(job: NormalizedJob): JobListing {
  const jobType = VALID_JOB_TYPES.includes(job.job_type as JobType)
    ? (job.job_type as JobType)
    : 'full_time';

  const expLevel = VALID_EXPERIENCE_LEVELS.includes(job.experience_level as ExperienceLevel)
    ? (job.experience_level as ExperienceLevel)
    : 'mid';

  return {
    id: deriveJobId(job.source_platform, job.external_id),
    title: (job.title || '').trim(),
    company_name: (job.company_name || '').trim(),
    company_logo_url: job.company_logo_url,
    description: (job.description || '').slice(0, 5000),
    requirements: Array.isArray(job.requirements) ? job.requirements : [],
    skills_required: Array.isArray(job.skills_required) ? job.skills_required : [],
    location: job.location,
    is_remote: job.is_remote,
    salary_min: job.salary_min,
    salary_max: job.salary_max,
    salary_currency: job.salary_currency || 'USD',
    job_type: jobType,
    experience_level: expLevel,
    source_platform: job.source_platform,
    source_url: job.source_url,
    external_id: job.external_id,
    is_active: true,
    posted_at: isValidPostedAt(job.posted_at) ? job.posted_at : nowISO(),
    metadata: job.metadata || {},
    created_at: nowISO(),
  };
}

export function deduplicateJobs(jobs: JobListing[]): JobListing[] {
  const seenBySource = new Set<string>();
  const seenByTitleCompany = new Set<string>();
  return jobs
    .filter((job) => {
      // Strict 60-day freshness filter
      if (!isJobFresh(job.posted_at)) return false;

      // Must have a title and company
      if (!job.title?.trim() || !job.company_name?.trim()) return false;

      const sourceKey = `${job.source_platform}:${job.external_id}`;
      if (seenBySource.has(sourceKey)) return false;
      seenBySource.add(sourceKey);

      // Cross-platform dedup: normalize title (strip whitespace + punctuation) + company
      const normTitle = (job.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const normCompany = (job.company_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const titleKey = `${normTitle}::${normCompany}`;
      if (seenByTitleCompany.has(titleKey)) return false;
      seenByTitleCompany.add(titleKey);

      return true;
    });
}
