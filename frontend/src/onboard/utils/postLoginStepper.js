import { readDraft } from './onboardingCookies';
import {
  FIRST_FORM_STEP,
  getStepById,
  PROCESSING_STEP_ID,
  REVIEW_STEP_ID,
  SPOUSE_INFORMATION_STEP_ID,
} from '../data/onboardingSteps';

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

/** Resume path for the post-login zip stepper (skips Welcome + Primary). */
export function getPostLoginStepperEntryPath() {
  const draft = readDraft();
  if (!draft?.currentStep) return FIRST_FORM_STEP.path;

  let stepId = Number(draft.currentStep) || SPOUSE_INFORMATION_STEP_ID;
  if (stepId < SPOUSE_INFORMATION_STEP_ID) stepId = SPOUSE_INFORMATION_STEP_ID;
  if (stepId > PROCESSING_STEP_ID) stepId = PROCESSING_STEP_ID;
  if (stepId === REVIEW_STEP_ID) stepId = PROCESSING_STEP_ID;

  return getStepById(stepId)?.path || FIRST_FORM_STEP.path;
}
