import { CollectionStorage } from './asyncStorage.service';
import { STORAGE_KEYS } from '../../config/constants';
import type { Resume } from '../../types/models';

export const resumeStorage = new CollectionStorage<Resume>(STORAGE_KEYS.RESUMES);
