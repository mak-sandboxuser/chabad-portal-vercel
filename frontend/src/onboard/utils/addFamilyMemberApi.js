import { fetchPortalApi } from '../../utils/portalApi';

/**
 * Same endpoint as Household → Add Family Members → "Save & Create Contact":
 * POST /api/household/add-family-member (Make.com MAKE_ADD_FAMILY_MEMBER_WEBHOOK_URL).
 */

export function getOnboardingSfSession() {
  try {
    const stored = localStorage.getItem('sf_user_session');
    if (!stored) return null;
    const sfUser = JSON.parse(stored);
    const member = sfUser.memberDetails || {};
    return {
      email: String(sfUser.email || '').trim().toLowerCase(),
      householdAccountId: member.accountId || member.householdAccountId || '',
      accountName: member.accountName || member.name || '',
    };
  } catch {
    return null;
  }
}

/** Stable fingerprint so Save & Continue can skip the webhook when fields are unchanged. */
export function fingerprintFamilyMember(person = {}) {
  const phoneRaw = person.phone?.number ?? person.mobilePhone ?? '';
  return JSON.stringify({
    salutation: String(person.salutation || '').trim(),
    gender: String(person.gender || '').trim(),
    firstName: String(person.firstName || '').trim().toLowerCase(),
    lastName: String(person.lastName || '').trim().toLowerCase(),
    email: String(person.email || person.contactEmail || '').trim().toLowerCase(),
    phone: String(phoneRaw).replace(/\D/g, ''),
    contactId: person.contactId || '',
    isLinked: Boolean(person.isLinked),
  });
}

/**
 * Create a household contact via the same webhook as Add Family Members.
 * @param {'secondary'|'child'} memberType
 */
export async function createFamilyMemberViaWebhook({
  memberType,
  salutation = '',
  firstName,
  lastName,
  gender = '',
  contactEmail = '',
  mobilePhone = '',
}) {
  const session = getOnboardingSfSession();
  if (!session?.email) {
    throw new Error('Session expired. Please log in again.');
  }

  const householdAccountId = session.householdAccountId || '';

  return fetchPortalApi('/api/household/add-family-member', {
    method: 'POST',
    body: {
      email: session.email,
      mode: 'create',
      householdAccountId,
      accountId: householdAccountId,
      accountName: session.accountName,
      salutation: String(salutation || '').trim(),
      firstName: String(firstName || '').trim(),
      lastName: String(lastName || '').trim(),
      gender: String(gender || '').trim(),
      contactEmail: String(contactEmail || '').trim(),
      mobilePhone: String(mobilePhone || '').trim(),
      memberType,
      groups: '',
    },
  });
}

/**
 * Search existing ChabadOne contacts via Make.com.
 */
export async function searchContactsViaWebhook(query) {
  const session = getOnboardingSfSession();
  if (!session?.email) {
    throw new Error('Session expired. Please log in again.');
  }

  return fetchPortalApi('/api/household/search-contacts', {
    method: 'POST',
    body: {
      email: session.email,
      query: String(query || '').trim(),
      limit: 50,
    },
  });
}

/**
 * Link an existing contact to the household.
 */
export async function linkFamilyMemberViaWebhook({
  memberType,
  contactIds = [],
  contactMeta = [],
}) {
  const session = getOnboardingSfSession();
  if (!session?.email) {
    throw new Error('Session expired. Please log in again.');
  }

  const householdAccountId = session.householdAccountId || '';

  return fetchPortalApi('/api/household/add-family-member', {
    method: 'POST',
    body: {
      email: session.email,
      mode: 'link',
      contactIds,
      contactMeta,
      memberType,
      householdAccountId,
      accountId: householdAccountId,
    },
  });
}

