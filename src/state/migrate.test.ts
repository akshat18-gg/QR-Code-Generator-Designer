import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from './editor';
import { migrateStorage } from './migrate';
import { readRecent, type RecentItem } from './recent';

const RECENT: RecentItem[] = [
  {
    id: 'id-1',
    savedAt: 1,
    thumbnail: 'data:image/png;base64,AAAA',
    type: 'url',
    input: { url: 'example.com' },
    style: DEFAULT_STYLE,
  },
];

class MemoryStorage {
  data: Map<string, string>;
  failWrites = false;
  constructor(entries: Record<string, string> = {}) {
    this.data = new Map(Object.entries(entries));
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (this.failWrites) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
}

describe('migrateStorage', () => {
  it('moves recent codes and the theme to the qraft keys and deletes the old ones', () => {
    const storage = new MemoryStorage({
      'quietzone:recent:v1': JSON.stringify(RECENT),
      'quietzone:theme': 'dark',
    });
    migrateStorage(storage);
    expect(Object.fromEntries(storage.data)).toEqual({
      'qraft:recent:v1': JSON.stringify(RECENT),
      'qraft:theme': 'dark',
    });
    expect(readRecent(storage)).toEqual(RECENT);
  });

  it('keeps data already saved under a new key, and still deletes the old one', () => {
    const storage = new MemoryStorage({ 'quietzone:theme': 'dark', 'qraft:theme': 'light' });
    migrateStorage(storage);
    expect(Object.fromEntries(storage.data)).toEqual({ 'qraft:theme': 'light' });
  });

  it('leaves unrelated keys and an already migrated store alone', () => {
    const entries = { 'qraft:theme': 'dark', 'other:key': 'x' };
    const storage = new MemoryStorage(entries);
    migrateStorage(storage);
    migrateStorage(storage);
    expect(Object.fromEntries(storage.data)).toEqual(entries);
  });

  it('keeps the old key when the new one cannot be written, so nothing is lost', () => {
    const storage = new MemoryStorage({ 'quietzone:recent:v1': JSON.stringify(RECENT) });
    storage.failWrites = true;
    migrateStorage(storage);
    expect(Object.fromEntries(storage.data)).toEqual({
      'quietzone:recent:v1': JSON.stringify(RECENT),
    });

    storage.failWrites = false;
    migrateStorage(storage);
    expect(Object.fromEntries(storage.data)).toEqual({
      'qraft:recent:v1': JSON.stringify(RECENT),
    });
  });

  it('does nothing without storage', () => {
    expect(() => migrateStorage(null)).not.toThrow();
  });
});
