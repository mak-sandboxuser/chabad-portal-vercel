import { useCallback, useEffect, useState } from 'react';
import { readThemeCookie, writeThemeCookie } from '../utils/onboardingCookies';

function getPreferredTheme() {
  const saved = readThemeCookie();
  if (saved) return saved;

  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  return 'light';
}

/**
 * Onboarding-scoped theme (independent from the portal's own `theme`
 * localStorage flag) so the public onboarding flow keeps working the same
 * way for signed-out applicants regardless of what a signed-in member last
 * chose on the dashboard.
 */
export default function useOnboardingTheme() {
  const [theme, setTheme] = useState(getPreferredTheme);

  useEffect(() => {
    writeThemeCookie(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return [theme, toggleTheme];
}
