import { readDraft, clearDraft, writeDraft, createEmptyDraft, bindDraftToUser } from './onboardingCookies';
import { FIRST_FORM_STEP } from '../data/onboardingSteps';
import {
  DEFAULT_HOUSEHOLD_PREFERENCES,
  HOUSEHOLD_PREFERENCES_VERSION,
  getFirstPreferencePath,
  getHouseholdPreferences,
} from './householdPreferences';

const PENDING_POST_LOGIN_STEPPER_KEY = 'pending_post_login_membership_stepper';
const COMPLETED_POST_LOGIN_STEPPER_KEY = 'completed_post_login_membership_stepper';

export function markPostLoginStepperPending() {
  try {
    localStorage.setItem(PENDING_POST_LOGIN_STEPPER_KEY, '1');
    localStorage.removeItem(COMPLETED_POST_LOGIN_STEPPER_KEY);

    // Fresh membership onboarding — never carry over a previous applicant's
    // spouse/children form data into the new run.
    let ownerEmail = '';
    try {
      const stored = localStorage.getItem('sf_user_session');
      if (stored) ownerEmail = JSON.parse(stored)?.email || '';
    } catch {
      // ignore
    }
    clearDraft();
    writeDraft(createEmptyDraft(ownerEmail));
  } catch {
    // ignore storage failures
  }
}

export function clearPostLoginStepperPending() {
  try {
    localStorage.removeItem(PENDING_POST_LOGIN_STEPPER_KEY);
    localStorage.setItem(COMPLETED_POST_LOGIN_STEPPER_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

export function isPostLoginStepperPending() {
  try {
    return localStorage.getItem(PENDING_POST_LOGIN_STEPPER_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * New-member post-login entry based on Help Us Know You Better defaults:
 * Spouse Yes → Spouse Information; Spouse+Children No → Membership; etc.
 */
export function getPostLoginStepperEntryPath() {
  const draft = readDraft();
  const prefs = draft ? getHouseholdPreferences(draft) : DEFAULT_HOUSEHOLD_PREFERENCES;
  return getFirstPreferencePath(prefs) || FIRST_FORM_STEP.path;
}

/**
 * Call after a successful login. Clears any draft belonging to a different
 * email so the stepper never shows the previous user's spouse/children.
 */
export function prepareOnboardingDraftForLogin(email) {
  return bindDraftToUser(email);
}

/**
 * Sign out from the first onboarding form and return to the login screen.
 * The draft is cleared too, so the next login starts from the Help Us Know You
 * Better defaults (Spouse Yes, Children No, Yahrzeit No) instead of inheriting
 * the previous applicant's toggles.
 */
export function signOutFromOnboarding() {
  try {
    localStorage.removeItem('sf_user_session');
    localStorage.removeItem(PENDING_POST_LOGIN_STEPPER_KEY);
  } catch {
    // ignore storage failures
  }
  clearDraft();
  window.location.replace('/');
}
