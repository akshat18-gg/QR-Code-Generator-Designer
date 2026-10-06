import { THEME_KEY } from '../hooks/useTheme';
import { RECENT_KEY } from './recent';

// The app was called Quiet Zone before it became QRaft. Anything saved under
// the old keys moves to the new ones once, so nobody loses their recent codes
// or their theme choice.
export const RENAMED_KEYS: Readonly<Record<string, string>> = {
  'quietzone:recent:v1': RECENT_KEY,
  'quietzone:theme': THEME_KEY,
};

type MigratableStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function migrateStorage(storage: MigratableStorage | null): void {
  if (!storage) return;
  for (const [oldKey, newKey] of Object.entries(RENAMED_KEYS)) {
    try {
      const value = storage.getItem(oldKey);
      if (value === null) continue;
      // Anything already under the new key was saved later, so it wins.
      if (storage.getItem(newKey) === null) storage.setItem(newKey, value);
      storage.removeItem(oldKey);
    } catch {
      // Storage full or blocked: keep the old key so the next visit can retry.
    }
  }
}
