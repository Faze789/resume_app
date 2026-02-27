import AsyncStorage from '@react-native-async-storage/async-storage';

export class TypedStorage<T> {
  constructor(private key: string) {}

  async get(): Promise<T | null> {
    try {
      const raw = await AsyncStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  async set(value: T): Promise<void> {
    await AsyncStorage.setItem(this.key, JSON.stringify(value));
  }

  async remove(): Promise<void> {
    await AsyncStorage.removeItem(this.key);
  }
}

export class CollectionStorage<T extends { id: string }> {
  constructor(private key: string) {}

  async getAll(): Promise<T[]> {
    try {
      const raw = await AsyncStorage.getItem(this.key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  async getById(id: string): Promise<T | null> {
    const items = await this.getAll();
    return items.find((item) => item.id === id) ?? null;
  }

  async upsert(item: T): Promise<void> {
    const items = await this.getAll();
    const index = items.findIndex((i) => i.id === item.id);
    if (index >= 0) {
      items[index] = item;
    } else {
      items.push(item);
    }
    await AsyncStorage.setItem(this.key, JSON.stringify(items));
  }

  async remove(id: string): Promise<void> {
    const items = await this.getAll();
    const filtered = items.filter((i) => i.id !== id);
    await AsyncStorage.setItem(this.key, JSON.stringify(filtered));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(this.key);
  }

  async setAll(items: T[]): Promise<void> {
    await AsyncStorage.setItem(this.key, JSON.stringify(items));
  }
}
