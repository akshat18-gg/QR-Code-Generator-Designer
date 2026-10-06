/// <reference types="node" />
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../lib/contrast';

// Reads the colour tokens straight from the stylesheet, so a palette tweak that
// breaks contrast fails here instead of in an axe run that may not cover it.
const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const body = css.slice(start, css.indexOf('\n}', start));
  return Object.fromEntries(
    [...body.matchAll(/--([\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]),
  );
}

const light = block(':root');
const themes = { light, dark: { ...light, ...block(":root[data-theme='dark']") } };

const TEXT = ['ink', 'ink-2', 'error', 'ok', 'warn'];
const UI = ['rule-strong', 'accent', 'focus', 'blue-ui', 'red-ui', 'yellow-ui', 'green-ui'];
const SURFACES = ['paper', 'sheet', 'hover'];

function ratio(tokens: Record<string, string>, a: string, b: string): number {
  const [first, second] = [tokens[a], tokens[b]];
  if (!first || !second) throw new Error(`Missing token --${first ? b : a}`);
  return contrastRatio(first, second);
}

for (const [name, tokens] of Object.entries(themes)) {
  describe(`${name} theme tokens`, () => {
    for (const surface of SURFACES) {
      it.each(TEXT)(`text %s is at least 4.5:1 on ${surface}`, (token) => {
        expect(ratio(tokens, token, surface)).toBeGreaterThanOrEqual(4.5);
      });
      it.each(UI)(`control colour %s is at least 3:1 on ${surface}`, (token) => {
        expect(ratio(tokens, token, surface)).toBeGreaterThanOrEqual(3);
      });
    }
  });
}
