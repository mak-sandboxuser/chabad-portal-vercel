const listeners = new Set();
let toastId = 0;
/** Active toasts by `${type}::${message}` so identical ones don't stack. */
const activeKeys = new Map();

export function showToast({ message, type = 'success', duration = 4000 }) {
  const key = `${type}::${message}`;
  const existingId = activeKeys.get(key);
  if (existingId != null) {
    return existingId;
  }

  const id = ++toastId;
  const toast = { id, message, type, duration, key };
  activeKeys.set(key, id);
  listeners.forEach((listener) => listener(toast));

  window.setTimeout(() => {
    if (activeKeys.get(key) === id) {
      activeKeys.delete(key);
    }
  }, duration || 4000);

  return id;
}

export function dismissToastKey(key) {
  activeKeys.delete(key);
}

export function subscribeToasts(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
