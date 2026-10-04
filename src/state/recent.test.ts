import { describe, expect, it } from 'vitest';
import { DEFAULT_STYLE } from './editor';
import {
  addRecent,
  describeEntry,
  readRecent,
  RECENT_KEY,
  RECENT_LIMIT,
  writeRecent,
  type RecentItem,
} from './recent';

function item(url: string, savedAt = 0, overrides: Partial<RecentItem> = {}): RecentItem {
  return {
    id: `id-${url}-${savedAt}`,
    savedAt,
    thumbnail: 'data:image/png;base64,AAAA',
    type: 'url',
    input: { url },
    style: DEFAULT_STYLE,
    ...overrides,
  } as RecentItem;
}

class MemoryStorage {
  data = new Map<string, string>();
  quota: number;
  constructor(quota = Infinity) {
    this.quota = quota;
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    if (value.length > this.quota) throw new DOMException('full', 'QuotaExceededError');
    this.data.set(key, value);
  }
}

describe('addRecent', () => {
  it('puts the newest first', () => {
    const list = addRecent([item('a.co', 1)], item('b.co', 2));
    expect(list.map((i) => i.input)).toEqual([{ url: 'b.co' }, { url: 'a.co' }]);
  });

  it('moves an exact duplicate to the top instead of adding it again', () => {
    let list = [item('c.co', 3), item('b.co', 2), item('a.co', 1)];
    list = addRecent(list, item('a.co', 4));
    expect(list).toHaveLength(3);
    expect(list.map((i) => [i.input, i.savedAt])).toEqual([
      [{ url: 'a.co' }, 4],
      [{ url: 'c.co' }, 3],
      [{ url: 'b.co' }, 2],
    ]);
  });

  it('keeps entries that differ only in style', () => {
    const red = item('a.co', 2, { style: { ...DEFAULT_STYLE, fg: '#9b2226' } });
    expect(addRecent([item('a.co', 1)], red)).toHaveLength(2);
  });

  it(`keeps at most ${RECENT_LIMIT}`, () => {
    let list: RecentItem[] = [];
    for (let i = 0; i < 20; i++) list = addRecent(list, item(`site${i}.com`, i));
    expect(list).toHaveLength(RECENT_LIMIT);
    expect(list[0]?.input).toEqual({ url: 'site19.com' });
    expect(list.at(-1)?.input).toEqual({ url: 'site8.com' });
  });
});

describe('readRecent', () => {
  it('reads back what was written', () => {
    const storage = new MemoryStorage();
    const list = [item('b.co', 2), item('a.co', 1)];
    expect(writeRecent(storage, list)).toEqual(list);
    expect(readRecent(storage)).toEqual(list);
  });

  it('returns an empty list when there is nothing stored', () => {
    expect(readRecent(new MemoryStorage())).toEqual([]);
  });

  it('survives corrupt JSON', () => {
    const storage = new MemoryStorage();
    storage.setItem(RECENT_KEY, '{not json');
    expect(readRecent(storage)).toEqual([]);
  });

  it('survives a stored value that is not a list', () => {
    const storage = new MemoryStorage();
    storage.setItem(RECENT_KEY, JSON.stringify({ hello: 'world' }));
    expect(readRecent(storage)).toEqual([]);
  });

  it('drops malformed items and keeps the good ones', () => {
    const storage = new MemoryStorage();
    const good = item('a.co', 1);
    storage.setItem(
      RECENT_KEY,
      JSON.stringify([
        null,
        42,
        { ...good, type: 'fax' },
        { ...good, input: { url: 5 } },
        { ...good, style: { ...DEFAULT_STYLE, size: 'big' } },
        { ...good, style: { ...DEFAULT_STYLE, logo: null } },
        { ...good, thumbnail: 'javascript:alert(1)' },
        good,
      ]),
    );
    expect(readRecent(storage)).toEqual([good]);
  });

  it('works when storage is unavailable or throws', () => {
    expect(readRecent(null)).toEqual([]);
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    expect(readRecent(throwing)).toEqual([]);
    expect(writeRecent(throwing, [item('a.co')])).toBeNull();
  });
});

describe('writeRecent', () => {
  it('drops the oldest codes until the list fits a full storage', () => {
    const list = [item('c.co', 3), item('b.co', 2), item('a.co', 1)];
    const twoFit = JSON.stringify(list.slice(0, 2)).length;
    const storage = new MemoryStorage(twoFit);
    expect(writeRecent(storage, list)).toEqual(list.slice(0, 2));
    expect(readRecent(storage)).toEqual(list.slice(0, 2));
  });

  it('returns null when nothing at all can be stored', () => {
    expect(writeRecent(new MemoryStorage(0), [item('a.co')])).toBeNull();
  });

  it('returns null without storage', () => {
    expect(writeRecent(null, [item('a.co')])).toBeNull();
  });
});

describe('describeEntry', () => {
  it('summarises each type in a few words', () => {
    expect(describeEntry(item('example.com'))).toBe('example.com');
    expect(
      describeEntry({ type: 'text', input: { text: '  two\n lines ' }, style: DEFAULT_STYLE }),
    ).toBe('two lines');
    expect(
      describeEntry({
        type: 'wifi',
        input: { ssid: 'Home', security: 'WPA', password: 'x', hidden: false },
        style: DEFAULT_STYLE,
      }),
    ).toBe('Home');
  });
});
