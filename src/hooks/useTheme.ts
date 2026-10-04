import { useEffect, useState } from 'react';

export type ThemeChoice = 'auto' | 'light' | 'dark';

// Must match the inline script in index.html, which applies the theme before
// React loads so the page never flashes the wrong colours.
const THEME_KEY = 'quietzone:theme';
const PAPER = { light: '#f4f1ea', dark: '#1f1e1b' };

function readChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'auto';
  } catch {
    return 'auto';
  }
}

function storeChoice(choice: ThemeChoice) {
  try {
    if (choice === 'auto') localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Storage blocked: the choice still applies for this visit.
  }
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(readChoice);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    function apply() {
      const theme = choice === 'auto' ? (query.matches ? 'dark' : 'light') : choice;
      document.documentElement.dataset.theme = theme;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', PAPER[theme]);
    }
    apply();
    if (choice !== 'auto') return;
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
  }, [choice]);

  function choose(next: ThemeChoice) {
    storeChoice(next);
    setChoice(next);
  }

  return { choice, choose };
}
