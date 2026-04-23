import { TypedStorage } from './asyncStorage.service';
import { STORAGE_KEYS } from '../../config/constants';
import type { AppSettings } from '../../types/models';
import { DEFAULT_SETTINGS } from '../../types/models';

const storage = new TypedStorage<AppSettings>(STORAGE_KEYS.APP_SETTINGS);

export const settingsStorage = {
  async get(): Promise<AppSettings> {
    const saved = await storage.get();
    const merged = { ...DEFAULT_SETTINGS, ...saved };
    return merged;
  },
  async set(settings: AppSettings): Promise<void> {
    await storage.set(settings);
  },
  async update(updates: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.get();
    const updated = { ...current, ...updates };
    await storage.set(updated);
    return updated;
  },
};
