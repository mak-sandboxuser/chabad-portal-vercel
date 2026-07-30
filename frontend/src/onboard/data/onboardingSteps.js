import { Heart, User, Users, Home, Baby, Flame, Star, DollarSign, CreditCard, ClipboardList, LoaderCircle } from 'lucide-react';

/**
 * Named step ids. Import these instead of hardcoding numbers — the step
 * list has already been renumbered multiple times as later screenshots
 * clarified the real flow (a step inserted anywhere shifts every id after
 * it), and code that hardcoded "2" or "3" broke silently each time.
 */
export const WELCOME_STEP_ID = 1;
export const ABOUT_YOU_STEP_ID = 2;
export const SPOUSE_INFORMATION_STEP_ID = 3;
export const HOUSEHOLD_STEP_ID = 4;
export const MARITAL_INFORMATION_STEP_ID = 5;
export const CHILDREN_STEP_ID = 6;
export const YAHRZEIT_STEP_ID = 7;
export const MEMBERSHIP_STEP_ID = 8;
export const CONTRIBUTION_SCHEDULE_STEP_ID = 9;
export const PAYMENT_METHOD_STEP_ID = 10;
export const REVIEW_STEP_ID = 11;
export const PROCESSING_STEP_ID = 12;

/**
 * Full catalog for path lookups. Welcome + Primary Member stay listed for
 * legacy draft compatibility, but are excluded from the visible post-login
 * stepper (those screens live in the separate /onboard + /onboard/about-you flow).
 */
export const onboardingSteps = [
  { id: WELCOME_STEP_ID, key: 'welcome', label: 'Welcome', path: '/onboard', icon: Heart },
  { id: ABOUT_YOU_STEP_ID, key: 'about-you', label: 'Primary Member', path: '/onboard/about-you', icon: User },
  { id: SPOUSE_INFORMATION_STEP_ID, key: 'spouse-information', label: 'Spouse Information', path: '/onboard/spouse-information', icon: Users },
  { id: HOUSEHOLD_STEP_ID, key: 'household', label: 'Household', path: '/onboard/household', icon: Home },
  { id: MARITAL_INFORMATION_STEP_ID, key: 'marital-information', label: 'Marital Information', path: '/onboard/marital-information', icon: Heart },
  { id: CHILDREN_STEP_ID, key: 'children', label: 'Children', path: '/onboard/children', icon: Baby },
  { id: YAHRZEIT_STEP_ID, key: 'yahrzeit', label: 'Yahrzeit Information', path: '/onboard/yahrzeit', icon: Flame },
  { id: MEMBERSHIP_STEP_ID, key: 'membership', label: 'Membership', path: '/onboard/membership', icon: Star },
  { id: CONTRIBUTION_SCHEDULE_STEP_ID, key: 'contribution-schedule', label: 'Contribution Schedule', path: '/onboard/contribution-schedule', icon: DollarSign },
  { id: PAYMENT_METHOD_STEP_ID, key: 'payment-method', label: 'Payment Method', path: '/onboard/payment-method', icon: CreditCard },
  { id: REVIEW_STEP_ID, key: 'review', label: 'Review Application', path: '/onboard/review', icon: ClipboardList },
  { id: PROCESSING_STEP_ID, key: 'processing', label: 'Processing', path: '/onboard/processing', icon: LoaderCircle },
];

/** Visible post-login stepper (Welcome, Primary, Household, Marital, Yahrzeit, Payment, Review, Processing removed). */
export const stepperSteps = onboardingSteps.filter(
  (step) =>
    step.id !== WELCOME_STEP_ID &&
    step.id !== ABOUT_YOU_STEP_ID &&
    step.id !== HOUSEHOLD_STEP_ID &&
    step.id !== MARITAL_INFORMATION_STEP_ID &&
    step.id !== YAHRZEIT_STEP_ID &&
    step.id !== CONTRIBUTION_SCHEDULE_STEP_ID &&
    step.id !== PAYMENT_METHOD_STEP_ID &&
    step.id !== REVIEW_STEP_ID &&
    step.id !== PROCESSING_STEP_ID,
);

export function getStepById(id) {
  return onboardingSteps.find((step) => step.id === id);
}

export function getStepByPath(path) {
  return onboardingSteps.find((step) => step.path === path);
}

/** First step of the post-login zip stepper (defaults to Spouse when preference is Yes). */
export const FIRST_FORM_STEP = getStepById(SPOUSE_INFORMATION_STEP_ID);
