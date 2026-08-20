import { fetchPortalApi } from '../../utils/portalApi';
import { apiUrl } from '../../config/api';
import { showToast } from '../../utils/toast';

const MEMBERSHIP_TIERS = [
  { id: 'family', name: 'Family Membership' },
  { id: 'upgraded', name: 'Upgraded Membership' },
  { id: 'single-parent', name: 'Single Parent Family' },
  { id: 'single', name: 'Single Membership' },
  { id: 'senior', name: 'Senior Citizen Membership' },
  { id: 'chai-donor', name: 'Chai Donor' },
  { id: 'chai-partner', name: 'Chai Partner' },
  { id: 'chai-rabbis-circle', name: "Chai Rabbi's Circle" },
  { id: 'chai-leadership-circle', name: 'Chai Leadership Circle' },
];

function formatStreet(household = {}) {
  return [household.addressLine1, household.addressLine2]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join('\n');
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

function pad2(n) {
  return String(n).padStart(2, '0');
}

/** Salesforce Date fields need ISO: YYYY-MM-DD */
function toSalesforceDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!y || !m || !d) return '';
  if (m < 1 || m > 12 || d < 1 || d > 31) return '';
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function monthNameToNumber(month) {
  if (month == null || month === '') return 0;
  if (/^\d+$/.test(String(month).trim())) return Number(month);
  const idx = MONTH_NAMES.indexOf(String(month).trim().toLowerCase());
  return idx >= 0 ? idx + 1 : 0;
}

function formatBirthdate(primary = {}) {
  const month = primary.birthMonth || primary.birthDate?.month || '';
  const day = primary.birthDay || primary.birthDate?.day || '';
  const year = primary.birthYear || primary.birthDate?.year || '';
  if (!month || !day || !year) return '';
  return toSalesforceDate(year, monthNameToNumber(month), day);
}

/** Accepts YYYY-MM-DD, MM/DD/YYYY, or "April 9, 2003" → YYYY-MM-DD */
function normalizeSalesforceDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) return toSalesforceDate(slash[3], slash[1], slash[2]);

  const named = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (named) {
    return toSalesforceDate(named[3], monthNameToNumber(named[1]), named[2]);
  }

  return '';
}

function formatAnniversaryDate(marital = {}) {
  if (marital.anniversaryMonth && marital.anniversaryDay && marital.anniversaryYear) {
    return toSalesforceDate(
      marital.anniversaryYear,
      monthNameToNumber(marital.anniversaryMonth),
      marital.anniversaryDay,
    );
  }
  return normalizeSalesforceDate(marital.anniversaryDate);
}

function phoneNumber(phone) {
  if (!phone) return '';
  if (typeof phone === 'string') return phone.trim();
  return String(phone.number || '').trim();
}

/**
 * Same registration action as the former About You "Confirm & Submit":
 * check-member → add-family-member webhook (flat fields only, no nested collections).
 */
export async function submitPreLoginOnboardingApplication({
  primaryMember = {},
  household = {},
  marital = {},
} = {}) {
  const email = String(primaryMember.email || '').trim().toLowerCase();
  if (!email) {
    throw new Error('Email is required.');
  }

  const checkRes = await fetch(apiUrl('/api/auth/check-member'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (checkRes.ok) {
    const checkData = await checkRes.json();
    if (checkData.allowed) {
      const message = 'This email is already registered. Please log in.';
      showToast({ message, type: 'error' });
      const err = new Error(message);
      err.code = 'email_registered';
      throw err;
    }
  }

  const currentTier = MEMBERSHIP_TIERS.find((t) => t.id === primaryMember.membershipTier)
    || MEMBERSHIP_TIERS[0];
  let assignedGroup = currentTier ? currentTier.name : 'Family Membership';
  if (assignedGroup.toLowerCase().includes('senior')) {
    assignedGroup = 'Senior Citizen Membership';
  }

  const anniversaryDate = formatAnniversaryDate(marital);

  try {
    const primaryRes = await fetchPortalApi('/api/household/add-family-member', {
      getAuthToken: () => `dev:${email}`,
      method: 'POST',
      body: {
        email,
        mode: 'create',
        isOnboarding: true,
        memberType: 'primary',
        groups: assignedGroup,
        salutation: primaryMember.salutation || '',
        firstName: String(primaryMember.firstName || '').trim(),
        lastName: String(primaryMember.lastName || '').trim(),
        gender: primaryMember.gender || '',
        contactEmail: email,
        mobilePhone: String(primaryMember.mobilePhone || '').trim(),
        hebrewName: String(primaryMember.hebrewName || '').trim(),
        fathersHebrewName: String(
          primaryMember.fathersHebrewName || primaryMember.fatherHebrewName || '',
        ).trim(),
        mothersHebrewName: String(
          primaryMember.mothersHebrewName || primaryMember.motherHebrewName || '',
        ).trim(),
        occupation: String(primaryMember.occupation || '').trim(),
        birthdate: formatBirthdate(primaryMember),
        street: formatStreet(household),
        city: String(household.city || '').trim(),
        state: String(household.state || '').trim(),
        postalCode: String(household.zipCode || '').trim(),
        country: String(household.country || '').trim(),
        homePhone: phoneNumber(household.homePhone),
        workPhone: phoneNumber(household.workPhone),
        maritalStatus: String(marital.maritalStatus || '').trim(),
        anniversaryDate,
        weddingDate: anniversaryDate,
      },
    });

    return {
      householdAccountId: primaryRes.householdAccountId || primaryRes.accountId || '',
      contactId: primaryRes.contactId || '',
    };
  } catch (err) {
    showToast({
      message: `Registration failed: ${err.message}`,
      type: 'error',
    });
    throw err;
  }
}
