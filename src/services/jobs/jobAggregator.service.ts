import { RemotiveAdapter } from './adapters/remotive.adapter';
import { RemoteOKAdapter } from './adapters/remoteok.adapter';
import { ArbeitnowAdapter } from './adapters/arbeitnow.adapter';
import { JobicyAdapter } from './adapters/jobicy.adapter';
import { JoinRiseAdapter } from './adapters/joinrise.adapter';
import { HimalayasAdapter } from './adapters/himalayas.adapter';
import { TheMuseAdapter } from './adapters/themuse.adapter';
import { IndeedAdapter } from './adapters/indeed.adapter';
import { LinkedInAdapter } from './adapters/linkedin.adapter';
import { CareerJetAdapter } from './adapters/careerjet.adapter';
import { GeminiSearchAdapter } from './adapters/geminiSearch.adapter';
import { JSearchAdapter } from './adapters/jsearch.adapter';
import { AdzunaAdapter } from './adapters/adzuna.adapter';
import { JoobleAdapter } from './adapters/jooble.adapter';
import { SearchAPIAdapter } from './adapters/searchapi.adapter';
import { normalizeToJobListing, deduplicateJobs } from './normalizer';
import { calculateMatchScore } from './matchScoring';
import { jobCacheStorage, jobMatchStorage } from '../storage/job.storage';
import { withRetry } from '../../utils/retry';
import { resolveUserDomains, getExpandedRoles, getDomainKeywords } from '../../utils/domainMap';
import type { IJobAdapter } from './adapters/types';
import type { UserProfile, AppSettings, JobListing, JobMatch } from '../../types/models';

type AggregationResult = {
  jobs: JobListing[];
  matches: JobMatch[];
  stats: { total: number; unique: number; platforms: string[] };
};

function experienceLevelKeyword(years: number): string | null {
  if (years <= 2) return 'junior';
  if (years <= 5) return null; // mid-level doesn't need a prefix
  if (years <= 10) return 'senior';
  if (years <= 15) return 'lead';
  return 'director';
}

/**
 * Extract city and country from a location string like "Karachi, Pakistan"
 * or "New York, NY, USA" → { city: "karachi", country: "pakistan", raw: ... }
 */
function parseUserLocation(location: string | null): { city: string; country: string } | null {
  if (!location) return null;
  const parts = location.split(/[,]+/).map((p) => p.trim().toLowerCase()).filter((p) => p.length > 1);
  if (parts.length === 0) return null;
  return {
    city: parts[0],
    country: parts[parts.length - 1],
  };
}

function buildSearchQueries(profile: UserProfile): string[] {
  const queries: string[] = [];
  const levelKeyword = experienceLevelKeyword(profile.experience_years);
  const topSkills = profile.skills.slice(0, 5);

  // Resolve user domains for expanded role queries
  const domains = resolveUserDomains(profile.headline, profile.skills);
  const expandedRoles = getExpandedRoles(domains);

  // Parse user's home location for geo-targeted queries
  const homeLoc = parseUserLocation(profile.location);

  // === TIER 1: Exact profile queries ===

  // 1. Headline (most specific)
  if (profile.headline) queries.push(profile.headline);

  // 2. Experience-level + headline combo
  if (profile.headline && levelKeyword) {
    const cleaned = profile.headline.replace(/\b(senior|junior|mid|lead|entry|intern)\b/gi, '').trim();
    if (cleaned) {
      queries.push(`${levelKeyword} ${cleaned}`);
    }
  }

  // 3. Top skills grouped
  if (topSkills.length >= 2) {
    queries.push(topSkills.slice(0, 3).join(' '));
  }

  // === TIER 2: Domain-expanded queries ===

  // 4. Best domain-expanded role (e.g., "Mobile Developer" for a Flutter user)
  if (expandedRoles.length > 0) {
    queries.push(expandedRoles[0]);
  }

  // 5. Second expanded role with level (e.g., "senior Software Engineer")
  if (expandedRoles.length > 1) {
    queries.push(levelKeyword ? `${levelKeyword} ${expandedRoles[1]}` : expandedRoles[1]);
  }

  // === TIER 3: Location-targeted queries ===
  // Append country/city to queries so even non-location-aware APIs return geo-relevant results

  const roleAnchor = profile.headline || expandedRoles[0] || topSkills.slice(0, 2).join(' ');
  if (roleAnchor && homeLoc) {
    // "React Developer Pakistan" — surfaces country-specific results in text search
    if (homeLoc.country) {
      queries.push(`${roleAnchor} ${homeLoc.country}`);
    }
    // "React Developer Karachi" — surfaces city-specific results
    if (homeLoc.city && homeLoc.city !== homeLoc.country) {
      queries.push(`${roleAnchor} ${homeLoc.city}`);
    }
  }

  // Also use desired_locations for extra location queries
  for (const loc of (profile.desired_locations || []).slice(0, 2)) {
    if (loc && roleAnchor) {
      const locLower = loc.toLowerCase();
      // Avoid duplicating if already covered by homeLoc
      if (homeLoc && (locLower === homeLoc.city || locLower === homeLoc.country)) continue;
      queries.push(`${roleAnchor} ${loc}`);
    }
  }

  // === TIER 4: Job type queries ===

  const anchor = topSkills[0] || expandedRoles[0] || '';
  if (anchor) {
    for (const jobType of (profile.desired_job_types || []).slice(0, 2)) {
      if (jobType === 'remote') queries.push(`remote ${anchor}`);
      if (jobType === 'internship') queries.push(`${anchor} internship`);
    }
  }

  // Fallback: prefer domain role over generic "software developer"
  if (queries.length === 0) {
    queries.push(expandedRoles[0] || 'software developer');
  }

  // Deduplicate and cap at 10 for higher density (increased from 8 to accommodate geo queries)
  return [...new Set(queries)].slice(0, 10);
}

function getAdapters(settings: AppSettings): IJobAdapter[] {
  // Country-specific scrapers first, then remote-only boards
  const adapters: IJobAdapter[] = [
    new IndeedAdapter(),
    new LinkedInAdapter(),
    new CareerJetAdapter(),
    new RemotiveAdapter(),
    new RemoteOKAdapter(),
    new ArbeitnowAdapter(),
    new JobicyAdapter(),
    new JoinRiseAdapter(),
    new HimalayasAdapter(),
    new TheMuseAdapter(),
  ];

  if (settings.rapidapi_key) {
    adapters.push(new JSearchAdapter(settings.rapidapi_key));
  }

  if (settings.jooble_api_key) {
    adapters.push(new JoobleAdapter(settings.jooble_api_key));
  }

  if (settings.searchapi_key) {
    adapters.push(new SearchAPIAdapter(settings.searchapi_key));
  }

  if (settings.adzuna_app_id && settings.adzuna_app_key) {
    adapters.push(new AdzunaAdapter(settings.adzuna_app_id, settings.adzuna_app_key));
  }

  // Gemini Search — uses Google Search grounding for country-specific job search
  if (settings.gemini_api_key) {
    adapters.push(new GeminiSearchAdapter(settings.gemini_api_key));
  }

  return adapters;
}

// Adapters that do server-side search (multi-query benefits them)
const SEARCHABLE_ADAPTERS = new Set(['indeed', 'linkedin', 'careerjet', 'remotive', 'remoteok', 'arbeitnow', 'jobicy', 'joinrise', 'himalayas', 'themuse', 'jsearch', 'adzuna', 'jooble', 'searchapi']);
// Adapters that support location parameter — these get the user's country passed to them
const LOCATION_ADAPTERS = new Set(['indeed', 'linkedin', 'careerjet', 'gemini_search', 'themuse', 'jsearch', 'adzuna', 'jooble', 'searchapi']);
// Gemini Search: rate-limit sensitive — only gets primary + one extra query (not the full matrix)
const RATE_LIMITED_ADAPTERS = new Set(['gemini_search']);

export const JobAggregatorService = {
  async aggregateJobs(profile: UserProfile, settings: AppSettings): Promise<AggregationResult> {
    const adapters = getAdapters(settings);
    const queries = buildSearchQueries(profile);
    const domains = resolveUserDomains(profile.headline, profile.skills);
    const domainKeywords = getDomainKeywords(domains);

    // Derive effective locations: desired_locations → profile.location (home) → undefined
    const homeLoc = parseUserLocation(profile.location);
    let locations: (string | undefined)[];
    if (profile.desired_locations.length > 0) {
      locations = profile.desired_locations.slice(0, 3);
      // Also include home location if it's different from desired locations
      if (homeLoc && !profile.desired_locations.some(
        (dl) => dl.toLowerCase().includes(homeLoc.country) || dl.toLowerCase().includes(homeLoc.city)
      )) {
        locations.push(profile.location || undefined);
      }
    } else if (profile.location) {
      // Use home location as primary — this is the key fix
      locations = [profile.location];
      // Also add just the country if location has city+country
      if (homeLoc && homeLoc.city !== homeLoc.country) {
        locations.push(homeLoc.country);
      }
    } else {
      locations = [undefined];
    }

    const primaryQuery = queries[0];
    const primaryLocation = locations[0];

    // Build fetch tasks: primary query for all adapters + additional queries/locations
    const fetchTasks: Promise<{ platform: string; jobs: any[] }>[] = [];

    const retryOpts = { maxAttempts: 2, delayMs: 1500 };

    for (const adapter of adapters) {
      const isRateLimited = RATE_LIMITED_ADAPTERS.has(adapter.platformName);

      // Primary query + primary location (always)
      fetchTasks.push(
        withRetry(() => adapter.fetch(primaryQuery, primaryLocation as string | undefined), retryOpts)
          .then(jobs => ({ platform: adapter.platformName, jobs }))
          .catch(err => { console.warn(`${adapter.platformName} failed:`, err.message); return { platform: adapter.platformName, jobs: [] }; })
      );

      // Rate-limited adapters (Gemini Search): only 1 extra query to conserve quota
      if (isRateLimited) {
        // Fire one more query with country for broader coverage
        if (homeLoc?.country && queries.length > 1) {
          fetchTasks.push(
            withRetry(() => adapter.fetch(queries[1], homeLoc.country), retryOpts)
              .then(jobs => ({ platform: adapter.platformName, jobs }))
              .catch(() => ({ platform: adapter.platformName, jobs: [] }))
          );
        }
        continue; // Skip the full query matrix for rate-limited adapters
      }

      // Additional queries for searchable adapters — use up to 4 extra queries
      if (SEARCHABLE_ADAPTERS.has(adapter.platformName)) {
        for (const query of queries.slice(1, 5)) {
          fetchTasks.push(
            withRetry(() => adapter.fetch(query, primaryLocation as string | undefined), retryOpts)
              .then(jobs => ({ platform: adapter.platformName, jobs }))
              .catch(() => ({ platform: adapter.platformName, jobs: [] }))
          );
        }
      }

      // Additional locations for location-aware adapters
      if (LOCATION_ADAPTERS.has(adapter.platformName)) {
        // Fire extra queries with each additional location
        for (const loc of locations.slice(1)) {
          if (loc) {
            fetchTasks.push(
              withRetry(() => adapter.fetch(primaryQuery, loc as string), retryOpts)
                .then(jobs => ({ platform: adapter.platformName, jobs }))
                .catch(() => ({ platform: adapter.platformName, jobs: [] }))
            );
          }
        }
        // Also fire 2nd-best query with user's home country to maximize local results
        if (homeLoc?.country && queries.length > 1) {
          fetchTasks.push(
            withRetry(() => adapter.fetch(queries[1], homeLoc.country), retryOpts)
              .then(jobs => ({ platform: adapter.platformName, jobs }))
              .catch(() => ({ platform: adapter.platformName, jobs: [] }))
          );
        }
      }
    }

    // Cap total fetch tasks — raised to 50 to accommodate Indeed + LinkedIn scrapers
    const cappedTasks = fetchTasks.slice(0, 50);

    // Fetch all in parallel
    const results = await Promise.allSettled(cappedTasks);

    // Collect all results with per-adapter stats for debugging
    const allNormalized: JobListing[] = [];
    const platformSet = new Set<string>();
    const adapterStats: Record<string, number> = {};
    let failedCount = 0;

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.jobs.length > 0) {
        const p = result.value.platform;
        platformSet.add(p);
        adapterStats[p] = (adapterStats[p] || 0) + result.value.jobs.length;
        for (const job of result.value.jobs) {
          try {
            allNormalized.push(normalizeToJobListing(job));
          } catch {
            // Skip malformed job entry
          }
        }
      } else if (result.status === 'rejected') {
        failedCount++;
      }
    }

    // Log adapter-level results for debugging
    console.log('[JobAggregator] Adapter results:', JSON.stringify(adapterStats));
    console.log(`[JobAggregator] Queries: ${queries.slice(0, 3).join(' | ')}... (${queries.length} total)`);
    console.log(`[JobAggregator] Location: ${primaryLocation || 'none'} | Tasks: ${cappedTasks.length} | Failed: ${failedCount}`);

    // Deduplicate
    const unique = deduplicateJobs(allNormalized);

    // Calculate match scores with domain-aware scoring
    const matches: JobMatch[] = unique.map((job) => calculateMatchScore(profile, job, domainKeywords));

    // Build a quick lookup for match data
    const matchMap = new Map(matches.map((m) => [m.job_id, m]));

    // Sort: city → national → remote → international — within each group, sort by match score
    const localityOrder: Record<string, number> = { city: 0, national: 1, remote: 2, unknown: 3, international: 4 };
    const sortedJobs = unique.sort((a, b) => {
      const mA = matchMap.get(a.id);
      const mB = matchMap.get(b.id);
      const groupA = localityOrder[mA?.locality || 'unknown'] ?? 2;
      const groupB = localityOrder[mB?.locality || 'unknown'] ?? 2;
      if (groupA !== groupB) return groupA - groupB;
      return (mB?.match_score || 0) - (mA?.match_score || 0);
    });

    // Cache results
    await jobCacheStorage.setAll(sortedJobs);
    await jobMatchStorage.set(matches);

    return {
      jobs: sortedJobs,
      matches,
      stats: {
        total: allNormalized.length,
        unique: unique.length,
        platforms: [...platformSet],
      },
    };
  },

  async getCachedJobs(): Promise<{ jobs: JobListing[]; matches: JobMatch[] }> {
    const jobs = await jobCacheStorage.getAll();
    const matches = await jobMatchStorage.get() || [];
    return { jobs, matches };
  },
};
