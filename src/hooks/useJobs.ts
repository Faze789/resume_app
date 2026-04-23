import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { JobAggregatorService } from '../services/jobs/jobAggregator.service';
import { settingsStorage } from '../services/storage/settings.storage';
import { supabase } from '../services/supabase';
import { nowISO } from '../utils/date';
import { JOB_REFRESH_COOLDOWN_MS } from '../config/constants';
import type { UserProfile, JobListing, JobMatch, SavedJob, JobFilters } from '../types/models';

type JobsContextType = {
  jobs: JobListing[];
  matches: JobMatch[];
  savedJobs: SavedJob[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshJobs: () => Promise<void>;
  forceRefreshJobs: () => Promise<void>;
  searchJobs: (filters: JobFilters) => JobListing[];
  saveJob: (job: JobListing) => Promise<void>;
  unsaveJob: (externalJobId: string) => Promise<void>;
  isJobSaved: (jobId: string) => boolean;
  getMatchForJob: (jobId: string) => JobMatch | undefined;
};

const JobsContext = createContext<JobsContextType | null>(null);

export function JobsProvider({ profile, children }: { profile: UserProfile | null; children: React.ReactNode }) {
  const [jobs, setJobs] = useState<JobListing[]>([]);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const [initialLoaded, setInitialLoaded] = useState(false);

  // Track profile changes for reactive re-scoring
  const profileSignature = profile
    ? `${(profile.skills || []).join(',')}|${profile.location || ''}|${profile.headline || ''}|${(profile.desired_locations || []).join(',')}`
    : '';
  const prevSignature = useRef(profileSignature);

  // Stable ref to profile for use in callbacks without stale closures
  const profileRef = useRef(profile);
  profileRef.current = profile;

  const lastRefreshRef = useRef(lastRefresh);
  lastRefreshRef.current = lastRefresh;

  // Load cached data on mount
  useEffect(() => {
    loadCached();
    loadSaved();
  }, []);

  // Auto-fetch when cache is empty and profile is ready
  useEffect(() => {
    if (initialLoaded && jobs.length === 0 && profile && !refreshing) {
      refreshJobs();
    }
  }, [initialLoaded, profile]);

  // Reactive re-scoring when profile changes
  useEffect(() => {
    if (
      prevSignature.current &&
      prevSignature.current !== profileSignature &&
      jobs.length > 0 &&
      profile
    ) {
      forceRefreshJobs();
    }
    prevSignature.current = profileSignature;
  }, [profileSignature]);

  const loadCached = async () => {
    setLoading(true);
    try {
      const { jobs: cached, matches: cachedMatches } = await JobAggregatorService.getCachedJobs();
      if (cached.length > 0) {
        setJobs(cached);
        setMatches(cachedMatches);
      }
    } catch (err: unknown) {
      console.warn('Failed to load cached jobs:', err instanceof Error ? err.message : err);
    } finally {
      setLoading(false);
      setInitialLoaded(true);
    }
  };

  const loadSaved = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const { data, error } = await supabase
      .from('saved_jobs')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedJobs(data as SavedJob[]);
    }
  };

  const refreshJobs = useCallback(async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;

    const now = Date.now();
    if (now - lastRefreshRef.current < JOB_REFRESH_COOLDOWN_MS) {
      setError('Please wait before refreshing again');
      return;
    }

    setRefreshing(true);
    setError(null);
    try {
      const settings = await settingsStorage.get();
      const result = await JobAggregatorService.aggregateJobs(currentProfile, settings);
      setJobs(result.jobs);
      setMatches(result.matches);
      setLastRefresh(now);
      lastRefreshRef.current = now;
      await settingsStorage.update({ last_job_refresh: nowISO() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const forceRefreshJobs = useCallback(async () => {
    const currentProfile = profileRef.current;
    if (!currentProfile) return;

    setRefreshing(true);
    setError(null);
    try {
      const settings = await settingsStorage.get();
      const result = await JobAggregatorService.aggregateJobs(currentProfile, settings);
      setJobs(result.jobs);
      setMatches(result.matches);
      const now = Date.now();
      setLastRefresh(now);
      lastRefreshRef.current = now;
      await settingsStorage.update({ last_job_refresh: nowISO() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch jobs');
    } finally {
      setRefreshing(false);
    }
  }, []);

  const searchJobs = useCallback((filters: JobFilters) => {
    let filtered = [...jobs];

    if (filters.query) {
      const q = filters.query.toLowerCase();
      filtered = filtered.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company_name.toLowerCase().includes(q) ||
          j.description.toLowerCase().includes(q)
      );
    }

    if (filters.job_type) {
      filtered = filtered.filter((j) => j.job_type === filters.job_type);
    }

    if (filters.experience_level) {
      filtered = filtered.filter((j) => j.experience_level === filters.experience_level);
    }

    if (filters.is_remote !== undefined) {
      filtered = filtered.filter((j) => j.is_remote === filters.is_remote);
    }

    if (filters.location) {
      const loc = filters.location.toLowerCase();
      filtered = filtered.filter((j) => j.location?.toLowerCase().includes(loc));
    }

    if (filters.salary_min != null) {
      filtered = filtered.filter((j) => (j.salary_max ?? j.salary_min ?? 0) >= filters.salary_min!);
    }

    if (filters.salary_max != null) {
      filtered = filtered.filter((j) => (j.salary_min ?? j.salary_max ?? Infinity) <= filters.salary_max!);
    }

    if (filters.skills && filters.skills.length > 0) {
      const skillsLower = filters.skills.map((s) => s.toLowerCase());
      filtered = filtered.filter((j) =>
        j.skills_required.some((s) => skillsLower.includes(s.toLowerCase()))
      );
    }

    return filtered;
  }, [jobs]);

  const saveJob = useCallback(async (job: JobListing) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Prevent duplicate saves
    if (savedJobs.some((s) => (s.job_data as any)?.id === job.id)) return;

    const { data, error } = await supabase
      .from('saved_jobs')
      .insert({
        user_id: session.user.id,
        job_id: null,
        job_data: job,
        notes: null,
      })
      .select()
      .single();

    if (!error && data) {
      setSavedJobs((prev) => [data as SavedJob, ...prev]);
    }
  }, [savedJobs]);

  const unsaveJob = useCallback(async (externalJobId: string) => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.user) return;

    const saved = savedJobs.find((s) => (s.job_data as any)?.id === externalJobId);
    if (!saved) return;

    const { error } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('id', saved.id);

    if (!error) {
      setSavedJobs((prev) => prev.filter((s) => s.id !== saved.id));
    }
  }, [savedJobs]);

  const isJobSaved = useCallback((jobId: string) => {
    return savedJobs.some((s) => (s.job_data as any)?.id === jobId);
  }, [savedJobs]);

  const getMatchForJob = useCallback((jobId: string): JobMatch | undefined => {
    return matches.find((m) => m.job_id === jobId);
  }, [matches]);

  const value: JobsContextType = {
    jobs,
    matches,
    savedJobs,
    loading,
    refreshing,
    error,
    refreshJobs,
    forceRefreshJobs,
    searchJobs,
    saveJob,
    unsaveJob,
    isJobSaved,
    getMatchForJob,
  };

  return React.createElement(JobsContext.Provider, { value }, children);
}

export function useJobs(): JobsContextType {
  const context = useContext(JobsContext);
  if (!context) {
    throw new Error('useJobs must be used within JobsProvider');
  }
  return context;
}
