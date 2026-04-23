import { CollectionStorage, TypedStorage } from './asyncStorage.service';
import { STORAGE_KEYS } from '../../config/constants';
import type { JobListing, SavedJob, JobMatch } from '../../types/models';

export const jobCacheStorage = new CollectionStorage<JobListing>(STORAGE_KEYS.JOBS_CACHE);
export const savedJobStorage = new CollectionStorage<SavedJob>(STORAGE_KEYS.SAVED_JOBS);
export const jobMatchStorage = new TypedStorage<JobMatch[]>(STORAGE_KEYS.JOB_MATCHES);
