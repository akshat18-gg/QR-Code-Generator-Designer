import type { Style } from '../lib/style';
import { QR_TYPES, type Inputs, type QrType } from '../lib/types';
import { DEFAULT_STYLE } from './editor';

export const RECENT_KEY = 'quietzone:recent:v1';
export const RECENT_LIMIT = 12;

export type RecentEntry = { [K in QrType]: { type: K; input: Inputs[K]; style: Style } }[QrType];

export type RecentItem = RecentEntry & {
  id: string;
  savedAt: number;
  thumbnail: string;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

// localStorage itself can throw on access (Safari private mode, blocked cookies).
export function getStorage(): StorageLike | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Every field must have the same primitive type as in the default. Anything
// written by an older or newer version, or edited by hand, is dropped rather
// than loaded half-broken into the editor.
function matchesShape(value: unknown, template: Record<string, unknown>): boolean {
  if (!isObject(value)) return false;
  return Object.entries(template).every(([key, expected]) => {
    const actual = value[key];
    if (isObject(expected)) return matchesShape(actual, expected);
    if (expected === null) return actual === null || typeof actual === 'string';
    return typeof actual === typeof expected;
  });
}

const STYLE_TEMPLATE = {
  ...DEFAULT_STYLE,
  logo: { ...DEFAULT_STYLE.logo, src: null },
} as unknown as Record<string, unknown>;

const INPUT_TEMPLATES: Record<QrType, Record<string, unknown>> = {
  url: { url: '' },
  text: { text: '' },
  email: { to: '', subject: '', body: '' },
  phone: { phone: '' },
  wifi: { ssid: '', security: '', password: '', hidden: false },
};

function isRecentItem(value: unknown): value is RecentItem {
  if (!isObject(value)) return false;
  const { id, savedAt, thumbnail, type, input, style } = value;
  return (
    typeof id === 'string' &&
    typeof savedAt === 'number' &&
    typeof thumbnail === 'string' &&
    thumbnail.startsWith('data:image/') &&
    QR_TYPES.includes(type as QrType) &&
    matchesShape(input, INPUT_TEMPLATES[type as QrType]) &&
    matchesShape(style, STYLE_TEMPLATE)
  );
}

export function readRecent(storage: StorageLike | null): RecentItem[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(RECENT_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isRecentItem).slice(0, RECENT_LIMIT) : [];
  } catch {
    return [];
  }
}

function sameEntry(a: RecentEntry, b: RecentEntry): boolean {
  return (
    a.type === b.type &&
    JSON.stringify(a.input) === JSON.stringify(b.input) &&
    JSON.stringify(a.style) === JSON.stringify(b.style)
  );
}

// Newest first. Saving the same code again moves it to the top instead of
// adding a copy.
export function addRecent(items: RecentItem[], item: RecentItem): RecentItem[] {
  return [item, ...items.filter((existing) => !sameEntry(existing, item))].slice(0, RECENT_LIMIT);
}

// Returns the list that was actually stored. When storage is full, the oldest
// codes are dropped until the rest fit; null means nothing could be saved.
export function writeRecent(storage: StorageLike | null, items: RecentItem[]): RecentItem[] | null {
  if (!storage) return null;
  for (let count = items.length; count >= 0; count--) {
    const kept = items.slice(0, count);
    try {
      storage.setItem(RECENT_KEY, JSON.stringify(kept));
      return kept;
    } catch {
      // Quota exceeded: try again with one fewer.
    }
  }
  return null;
}

export function describeEntry(entry: RecentEntry): string {
  switch (entry.type) {
    case 'url':
      return entry.input.url.trim();
    case 'text':
      return entry.input.text.trim().replace(/\s+/g, ' ');
    case 'email':
      return entry.input.to.trim();
    case 'phone':
      return entry.input.phone.trim();
    case 'wifi':
      return entry.input.ssid;
  }
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function restoreInputs(entry: RecentEntry, inputs: Inputs): Inputs {
  return { ...inputs, [entry.type]: entry.input };
}
