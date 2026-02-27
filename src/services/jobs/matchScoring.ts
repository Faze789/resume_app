import { findSkillMatches } from '../../utils/skillDictionary';
import type { UserProfile, JobListing, JobMatch, JobLocality } from '../../types/models';

const WEIGHTS = {
  skills: 0.40,
  jobType: 0.15,
  location: 0.15,
  experience: 0.15,
  salary: 0.15,
};

function scoreSkills(
  userSkills: string[],
  jobSkills: string[],
  domainKeywords: string[],
): { score: number; matched: string[] } {
  if (jobSkills.length === 0) return { score: 70, matched: [] };
  const { matched, missing } = findSkillMatches(userSkills, jobSkills);

  let domainMatches = 0;
  if (domainKeywords.length > 0 && missing.length > 0) {
    const domainLower = domainKeywords.map((k) => k.toLowerCase());
    for (const skill of missing) {
      const skillLower = skill.toLowerCase();
      if (domainLower.some((dk) => skillLower.includes(dk) || dk.includes(skillLower))) {
        domainMatches++;
      }
    }
  }

  const effectiveMatched = matched.length + domainMatches * 0.4;
  const ratio = effectiveMatched / jobSkills.length;
  return { score: Math.min(100, ratio * 100), matched };
}

function scoreJobType(userTypes: string[], jobType: string): number {
  if (userTypes.length === 0) return 70;
  return userTypes.includes(jobType) ? 100 : 30;
}

function scoreLocation(userLocations: string[], jobLocation: string | null, isRemote: boolean): number {
  if (userLocations.length === 0) return 70;
  if (isRemote && userLocations.some((l) => l.toLowerCase().includes('remote'))) return 100;
  if (isRemote) return 80;
  if (!jobLocation) return 50;

  const jobLower = jobLocation.toLowerCase();
  for (const loc of userLocations) {
    if (jobLower.includes(loc.toLowerCase()) || loc.toLowerCase().includes(jobLower)) {
      return 100;
    }
  }
  return 30;
}

function scoreExperience(userYears: number, jobLevel: string): number {
  const levelRanges: Record<string, [number, number]> = {
    entry: [0, 2],
    mid: [2, 5],
    senior: [5, 10],
    lead: [8, 15],
    executive: [12, 30],
  };

  const range = levelRanges[jobLevel] || levelRanges.mid;
  if (userYears >= range[0] && userYears <= range[1]) return 100;
  if (userYears < range[0]) return Math.max(30, 100 - (range[0] - userYears) * 20);
  return Math.max(50, 100 - (userYears - range[1]) * 10);
}

function scoreSalary(
  userMin: number | null,
  userMax: number | null,
  jobMin: number | null,
  jobMax: number | null
): number {
  if (!userMin && !userMax) return 70;
  if (!jobMin && !jobMax) return 60;

  const jMin = jobMin || 0;
  const jMax = jobMax || jMin * 1.3;
  const uMin = userMin || 0;
  const uMax = userMax || uMin * 1.5;

  if (jMax >= uMin && jMin <= uMax) return 100;
  if (jMax < uMin) return Math.max(20, 100 - ((uMin - jMax) / uMin) * 100);
  return 70;
}

/**
 * Parse a user location string like "Karachi, Pakistan" or "New York, NY, USA"
 * into { city, country, parts } for multi-level matching.
 */
function parseLocationParts(location: string): { parts: string[]; city: string; country: string } {
  const parts = location.split(/[,]+/).map((p) => p.trim().toLowerCase()).filter((p) => p.length > 1);
  return {
    parts,
    city: parts[0] || '',
    country: parts[parts.length - 1] || '',
  };
}

/** Check if a needle is present in haystack as a meaningful word (min 3 chars to avoid false positives) */
function locationContains(haystack: string, needle: string): boolean {
  if (!needle || needle.length < 3) return false;
  // Use word boundary check to avoid partial matches like "in" matching "engineering"
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(?:^|[\\s,;/|()\\-])${escaped}(?:$|[\\s,;/|()\\-])`, 'i');
  return regex.test(haystack);
}

/**
 * Strict 4-tier geofencing classification:
 *   Tier 1 (city)          — job location matches user's city/metro
 *   Tier 2 (national)      — job location matches user's country
 *   Tier 3 (remote)        — remote/WFH position with no local match
 *   Tier 4 (international) — on-site abroad
 *
 * IMPORTANT: Location is checked FIRST, before the remote flag.
 * A remote job in "Karachi, Pakistan" for a user in Karachi → 'city', not 'remote'.
 * Only jobs with no location match get classified as 'remote' when is_remote is true.
 */
function classifyLocality(
  userLocation: string | null,
  userDesiredLocations: string[],
  jobLocation: string | null,
  isRemote: boolean,
): JobLocality {
  // If the job has no location info at all
  if (!jobLocation || jobLocation.trim().length === 0) {
    return isRemote ? 'remote' : 'unknown';
  }

  const jobLower = jobLocation.toLowerCase().trim();

  // Filter out generic "remote-only" location strings — these have no real location info
  const REMOTE_ONLY_PATTERNS = [
    /^remote$/i, /^remote\s*[\-\/]\s*remote$/i, /^anywhere$/i,
    /^worldwide$/i, /^global$/i, /^work\s*from\s*home$/i,
    /^remote\s*\(remote\)$/i, /^remote\s*[\-\/]\s*anywhere$/i,
  ];
  const isGenericRemote = REMOTE_ONLY_PATTERNS.some((p) => p.test(jobLocation.trim()));
  if (isGenericRemote) {
    return 'remote';
  }

  // Parse user's home location
  const home = userLocation ? parseLocationParts(userLocation) : null;

  // ── Tier 1: City match ──
  // Check if the job's location contains the user's city
  if (home && home.city && locationContains(jobLower, home.city)) {
    return 'city';
  }
  // Also check desired locations for city match
  for (const loc of userDesiredLocations) {
    const parsed = parseLocationParts(loc);
    if (parsed.city && locationContains(jobLower, parsed.city)) {
      return 'city';
    }
  }

  // ── Tier 2: Country match ──
  if (home && home.country && locationContains(jobLower, home.country)) {
    return 'national';
  }
  for (const loc of userDesiredLocations) {
    const parsed = parseLocationParts(loc);
    if (parsed.country && locationContains(jobLower, parsed.country)) {
      return 'national';
    }
  }
  // Check home state/region parts (skip city which we already checked)
  if (home) {
    for (const part of home.parts.slice(1)) {
      if (locationContains(jobLower, part)) {
        return 'national';
      }
    }
  }

  // ── Tier 3: Remote with no location match ──
  if (isRemote) return 'remote';

  // ── Tier 4: Non-remote, no match → international ──
  return 'international';
}

/** Human-readable label for each locality tier */
export const LOCALITY_LABELS: Record<JobLocality, string> = {
  city: 'In Your City',
  national: 'In Your Country',
  remote: 'Remote',
  international: 'International',
  unknown: '',
};

/** Badge colors for each tier */
export const LOCALITY_COLORS: Record<JobLocality, { bg: string; text: string }> = {
  city: { bg: '#dcfce7', text: '#15803d' },
  national: { bg: '#dbeafe', text: '#1d4ed8' },
  remote: { bg: '#fae8ff', text: '#9333ea' },
  international: { bg: '#fef3c7', text: '#b45309' },
  unknown: { bg: '#f1f5f9', text: '#64748b' },
};

export function calculateMatchScore(
  profile: UserProfile,
  job: JobListing,
  domainKeywords: string[] = [],
): JobMatch {
  const skills = scoreSkills(profile.skills, job.skills_required, domainKeywords);
  const jobType = scoreJobType(profile.desired_job_types, job.job_type);
  const location = scoreLocation(profile.desired_locations, job.location, job.is_remote);
  const experience = scoreExperience(profile.experience_years, job.experience_level);
  const salary = scoreSalary(
    profile.desired_salary_min,
    profile.desired_salary_max,
    job.salary_min,
    job.salary_max
  );

  const totalScore = Math.round(
    skills.score * WEIGHTS.skills +
    jobType * WEIGHTS.jobType +
    location * WEIGHTS.location +
    experience * WEIGHTS.experience +
    salary * WEIGHTS.salary
  );

  const locality = classifyLocality(
    profile.location,
    profile.desired_locations,
    job.location,
    job.is_remote,
  );

  const reasons: string[] = [];
  if (skills.matched.length > 0) reasons.push(`${skills.matched.length} matching skills`);
  if (jobType === 100) reasons.push('Preferred job type');
  if (locality === 'city') reasons.push('Near you');
  else if (locality === 'national') reasons.push('In your country');
  else if (locality === 'remote') reasons.push('Remote position');
  else if (location >= 80) reasons.push('Good location match');
  if (experience === 100) reasons.push('Experience level fits');
  if (salary === 100) reasons.push('Salary in range');

  return {
    job_id: job.id,
    match_score: totalScore,
    matched_skills: skills.matched,
    match_reasons: reasons,
    locality,
  };
}
