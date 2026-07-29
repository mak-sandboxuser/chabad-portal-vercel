import { FIRST_FORM_STEP, PROCESSING_STEP_ID } from '../data/onboardingSteps';

export const ONBOARD_PATH = '/onboard';
export const ONBOARD_FIRST_FORM_PATH = FIRST_FORM_STEP.path;
export const ONBOARD_EXIT_PATH = '/';
/** After the post-login stepper finishes, return to the Member Portal dashboard. */
export const ONBOARD_CONFIRMATION_PATH = '/';

/**
 * Highest step id with a real page + App.jsx route. Processing is included so
 * resume can land on the final screen; Review redirects in App.jsx.
 */
export const LATEST_IMPLEMENTED_STEP_ID = PROCESSING_STEP_ID;

/**
 * Navigates to an onboarding step. There is no client-side router installed
 * in this project (routes are resolved by reading window.location.pathname
 * in App.jsx), so moving between onboarding pages is a real navigation.
 */
export function goToOnboardingPath(path) {
  window.location.assign(path);
}
