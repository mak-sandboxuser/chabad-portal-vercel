import { readDraft, clearDraft, writeDraft, createEmptyDraft, bindDraftToUser } from './onboardingCookies';
import { FIRST_FORM_STEP, CONTRIBUTION_SCHEDULE_STEP_ID, MEMBERSHIP_STEP_ID, getStepById } from '../data/onboardingSteps';
import {
  DEFAULT_HOUSEHOLD_PREFERENCES,
  HOUSEHOLD_PREFERENCES_VERSION,
  getFirstPreferencePath,
  getHouseholdPreferences,
} from './householdPreferences';
import {
  resolveMembershipTierFromSfData,
  needsSalesforceMembershipScheduleSetup,
  getMembership,
  getFinancialSummary,
  parseMoney,
  getContacts,
  hasRealMembershipGroup,
  hasAssignedSalesforceGroup,
} from '../../utils/portalData';

const PENDING_POST_LOGIN_STEPPER_KEY = 'pending_post_login_membership_stepper';
const CHOOSE_MEMBERSHIP_EXISTING_HH_KEY = 'choose_membership_existing_household';
const COMPLETED_POST_LOGIN_STEPPER_KEY = 'completed_post_login_membership_stepper';
const DISMISSED_POST_LOGIN_STEPPER_KEY = 'dismissed_post_login_membership_stepper';
const SF_MEMBERSHIP_SCHEDULE_ONLY_KEY = 'sf_membership_schedule_only';

export function isSalesforceMembershipScheduleOnly() {
  try {
    if (localStorage.getItem(SF_MEMBERSHIP_SCHEDULE_ONLY_KEY) === '1') return true;
    return new URLSearchParams(window.location.search).get('mode') === 'sf-membership-pay';
  } catch {
    return false;
  }
}

export function clearSalesforceMembershipScheduleOnly() {
  try {
    localStorage.removeItem(SF_MEMBERSHIP_SCHEDULE_ONLY_KEY);
  } catch {
    // ignore
  }
}

/**
 * Salesforce already assigned membership — skip tier selection and open
 * Contribution Schedule (monthly / half-yearly / full), then existing checkout.
 */
export function startSalesforceMembershipSchedulePayment(sfData = {}) {
  const tier = resolveMembershipTierFromSfData(sfData);
  const commitment = Number(tier?.annualPrice)
    || parseMoney(getMembership(sfData).annualCommitment)
    || parseMoney(getFinancialSummary(sfData).outstanding)
    || 0;
  if (!(commitment > 0)) {
    throw new Error('No Salesforce membership commitment found to pay.');
  }

  let ownerEmail = '';
  let contactId = sfData.contactId || '';
  let accountId = sfData.accountId || sfData.account?.id || '';
  try {
    const stored = localStorage.getItem('sf_user_session');
    if (stored) {
      const session = JSON.parse(stored);
      ownerEmail = session?.email || '';
      contactId = contactId || session?.contactId || '';
      accountId = accountId || session?.householdAccountId || session?.accountId || '';
    }
  } catch {
    // ignore
  }

  markPostLoginStepperPending();

  const draft = readDraft() || createEmptyDraft(ownerEmail);
  const nameParts = String(sfData.name || '').trim().split(/\s+/).filter(Boolean);
  const sfGroupName = getMembership(sfData).tier || 'Membership';
  const resolvedTier = tier || {
    id: 'sf-assigned',
    name: sfGroupName,
    sfGroup: sfGroupName,
  };

  writeDraft({
    ...draft,
    email: ownerEmail || draft.email || '',
    currentStep: CONTRIBUTION_SCHEDULE_STEP_ID,
    data: {
      ...draft.data,
      membership: {
        ...(draft.data.membership || {}),
        // Keep catalog id when matched; ContributionSchedule also reads annualPrice
        // so non-catalog SF groups (Building Donors HH) still open monthly/half-yearly.
        tier: resolvedTier.id || 'sf-assigned',
        annualPrice: commitment,
        name: sfGroupName || resolvedTier.name,
        sfGroup: sfGroupName || resolvedTier.sfGroup || resolvedTier.name,
        source: 'salesforce_assigned',
      },
      primaryMember: {
        ...(draft.data.primaryMember || {}),
        contactId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: ownerEmail,
      },
      household: {
        ...(draft.data.household || {}),
        accountId,
      },
      contributionSchedule: {},
    },
  });

  try {
    localStorage.setItem(SF_MEMBERSHIP_SCHEDULE_ONLY_KEY, '1');
  } catch {
    // ignore
  }

  const path = getStepById(CONTRIBUTION_SCHEDULE_STEP_ID)?.path || '/onboard/contribution-schedule';
  window.location.assign(`${path}?mode=sf-membership-pay`);
}

export { needsSalesforceMembershipScheduleSetup };

export function isChooseMembershipExistingHousehold() {
  try {
    return sessionStorage.getItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * First login + Choose Membership + Become Member:
 * 1 household member → full stepper (spouse/children, then membership/payment)
 * more than 1 member → Membership form only, then schedule/payment.
 * Assigned Salesforce membership → do not open the stepper.
 */
export function startChooseMembershipStepper(sfData = {}, options = {}) {
  const replace = Boolean(options.replace);
  const go = (path) => (replace ? window.location.replace(path) : window.location.assign(path));

  const assignedGroup = String(
    getMembership(sfData).tier
    || sfData?.groups
    || sfData?.account?.groups
    || sfData?.profile?.groups
    || '',
  ).trim();
  if (hasRealMembershipGroup(assignedGroup) || hasAssignedSalesforceGroup(assignedGroup)) {
    return;
  }

  const memberCount = getContacts(sfData).length;
  markPostLoginStepperPending();

  try {
    sessionStorage.removeItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY);
  } catch {
    // ignore
  }

  if (memberCount > 1) {
    try {
      sessionStorage.setItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY, '1');
    } catch {
      // ignore
    }
    const draft = readDraft() || createEmptyDraft();
    writeDraft({
      ...draft,
      currentStep: MEMBERSHIP_STEP_ID,
      data: {
        ...draft.data,
        householdPreferences: {
          hasSpouse: false,
          hasChildren: false,
          addYahrzeit: false,
          version: HOUSEHOLD_PREFERENCES_VERSION,
        },
      },
    });
    const path = getStepById(MEMBERSHIP_STEP_ID)?.path || '/onboard/membership';
    go(path);
    return;
  }

  // Previous (commented out): always assign() — first-login Portal uses replace()
  // window.location.assign(getPostLoginStepperEntryPath());
  go(getPostLoginStepperEntryPath());
}

export function markPostLoginStepperPending() {
  try {
    localStorage.setItem(PENDING_POST_LOGIN_STEPPER_KEY, '1');
    localStorage.removeItem(COMPLETED_POST_LOGIN_STEPPER_KEY);
    localStorage.removeItem(DISMISSED_POST_LOGIN_STEPPER_KEY);

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

/** Mark membership onboarding as finished (after payment / processing). */
export function clearPostLoginStepperPending() {
  try {
    localStorage.removeItem(PENDING_POST_LOGIN_STEPPER_KEY);
    localStorage.removeItem(DISMISSED_POST_LOGIN_STEPPER_KEY);
    localStorage.setItem(COMPLETED_POST_LOGIN_STEPPER_KEY, '1');
  } catch {
    // ignore storage failures
  }
}

/**
 * Clear stepper routing flags without marking onboarding complete.
 * Use on established-member login so a leftover "completed" flag cannot
 * block a later new guest on the same browser.
 */
export function releasePostLoginStepperPending() {
  try {
    localStorage.removeItem(PENDING_POST_LOGIN_STEPPER_KEY);
    localStorage.removeItem(DISMISSED_POST_LOGIN_STEPPER_KEY);
    localStorage.removeItem(COMPLETED_POST_LOGIN_STEPPER_KEY);
  } catch {
    // ignore storage failures
  }
}

/** Leave the stepper without marking membership onboarding complete (e.g. Back to Portal). */
export function dismissPostLoginStepperPending() {
  try {
    localStorage.removeItem(PENDING_POST_LOGIN_STEPPER_KEY);
    localStorage.setItem(DISMISSED_POST_LOGIN_STEPPER_KEY, '1');
    sessionStorage.removeItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY);
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

export function hasCompletedPostLoginStepper() {
  try {
    return localStorage.getItem(COMPLETED_POST_LOGIN_STEPPER_KEY) === '1';
  } catch {
    return false;
  }
}

export function hasDismissedPostLoginStepper() {
  try {
    return localStorage.getItem(DISMISSED_POST_LOGIN_STEPPER_KEY) === '1';
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
