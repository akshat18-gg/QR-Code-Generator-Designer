// Accepts "#abc", "abc", "#aabbcc" or "aabbcc" and returns "#aabbcc", or null.
export function normaliseHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match?.[1]) return null;
  const hex = match[1].toLowerCase();
  if (hex.length === 6) return `#${hex}`;
  return `#${[...hex].map((ch) => ch + ch).join('')}`;
}
