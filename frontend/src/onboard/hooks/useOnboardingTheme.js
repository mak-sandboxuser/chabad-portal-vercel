import { useCallback, useEffect, useState } from 'react';
import { readThemeCookie, writeThemeCookie } from '../utils/onboardingCookies';

function getPreferredTheme() {
  if (typeof window !== 'undefined') {
    const localTheme = localStorage.getItem('theme');
    if (localTheme === 'dark' || localTheme === 'light') {
      return localTheme;
    }
  }

  const saved = readThemeCookie();
  if (saved) return saved;

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Onboarding-scoped theme. Inherits from login/portal theme if set,
 * and syncs data-theme and light-theme DOM attributes.
 */
export default function useOnboardingTheme() {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    writeThemeCookie(theme);
    try {
      localStorage.setItem('theme', theme);
      const root = document.documentElement;
      if (theme === 'light') {
        root.classList.add('light-theme');
        root.setAttribute('data-theme', 'light');
      } else {
        root.classList.remove('light-theme');
        root.setAttribute('data-theme', 'dark');
      }
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return [theme, toggleTheme];
}
