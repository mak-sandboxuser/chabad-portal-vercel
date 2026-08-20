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
<<<<<<< HEAD
  const id = String(payment.id || '').trim();
  // Prefer Salesforce Income Id so same-day/same-amount installments stay visible.
  // Old key collapsed real payment history to a single row:
  // const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  // const date = String(payment.date || '').slice(0, 10);
  // return `${date}|${amount.toFixed(2)}`;
  if (id && !/^(payment_|local_|pending_)/i.test(id)) {
    return `id:${id}`;
  }
=======
>>>>>>> parent of 6654812 (fix 1)
  const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  const method = String(payment.method || payment.type || '').trim().toLowerCase();
  const date = String(payment.date || '').slice(0, 10);
<<<<<<< HEAD
  return `${date}|${amount.toFixed(2)}|${id || 'anon'}`;
=======
  return `${date}|${amount.toFixed(2)}|${method}`;
>>>>>>> parent of 6654812 (fix 1)
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

<<<<<<< HEAD
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

  const crmKeys = new Set(crmPayments.map((payment) => paymentDisplayKey(payment)));
  const pending = readPendingPortalPayments().filter((payment) => {
    if (email && payment.email && payment.email !== email) return false;
    if (Date.now() - (Number(payment.at) || 0) > RECENT_MEMBERSHIP_PAYMENT_TTL_MS) return false;
    // Drop once CRM has the matching charge.
    if (crmKeys.has(paymentDisplayKey(payment))) return false;
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

    if (amount <= 0) {
      amount = parseMoney(sfData?.membership?.annualCommitment) || 0;
      subType = sfData?.membership?.tier || subType;
    }

    if (amount <= 0) {
      const pledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
      amount = pledges.reduce((max, item) => Math.max(max, parseMoney(item.total || item.amount)), 0);
    }

    if (amount <= 0) return;

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

=======
>>>>>>> parent of 6654812 (fix 1)
export function sumPaymentsTotal(payments = []) {
  return payments.reduce((sum, item) => sum + parseMoney(item.amount || item.total), 0);
}

export function sumPaymentsYtd(payments = []) {
  return sumPaymentsTotal(payments);
}

const MEMBERSHIP_ANNUAL_TIERS = [
  { amount: 36000, name: 'Chai Leadership Circle Membership 26-27' },
  { amount: 18000, name: "Chai Rabbi's Circle Membership 26-27" },
  { amount: 10000, name: 'Chai Partner Membership 26-27' },
  { amount: 5000, name: 'Chai Donor Membership 26-27' },
  { amount: 3000, name: 'Upgraded Membership 26-27' },
  { amount: 2244, name: 'Family Membership 26-27' },
  { amount: 1800, name: 'Senior Citizen Membership 26-27' },
  { amount: 1560, name: 'Single Parent Family Membership 26-27' },
  { amount: 1128, name: 'Single Membership 26-27' },
];

/** When Make returns Campaign cash payments but no Groups / pledge, infer tier + annual. */
export function inferMembershipFromPayments(payments = []) {
  const pool = (payments || []).filter((payment) => {
    const amount = parseMoney(payment.amount || payment.total);
    if (amount <= 0) return false;
    const blob = `${payment.type || ''} ${payment.subType || ''} ${payment.name || ''} ${payment.purpose || ''}`.toLowerCase();
    return blob.includes('campaign')
      || blob.includes('membership')
      || blob.includes('member')
      || blob.includes('cash payment');
  });

  if (!pool.length) {
    return { annual: 0, installment: 0, tier: '', paid: 0 };
  }

  const amounts = pool.map((payment) => parseMoney(payment.amount || payment.total)).filter((amount) => amount > 0);
  const counts = new Map();
  amounts.forEach((amount) => counts.set(amount, (counts.get(amount) || 0) + 1));
  const installment = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || amounts[0] || 0;

  let annual = 0;
  if (installment > 0 && installment <= 500) {
    // Monthly membership installments (e.g. $250 × 12 = $3000 upgraded).
    annual = installment * 12;
  } else if (installment > 500 && installment < 1500) {
    annual = installment * 2;
  } else {
    annual = Math.max(...amounts);
  }

  const matched = MEMBERSHIP_ANNUAL_TIERS.find((tier) => Math.abs(tier.amount - annual) < 1);
  const paid = amounts.reduce((sum, amount) => sum + amount, 0);

  return {
    annual,
    installment,
    paid,
    tier: matched?.name || (annual > 0 ? 'Membership 26-27' : ''),
  };
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

<<<<<<< HEAD
  // Only invent a membership pledge from real CRM evidence — never from bare
  // role "Member" or an empty financials payload (previously defaulted to $3000).
  let memCommitment = 0;
  if (explicitAmt > 0) memCommitment = explicitAmt;
  else if (matchedTierPrice) memCommitment = matchedTierPrice;
  else if (realGroup && sfCommitment > 0) memCommitment = sfCommitment;

  // Make often returns Campaign cash installments with no Groups / Active pledge.
  // Infer annual commitment from those payments so Outstanding Balance is not $0.
  const inferred = inferMembershipFromPayments(displayPayments);
  if (memCommitment <= 0 && inferred.annual > 0) {
    memCommitment = inferred.annual;
  }

  if (memCommitment <= 0) {
    return rawPledges.filter((item) => parseMoney(item.amount || item.total) > 0);
=======
  if (explicitAmt > memCommitment) {
    memCommitment = explicitAmt;
>>>>>>> parent of 6654812 (fix 1)
  }

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

  // Prefer Salesforce pledge Paid / Outstanding when present.
  // Old logic only used payment-history sum, which was wrong after aggressive
  // date|amount payment dedupe (e.g. $250 instead of $1250):
  // const memPaid = currentYtdPaid || parseMoney(membershipObj.contributedYtd);
  // const memOutstanding = Math.max(memCommitment - memPaid, 0);
  const sfPaid = parseMoney(explicitMemPledge?.paid);
  const sfOutstanding = parseMoney(explicitMemPledge?.outstanding);
  const memPaid = Math.max(
    currentYtdPaid,
    sfPaid,
    parseMoney(membershipObj.contributedYtd),
  );
  const memOutstanding = sfOutstanding > 0
    ? sfOutstanding
    : Math.max(memCommitment - memPaid, 0);

  const primaryMemPledge = {
    id: explicitMemPledge?.id || 'membership_pledge_primary',
    name: inferred.tier || explicitMemPledge?.name || 'Membership',
    purpose: inferred.tier || explicitMemPledge?.purpose || 'Annual Membership',
    type: 'Pledge',
    subType: 'Annual Membership',
    amount: formatMoney(memCommitment),
    total: formatMoney(memCommitment),
    paid: formatMoney(memPaid),
    outstanding: formatMoney(memOutstanding),
<<<<<<< HEAD
    date: explicitMemPledge?.date || membershipObj.renewalDate || sfData?.joinedDate || '',
    status: memOutstanding > 0 ? 'Active' : 'Success',
=======
    date: explicitMemPledge?.date || membershipObj.renewalDate || sfData?.joinedDate || '2026-08-03',
    status: 'Success',
>>>>>>> parent of 6654812 (fix 1)
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
  const rawTierCandidate = membership.tier
    || sfData?.groups
    || sfData?.profile?.groups
    || sfData?.account?.groups
    || '';

  const resolveStandardGroup = (raw = '') => {
    const s = String(raw || '').toLowerCase().trim();
    if (!s) return 'Family Membership 26-27 (Household) (Household)';
    if (s.includes('family membership')) return 'Family Membership 26-27 (Household) (Household)';
    if (s.includes('upgraded membership')) return 'Upgraded Membership 26-27 (Household) (Household)';
    if (s.includes('senior citizen')) return 'Senior Citizen Membership 26-27 (Household) (Household)';
    if (s.includes('single membership')) return 'Single Membership 26-27 (Household) (Household)';
    if (s.includes('chai donor')) return 'Chai Donor Membership 26-27 (Household) (Household)';
    if (s.includes('chai partner')) return 'Chai Partner Membership 26-27 (Household) (Household)';
    if (s.includes('chai rabbi')) return 'Chai Rabbi Circle Membership 26-27 (Household) (Household)';
    if (s.includes('chai leadership')) return 'Chai Leadership Circle Membership 26-27 (Household) (Household)';
    if (s.includes('single parent') || s.includes('membership 26-27')) return 'Membership 26-27 (Household)';
    return raw || 'Family Membership 26-27 (Household) (Household)';
  };

  const resolvedTierFromGroups = resolveStandardGroup(rawTierCandidate);
  const pledges = getPledges(sfData);
  const recurring = getRecurring(sfData);
  const payments = getPayments(sfData);
  const activeRecurring = recurring.find((item) => (item.status || '').toLowerCase() === 'active') || recurring[0];
  const inferredFromPayments = inferMembershipFromPayments(payments);
  // Prefer CRM groups; fall back to payment-inferred membership name.
  const resolvedTier = resolvedTierFromGroups
    || (inferredFromPayments.tier ? resolveStandardGroup(inferredFromPayments.tier) || inferredFromPayments.tier : '');

  const membershipPledge = pledges.find(
    (p) => (p.type || '').toLowerCase() === 'membership'
      || (p.purpose || '').toLowerCase().includes('membership')
      || (p.name || '').toLowerCase().includes('membership')
      || (p.purpose || '').toLowerCase().includes('member')
      || (p.type || '').toLowerCase() === 'member'
      || (p.type || '').toLowerCase() === 'pledge',
  );

  const membershipPledgeAmt = membershipPledge ? parseMoney(membershipPledge.total || membershipPledge.amount) : 0;
  const annualFromPledges = pledges.reduce((sum, item) => sum + parseMoney(item.total || item.amount), 0);

  let annualCommitmentVal = membershipPledgeAmt > 0
    ? membershipPledgeAmt
    : (annualFromPledges > 0 ? annualFromPledges : parseMoney(membership.annualCommitment));

  if (annualCommitmentVal <= 0 && inferredFromPayments.annual > 0) {
    annualCommitmentVal = inferredFromPayments.annual;
  }

  const totalPaidSum = sumPaymentsTotal(payments);
  const contributed = totalPaidSum || parseMoney(membership.contributedYtd)
    || pledges.reduce((sum, item) => sum + parseMoney(item.paid || item.amount), 0)
    || inferredFromPayments.paid;

  const pledgeOutstanding = membershipPledge ? parseMoney(membershipPledge.outstanding) : 0;
  const calculatedOutstanding = pledgeOutstanding > 0
    ? pledgeOutstanding
    : Math.max(annualCommitmentVal - contributed, 0);

  const finalAnnualCommitmentStr = annualCommitmentVal > 0
    ? formatMoney(annualCommitmentVal)
    : (membership.annualCommitment || '$0.00');

  return {
    tier: resolvedTier,
    status: membership.status || 'Active',
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

/** TEST MODE: compress billing cadence. Set false for production. */
const ACCELERATED_SCHEDULE_TEST = true;

function getAcceleratedScheduleDelayMinutes(frequency = 'Monthly') {
  if (!ACCELERATED_SCHEDULE_TEST) return 0;
  const normalized = String(frequency || '').trim().toLowerCase();
  if (normalized.includes('half') || normalized.includes('semi') || normalized.includes('install')) return 5;
  if (normalized.includes('year') || normalized.includes('annual') || normalized.includes('full')) return 10;
  return 1;
}

function addFrequencyInterval(baseDate, frequency) {
  const next = new Date(baseDate.getTime());
  const accelMinutes = getAcceleratedScheduleDelayMinutes(frequency);
  if (accelMinutes > 0) {
    next.setMinutes(next.getMinutes() + accelMinutes);
    return next;
  }
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

  // Next payment date is always the 1st of the month.
  // Monthly: 1st of the month after last payment (or next month from today).
  let nextPaymentDate = '';
  const lastPaymentDate = parseLocalDate(payments[0]?.date || payments[0]?.sortDate);
  const recurringNext = parseLocalDate(activeRecurring?.nextDate);

<<<<<<< HEAD
  if (accelMinutes > 0) {
    let latestAt = 0;
    payments.forEach((payment) => {
      const ts = parseSortableDate(payment.sortDate || payment.date);
      if (ts > latestAt) latestAt = ts;
    });
    try {
      const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const at = Number(parsed?.at) || 0;
        if (at > latestAt) latestAt = at;
      }
    } catch {
      // ignore
    }
    const base = latestAt > 0 ? new Date(latestAt) : now;
    const next = new Date(base.getTime());
    next.setMinutes(next.getMinutes() + accelMinutes);
    nextPaymentDate = toIsoDate(next);
  } else if (scheduleKind === 'installments') {
    const decFirstThisYear = new Date(currentYear, 11, 1);
    if (now < decFirstThisYear) {
      nextPaymentDate = `${currentYear}-12-01`;
    } else {
      nextPaymentDate = `${currentYear + 1}-12-01`;
    }
  } else if (scheduleKind === 'monthly') {
    const firstOfNextMonth = new Date(currentYear, currentMonth + 1, 1);
=======
  if (scheduleKind === 'monthly') {
    const base = lastPaymentDate || recurringNext || new Date();
    const firstOfNextMonth = new Date(base.getFullYear(), base.getMonth() + 1, 1);
>>>>>>> parent of 6654812 (fix 1)
    nextPaymentDate = toIsoDate(firstOfNextMonth);
  } else if (scheduleKind === 'installments') {
    const base = lastPaymentDate || recurringNext || new Date();
    const sixMonthsLater = addFrequencyInterval(base, 'Half Yearly');
    nextPaymentDate = toIsoDate(new Date(sixMonthsLater.getFullYear(), sixMonthsLater.getMonth(), 1));
  } else {
    const raw = activeRecurring?.nextDate || membership.renewalDate || membership.endDate || '';
    const parsed = parseLocalDate(raw);
    nextPaymentDate = parsed
      ? toIsoDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
      : '';
    if (!nextPaymentDate) {
      const now = new Date();
      nextPaymentDate = toIsoDate(new Date(now.getFullYear(), now.getMonth() + 1, 1));
    }
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

const LAST_PAYMENT_AT_KEY = 'portal_last_payment_at';

<<<<<<< HEAD
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
=======
export function markLastPaymentNow() {
  try {
    localStorage.setItem(LAST_PAYMENT_AT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors in private mode.
  }
}

export function getLastPaymentAtMs(sfData) {
  let storedMs = 0;
  try {
    storedMs = parseInt(localStorage.getItem(LAST_PAYMENT_AT_KEY) || '0', 10) || 0;
  } catch {
    storedMs = 0;
  }
  if (storedMs > 0) return storedMs;

  const payments = getPayments(sfData);
  let crmMs = 0;
  payments.forEach((p) => {
    const pDate = p.date ? new Date(p.date) : null;
    if (!pDate || isNaN(pDate.getTime())) return;
    const ms = pDate.getTime();
    if (ms > crmMs) crmMs = ms;
  });

  if (!(crmMs > 0)) return 0;

  // Salesforce dates are day-only. For testing delays, if last payment is today,
  // seed a precise timestamp so Monthly/Half/Yearly cool-down can apply.
  const crmDate = new Date(crmMs);
  const now = new Date();
  const sameDay = crmDate.getFullYear() === now.getFullYear()
    && crmDate.getMonth() === now.getMonth()
    && crmDate.getDate() === now.getDate();

  if (sameDay) {
    markLastPaymentNow();
    try {
      return parseInt(localStorage.getItem(LAST_PAYMENT_AT_KEY) || '0', 10) || Date.now();
    } catch {
      return Date.now();
    }
  }

  return crmMs;
}

export function getPaymentScheduleDelayMs(sfData) {
  const schedule = getPaymentScheduleSummary(sfData);
  if (schedule.scheduleKind === 'monthly') return 60 * 1000;
  if (schedule.scheduleKind === 'installments') return 5 * 60 * 1000;
  if (schedule.scheduleKind === 'full') return 10 * 60 * 1000;
  return 0;
>>>>>>> parent of 6654812 (fix 1)
}

export function isPaymentWindowOpen(sfData) {
  if (!sfData) return false;

  const membership = getMembership(sfData);
  const outstandingVal = parseMoney(membership.outstanding);

<<<<<<< HEAD
  const schedule = getPaymentScheduleSummary(sfData);
  const isMonthly = schedule.scheduleKind === 'monthly'
    || /month/i.test(schedule.frequencyLabel || '');
  const isHalfYearly = schedule.scheduleKind === 'installments'
    || /half/i.test(schedule.frequencyLabel || '');

  const accelMinutes = getAcceleratedScheduleDelayMinutes(
    schedule.frequencyLabel
    || (isMonthly ? 'Monthly' : isHalfYearly ? 'Half Yearly' : 'Annual'),
  );

  if (accelMinutes > 0) {
    // TEST MODE: reopen Make Payment after N minutes from last payment / recent marker.
    let latestAt = 0;
    getPayments(sfData).forEach((payment) => {
      const ts = parseSortableDate(payment.sortDate || payment.date);
      if (ts > latestAt) latestAt = ts;
    });
    try {
      const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const at = Number(parsed?.at) || 0;
        if (at > latestAt) latestAt = at;
      }
    } catch {
      // ignore
    }
    if (latestAt > 0) {
      return Date.now() >= latestAt + (accelMinutes * 60 * 1000);
    }
    return outstandingVal > 0;
  }

  // Monthly: once this month's installment is paid, hide until next month.
  // Without this, the 30-day window for the 1st of next month keeps the button
  // visible for nearly the entire month (e.g. paid Aug 13, due Sep 1).
  if (isMonthly && hasPaymentInCurrentMonth(sfData)) {
=======
  // TEMP testing schedule:
  // Monthly → 1 min after last payment
  // Half Yearly → 5 min after last payment
  // Yearly → 10 min after last payment
  // No schedule / outstanding left → immediately
  if (outstandingVal <= 0) {
>>>>>>> parent of 6654812 (fix 1)
    return false;
  }

  const delayMs = getPaymentScheduleDelayMs(sfData);
  if (!(delayMs > 0)) {
    return true;
  }

<<<<<<< HEAD
  const now = new Date();
  const nextDate = new Date(`${nextDateStr}T00:00:00`);

  if (isNaN(nextDate.getTime())) {
    return outstandingVal > 0;
=======
  const lastPaymentAtMs = getLastPaymentAtMs(sfData);
  if (!(lastPaymentAtMs > 0)) {
    return true;
>>>>>>> parent of 6654812 (fix 1)
  }

  return Date.now() >= lastPaymentAtMs + delayMs;
}

export function formatAddress(account) {
  const parts = [
    account.street,
    [account.city, account.state, account.postalCode].filter(Boolean).join(', '),
    account.country,
  ].filter(Boolean);
  return parts.join(', ') || '—';
}
