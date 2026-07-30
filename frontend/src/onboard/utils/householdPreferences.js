import {
  getStepById,
  SPOUSE_INFORMATION_STEP_ID,
  CHILDREN_STEP_ID,
  MEMBERSHIP_STEP_ID,
  CONTRIBUTION_SCHEDULE_STEP_ID,
} from '../data/onboardingSteps';

/** Defaults: Spouse Yes, Children No, Yahrzeit No. */
export const DEFAULT_HOUSEHOLD_PREFERENCES = {
  hasSpouse: true,
  hasChildren: false,
  addYahrzeit: false,
};

/**
 * Bumped when the default preference set changes. Drafts without this version
 * (or with an older one) are reset to DEFAULT_HOUSEHOLD_PREFERENCES so a stale
 * Children=Yes from earlier testing cannot override the Children=No default.
 */
export const HOUSEHOLD_PREFERENCES_VERSION = 2;

export function getHouseholdPreferences(draft) {
  const saved = draft?.data?.householdPreferences || {};
  if (saved.version !== HOUSEHOLD_PREFERENCES_VERSION) {
    return { ...DEFAULT_HOUSEHOLD_PREFERENCES, version: HOUSEHOLD_PREFERENCES_VERSION };
  }
  return {
    ...DEFAULT_HOUSEHOLD_PREFERENCES,
    ...saved,
    version: HOUSEHOLD_PREFERENCES_VERSION,
  };
}

/**
 * Ordered form steps based on Yes/No preferences.
 * Yahrzeit is toggle-only (preference saved, no form step).
 * Membership + Contribution Schedule always remain.
 */
export function getPreferenceDrivenStepIds(prefs) {
  const ids = [];
  if (prefs.hasSpouse) ids.push(SPOUSE_INFORMATION_STEP_ID);
  if (prefs.hasChildren) ids.push(CHILDREN_STEP_ID);
  ids.push(MEMBERSHIP_STEP_ID);
  return ids;
}

export function getFirstPreferenceStepId(prefs = DEFAULT_HOUSEHOLD_PREFERENCES) {
  return getPreferenceDrivenStepIds(prefs)[0];
}

export function getFirstPreferencePath(prefs = DEFAULT_HOUSEHOLD_PREFERENCES) {
  return getStepById(getFirstPreferenceStepId(prefs)).path;
}

export function getNextPreferenceStepId(currentStepId, prefs) {
  const ids = getPreferenceDrivenStepIds(prefs);
  const index = ids.indexOf(currentStepId);
  if (index === -1) return getFirstPreferenceStepId(prefs);
  return ids[Math.min(index + 1, ids.length - 1)];
}

export function getPreviousPreferenceStepId(currentStepId, prefs) {
  const ids = getPreferenceDrivenStepIds(prefs);
  const index = ids.indexOf(currentStepId);
  if (index <= 0) return ids[0];
  return ids[index - 1];
}

/** True when this step is the first visible form in the preference-driven flow. */
export function isFirstPreferenceStep(stepId, prefs) {
  return getFirstPreferenceStepId(prefs) === stepId;
}

export function isStepAllowedByPreferences(stepId, prefs) {
  return getPreferenceDrivenStepIds(prefs).includes(stepId);
}

/** If the user is on a step that no longer applies, return the path they should move to. */
export function getRedirectPathIfStepDisallowed(currentStepId, prefs) {
  if (isStepAllowedByPreferences(currentStepId, prefs)) return null;
  const ids = getPreferenceDrivenStepIds(prefs);
  const later = ids.find((id) => id > currentStepId);
  return getStepById(later || ids[0]).path;
}
