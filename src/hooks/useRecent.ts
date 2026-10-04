import type { Options } from 'qr-code-styling';
import { useEffect, useRef, useState } from 'react';
import { renderBlob } from '../lib/exportQr';
import { rasterise, rasteriseBlob } from '../lib/image';
import {
  addRecent,
  getStorage,
  newId,
  readRecent,
  RECENT_KEY,
  writeRecent,
  type RecentEntry,
  type RecentItem,
} from '../state/recent';

const THUMBNAIL_SIDE = 96;
// Big enough to look fine when a recent code is exported again at full size,
// small enough that twelve of them don't fill the storage quota.
const STORED_LOGO_SIDE = 256;

export function useRecent() {
  const [items, setItems] = useState<RecentItem[]>(() => readRecent(getStorage()));
  const [problem, setProblem] = useState<string | null>(null);
  const latest = useRef(items);

  useEffect(() => {
    latest.current = items;
  }, [items]);

  // Another tab saving a code updates this one too.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      if (event.key === RECENT_KEY) setItems(readRecent(getStorage()));
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function commit(next: RecentItem[]) {
    const saved = writeRecent(getStorage(), next);
    // Keep the list in memory even if it couldn't be stored, so this session
    // still works.
    setItems(saved && saved.length > 0 ? saved : next);
    if (saved === null || (saved.length === 0 && next.length > 0)) {
      setProblem("Couldn't save recent codes. Browser storage is full or turned off.");
    } else if (saved.length < next.length) {
      setProblem('Browser storage is nearly full, so the oldest codes were dropped.');
    } else {
      setProblem(null);
    }
  }

  async function save(entry: RecentEntry, options: Options) {
    let item: RecentItem;
    try {
      const [thumbnail, logoSrc] = await Promise.all([
        renderBlob(options, 'png').then((blob) => rasteriseBlob(blob, THUMBNAIL_SIDE)),
        entry.style.logo.src ? rasterise(entry.style.logo.src, STORED_LOGO_SIDE) : null,
      ]);
      item = {
        ...entry,
        style: { ...entry.style, logo: { ...entry.style.logo, src: logoSrc } },
        id: newId(),
        savedAt: Date.now(),
        thumbnail,
      } as RecentItem;
    } catch {
      setProblem("Couldn't add this code to the recent list.");
      return;
    }
    const storage = getStorage();
    commit(addRecent(storage ? readRecent(storage) : latest.current, item));
  }

  function remove(id: string) {
    commit(latest.current.filter((item) => item.id !== id));
  }

  function clear() {
    commit([]);
  }

  return { items, problem, save, remove, clear };
}
