import { TypedStorage } from './asyncStorage.service';
import { STORAGE_KEYS } from '../../config/constants';
import type { UserProfile } from '../../types/models';

export const userStorage = new TypedStorage<UserProfile>(STORAGE_KEYS.USER_PROFILE);
