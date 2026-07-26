import { FIRST_FORM_STEP, PAYMENT_METHOD_STEP_ID } from '../data/onboardingSteps';

export const ONBOARD_PATH = '/onboard';
export const ONBOARD_FIRST_FORM_PATH = FIRST_FORM_STEP.path;
export const ONBOARD_EXIT_PATH = '/';
// Review and Confirmation aren't implemented yet — Review isn't shown to the
// user as a numbered stepper destination from here, but Processing always
// redirects to Confirmation once it finishes, so that path is named centrally
// now rather than repeating a magic string when Confirmation is built.
export const ONBOARD_CONFIRMATION_PATH = '/onboard/confirmation';

/**
 * Highest step id that actually has a built page AND a real route wired up
 * in App.jsx behind it. Pages are implemented one at a time, so a draft can
 * easily hold a currentStep pointing at a step that doesn't exist yet (e.g.
 * finishing "About You" advances currentStep to "Household" before
 * Household is built) — bump this each time a new onboarding page ships so
 * "resume" always lands somewhere real instead of a dead route.
 *
 * This intentionally stops at Payment Method, not Processing: Review
 * (step 11) has neither a page nor an App.jsx route yet, even though
 * Processing (step 12) does — so clamping any higher would let a resuming
 * applicant land on the Review gap. See the '/onboard/review' redirect in
 * App.jsx for the matching defensive guard.
 */
export const LATEST_IMPLEMENTED_STEP_ID = PAYMENT_METHOD_STEP_ID;

/**
 * Navigates to an onboarding step. There is no client-side router installed
 * in this project (routes are resolved by reading window.location.pathname
 * in App.jsx), so moving between onboarding pages is a real navigation.
 */
export function goToOnboardingPath(path) {
  window.location.assign(path);
}
