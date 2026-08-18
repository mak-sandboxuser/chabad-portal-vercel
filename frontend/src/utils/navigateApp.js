/** Soft in-app navigation (no full page reload). App listens for `app:navigate`. */
export function navigateApp(path) {
  const next = path || '/';
  if (window.location.pathname !== next) {
    window.history.pushState({}, '', next);
  } else {
    window.history.replaceState({}, '', next);
  }
  window.dispatchEvent(new Event('app:navigate'));
}
