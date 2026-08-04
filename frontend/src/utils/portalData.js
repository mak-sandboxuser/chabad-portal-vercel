import { isDateInPortalFiscalYear, getPortalFiscalYearLabel } from './portalFiscalYear.js';

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
  return filterDisplayPayments(payments);
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
  const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  const method = String(payment.method || payment.type || '').trim().toLowerCase();
  const date = String(payment.date || '').slice(0, 10);
  return `${date}|${amount.toFixed(2)}|${method}`;
}

function filterDisplayPayments(payments = []) {
  const seen = new Set();
  return sortFinancialRecordsByRecent(
    payments.filter((payment) => {
      const amount = parseMoney(payment.amount) || parseMoney(payment.total);
      if (amount <= 0) return false;
      if (!isDateInPortalFiscalYear(payment.sortDate || payment.date)) return false;

      // Filter to ONLY include payments matching Main Type: Pledge and Sub Type: Annual Membership
      const type = String(payment.type || payment.OneCRM__Type__c || '').toLowerCase();
      const subType = String(payment.subType || payment.OneCRM__Sub_Type__c || payment.purpose || payment.name || '').toLowerCase();

      // Exclude non-membership categories (tuition, campaign, building)
      if (subType.includes('campaign') || subType.includes('tuition') || subType.includes('building')) {
        return false;
      }

      // Enforce Main Type: Pledge & Sub Type: Annual Membership
      const isPledgeType = !type || type === 'pledge' || type === 'payment' || type === 'membership';
      const isAnnualMemSubType = !subType || subType.includes('membership') || subType.includes('annual');

      if (!isPledgeType || !isAnnualMemSubType) {
        return false;
      }

      const key = paymentDisplayKey(payment);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  );
}

export function sumPaymentsTotal(payments = []) {
  return payments.reduce((sum, item) => sum + parseMoney(item.amount || item.total), 0);
}

export function sumPaymentsYtd(payments = []) {
  return sumPaymentsTotal(payments);
}

export function getPledges(sfData) {
  const rawPledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
  const payments = (sfData?.financials?.payments?.length ? sfData.financials.payments : sfData?.payments) || [];
  const recurring = (sfData?.financials?.recurring?.length ? sfData.financials.recurring : sfData?.recurring) || [];
  const activeRecurring = recurring.find((item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase())) || recurring[0];
  const freq = (activeRecurring?.frequency || sfData?.membership?.frequency || '').toLowerCase();

  const displayPayments = filterDisplayPayments(payments);
  const currentYtdPaid = sumPaymentsYtd(displayPayments);

  const membershipObj = sfData?.membership || {};
  
  const explicitMemPledge = rawPledges.find(
    (p) => (p.type || '').toLowerCase() === 'membership' 
      || (p.purpose || '').toLowerCase().includes('membership')
      || (p.name || '').toLowerCase().includes('membership')
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

  const tierName = (membershipObj.tier || explicitMemPledge?.purpose || explicitMemPledge?.name || sfData?.account?.groups || '').toLowerCase();
  const matchedTierPrice = Object.entries(tierPriceMap).find(([key]) => tierName.includes(key))?.[1];

  const explicitAmt = explicitMemPledge ? parseMoney(explicitMemPledge.total || explicitMemPledge.amount) : 0;
  let memCommitment = matchedTierPrice || parseMoney(membershipObj.annualCommitment);

  if (explicitAmt > memCommitment) {
    memCommitment = explicitAmt;
  }

  const memPaid = currentYtdPaid || parseMoney(membershipObj.contributedYtd);

  // If commitment is recorded as per-period or single charge (e.g. $250, $500), extrapolate to full annual commitment
  if (memCommitment < 1000) {
    if (freq.includes('half') || freq.includes('semi')) {
      memCommitment = memCommitment * 2;
    } else if (freq.includes('month') || memCommitment <= 500) {
      memCommitment = memCommitment * 12;
    }
  }

  if (memCommitment <= 0) {
    memCommitment = matchedTierPrice || 3000;
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
    date: explicitMemPledge?.date || membershipObj.renewalDate || sfData?.joinedDate || '2026-08-03',
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

export function isGuestUser(sfData) {
  if (!sfData) return true;

  const membership = sfData.membership || {};
  const status = (membership.status || sfData.profile?.lifecycle?.lifecycleStatus || '').toLowerCase().trim();
  const role = (sfData.role || '').toLowerCase().trim();

  if (GUEST_MEMBERSHIP_STATUSES.has(status)) return true;
  if (role === 'guest') return true;

  const tier = (membership.tier || '').trim();
  const hasMembershipTier = /\d{2}[-/]\d{2}/.test(tier)
    || /(family|individual|couple|patron|sustaining|benefactor|supporter)/i.test(tier);
  const hasMemberSince = Boolean((membership.memberSince || sfData.joinedDate || '').trim());
  const hasCommitment = parseMoney(membership.annualCommitment) > 0;
  const pledges = (sfData.financials?.pledges?.length ? sfData.financials.pledges : sfData.pledges) || [];
  const hasPledges = pledges.some((item) => parseMoney(item.amount || item.total) > 0);
  const recurring = (sfData.financials?.recurring?.length ? sfData.financials.recurring : sfData.recurring) || [];
  const hasActiveRecurring = recurring.some(
    (item) => (item.status || '').toLowerCase() === 'active' && parseMoney(item.amount) > 0,
  );

  if (hasMembershipTier || hasMemberSince || hasCommitment || hasPledges || hasActiveRecurring) {
    return false;
  }

  return true;
}

export function getMembership(sfData) {
  const membership = sfData?.membership || {};
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
    tier: membership.tier || 'Member',
    status: membership.status || 'Active',
    memberSince: membership.memberSince || sfData?.joinedDate || '',
    renewalDate: membership.renewalDate || activeRecurring?.nextDate || '',
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

export function isPaymentWindowOpen(sfData) {
  if (!sfData) return false;

  const membership = getMembership(sfData);
  const outstandingVal = parseMoney(membership.outstanding);
  const recurring = getRecurring(sfData);
  const activeRecurring = recurring.find(
    (item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase()),
  ) || recurring[0];

  const freq = (activeRecurring?.frequency || membership.frequency || '').toLowerCase().trim();
  const isHalfYearly = freq.includes('half') || freq.includes('semi');
  const isYearly = freq.includes('annual') || freq.includes('yearly') || freq.includes('full') || freq.includes('one-time');

  if (outstandingVal <= 0) {
    return false;
  }

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (isYearly) {
    return outstandingVal > 0;
  }

  if (isHalfYearly) {
    const decFirst2026 = new Date(2026, 11, 1);
    if (now < decFirst2026) {
      return false;
    }
    return outstandingVal > 0;
  }

  const payments = getPayments(sfData);
  const hasPaidThisMonth = payments.some((p) => {
    const pDate = p.date ? new Date(p.date) : null;
    if (!pDate || isNaN(pDate.getTime())) return false;
    return pDate.getFullYear() === currentYear && pDate.getMonth() === currentMonth;
  });

  if (hasPaidThisMonth) {
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
