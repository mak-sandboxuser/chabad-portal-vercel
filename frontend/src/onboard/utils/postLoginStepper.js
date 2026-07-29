import { readDraft, clearDraft } from './onboardingCookies';
import { FIRST_FORM_STEP } from '../data/onboardingSteps';
import {
  DEFAULT_HOUSEHOLD_PREFERENCES,
  getFirstPreferencePath,
  getHouseholdPreferences,
} from './householdPreferences';

const PENDING_POST_LOGIN_STEPPER_KEY = 'pending_post_login_membership_stepper';
const COMPLETED_POST_LOGIN_STEPPER_KEY = 'completed_post_login_membership_stepper';

export function markPostLoginStepperPending() {
  try {
    localStorage.setItem(PENDING_POST_LOGIN_STEPPER_KEY, '1');
    localStorage.removeItem(COMPLETED_POST_LOGIN_STEPPER_KEY);
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
