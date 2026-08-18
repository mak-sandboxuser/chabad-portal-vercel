export const DASHBOARD_PREFETCH_KEY = 'portal_dashboard_prefetch';
export const SKIP_PORTAL_FULL_LOADER_KEY = 'portal_skip_full_loader';
const PREFETCH_MAX_AGE_MS = 90_000;

export function storeDashboardPrefetch(data) {
  if (!data || typeof data !== 'object') return;
  try {
    sessionStorage.setItem(
      DASHBOARD_PREFETCH_KEY,
      JSON.stringify({ ts: Date.now(), data }),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function markSkipPortalFullLoader() {
  try {
    sessionStorage.setItem(SKIP_PORTAL_FULL_LOADER_KEY, '1');
  } catch {
    // ignore
  }
}

export function consumeSkipPortalFullLoader() {
  try {
    const value = sessionStorage.getItem(SKIP_PORTAL_FULL_LOADER_KEY);
    sessionStorage.removeItem(SKIP_PORTAL_FULL_LOADER_KEY);
    return value === '1';
  } catch {
    return false;
  }
}

/** Read and clear a recent dashboard prefetch, if any. */
export function consumeDashboardPrefetch() {
  try {
    const raw = sessionStorage.getItem(DASHBOARD_PREFETCH_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(DASHBOARD_PREFETCH_KEY);
    const parsed = JSON.parse(raw);
    if (!parsed?.data || typeof parsed.data !== 'object') return null;
    if (Date.now() - Number(parsed.ts || 0) > PREFETCH_MAX_AGE_MS) return null;
    return parsed.data;
  } catch {
    try {
      sessionStorage.removeItem(DASHBOARD_PREFETCH_KEY);
    } catch {
      // ignore
    }
    return null;
  }
}
