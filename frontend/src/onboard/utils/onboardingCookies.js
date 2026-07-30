const DRAFT_COOKIE_NAME = 'chabad_membership_onboarding_draft';
const THEME_COOKIE_NAME = 'chabad_onboarding_theme';
const STEP_COOKIE_NAME = 'chabad_onboarding_current_step';
const DRAFT_LOCAL_STORAGE_KEY = 'chabad_membership_onboarding_draft_full';

const DRAFT_VERSION = 1;
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // ~30 days
// Cookies are capped around 4KB per cookie; stay well under that so browsers
// never silently truncate the value.
const COOKIE_SAFE_BYTE_LIMIT = 3500;

function isProduction() {
  return typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.PROD;
}

function cookieAttributes(maxAgeSeconds) {
  const parts = [`path=/`, `SameSite=Lax`, `max-age=${maxAgeSeconds}`];
  if (isProduction()) parts.push('Secure');
  return parts.join('; ');
}

export function readCookie(name) {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));
  if (!match) return null;
  try {
    return decodeURIComponent(match.slice(name.length + 1));
  } catch {
    return null;
  }
}

export function writeCookie(name, value, maxAgeSeconds = COOKIE_MAX_AGE_SECONDS) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; ${cookieAttributes(maxAgeSeconds)}`;
}

export function deleteCookie(name) {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; SameSite=Lax; max-age=0`;
}

export function createEmptyDraft(ownerEmail = '') {
  return {
    version: DRAFT_VERSION,
    currentStep: 3,
    lastUpdated: new Date().toISOString(),
    // Ties the draft to the logged-in applicant so a new login never inherits
    // the previous user's spouse/children/stepper state.
    ownerEmail: String(ownerEmail || '').trim().toLowerCase(),
    data: {
      primaryMember: {},
      householdPreferences: {
        version: 2,
        hasSpouse: true,
        hasChildren: false,
        addYahrzeit: false,
      },
      spouse: {},
      spouseSyncFingerprint: '',
      household: {},
      marital: {},
      children: [],
      childrenAdditionalInfo: {},
      yahrzeitRecords: [],
      membership: {},
      contributionSchedule: {},
      payment: {},
    },
  };
}

/**
 * If a draft exists for a different user (or no owner), wipe it and start fresh
 * for `email`. Same-user drafts are kept so refresh mid-flow still works.
 */
export function bindDraftToUser(email) {
  const nextEmail = String(email || '').trim().toLowerCase();
  if (!nextEmail) {
    clearDraft();
    return createEmptyDraft();
  }

  const existing = readDraft();
  const owner = String(existing?.ownerEmail || '').trim().toLowerCase();
  if (existing && owner === nextEmail) {
    return existing;
  }

  clearDraft();
  return writeDraft(createEmptyDraft(nextEmail));
}

function isValidDraftShape(candidate) {
  return Boolean(
    candidate &&
    typeof candidate === 'object' &&
    typeof candidate.version === 'number' &&
    candidate.data &&
    typeof candidate.data === 'object'
  );
}

/**
 * Reads the saved draft, preferring the localStorage copy (used when the
 * draft outgrew the cookie size budget) and falling back to the cookie.
 * Corrupted or unrecognized data is treated as "no draft" rather than
 * thrown, so a bad cookie can never break the onboarding flow.
 */
export function readDraft() {
  if (typeof window === 'undefined') return null;

  try {
    const stored = window.localStorage.getItem(DRAFT_LOCAL_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidDraftShape(parsed)) return parsed;
    }
  } catch {
    // fall through to cookie
  }

  try {
    const cookieValue = readCookie(DRAFT_COOKIE_NAME);
    if (!cookieValue) return null;
    const parsed = JSON.parse(cookieValue);
    if (isValidDraftShape(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

/**
 * Persists the draft. Small drafts are written directly to the cookie; once
 * the serialized draft crosses the safe cookie size, the full draft moves to
 * localStorage and only a compact summary stays in the cookie.
 */
export function writeDraft(draft) {
  const payload = { ...draft, version: DRAFT_VERSION, lastUpdated: new Date().toISOString() };
  const serialized = JSON.stringify(payload);

  if (serialized.length <= COOKIE_SAFE_BYTE_LIMIT) {
    writeCookie(DRAFT_COOKIE_NAME, serialized);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(DRAFT_LOCAL_STORAGE_KEY);
    }
    return payload;
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(DRAFT_LOCAL_STORAGE_KEY, serialized);
  }
  const summary = {
    version: payload.version,
    currentStep: payload.currentStep,
    lastUpdated: payload.lastUpdated,
    overflow: true,
  };
  writeCookie(DRAFT_COOKIE_NAME, JSON.stringify(summary));
  return payload;
}

export function clearDraft() {
  deleteCookie(DRAFT_COOKIE_NAME);
  deleteCookie(STEP_COOKIE_NAME);
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(DRAFT_LOCAL_STORAGE_KEY);
  }
}

export function readCurrentStepCookie() {
  const value = readCookie(STEP_COOKIE_NAME);
  const parsed = value ? Number.parseInt(value, 10) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function writeCurrentStepCookie(stepId) {
  writeCookie(STEP_COOKIE_NAME, String(stepId));
}

export function readThemeCookie() {
  const value = readCookie(THEME_COOKIE_NAME);
  return value === 'light' || value === 'dark' ? value : null;
}

export function writeThemeCookie(theme) {
  writeCookie(THEME_COOKIE_NAME, theme);
}
