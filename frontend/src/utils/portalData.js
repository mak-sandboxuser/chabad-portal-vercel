import { isDateInPortalFiscalYear, getPortalFiscalYearRange, getPortalFiscalYearLabel } from './portalFiscalYear.js';

export { getPortalFiscalYearLabel };

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
}

export function parseMoney(value) {
  if (value == null || value === '') return 0;
  const normalized = String(value).replace(/[^0-9.-]/g, '');
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
}

export function formatMoney(amount) {
  return `$${Number(amount || 0).toFixed(2)}`;
}

export function formatDisplayDate(value) {
  const normalized = (value ?? '').toString().trim();
  if (!normalized) return '—';
  if (/^\d{4}-\d{2}-\d{2}T/.test(normalized)) {
    const parsed = new Date(normalized);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    }
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    const [year, month, day] = normalized.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
  return normalized;
}

/** Display labels for CRM frequency values (Semi-Annual → Half Yearly). */
export function formatFrequencyLabel(frequency) {
  const value = String(frequency || '').trim();
  if (!value) return '—';
  if (/^semi[-\s]?annual$/i.test(value)) return 'Half Yearly';
  return value;
}

export function getContacts(sfData) {
  if (sfData?.contacts?.length) {
    return sfData.contacts.map((contact) => ({
      ...contact,
      isPrimary: Boolean(contact.isPrimary),
      isSecondary: Boolean(contact.isSecondary),
      role: normalizeContactRole(contact.role),
    }));
  }
  if (sfData?.name) {
    return [{
      id: sfData.contactId || 'primary',
      name: sfData.name,
      role: normalizeContactRole(sfData.role || 'Member'),
      isPrimary: true,
      isSecondary: false,
      contactId: sfData.contactId,
      email: sfData.email,
      phone: sfData.profile?.phone || sfData.profile?.mobile,
    }];
  }
  return [];
}

export function getAccount(sfData) {
  const profile = sfData?.profile || {};
  return {
    id: sfData?.accountId || sfData?.account?.id || '',
    name: sfData?.account?.name || profile.accountName || sfData?.name || 'Household',
    phone: sfData?.account?.phone || profile.phone || profile.mobile || '',
    email: sfData?.account?.email || sfData?.email || '',
    street: sfData?.account?.street || profile.street || '',
    city: sfData?.account?.city || profile.city || '',
    state: sfData?.account?.state || profile.state || '',
    postalCode: sfData?.account?.postalCode || profile.postalCode || '',
    country: sfData?.account?.country || profile.country || '',
  };
}

export function getHouseholdAccountContext(sfData) {
  const account = getAccount(sfData);
  const contacts = getContacts(sfData);
  const primaryContact = contacts.find((contact) => contact.isPrimary) || contacts[0] || null;
  const secondaryContact = contacts.find((contact) => contact.isSecondary) || null;

  return {
    account,
    householdAccountId: account.id,
    accountName: account.name,
    memberCount: contacts.length,
    primaryContact,
    secondaryContact,
    householdContactIds: contacts
      .map((contact) => contact.contactId || contact.id)
      .filter((id) => typeof id === 'string' && id.startsWith('003')),
  };
}

function normalizeContactRole(role = '') {
  const value = role.trim();
  if (!value) return 'Member';
  if (/primary member/i.test(value)) return 'Parent';
  if (/secondary member/i.test(value)) return 'Parent';
  if (/spouse/i.test(value)) return 'Parent';
  if (/child/i.test(value)) return 'Child';
  return value;
}

export function getRelationships(sfData) {
  return sfData?.relationships || [];
}

export function getPayments(sfData) {
  const payments = (sfData?.financials?.payments?.length ? sfData.financials.payments : sfData?.payments) || [];
  return mergePendingPayments(filterDisplayPayments(payments), sfData);
}

function parseSortableDate(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 0;
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    const [year, month, day] = normalized.slice(0, 10).split('-').map(Number);
    return new Date(year, month - 1, day).getTime();
  }
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compareFinancialRecordsByRecent(a, b) {
  const dateDiff = parseSortableDate(b.sortDate || b.date) - parseSortableDate(a.sortDate || a.date);
  if (dateDiff !== 0) return dateDiff;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function sortFinancialRecordsByRecent(records = []) {
  return [...records].sort(compareFinancialRecordsByRecent);
}

function paymentDisplayKey(payment = {}) {
  // Dedupe on date + amount ONLY.
  // Salesforce returns type/subType as null, and the same real payment
  // generates multiple records with different methods (Cash vs null).
  // Date + amount is the only reliable combination for deduplication.
  const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  const date = String(payment.date || '').slice(0, 10);
  return `${date}|${amount.toFixed(2)}`;
}

function filterDisplayPayments(payments = []) {
  const seen = new Set();
  return sortFinancialRecordsByRecent(
    payments.filter((payment) => {
      const amount = parseMoney(payment.amount) || parseMoney(payment.total);
      if (amount <= 0) return false;

      const type = String(payment.type || payment.OneCRM__Type__c || '').toLowerCase();
      const subType = String(payment.subType || payment.OneCRM__Sub_Type__c || payment.purpose || payment.name || '').toLowerCase();

      // Exclude non-membership categories (tuition, building)
      if (subType.includes('tuition') || subType.includes('building')) {
        return false;
      }

      // Keep membership / campaign / payment / pledge charges. Also keep blank
      // type/subType (Salesforce often returns nulls for synced Stripe charges).
      const isExcludedType = type
        && !['pledge', 'payment', 'membership', 'campaign', 'donation', 'income', 'gift'].includes(type)
        && !type.includes('member')
        && !type.includes('campaign')
        && !type.includes('payment');
      if (isExcludedType) return false;

      const key = paymentDisplayKey(payment);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

const PENDING_PORTAL_PAYMENTS_KEY = 'pending_portal_payments';

export function storePendingPortalPayment(payment = {}) {
  try {
    const amount = parseMoney(payment.amount || payment.total);
    if (amount <= 0) return;

    let email = String(payment.email || '').trim().toLowerCase();
    if (!email) {
      const stored = localStorage.getItem('sf_user_session');
      if (stored) email = JSON.parse(stored)?.email?.toLowerCase?.() || '';
    }

    const next = {
      id: payment.id || `pending_${Date.now()}`,
      email,
      amount: formatMoney(amount),
      total: formatMoney(amount),
      date: String(payment.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      sortDate: String(payment.date || new Date().toISOString().slice(0, 10)).slice(0, 10),
      type: payment.type || 'Campaign',
      subType: payment.subType || payment.purpose || 'Membership',
      purpose: payment.purpose || payment.subType || 'Membership',
      method: payment.method || 'Stripe',
      status: payment.status || 'Paid',
      pending: true,
      at: Date.now(),
    };

    const existing = readPendingPortalPayments().filter((item) => item.id !== next.id);
    existing.unshift(next);
    localStorage.setItem(PENDING_PORTAL_PAYMENTS_KEY, JSON.stringify(existing.slice(0, 20)));
  } catch {
    // ignore
  }
}

function readPendingPortalPayments() {
  try {
    const raw = localStorage.getItem(PENDING_PORTAL_PAYMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergePendingPayments(crmPayments = [], sfData = null) {
  const email = String(sfData?.email || '').trim().toLowerCase();
  hydratePendingPaymentFromDraft(email, sfData);

  // Once CRM has real payment rows, drop optimistic Stripe placeholders.
  // Pending often stores the full annual commitment (e.g. $1560) while CRM
  // correctly has only the installment ($130), which double-counts on localhost.
  if (crmPayments.length > 0) {
    const remaining = readPendingPortalPayments().filter(
      (payment) => email && payment.email && payment.email !== email,
    );
    try {
      localStorage.setItem(PENDING_PORTAL_PAYMENTS_KEY, JSON.stringify(remaining));
    } catch {
      // ignore
    }
    return sortFinancialRecordsByRecent(crmPayments);
  }

  const crmKeys = new Set(crmPayments.map((payment) => paymentDisplayKey(payment)));
  const pledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
  const annual = parseMoney(sfData?.membership?.annualCommitment)
    || pledges.reduce((max, item) => Math.max(max, parseMoney(item.total || item.amount)), 0);
  const pending = readPendingPortalPayments().filter((payment) => {
    if (email && payment.email && payment.email !== email) return false;
    if (Date.now() - (Number(payment.at) || 0) > RECENT_MEMBERSHIP_PAYMENT_TTL_MS) return false;
    if (crmKeys.has(paymentDisplayKey(payment))) return false;
    const pendingAmount = parseMoney(payment.amount || payment.total);
    // Never keep a pending charge that looks like the full annual pledge —
    // installment checkouts must not inflate contributed / zero outstanding.
    if (annual > 0 && amountsMatch(pendingAmount, annual)) return false;
    return true;
  });

  // Persist pruned list (remove synced / expired).
  try {
    localStorage.setItem(PENDING_PORTAL_PAYMENTS_KEY, JSON.stringify(pending));
  } catch {
    // ignore
  }

  return sortFinancialRecordsByRecent([...pending, ...crmPayments]);
}

function hydratePendingPaymentFromDraft(email = '', sfData = null) {
  try {
    const existing = readPendingPortalPayments();
    if (existing.some((item) => !email || !item.email || item.email === email)) return;

    // Only recover a pending Stripe charge after a real checkout success flag.
    if (!hasRecentMembershipPayment(email)) return;

    let amount = 0;
    let subType = 'Membership';

    try {
      const raw = localStorage.getItem('chabad_membership_onboarding_draft_full');
      if (raw) {
        const draft = JSON.parse(raw);
        amount = Number(draft?.data?.contributionSchedule?.amount) || 0;
        subType = draft?.data?.membership?.tier || subType;
      }
    } catch {
      // ignore draft parse errors
    }

    // Do NOT fall back to annual commitment / full pledge — that wrongly
    // records a full-year payment when the member only paid one installment.
    if (amount <= 0) return;

    const pledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
    const annual = parseMoney(sfData?.membership?.annualCommitment)
      || pledges.reduce((max, item) => Math.max(max, parseMoney(item.total || item.amount)), 0);
    if (annual > 0 && amountsMatch(amount, annual)) {
      // Draft still has annual price as "amount" — not a safe installment charge.
      return;
    }

    storePendingPortalPayment({
      email,
      amount,
      date: new Date().toISOString().slice(0, 10),
      subType,
      purpose: subType,
      method: 'Stripe',
      status: 'Paid',
      id: `pending_draft_${email || 'user'}`,
    });
  } catch {
    // ignore
  }
}

export function sumPaymentsTotal(payments = []) {
  return payments.reduce((sum, item) => sum + parseMoney(item.amount || item.total), 0);
}

export function sumPaymentsYtd(payments = []) {
  return sumPaymentsTotal(payments);
}

export function getPledges(sfData) {
  const rawPledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
  const recurring = (sfData?.financials?.recurring?.length ? sfData.financials.recurring : sfData?.recurring) || [];
  const activeRecurring = recurring.find((item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase())) || recurring[0];
  const freq = (activeRecurring?.frequency || sfData?.membership?.frequency || '').toLowerCase();

  const displayPayments = getPayments(sfData);
  const currentYtdPaid = sumPaymentsYtd(displayPayments);

  const membershipObj = sfData?.membership || {};

  const explicitMemPledge = rawPledges.find(
    (p) => (p.type || '').toLowerCase() === 'membership'
      || (p.purpose || '').toLowerCase().includes('membership')
      || (p.name || '').toLowerCase().includes('membership'),
  );

  const tierPriceMap = {
    'family': 2244,
    'upgraded': 3000,
    'single parent': 1560,
    'single membership': 1128,
    'single': 1128,
    'senior': 1800,
    'chai donor': 5000,
    'chai partner': 10000,
    'chai rabbi': 18000,
    'chai leadership': 36000,
  };

  const tierName = membershipObj.tier
    || explicitMemPledge?.purpose
    || explicitMemPledge?.name
    || sfData?.account?.groups
    || sfData?.groups
    || '';
  const realGroup = hasRealMembershipGroup(tierName);
  const matchedTierPrice = realGroup
    ? Object.entries(tierPriceMap).find(([key]) => String(tierName).toLowerCase().includes(key))?.[1]
    : undefined;

  const explicitAmt = explicitMemPledge ? parseMoney(explicitMemPledge.total || explicitMemPledge.amount) : 0;
  const sfCommitment = parseMoney(membershipObj.annualCommitment);

  // Only invent a membership pledge from real CRM evidence — never from bare
  // role "Member" or an empty financials payload (previously defaulted to $3000).
  let memCommitment = 0;
  if (explicitAmt > 0) memCommitment = explicitAmt;
  else if (matchedTierPrice) memCommitment = matchedTierPrice;
  else if (realGroup && sfCommitment > 0) memCommitment = sfCommitment;

  if (memCommitment <= 0) {
    return rawPledges.filter((item) => parseMoney(item.amount || item.total) > 0);
  }

  const memPaid = currentYtdPaid || parseMoney(membershipObj.contributedYtd);

  // If commitment is recorded as per-period or single charge (e.g. $250, $500), extrapolate to full annual commitment
  if (memCommitment > 0 && memCommitment < 1000) {
    if (freq.includes('half') || freq.includes('semi')) {
      memCommitment = memCommitment * 2;
    } else if (freq.includes('month') || memCommitment <= 500) {
      memCommitment = memCommitment * 12;
    }
  }

  if (memCommitment <= 0) {
    return rawPledges.filter((item) => parseMoney(item.amount || item.total) > 0);
  }

  const memOutstanding = Math.max(memCommitment - memPaid, 0);

  const primaryMemPledge = {
    id: explicitMemPledge?.id || 'membership_pledge_primary',
    name: 'Membership',
    purpose: 'Annual Membership',
    type: 'Pledge',
    subType: 'Annual Membership',
    amount: formatMoney(memCommitment),
    total: formatMoney(memCommitment),
    paid: formatMoney(memPaid),
    outstanding: formatMoney(memOutstanding),
    date: explicitMemPledge?.date || membershipObj.renewalDate || sfData?.joinedDate || '',
    status: 'Success',
  };

  return [primaryMemPledge];
}

export function getRecurring(sfData) {
  const recurring = (sfData?.financials?.recurring?.length ? sfData.financials.recurring : sfData?.recurring) || [];
  return sortFinancialRecordsByRecent(
    recurring.filter((item) => parseMoney(item.amount) > 0),
  );
}

const GUEST_MEMBERSHIP_STATUSES = new Set([
  'guest',
  'prospect',
  'non-member',
  'non member',
  'pending',
  'inactive',
  'lapsed',
]);

export const PAYMENT_TAB_IDS = new Set(['financial', 'contributions', 'payments', 'recurring']);

export const GUEST_PAYMENTS_MESSAGE = 'Become a member to enable payments.';

/** Survives CRM lag after Stripe → Make sync (role often stays Guest briefly). */
const RECENT_MEMBERSHIP_PAYMENT_KEY = 'recent_membership_payment';
const RECENT_MEMBERSHIP_PAYMENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function markRecentMembershipPayment(email = '', paymentDetails = null) {
  try {
    const normalized = String(email || '').trim().toLowerCase();
    let fallbackEmail = normalized;
    if (!fallbackEmail) {
      const stored = localStorage.getItem('sf_user_session');
      if (stored) fallbackEmail = JSON.parse(stored)?.email?.toLowerCase?.() || '';
    }
    localStorage.setItem(
      RECENT_MEMBERSHIP_PAYMENT_KEY,
      JSON.stringify({ email: fallbackEmail, at: Date.now() }),
    );

    // Promote local session role so header/nav stop showing GUEST immediately.
    const stored = localStorage.getItem('sf_user_session');
    if (stored) {
      const session = JSON.parse(stored);
      session.role = 'Member';
      if (session.memberDetails && typeof session.memberDetails === 'object') {
        session.memberDetails = { ...session.memberDetails, role: 'Member' };
      }
      localStorage.setItem('sf_user_session', JSON.stringify(session));
    }

    if (paymentDetails && (paymentDetails.amount || paymentDetails.total)) {
      storePendingPortalPayment({
        ...paymentDetails,
        email: fallbackEmail,
      });
    }
  } catch {
    // ignore storage failures
  }
}

export function clearRecentMembershipPayment() {
  try {
    localStorage.removeItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
    localStorage.removeItem(PENDING_PORTAL_PAYMENTS_KEY);
  } catch {
    // ignore
  }
}

export function hasRecentMembershipPayment(email = '') {
  try {
    const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    const normalized = String(email || '').trim().toLowerCase();
    if (normalized && data.email && data.email !== normalized) return false;
    const at = Number(data.at) || 0;
    return at > 0 && Date.now() - at < RECENT_MEMBERSHIP_PAYMENT_TTL_MS;
  } catch {
    return false;
  }
}

export function hasRealMembershipGroup(value = '') {
  const tier = String(value || '').trim();
  if (!tier) return false;
  // Bare CRM labels are not paid membership groups.
  if (/^(member|guest|prospect|contact)$/i.test(tier)) return false;
  if (/^(member|guest|prospect|contact)(\s*;\s*(member|guest|prospect|contact))*$/i.test(tier)) {
    return false;
  }
  return /\d{2}[-/]\d{2}/.test(tier)
    || /membership/i.test(tier)
    || /(family|upgraded|chai|senior|single parent)/i.test(tier);
}

export function isGuestUser(sfData) {
  if (!sfData) return true;

  const membership = sfData.membership || {};
  const status = (membership.status || sfData.profile?.lifecycle?.lifecycleStatus || '').toLowerCase().trim();
  const role = (sfData.role || '').toLowerCase().trim();
  const email = (sfData.email || '').toLowerCase().trim();

  // Evidence of an existing member household / paid membership.
  // Make.com check-member often returns groups="" even for long-time members
  // (e.g. rabbi@chabadbedford.com), so do not rely on groups alone.
  const tier = String(
    membership.tier
    || sfData.groups
    || sfData.profile?.groups
    || sfData.account?.groups
    || '',
  ).trim();
  const hasMembershipTiers = hasRealMembershipGroup(tier);
  const pledges = (sfData.financials?.pledges?.length ? sfData.financials.pledges : sfData.pledges) || [];
  const hasPledges = pledges.some((item) => parseMoney(item.amount || item.total) > 0);
  const payments = getPayments(sfData);
  const hasPayments = payments.some((item) => parseMoney(item.amount || item.total) > 0);
  const recurring = (sfData.financials?.recurring?.length ? sfData.financials.recurring : sfData.recurring) || [];
  const hasActiveRecurring = recurring.some(
    (item) => (item.status || '').toLowerCase() === 'active' && parseMoney(item.amount) > 0,
  );
  const contacts = getContacts(sfData);
  const hasEstablishedHousehold = contacts.length > 1;

  if (hasMembershipTiers || hasPledges || hasPayments || hasActiveRecurring || hasEstablishedHousehold) {
    return false;
  }

  if (hasRecentMembershipPayment(email)) return false;

  if (GUEST_MEMBERSHIP_STATUSES.has(status)) return true;
  // Bare CRM role "Member" with a solo contact and no financial/group evidence
  // is a new pre-login onboarded contact — still a guest until membership payment.
  if (role === 'guest' || role === '' || role === 'member') return true;

  return true;
}

export function formatMembershipDisplayName(name = '') {
  return String(name || '')
    .replace(/(?:\s*\(\s*Household\s*\))+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

export function getMembership(sfData) {
  const membership = sfData?.membership || {};
  const rawTierCandidate = membership.tier
    || sfData?.groups
    || sfData?.profile?.groups
    || sfData?.account?.groups
    || '';

  const resolveStandardGroup = (raw = '') => {
    const rawStr = String(raw || '').trim();
    if (!rawStr) return '';
    if (/^(member|guest|prospect|contact)$/i.test(rawStr)) return '';

    if (rawStr.includes(';')) {
      const parts = rawStr.split(';').map((p) => p.trim()).filter(Boolean);
      const memParts = parts.filter((p) => /membership|partnership|chai/i.test(p));
      const pool = memParts.length > 0 ? memParts : parts;

      let latestPart = pool[pool.length - 1];
      let maxYear = 0;
      for (const part of pool) {
        const m = part.match(/(\d{2})[-/](\d{2})/);
        if (m) {
          const yr = parseInt(m[2], 10);
          if (yr > maxYear) {
            maxYear = yr;
            latestPart = part;
          }
        }
      }
      return formatMembershipDisplayName(latestPart);
    }

    const s = rawStr.toLowerCase();
    if (s.includes('family membership')) return 'Family Membership 26-27';
    if (s.includes('upgraded membership')) return 'Upgraded Membership 26-27';
    if (s.includes('senior citizen')) return 'Senior Citizen Membership 26-27';
    if (s.includes('single membership')) return 'Single Membership 26-27';
    if (s.includes('chai donor')) return 'Chai Donor Membership 26-27';
    if (s.includes('chai partner')) return 'Chai Partner Membership 26-27';
    if (s.includes('chai rabbi')) return 'Chai Rabbi Circle Membership 26-27';
    if (s.includes('chai leadership')) return 'Chai Leadership Circle Membership 26-27';
    if (s.includes('single parent') || /membership\s*\d{2}/.test(s)) return 'Membership 26-27';
    return formatMembershipDisplayName(rawStr);
  };

  const resolvedTier = resolveStandardGroup(rawTierCandidate);
  const pledges = getPledges(sfData);
  const recurring = getRecurring(sfData);
  const payments = getPayments(sfData);
  const activeRecurring = recurring.find((item) => (item.status || '').toLowerCase() === 'active') || recurring[0];

  const membershipPledge = pledges.find(
    (p) => (p.type || '').toLowerCase() === 'membership'
      || (p.purpose || '').toLowerCase().includes('membership')
      || (p.name || '').toLowerCase().includes('membership')
      || (p.purpose || '').toLowerCase().includes('member')
      || (p.type || '').toLowerCase() === 'member',
  );

  const membershipPledgeAmt = membershipPledge ? parseMoney(membershipPledge.total || membershipPledge.amount) : 0;
  const annualFromPledges = pledges.reduce((sum, item) => sum + parseMoney(item.total || item.amount), 0);

  const annualCommitmentVal = membershipPledgeAmt > 0
    ? membershipPledgeAmt
    : (annualFromPledges > 0 ? annualFromPledges : parseMoney(membership.annualCommitment));

  const totalPaidSum = sumPaymentsTotal(payments);
  const contributed = totalPaidSum || parseMoney(membership.contributedYtd)
    || pledges.reduce((sum, item) => sum + parseMoney(item.paid || item.amount), 0);

  const calculatedOutstanding = Math.max(annualCommitmentVal - contributed, 0);

  const finalAnnualCommitmentStr = annualCommitmentVal > 0
    ? formatMoney(annualCommitmentVal)
    : (membership.annualCommitment || '$0.00');

  return {
    tier: resolvedTier,
    status: resolvedTier ? (membership.status || 'Active') : '',
    memberSince: membership.memberSince || sfData?.joinedDate || '',
    renewalDate: membership.renewalDate || membership.endDate || '',
    annualCommitment: finalAnnualCommitmentStr,
    contributedYtd: formatMoney(contributed),
    outstanding: formatMoney(calculatedOutstanding),
    autoRenewal: membership.autoRenewal || (activeRecurring ? 'Enabled' : 'Disabled'),
    paymentMethod: membership.paymentMethod || activeRecurring?.method || '—',
    paymentMethodExpiry: membership.paymentMethodExpiry || activeRecurring?.cardExpiry || '',
    notes: membership.notes || '',
  };
}

export function getFinancialSummary(sfData) {
  const membership = getMembership(sfData);
  const payments = getPayments(sfData);
  const totalContributed = sumPaymentsTotal(payments);
  const contributedYtd = sumPaymentsYtd(payments) || parseMoney(membership.contributedYtd);
  const annual = parseMoney(membership.annualCommitment);
  const contributed = contributedYtd || totalContributed || parseMoney(membership.contributedYtd);

  const pledges = getPledges(sfData);
  const pledgeOutstandingSum = pledges.reduce((sum, item) => sum + parseMoney(item.outstanding), 0);
  const calculatedOutstanding = annual > 0 ? Math.max(annual - contributed, 0) : pledgeOutstandingSum;
  const outstanding = calculatedOutstanding;

  const pct = annual > 0 ? Math.round((contributed / annual) * 100) : 0;

  return {
    ...membership,
    totalContributed,
    contributedYtd: formatMoney(contributedYtd || contributed),
    paymentCount: payments.length,
    annual,
    contributed,
    outstanding,
    progressPct: Math.min(pct, 100),
  };
}

function parseLocalDate(value) {
  const normalized = String(value || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const [year, month, day] = normalized.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addFrequencyInterval(baseDate, frequency) {
  const next = new Date(baseDate.getTime());
  const freq = String(frequency || '').toLowerCase();
  if (freq.includes('week')) next.setDate(next.getDate() + 7);
  else if (freq.includes('half') || freq.includes('semi')) next.setMonth(next.getMonth() + 6);
  else if (freq.includes('quarter')) next.setMonth(next.getMonth() + 3);
  else if (freq.includes('year') || freq.includes('annual')) next.setFullYear(next.getFullYear() + 1);
  else next.setMonth(next.getMonth() + 1);
  return next;
}

function scheduleKindFromFrequency(frequency) {
  const freq = String(frequency || '').toLowerCase().trim();
  if (!freq) return '';
  if (freq.includes('month') && !freq.includes('semi')) return 'monthly';
  if (freq.includes('half') || freq.includes('semi') || freq.includes('install')) return 'installments';
  if (freq.includes('week') || freq.includes('quarter')) return 'monthly';
  if (freq.includes('year') || freq.includes('annual') || freq.includes('one') || freq.includes('full')) {
    return 'full';
  }
  return '';
}

function amountsMatch(a, b, tolerance = 1.5) {
  if (!(a > 0) || !(b > 0)) return false;
  return Math.abs(a - b) <= tolerance || Math.abs(a - b) / b < 0.06;
}

export function getActiveRecurring(sfData) {
  const recurring = getRecurring(sfData);
  return recurring.find(
    (item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase()) && item.nextDate,
  )
    || recurring.find(
      (item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase()),
    )
    || recurring.find((item) => item.nextDate)
    || recurring[0]
    || null;
}

/**
 * Shared schedule labels/amounts for Dashboard + Financial Overview.
 * Infers monthly / two-installment / full when CRM frequency is missing.
 */
export function getPaymentScheduleSummary(sfData) {
  const summary = getFinancialSummary(sfData);
  const membership = getMembership(sfData);
  const payments = getPayments(sfData);
  const activeRecurring = getActiveRecurring(sfData);
  const lastPaymentAmount = parseMoney(payments[0]?.amount || payments[0]?.total);
  const recurringAmount = parseMoney(activeRecurring?.amount);
  const frequency = activeRecurring?.frequency || membership.frequency || '';

  // No real membership commitment → don't invent Annual / next-payment amounts.
  if (!(summary.annual > 0) && !(summary.outstanding > 0) && !(recurringAmount > 0)) {
    return {
      scheduleKind: '',
      activeRecurring: null,
      balanceLabel: 'Net Payment',
      balanceAmount: 0,
      balanceAmountDisplay: formatMoney(0),
      nextPaymentDate: '',
      nextPaymentDateDisplay: '—',
      nextPaymentAmount: 0,
      nextPaymentAmountDisplay: '—',
      frequencyLabel: '—',
      membershipRenewalDate: '',
      membershipRenewalDateDisplay: '—',
    };
  }

  let scheduleKind = scheduleKindFromFrequency(frequency);
  if (!scheduleKind) {
    const probe = recurringAmount > 0 ? recurringAmount : lastPaymentAmount;
    if (summary.annual > 0 && probe > 0) {
      if (amountsMatch(probe, summary.annual / 12)) scheduleKind = 'monthly';
      else if (amountsMatch(probe, summary.annual / 2)) scheduleKind = 'installments';
      else if (amountsMatch(probe, summary.annual)) scheduleKind = 'full';
      else scheduleKind = 'full';
    } else {
      scheduleKind = 'full';
    }
  }

  let scheduledAmount = recurringAmount;
  if (!(scheduledAmount > 0)) {
    if (scheduleKind === 'monthly') {
      scheduledAmount = summary.annual > 0
        ? Math.round((summary.annual / 12) * 100) / 100
        : lastPaymentAmount;
    } else if (scheduleKind === 'installments') {
      scheduledAmount = summary.annual > 0
        ? Math.min(Math.round((summary.annual / 2) * 100) / 100, summary.outstanding || summary.annual / 2)
        : lastPaymentAmount;
    } else {
      scheduledAmount = summary.outstanding;
    }
  }

  // Next payment date rules (production):
  // - Half Yearly (Installments): 2nd installment is ALWAYS scheduled on 1st of December.
  // - Monthly: 1st of every upcoming month.
  // TEST MODE: compress to minutes after last payment / now.
  let nextPaymentDate = '';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const accelMinutes = getAcceleratedScheduleDelayMinutes(
    frequency || (scheduleKind === 'monthly' ? 'Monthly' : scheduleKind === 'installments' ? 'Half Yearly' : 'Annual'),
  );

  if (accelMinutes > 0) {
    const payments = getPayments(sfData);
    let latestAt = 0;
    payments.forEach((payment) => {
      const ts = parseSortableDate(payment.sortDate || payment.date);
      if (ts > latestAt) latestAt = ts;
    });
    try {
      const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        const email = String(sfData?.email || '').trim().toLowerCase();
        if ((!email || !data.email || data.email === email) && Number(data.at) > latestAt) {
          latestAt = Number(data.at);
        }
      }
    } catch {
      // ignore
    }
    const base = latestAt > 0 ? new Date(latestAt) : now;
    const next = new Date(base.getTime());
    next.setMinutes(next.getMinutes() + accelMinutes);
    nextPaymentDate = next.toISOString();
  } else if (scheduleKind === 'installments') {
    const decFirstThisYear = new Date(currentYear, 11, 1);
    if (now < decFirstThisYear) {
      nextPaymentDate = `${currentYear}-12-01`;
    } else {
      nextPaymentDate = `${currentYear + 1}-12-01`;
    }
  } else if (scheduleKind === 'monthly') {
    const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
    nextPaymentDate = toIsoDate(firstOfNextMonth);
  } else {
    const raw = activeRecurring?.nextDate || membership.renewalDate || membership.endDate || '';
    const parsed = parseLocalDate(raw);
    nextPaymentDate = parsed
      ? toIsoDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
      : toIsoDate(new Date(currentYear + 1, currentMonth, 1));
  }

  // Renewal Date always matches Next Payment date.
  const membershipRenewalDate = nextPaymentDate;

  const balanceLabel = scheduleKind === 'monthly' ? 'Monthly Payments' : 'Net Payment';
  const balanceAmount = scheduleKind === 'full' ? summary.outstanding : scheduledAmount;
  const nextPaymentAmountValue = scheduleKind === 'full' ? summary.outstanding : scheduledAmount;

  return {
    scheduleKind,
    activeRecurring,
    balanceLabel,
    balanceAmount,
    balanceAmountDisplay: formatMoney(balanceAmount),
    nextPaymentDate,
    nextPaymentDateDisplay: formatDisplayDate(nextPaymentDate),
    nextPaymentAmount: nextPaymentAmountValue,
    nextPaymentAmountDisplay: nextPaymentAmountValue > 0 ? formatMoney(nextPaymentAmountValue) : '—',
    membershipRenewalDate,
    membershipRenewalDateDisplay: formatDisplayDate(membershipRenewalDate),
    frequencyLabel: formatFrequencyLabel(
      frequency || (scheduleKind === 'monthly' ? 'Monthly' : scheduleKind === 'installments' ? 'Half Yearly' : 'Annual'),
    ),
  };
}

function hasPaymentInCurrentMonth(sfData) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  return getPayments(sfData).some((payment) => {
    const raw = payment.sortDate || payment.date || '';
    const pDate = parseLocalDate(raw);
    if (pDate) {
      return pDate.getFullYear() === year && pDate.getMonth() === month;
    }
    // Fallback for non-ISO date strings
    const ts = parseSortableDate(raw);
    if (!ts) return false;
    const d = new Date(ts);
    return d.getFullYear() === year && d.getMonth() === month;
  });
}

/** TEST MODE: Monthly 1 min / Half Yearly 5 min / Yearly 10 min. */
const ACCELERATED_SCHEDULE_TEST = true;

function getAcceleratedScheduleDelayMinutes(frequency = '') {
  if (!ACCELERATED_SCHEDULE_TEST) return 0;
  const freq = String(frequency || '').toLowerCase().trim();
  if (freq.includes('half') || freq.includes('semi') || freq.includes('install')) return 5;
  if (freq.includes('annual') || freq.includes('yearly') || freq.includes('year') || freq === 'full') return 10;
  if (freq.includes('month') || freq === 'monthly') return 1;
  return 1;
}

function getLatestPaymentTimestamp(sfData) {
  let latest = 0;
  getPayments(sfData).forEach((payment) => {
    const ts = parseSortableDate(payment.sortDate || payment.date);
    if (ts > latest) latest = ts;
  });
  try {
    const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
    if (!raw) return latest;
    const data = JSON.parse(raw);
    const email = String(sfData?.email || '').trim().toLowerCase();
    if (email && data.email && data.email !== email) return latest;
    const at = Number(data.at) || 0;
    if (at > latest) latest = at;
  } catch {
    // ignore
  }
  return latest;
}

export function isPaymentWindowOpen(sfData) {
  if (!sfData) return false;

  const summary = getFinancialSummary(sfData);
  const outstandingVal = parseMoney(summary.outstanding);
  if (outstandingVal <= 0) return false;

  const schedule = getPaymentScheduleSummary(sfData);
  const accelMinutes = getAcceleratedScheduleDelayMinutes(
    schedule.frequencyLabel || schedule.scheduleKind || '',
  );

  // TEST MODE: reopen Make Payment N minutes after the last payment.
  if (accelMinutes > 0) {
    const latestPaymentAt = getLatestPaymentTimestamp(sfData);
    if (!latestPaymentAt) return true;
    return Date.now() >= (latestPaymentAt + accelMinutes * 60 * 1000);
  }

  const isMonthly = schedule.scheduleKind === 'monthly'
    || /month/i.test(schedule.frequencyLabel || '');

  // Monthly: once this month's installment is paid, hide until next month.
  if (isMonthly && hasPaymentInCurrentMonth(sfData)) {
    return false;
  }

  const nextDateStr = schedule.nextPaymentDate;

  // If no scheduled date exists but outstanding balance remains, allow payment
  if (!nextDateStr) {
    return outstandingVal > 0;
  }

  const now = new Date();
  const nextDate = new Date(nextDateStr.includes('T') ? nextDateStr : `${nextDateStr}T00:00:00`);

  if (isNaN(nextDate.getTime())) {
    return outstandingVal > 0;
  }

  // Payment window opens 30 days prior to the scheduled next payment date
  const windowOpenDate = new Date(nextDate);
  windowOpenDate.setDate(windowOpenDate.getDate() - 30);

  if (now < windowOpenDate) {
    return false;
  }

  return true;
}

export function formatAddress(account) {
  const parts = [
    account.street,
    [account.city, account.state, account.postalCode].filter(Boolean).join(', '),
    account.country,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}
