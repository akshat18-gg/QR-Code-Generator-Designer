import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

// Must match the inline script in index.html, which applies the theme before
// React loads so the page never flashes the wrong colours.
export const THEME_KEY = 'qraft:theme';
const PAPER: Record<Theme, string> = { light: '#eef3f8', dark: '#0d1520' };
const FADE_MS = 200;

const systemQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : null;
  } catch {
    return null;
  }
}

function store(theme: Theme) {
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
}

// Fades colours for one theme switch only. A permanent transition on every
// element would also slow down hover states and fight other transitions.
// A second click restarts the timer, so the first one can't cut its fade short.
let fadeTimer = 0;

function fadeColours() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = document.documentElement;
  root.classList.add('theme-fade');
  window.clearTimeout(fadeTimer);
  fadeTimer = window.setTimeout(() => root.classList.remove('theme-fade'), FADE_MS + 50);
}

export function useTheme() {
  // null until the user picks one: follow the system setting.
  const [chosen, setChosen] = useState<Theme | null>(readStored);
  const [system, setSystem] = useState<Theme>(() => (systemQuery().matches ? 'dark' : 'light'));
  const theme = chosen ?? system;

  useEffect(() => {
    const query = systemQuery();
    const onChange = () => setSystem(query.matches ? 'dark' : 'light');
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[theme]);
  }, [theme]);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    fadeColours();
    store(next);
    setChosen(next);
  }

  return { theme, toggle };
}
