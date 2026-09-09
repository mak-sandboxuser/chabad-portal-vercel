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
import {
  getProratedMembershipCommitment,
  getRemainingMembershipMonths,
  // isMembershipRenewalWindowOpen,
} from '../../utils/portalFiscalYear';

const PENDING_POST_LOGIN_STEPPER_KEY = 'pending_post_login_membership_stepper';
const CHOOSE_MEMBERSHIP_EXISTING_HH_KEY = 'choose_membership_existing_household';
const COMPLETED_POST_LOGIN_STEPPER_KEY = 'completed_post_login_membership_stepper';
const DISMISSED_POST_LOGIN_STEPPER_KEY = 'dismissed_post_login_membership_stepper';
const SF_MEMBERSHIP_SCHEDULE_ONLY_KEY = 'sf_membership_schedule_only';
const SELECTED_MEMBERSHIP_TIER_KEY = 'portal_selected_membership_tier';

/** Catalog id from Select & Pay (URL wins, then sessionStorage). */
export function saveSelectedMembershipTier(tierId) {
  try {
    const id = String(tierId || '').trim();
    if (id) sessionStorage.setItem(SELECTED_MEMBERSHIP_TIER_KEY, id);
  } catch {
    // ignore
  }
}

export function readSelectedMembershipTier() {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('tier');
    if (fromUrl) return fromUrl;
    return sessionStorage.getItem(SELECTED_MEMBERSHIP_TIER_KEY) || '';
  } catch {
    return '';
  }
}

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

  const remainingMonths = getRemainingMembershipMonths();
  const proratedCommitment = getProratedMembershipCommitment(commitment);
  // Previous (commented out): Pay Membership prorated only while the renewal flex was showing
  // const applyRenewalProration = isMembershipRenewalWindowOpen(sfData);
  // const remainingMonths = applyRenewalProration
  //   ? getRemainingMembershipMonths()
  //   : 12;
  // const proratedCommitment = applyRenewalProration
  //   ? getProratedMembershipCommitment(commitment)
  //   : commitment;

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
        // Pay Membership uses remaining-months proration only while the
        // Membership Renewal flex is showing (Sep–Dec, no payment this year).
        remainingMonths,
        proratedCommitment,
        // Previous (commented out): Pay Membership always used the full CRM amount
        // remainingMonths: 12,
        // proratedCommitment: commitment,
        // annualPrice: commitment,
        // Previous (commented out): Pay Membership always prorated, even without the renewal flex
        // remainingMonths: getRemainingMembershipMonths(),
        // proratedCommitment: getProratedMembershipCommitment(commitment),
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

export function isPortalRenewalMode() {
  try {
    if (sessionStorage.getItem('is_portal_renewal_mode') === 'true') return true;
    return new URLSearchParams(window.location.search).get('mode') === 'renew';
  } catch {
    return false;
  }
}

const UPDATE_MEMBERSHIP_MODE_KEY = 'is_portal_update_membership_mode';

export function isPortalUpdateMembershipMode() {
  try {
    if (sessionStorage.getItem(UPDATE_MEMBERSHIP_MODE_KEY) === 'true') return true;
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'update' || mode === 'update-membership';
  } catch {
    return false;
  }
}

export function clearPortalUpdateMembershipMode() {
  try {
    sessionStorage.removeItem(UPDATE_MEMBERSHIP_MODE_KEY);
  } catch {
    // ignore
  }
}

/** Membership-form-only flows: existing household choose-membership, and portal renewal. */
export function isMembershipFormOnlyFlow() {
  return isChooseMembershipExistingHousehold() || isPortalRenewalMode() || isPortalUpdateMembershipMode();
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

/**
 * Renew Membership: open Membership Selection only, then contribution schedule
 * and payment. Do not open the spouse/children stepper.
 */
export function startPortalMembershipRenewal(sfData = {}) {
  markPostLoginStepperPending();

  try {
    sessionStorage.setItem('is_portal_renewal_mode', 'true');
    sessionStorage.setItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY, '1');
  } catch {
    // ignore
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

  const draft = readDraft() || createEmptyDraft(ownerEmail);
  const nameParts = String(sfData.name || '').trim().split(/\s+/).filter(Boolean);
  writeDraft({
    ...draft,
    email: ownerEmail || draft.email || '',
    currentStep: MEMBERSHIP_STEP_ID,
    data: {
      ...draft.data,
      householdPreferences: {
        hasSpouse: false,
        hasChildren: false,
        addYahrzeit: false,
        version: HOUSEHOLD_PREFERENCES_VERSION,
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
    },
  });

  const path = getStepById(MEMBERSHIP_STEP_ID)?.path || '/onboard/membership';
  window.location.assign(`${path}?mode=renew`);
}

/**
 * Update Membership from the Membership page: open Membership Selection with
 * remaining-months proration (e.g. March → March–August), then schedule/payment.
 */
export function startUpdateMembershipFlow(sfData = {}) {
  markPostLoginStepperPending();
  clearSalesforceMembershipScheduleOnly();

  try {
    sessionStorage.setItem(UPDATE_MEMBERSHIP_MODE_KEY, 'true');
    sessionStorage.setItem(CHOOSE_MEMBERSHIP_EXISTING_HH_KEY, '1');
    sessionStorage.removeItem(SELECTED_MEMBERSHIP_TIER_KEY);
  } catch {
    // ignore
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

  const remainingMonths = getRemainingMembershipMonths();
  const catalogCommitment = Number(resolveMembershipTierFromSfData(sfData)?.annualPrice)
    || parseMoney(getMembership(sfData).annualCommitment)
    || 0;
  const proratedCommitment = getProratedMembershipCommitment(catalogCommitment);
  const draft = readDraft() || createEmptyDraft(ownerEmail);
  const nameParts = String(sfData.name || '').trim().split(/\s+/).filter(Boolean);
  writeDraft({
    ...draft,
    email: ownerEmail || draft.email || '',
    currentStep: MEMBERSHIP_STEP_ID,
    data: {
      ...draft.data,
      householdPreferences: {
        hasSpouse: false,
        hasChildren: false,
        addYahrzeit: false,
        version: HOUSEHOLD_PREFERENCES_VERSION,
      },
      membership: {
        ...(draft.data.membership || {}),
        source: 'update_membership',
        remainingMonths,
        proratedCommitment,
        // Drop leftover Pay Membership / fallback $1800 so Select & Pay sets the tier.
        tier: '',
        name: '',
        annualPrice: 0,
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

  const path = getStepById(MEMBERSHIP_STEP_ID)?.path || '/onboard/membership';
  window.location.assign(`${path}?mode=update&asOf=2026-03-05`);
}

/** Keep logged-in members on onboarding URLs without wiping the draft. */
export function ensurePostLoginStepperPending() {
  try {
    localStorage.setItem(PENDING_POST_LOGIN_STEPPER_KEY, '1');
    localStorage.removeItem(COMPLETED_POST_LOGIN_STEPPER_KEY);
    localStorage.removeItem(DISMISSED_POST_LOGIN_STEPPER_KEY);
  } catch {
    // ignore storage failures
  }
}

export function markPostLoginStepperPending() {
  try {
    ensurePostLoginStepperPending();

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
    sessionStorage.removeItem('is_portal_renewal_mode');
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
