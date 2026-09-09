import { isDateInPortalFiscalYear, getPortalFiscalYearRange, getPortalFiscalYearLabel, getProratedMembershipCommitment, getPortalClock, getHalfYearlySecondInstallmentDate } from './portalFiscalYear.js';
import { ALL_MEMBERSHIP_TIERS } from '../onboard/data/membershipTiers';

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

/** Display OneCRM__Payment_Type__c for payment history Description. */
export function formatPaymentDescription(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '—';
  // Never surface Salesforce API field names.
  if (/^OneCRM__/i.test(raw) || /__c$/i.test(raw)) return '—';
  const lower = raw.toLowerCase();
  // Previous (commented out): Card / Bank short labels
  // if (/^stripe$/i.test(raw) || /stripe/i.test(raw)) return 'Card';
  // if (/credit\s*card/i.test(raw) || /^card$/i.test(raw)) return 'Card';
  if (lower.includes('credit') || lower === 'card' || lower.includes('stripe')) return 'Credit  Card';
  if (lower.includes('ach') || lower.includes('bank') || lower.includes('transfer') || lower.includes('wire')) {
    return 'ACH';
  }
  return raw
    .split(/(\s+|[-_/])/g)
    .map((part) => {
      if (/^\s+$/.test(part) || /^[-_/]$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

/**
 * Dashboard / Payments "Description" — OneCRM__Payment_Type__c from MAKE_PAYMENTS_WEBHOOK_URL.
 */
export function getPaymentHistoryDescription(payment = {}) {
  const candidates = [
    payment.OneCRM__Payment_Type__c,
    payment['Payment Type'],
    payment.paymentType,
    payment.method,
    payment.type,
    payment.purpose,
    payment.subType,
    payment.name,
  ];

  // Previous (commented out): mapped CREDIT CARD → Card and ACH → Bank
  // if (lower.includes('stripe') || lower.includes('credit') || lower === 'card') return 'Card';
  // if (lower.includes('bank') || lower.includes('ach') || lower.includes('transfer')) return 'Bank';

  for (const candidate of candidates) {
    const raw = String(candidate || '').trim();
    if (!raw) continue;
    if (/^OneCRM__/i.test(raw) || /__c$/i.test(raw)) continue;
    const lower = raw.toLowerCase();
    if (lower === 'campaign' || lower.includes('membership') || lower.includes('donation')) continue;
    return formatPaymentDescription(raw);
  }
  return '—';
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

/** Date + time when value has a clock time; date-only strings stay date-only. */
export function formatDisplayDateTime(value) {
  const normalized = (value ?? '').toString().trim();
  if (!normalized) return '—';
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return formatDisplayDate(normalized);
  }
  const hasTime = /T\d{2}:\d{2}/.test(normalized) || /\d{1,2}:\d{2}\s*(AM|PM)?/i.test(normalized);
  if (!hasTime) {
    return formatDisplayDate(normalized);
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return formatDisplayDate(normalized);
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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
  const pledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
  const pledgeIds = new Set(pledges.map((item) => String(item.id || '').trim()).filter(Boolean));
  // const commitmentAmounts = pledges
  //   .map((item) => parseMoney(item.total || item.amount))
  //   .filter((amount) => amount > 0);

  // Never show pledge / commitment rows in payment history (same Salesforce Id).
  const historyOnly = payments.filter((payment) => {
    const id = String(payment.id || '').trim();
    if (id && pledgeIds.has(id)) return false;

    // Previous (commented out): hid full membership payments because $2244 matched the pledge total.
    // const amount = parseMoney(payment.amount) || parseMoney(payment.total);
    // const method = String(payment.method || '').toLowerCase();
    // const name = String(payment.name || payment.purpose || payment.subType || '').toLowerCase();
    // const isCashLine = method.includes('cash') || name.includes('cash payment');
    // if (!isCashLine && commitmentAmounts.some((commitment) => Math.abs(commitment - amount) < 0.02)) {
    //   return false;
    // }
    return true;
  });

  // Payment history is Salesforce/Make only — do not append browser Stripe leftovers.
  // Previous (commented out): mergePendingPayments kept local checkout rows on the dashboard
  // after Salesforce payments were deleted.
  // return mergePendingPayments(filterDisplayPayments(historyOnly), sfData);
  try {
    localStorage.removeItem(PENDING_PORTAL_PAYMENTS_KEY);
  } catch {
    // ignore
  }
  return filterDisplayPayments(historyOnly);
}

function parseSortableDate(value) {
  const normalized = String(value ?? '').trim();
  if (!normalized) return 0;
  // Keep clock time when present (accelerated schedule depends on it).
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized)) {
    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
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
  const id = String(payment.id || '').trim();
  // Prefer Salesforce Income Id so same-day/same-amount installments stay visible.
  // Old key collapsed real payment history to a single row:
  // const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  // const date = String(payment.date || '').slice(0, 10);
  // return `${date}|${amount.toFixed(2)}`;
  if (id && !/^(payment_|local_|pending_)/i.test(id)) {
    return `id:${id}`;
  }
  const amount = parseMoney(payment.amount) || parseMoney(payment.total);
  const date = String(payment.date || '').slice(0, 10);
  return `${date}|${amount.toFixed(2)}|${id || 'anon'}`;
}

function filterDisplayPayments(payments = []) {
  const seen = new Set();
  return sortFinancialRecordsByRecent(
    payments.filter((payment) => {
      const amount = parseMoney(payment.amount) || parseMoney(payment.total);
      if (amount <= 0) return false;
      // Hide browser leftover Stripe checkout rows (pending / local / stripe_ ids).
      if (payment.pending || /^(pending_|local_|stripe_)/i.test(String(payment.id || ''))) {
        return false;
      }

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
      method: payment.method || 'Card',
      // Previous (commented out): method defaulted to 'Stripe' and showed in Description
      // method: payment.method || 'Stripe',
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

  // Once CRM has real payment rows, drop optimistic Stripe / full-commitment placeholders.
  // Pending often stores the annual pledge (e.g. $3000) while CRM correctly has only
  // cash installments ($250), which wrongly appear as an extra "payment" on this page.
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

  const crmLoaded = Boolean(sfData?.financials) || Boolean(sfData?.syncedFromSalesforce);
  const now = Date.now();

  // Previous (commented out): kept local Stripe pending for 7 days when CRM payments
  // were empty — so deleting a payment in Salesforce still showed $2244 paid-in-full.
  // const crmKeys = new Set(crmPayments.map((payment) => paymentDisplayKey(payment)));
  // const pending = readPendingPortalPayments().filter((payment) => {
  //   if (email && payment.email && payment.email !== email) return false;
  //   if (Date.now() - (Number(payment.at) || 0) > RECENT_MEMBERSHIP_PAYMENT_TTL_MS) return false;
  //   if (crmKeys.has(paymentDisplayKey(payment))) return false;
  //   return true;
  // });
  // return sortFinancialRecordsByRecent([...pending, ...crmPayments]);

  // CRM financials loaded with 0 payments: Salesforce is source of truth (payment deleted).
  // Do not keep local Stripe leftovers on the dashboard.
  // Previous (commented out): 20-minute lag still showed deleted payments.
  // if (crmLoaded) {
  //   return age < PENDING_PAYMENTS_CRM_LAG_MS;
  // }
  const pending = readPendingPortalPayments().filter((payment) => {
    if (email && payment.email && payment.email !== email) return false;
    if (crmLoaded) return false;
    const age = now - (Number(payment.at) || 0);
    if (age < 0) return false;
    return age < PENDING_PAYMENTS_CRM_LAG_MS;
  });

  try {
    const others = readPendingPortalPayments().filter(
      (payment) => email && payment.email && payment.email !== email,
    );
    localStorage.setItem(PENDING_PORTAL_PAYMENTS_KEY, JSON.stringify([...pending, ...others]));
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

    // Do not resurrect a deleted Salesforce payment from the onboarding draft.
    const crmPayments = (sfData?.financials?.payments?.length ? sfData.financials.payments : sfData?.payments) || [];
    const crmLoaded = Boolean(sfData?.financials) || Boolean(sfData?.syncedFromSalesforce);
    if (crmLoaded && crmPayments.length === 0) {
      return;
      // Previous (commented out): resurrected pending from draft after SF delete
      // try {
      //   const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
      //   const at = raw ? Number(JSON.parse(raw)?.at) || 0 : 0;
      //   if (!at || Date.now() - at >= PENDING_PAYMENTS_CRM_LAG_MS) return;
      // } catch {
      //   return;
      // }
    }

    let amount = 0;
    let subType = 'Membership';

    try {
      const raw = localStorage.getItem('chabad_membership_onboarding_draft_full');
      if (raw) {
        const draft = JSON.parse(raw);
        // Only the schedule installment that was actually charged — never the pledge total.
        amount = Number(draft?.data?.contributionSchedule?.amount) || 0;
        subType = draft?.data?.membership?.tier || subType;
      }
    } catch {
      // ignore draft parse errors
    }

    if (amount <= 0) return;

    // Hidden: do not recreate a browser leftover from the onboarding draft.
    // storePendingPortalPayment({
    //   email,
    //   amount,
    //   total: amount,
    //   type: 'Campaign',
    //   subType,
    //   purpose: subType,
    //   method: 'Card',
    //   status: 'Paid',
    // });
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
  const recurring = (sfData?.financials?.recurring?.length ? sfData.financials.recurring : sfData?.recurring) || [];
  const activeRecurring = recurring.find((item) => ['active', 'finished', 'open'].includes((item.status || '').toLowerCase())) || recurring[0];
  // const freq = (activeRecurring?.frequency || sfData?.membership?.frequency || '').toLowerCase();

  const displayPayments = getPayments(sfData);
  // const currentYtdPaid = sumPaymentsYtd(displayPayments);

  const membershipObj = sfData?.membership || {};

  const tierPriceMap = {
    'family': 2244,
    'upgraded': 3000,
    'single parent': 1560,
    'single membership': 1128,
    'senior': 1800,
    'chai donor': 5000,
    'chai partner': 10000,
    'chai rabbi': 18000,
    'chai leadership': 36000,
    'single': 1128,
  };

  const resolveTierPriceFromGroup = (tierName = '') => {
    if (!hasRealMembershipGroup(tierName)) return 0;
    const lower = String(tierName).toLowerCase();
    const mapped = Object.entries(tierPriceMap)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([key]) => lower.includes(key))?.[1];
    if (mapped) return mapped;
    const fromCatalog = ALL_MEMBERSHIP_TIERS.find((tier) => {
      const name = String(tier.name || '').toLowerCase();
      return name && lower.includes(name);
    });
    return Number(fromCatalog?.annualPrice) || 0;
  };

  const membershipPaidFromPayments = (payments = []) => payments.reduce((sum, payment) => {
    const amount = parseMoney(payment.amount || payment.total);
    if (amount <= 0) return sum;
    // Do not treat local pending checkout rows as CRM-paid (deleted SF payments).
    if (payment.pending || /^pending_/i.test(String(payment.id || ''))) return sum;
    const blob = `${payment.type || ''} ${payment.subType || ''} ${payment.name || ''} ${payment.purpose || ''}`.toLowerCase();
    // Do not count general donations (e.g. $1 Cash Donation) toward membership paid.
    if (blob.includes('donation') && !blob.includes('membership')) return sum;
    if (amount < 50 && !blob.includes('membership') && !blob.includes('campaign:membership')) return sum;
    return sum + amount;
  }, 0);

  // MAKE_PAYMENTS_WEBHOOK_URL returned empty pledges.
  // Fallback: remaining-months catalog calc (same as Contribution Schedule), not Family $2244.
  if (!rawPledges.length) {
    const tierName = membershipObj.tier || sfData?.account?.groups || sfData?.groups || '';
    const catalogAnnual = resolveTierPriceFromGroup(tierName);
    if (!(catalogAnnual > 0)) return [];
    const memPaid = membershipPaidFromPayments(displayPayments);
    const remainingMonthsOutstanding = getProratedMembershipCommitment(catalogAnnual);
    return [{
      id: 'membership_pledge_catalog_fallback',
      name: tierName || 'Membership',
      purpose: tierName || 'Annual Membership',
      type: 'Pledge',
      subType: 'Annual Membership',
      amount: formatMoney(catalogAnnual),
      total: formatMoney(catalogAnnual),
      paid: formatMoney(memPaid),
      outstanding: formatMoney(remainingMonthsOutstanding),
      date: membershipObj.renewalDate || sfData?.joinedDate || '',
      status: remainingMonthsOutstanding > 0 ? 'Active' : 'Success',
    }];
  }
  // Previous (commented out): invented catalog $2244 as Outstanding when pledges were empty
  // if (!rawPledges.length) {
  //   return [];
  // }
  // Previous (commented out): invented catalog commitment/outstanding when pledges were empty
  // if (!rawPledges.length) {
  //   const tierName = membershipObj.tier || sfData?.account?.groups || sfData?.groups || '';
  //   const memCommitment = resolveTierPriceFromGroup(tierName);
  //   ...
  //   outstanding: formatMoney(Math.max(memCommitment - memPaid, 0)),
  // }

  const explicitMemPledge = rawPledges.find(
    (p) => (p.type || '').toLowerCase() === 'membership'
      || (p.purpose || '').toLowerCase().includes('membership')
      || (p.name || '').toLowerCase().includes('membership'),
  );

  const tierName = membershipObj.tier
    || explicitMemPledge?.purpose
    || explicitMemPledge?.name
    || sfData?.account?.groups
    || sfData?.groups
    || '';
  const realGroup = hasRealMembershipGroup(tierName);
  const matchedTierPrice = resolveTierPriceFromGroup(tierName);

  const explicitAmt = explicitMemPledge ? parseMoney(explicitMemPledge.total || explicitMemPledge.amount) : 0;
  const sfCommitment = parseMoney(membershipObj.annualCommitment);

  // Only invent a membership pledge from real CRM evidence — never from bare
  // role "Member" or an empty financials payload (previously defaulted to $3000).
  let memCommitment = 0;
  if (explicitAmt > 0) memCommitment = explicitAmt;
  else if (matchedTierPrice) memCommitment = matchedTierPrice;
  else if (realGroup && sfCommitment > 0) memCommitment = sfCommitment;

  // Commented out: inventing commitment from payments when pledges are missing
  // caused fake outstanding (e.g. $1 payment → $144 commitment → $143 due).
  // const inferred = inferMembershipFromPayments(displayPayments);
  // if (memCommitment <= 0 && inferred.annual > 0) {
  //   memCommitment = inferred.annual;
  // }
  const inferred = { annual: 0, installment: 0, paid: 0, tier: '' };

  if (memCommitment <= 0) {
    return rawPledges.filter((item) => parseMoney(item.amount || item.total) > 0);
  }

  // Commented out: re-multiplying small amounts invented fake annual totals
  // (e.g. inferred $12 × 12 → $144) when Make pledges were empty.
  // if (memCommitment > 0 && memCommitment < 1000) {
  //   if (freq.includes('half') || freq.includes('semi')) {
  //     memCommitment = memCommitment * 2;
  //   } else if (freq.includes('month') || memCommitment <= 500) {
  //     memCommitment = memCommitment * 12;
  //   }
  // }

  if (memCommitment <= 0) {
    return rawPledges.filter((item) => parseMoney(item.amount || item.total) > 0);
  }

  // Prefer Salesforce pledge Paid / Outstanding when present.
  // Old logic only used payment-history sum, which was wrong after aggressive
  // date|amount payment dedupe (e.g. $250 instead of $1250):
  // const memPaid = currentYtdPaid || parseMoney(membershipObj.contributedYtd);
  // const memOutstanding = Math.max(memCommitment - memPaid, 0);
  const sfPaid = parseMoney(explicitMemPledge?.paid);
  const sfOutstanding = parseMoney(explicitMemPledge?.outstanding);
  // Prefer pledge paid; do not use donation YTD as membership paid.
  const memPaid = Math.max(
    membershipPaidFromPayments(displayPayments),
    sfPaid,
    // currentYtdPaid, // commented out: included $1 donations
    // parseMoney(membershipObj.contributedYtd),
  );
  // Prefer Salesforce OneCRM__Amount_Outstanding__c. If missing, remaining-months
  // catalog calc (Family $2244 in April → $935) — never the full catalog $2244.
  const remainingMonthsOutstanding = getProratedMembershipCommitment(matchedTierPrice || memCommitment);
  const memOutstanding = sfOutstanding > 0
    ? sfOutstanding
    : (memPaid > 0 ? 0 : remainingMonthsOutstanding);
  // Previous (commented out): Salesforce outstanding only (no catalog remaining-months fallback)
  // const memOutstanding = sfOutstanding;
  // Previous (commented out): when Amount_Outstanding__c was 0/missing, used catalog − paid ($2244)
  // const memOutstanding = sfOutstanding > 0
  //   ? sfOutstanding
  //   : Math.max(memCommitment - memPaid, 0);

  const primaryMemPledge = {
    id: explicitMemPledge?.id || 'membership_pledge_primary',
    name: inferred.tier || explicitMemPledge?.name || tierName || 'Membership',
    purpose: inferred.tier || explicitMemPledge?.purpose || tierName || 'Annual Membership',
    type: 'Pledge',
    subType: 'Annual Membership',
    amount: formatMoney(memCommitment),
    total: formatMoney(memCommitment),
    paid: formatMoney(memPaid),
    outstanding: formatMoney(memOutstanding),
    date: explicitMemPledge?.date || membershipObj.renewalDate || sfData?.joinedDate || '',
    status: memOutstanding > 0 ? 'Active' : 'Success',
  };

  return [primaryMemPledge];
}

export function getRecurring(sfData) {
  const recurring = (sfData?.financials?.recurring?.length ? sfData.financials.recurring : sfData?.recurring) || [];
  return sortFinancialRecordsByRecent(
    recurring.filter((item) => {
      const id = String(item.id || '');
      // Keep Salesforce payment programs even when amount was incomplete upstream.
      if (id && !id.startsWith('recurring_')) return true;
      return parseMoney(item.amount) > 0;
    }),
  );
}

export function getSavedCards(sfData) {
  const cards = sfData?.cards || sfData?.savedCards || [];
  return Array.isArray(cards) ? cards : [];
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
/** How long to show a local checkout payment while Salesforce/Make is still empty. */
const PENDING_PAYMENTS_CRM_LAG_MS = 20 * 60 * 1000;

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
      JSON.stringify({
        email: fallbackEmail,
        at: Date.now(),
        paymentId: paymentDetails?.id || paymentDetails?.paymentId || '',
        billingMode: paymentDetails?.billingMode || '',
        amount: parseMoney(paymentDetails?.amount || paymentDetails?.total || 0),
        frequency: paymentDetails?.frequency || '',
      }),
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
      // Hidden: do not keep a browser leftover payment row after Stripe checkout.
      // storePendingPortalPayment({
      //   ...paymentDetails,
      //   email: fallbackEmail,
      // });
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

/** Any Salesforce Groups value worth displaying (e.g. Building Prospects). */
export function hasAssignedSalesforceGroup(value = '') {
  const tier = String(value || '').trim();
  if (!tier) return false;
  if (/^(member|guest|prospect|contact)$/i.test(tier)) return false;
  if (/^(member|guest|prospect|contact)(\s*;\s*(member|guest|prospect|contact))*$/i.test(tier)) {
    return false;
  }
  return true;
}

export function getSalesforceAssignedGroup(sfData) {
  const candidates = [
    sfData?.membership?.tier,
    sfData?.groups,
    sfData?.account?.groups,
    sfData?.profile?.groups,
  ];
  for (const value of candidates) {
    const text = String(value || '').trim();
    if (hasAssignedSalesforceGroup(text)) return formatMembershipDisplayName(text);
  }
  return '';
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
  // Commented out: any cash payment (e.g. $1 General Donation) or a spouse/household
  // contact was treating users with NO Salesforce membership group as members,
  // which skipped the membership stepper and invented "Membership 26-27".
  // const payments = getPayments(sfData);
  // const hasPayments = payments.some((item) => parseMoney(item.amount || item.total) > 0);
  // const contacts = getContacts(sfData);
  // const hasEstablishedHousehold = contacts.length > 1;
  const recurring = (sfData.financials?.recurring?.length ? sfData.financials.recurring : sfData.recurring) || [];
  const hasActiveRecurring = recurring.some(
    (item) => (item.status || '').toLowerCase() === 'active' && parseMoney(item.amount) > 0,
  );

  // Require Salesforce group (paid membership OR other SF groups like Building Prospects),
  // pledge, or recurring — so UI matches paid portal tiers with $0 when group is not a portal tier.
  const hasAnySfGroup = hasAssignedSalesforceGroup(tier);
  if (hasMembershipTiers || hasAnySfGroup || hasPledges || hasActiveRecurring) {
    return false;
  }
  // Previous (commented out): only paid membership tiers counted as members
  // if (hasMembershipTiers || hasPledges || hasActiveRecurring) {
  //   return false;
  // }
  // Previous (commented out):
  // if (hasMembershipTiers || hasPledges || hasPayments || hasActiveRecurring || hasEstablishedHousehold) {
  //   return false;
  // }

  if (hasRecentMembershipPayment(email)) return false;

  if (GUEST_MEMBERSHIP_STATUSES.has(status)) return true;
  // Bare CRM role "Member" with a solo contact and no financial/group evidence
  // is a new pre-login onboarded contact — still a guest until membership payment.
  if (role === 'guest' || role === '' || role === 'member') return true;

  return true;
}

export function formatMembershipDisplayName(name = '') {
  return String(name || '')
    // Previous (commented out): hid "(Household)" in the portal Group label
    // .replace(/(?:\s*\(\s*Household\s*\))+/gi, '')
    .replace(/(?:\s*\(\s*Household\s*\))+/gi, ' (Household)')
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

    // Previous (commented out): hardcoded portal labels without "(Household)"
    // const s = rawStr.toLowerCase();
    // if (s.includes('family membership')) return 'Family Membership 26-27';
    // if (s.includes('upgraded membership')) return 'Upgraded Membership 26-27';
    // if (s.includes('senior citizen')) return 'Senior Citizen Membership 26-27';
    // if (s.includes('single membership')) return 'Single Membership 26-27';
    // if (s.includes('chai donor')) return 'Chai Donor Membership 26-27';
    // if (s.includes('chai partner')) return 'Chai Partner Membership 26-27';
    // if (s.includes('chai rabbi')) return 'Chai Rabbi Circle Membership 26-27';
    // if (s.includes('chai leadership')) return 'Chai Leadership Circle Membership 26-27';
    // if (s.includes('single parent')) return 'Single Parent Family 26-27';
    // if (s.includes('single parent') || /membership\s*\d{2}/.test(s)) return 'Membership 26-27';
    return formatMembershipDisplayName(rawStr);
  };

  const resolvedTierFromGroups = resolveStandardGroup(rawTierCandidate);
  const pledges = getPledges(sfData);
  const recurring = getRecurring(sfData);
  const payments = getPayments(sfData);
  const activeRecurring = recurring.find((item) => (item.status || '').toLowerCase() === 'active') || recurring[0];
  // Paid membership display name (Family / Chai / etc.).
  const paidMembershipTier = hasRealMembershipGroup(resolvedTierFromGroups)
    ? resolvedTierFromGroups
    : '';
  // Commented out: blanking non-membership SF groups hid "Building Prospects" in the portal.
  // const resolvedTier = hasRealMembershipGroup(resolvedTierFromGroups)
  //   ? resolvedTierFromGroups
  //   : '';
  // Show any Salesforce Groups assignment (including Building Prospects).
  const sfAssignedGroup = hasAssignedSalesforceGroup(rawTierCandidate)
    ? formatMembershipDisplayName(rawTierCandidate)
    : '';
  const resolvedTier = paidMembershipTier || sfAssignedGroup;
  // Prefer CRM groups only — never invent a tier when SF has no group.

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
    : (annualFromPledges > 0 ? annualFromPledges : 0);
  // When pledges empty but SF Groups has membership, pledges[] is synthesized
  // from the membership tier price (e.g. Family → $2244) inside getPledges.
  // Commented out: falling back to membership.annualCommitment / payment inference
  // when Make pledges are empty invented fake commitment/outstanding from $1 donations.
  // let annualCommitmentVal = membershipPledgeAmt > 0
  //   ? membershipPledgeAmt
  //   : (annualFromPledges > 0 ? annualFromPledges : parseMoney(membership.annualCommitment));
  // if (annualCommitmentVal <= 0 && inferredFromPayments.annual > 0) {
  //   annualCommitmentVal = inferredFromPayments.annual;
  // }

  const totalPaidSum = sumPaymentsTotal(payments);
  const contributed = totalPaidSum || parseMoney(membership.contributedYtd)
    || pledges.reduce((sum, item) => sum + parseMoney(item.paid || item.amount), 0);
    // || inferredFromPayments.paid;

  const pledgeOutstanding = membershipPledge ? parseMoney(membershipPledge.outstanding) : 0;
  const calculatedOutstanding = pledgeOutstanding;
  // Previous (commented out): catalog commitment − paid when pledge outstanding was missing
  // const calculatedOutstanding = pledgeOutstanding > 0
  //   ? pledgeOutstanding
  //   : (annualCommitmentVal > 0 ? Math.max(annualCommitmentVal - contributed, 0) : 0);
  // Previous (commented out): only used annual - contributed when raw pledge amounts existed
  // const calculatedOutstanding = pledgeOutstanding > 0
  //   ? pledgeOutstanding
  //   : (membershipPledgeAmt > 0 || annualFromPledges > 0
  //     ? Math.max(annualCommitmentVal - contributed, 0)
  //     : 0);

  const finalAnnualCommitmentStr = annualCommitmentVal > 0
    ? formatMoney(annualCommitmentVal)
    : (membership.annualCommitment || '$0.00');

  // Pledges empty + SF group is not a portal paid tier (e.g. Building Prospects):
  // same member UI as Family/Chai, but membership amounts stay $0.
  // If CRM / membership already has a commitment (e.g. Building Donors HH $3000), keep it
  // so first-login Pay Membership → monthly/half-yearly can run.
  const isPortalPaidTier = Boolean(paidMembershipTier);
  const isNonPortalSfGroup = Boolean(sfAssignedGroup) && !isPortalPaidTier;
  const crmCommitment = parseMoney(membership.annualCommitment);
  // Previous (commented out): zeroed all non-portal groups whenever pledges were empty,
  // which hid Pay Membership for SF donor groups that only had CRM commitment.
  // const forceZeroMembershipAmounts = isNonPortalSfGroup && annualCommitmentVal <= 0;
  const forceZeroMembershipAmounts = isNonPortalSfGroup
    && annualCommitmentVal <= 0
    && crmCommitment <= 0;
  const displayCommitment = forceZeroMembershipAmounts ? '$0.00' : finalAnnualCommitmentStr;
  const displayOutstanding = forceZeroMembershipAmounts
    ? '$0.00'
    : formatMoney(calculatedOutstanding);
  // Previous (commented out): fell back to catalog commitment − paid ($2244)
  // : formatMoney(
  //     calculatedOutstanding > 0
  //       ? calculatedOutstanding
  //       : (parseMoney(finalAnnualCommitmentStr) > 0
  //         ? Math.max(parseMoney(finalAnnualCommitmentStr) - contributed, 0)
  //         : 0),
  //   );

  return {
    tier: resolvedTier,
    // Active for any Salesforce group so Membership page matches paid-tier layout.
    status: resolvedTier ? (membership.status || 'Active') : '',
    // Previous (commented out): only paid membership groups got Active status
    // status: paidMembershipTier ? (membership.status || 'Active') : '',
    memberSince: membership.memberSince || sfData?.joinedDate || '',
    renewalDate: membership.renewalDate || membership.endDate || '',
    annualCommitment: displayCommitment,
    contributedYtd: formatMoney(contributed),
    outstanding: displayOutstanding,
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
  // Pledges drive outstanding / commitment; payments drive history / YTD only.
  const calculatedOutstanding = pledgeOutstandingSum;
  // Previous (commented out): catalog annual − contributed when pledge outstanding was missing
  // const calculatedOutstanding = pledgeOutstandingSum > 0
  //   ? pledgeOutstandingSum
  //   : (annual > 0 ? Math.max(annual - contributed, 0) : 0);
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

/**
 * Next charge date for Make/CRM: calendar due date (1st of next month, etc.)
 * with optional accelerated open time (1/5/10 min) in test mode.
 */
export function buildMembershipNextChargeDate({
  frequency = 'Monthly',
  paymentDate = '',
  membershipPaymentCount = 0,
} = {}) {
  const paid = (() => {
    const raw = String(paymentDate || '').slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      const [y, m, d] = raw.split('-').map(Number);
      return new Date(y, m - 1, d);
    }
    return new Date();
  })();
  const freq = String(frequency || '').toLowerCase();
  let calendar = '';

  if (freq.includes('half') || freq.includes('semi') || freq.includes('install')) {
    calendar = getHalfYearlySecondInstallmentDate(paid);
  } else if (freq.includes('year') || freq.includes('annual') || freq.includes('full') || freq.includes('one')) {
    const endYear = paid.getMonth() >= 8 ? paid.getFullYear() + 1 : paid.getFullYear();
    calendar = `${endYear}-09-01`;
  } else {
    const count = Math.max(Number(membershipPaymentCount) || 0, 1);
    const next = new Date(paid.getFullYear(), paid.getMonth() + count, 1);
    calendar = toIsoDate(next);
  }

  const delay = getAcceleratedScheduleDelayMinutes(frequency);
  if (delay > 0) {
    const openAt = new Date();
    openAt.setMinutes(openAt.getMinutes() + delay);
    const [y, m, d] = calendar.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, openAt.getHours(), openAt.getMinutes(), openAt.getSeconds()).toISOString();
  }
  return calendar;
}

/** TEST MODE: Monthly → 1 min, Half Yearly → 5 min, Full/Annual → 10 min. */
const ACCELERATED_SCHEDULE_TEST = true;

function getAcceleratedScheduleDelayMinutes(frequencyOrKind = '') {
  if (!ACCELERATED_SCHEDULE_TEST) return 0;
  const freq = String(frequencyOrKind || '').toLowerCase().trim();
  if (freq.includes('half') || freq.includes('semi') || freq.includes('install')) return 5;
  if (
    freq.includes('annual')
    || freq.includes('yearly')
    || freq.includes('year')
    || freq === 'full'
    || freq.includes('one')
  ) {
    return 10;
  }
  if (freq.includes('month') || freq === 'monthly' || !freq) return 1;
  return 1;
}

function acceleratedDelayForScheduleKind(scheduleKind = '') {
  if (!ACCELERATED_SCHEDULE_TEST) return 0;
  if (scheduleKind === 'monthly') return 1;
  if (scheduleKind === 'installments') return 5;
  if (scheduleKind === 'full') return 10;
  return 0;
}

function readRecentMembershipPaymentRecord(sfData) {
  try {
    const raw = localStorage.getItem(RECENT_MEMBERSHIP_PAYMENT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    const email = String(sfData?.email || '').trim().toLowerCase();
    if (email && data.email && data.email !== email) return null;
    return data;
  } catch {
    return null;
  }
}

function readRecentMembershipPaymentAt(sfData) {
  return Number(readRecentMembershipPaymentRecord(sfData)?.at) || 0;
}

/** Local accelerated clock only — never use CRM date-only midnights (those break the 1-min lock). */
function getAcceleratedClockAt(sfData) {
  return readRecentMembershipPaymentAt(sfData);
}

function getLatestPaymentTimestamp(sfData) {
  let latest = 0;
  getPayments(sfData).forEach((payment) => {
    const ts = parseSortableDate(payment.sortDate || payment.date);
    if (ts > latest) latest = ts;
  });
  return latest;
}

function getLatestMembershipPaymentTimestamp(sfData) {
  let latest = 0;
  getPayments(sfData).filter(isMembershipRelatedItem).forEach((payment) => {
    const ts = parseSortableDate(payment.sortDate || payment.date);
    if (ts > latest) latest = ts;
  });
  const recentAt = readRecentMembershipPaymentAt(sfData);
  if (recentAt > latest) latest = recentAt;
  return latest || getLatestPaymentTimestamp(sfData);
}

/**
 * Attach CRM payment id to the local accelerated clock (do not reset the timer).
 * Timer is started only by markRecentMembershipPayment after checkout.
 */
export function syncAcceleratedScheduleClock(sfData) {
  if (!ACCELERATED_SCHEDULE_TEST || !sfData) return;
  try {
    const payments = getPayments(sfData).filter(isMembershipRelatedItem);
    const last = payments[0];
    if (!last) return;
    const paymentId = String(last.id || `${last.date || ''}|${last.amount || ''}`);
    if (!paymentId || paymentId === '|') return;

    const existing = readRecentMembershipPaymentRecord(sfData);
    if (!existing?.at) return;
    if (existing.paymentId === paymentId) return;

    localStorage.setItem(
      RECENT_MEMBERSHIP_PAYMENT_KEY,
      JSON.stringify({ ...existing, paymentId }),
    );
  } catch {
    // ignore
  }
}

/**
 * TEST MODE: 10 minutes after a full/one-time payment ≈ 1 membership year complete.
 */
export function isAcceleratedMembershipRenewalDue(sfData) {
  if (!sfData || !ACCELERATED_SCHEDULE_TEST) return false;
  const summary = getFinancialSummary(sfData);
  const annual = parseMoney(summary.annual);
  const outstanding = parseMoney(summary.outstanding);
  if (!(annual > 0) || outstanding > 0) return false;

  const activeRecurring = getActiveMembershipRecurring(sfData);
  const recurringFreq = String(activeRecurring?.frequency || '').toLowerCase();
  const installmentFreq = (recurringFreq.includes('month') && !recurringFreq.includes('semi'))
    || recurringFreq.includes('half')
    || recurringFreq.includes('semi');

  const membershipPayments = getPayments(sfData).filter(isMembershipRelatedItem);
  const lastAmt = parseMoney(membershipPayments[0]?.amount || membershipPayments[0]?.total);
  const paidFullAmount = lastAmt > 0 && (amountsMatch(lastAmt, annual) || lastAmt >= annual * 0.9);
  if (installmentFreq && !paidFullAmount) return false;
  if (!paidFullAmount && lastAmt > 0 && lastAmt < annual * 0.85) return false;

  const clockAt = getAcceleratedClockAt(sfData);
  if (!clockAt) return false;
  return Date.now() >= (clockAt + 10 * 60 * 1000);
}

/** When the next accelerated pay / renewal window opens (ms), or 0. */
export function getAcceleratedNextOpenAt(sfData, scheduleKind = '') {
  if (!sfData || !ACCELERATED_SCHEDULE_TEST) return 0;
  const clockAt = getAcceleratedClockAt(sfData);
  if (!clockAt) return 0;
  const summary = getFinancialSummary(sfData);
  const outstanding = parseMoney(summary.outstanding);
  if (outstanding <= 0) return clockAt + 10 * 60 * 1000;
  const delay = acceleratedDelayForScheduleKind(scheduleKind)
    || getAcceleratedScheduleDelayMinutes('Monthly');
  return clockAt + delay * 60 * 1000;
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

function pickActiveRecurringFromList(recurring = []) {
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

function isMembershipRelatedItem(item = {}) {
  const blob = [
    item.name,
    item.purpose,
    item.type,
    item.subType,
    item.OneCRM__Type__c,
    item.OneCRM__Sub_Type__c,
  ].filter(Boolean).join(' ').toLowerCase();
  if (blob.includes('tuition') || blob.includes('building') || blob.includes('hebrew') || blob.includes('school')) {
    return false;
  }
  return blob.includes('member') || blob.includes('membership') || blob.includes('campaign');
}

export function getActiveRecurring(sfData) {
  return pickActiveRecurringFromList(getRecurring(sfData));
}

/** Membership-only recurring. Ignores tuition / building / school programs. */
export function getActiveMembershipRecurring(sfData) {
  return pickActiveRecurringFromList(getRecurring(sfData).filter(isMembershipRelatedItem));
}

/** Catalog list price (Family $2244) — not a prorated CRM pledge ($935). */
export function getMembershipCatalogListPrice(sfData) {
  const membership = getMembership(sfData);
  const blob = [
    membership.tier,
    sfData?.groups,
    sfData?.profile?.groups,
    sfData?.account?.groups,
  ].filter(Boolean).join(' ').toLowerCase();
  const mapped = ALL_MEMBERSHIP_TIERS.find((tier) => {
    const name = String(tier.name || '').toLowerCase();
    return name && blob.includes(name);
  });
  return Number(mapped?.annualPrice) || 0;
}

/**
 * Shared schedule labels/amounts for Dashboard + Financial Overview.
 * Infers monthly / two-installment / full when CRM frequency is missing.
 */
export function getPaymentScheduleSummary(sfData) {
  const summary = getFinancialSummary(sfData);
  const membership = getMembership(sfData);
  const payments = getPayments(sfData);
  // Previous (commented out): first active recurring of any program (e.g. $5000 Recurring Balance).
  // const activeRecurring = getActiveRecurring(sfData);
  const activeRecurring = getActiveMembershipRecurring(sfData);
  const membershipPayments = payments.filter(isMembershipRelatedItem);
  const lastMembershipPayment = membershipPayments[0] || payments[0];
  const lastPaymentAmount = parseMoney(lastMembershipPayment?.amount || lastMembershipPayment?.total);
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

  const catalogAnnual = getMembershipCatalogListPrice(sfData);
  let scheduleKind = scheduleKindFromFrequency(frequency);
  const probe = recurringAmount > 0 ? recurringAmount : lastPaymentAmount;
  const monthlyRate = (catalogAnnual > 0 ? catalogAnnual : summary.annual) / 12;
  const halfRate = (catalogAnnual > 0 ? catalogAnnual : summary.annual) / 2;
  // Prefer installment amounts over CRM frequency (often "Annual" even for monthly payers).
  if ((summary.annual > 0 || catalogAnnual > 0) && probe > 0) {
    if (amountsMatch(probe, monthlyRate) || amountsMatch(probe, summary.annual / 12)) {
      scheduleKind = 'monthly';
    } else if (amountsMatch(probe, halfRate) || amountsMatch(probe, summary.annual / 2)) {
      scheduleKind = 'installments';
    } else if (!scheduleKind && (amountsMatch(probe, summary.annual) || amountsMatch(probe, catalogAnnual))) {
      scheduleKind = 'full';
    } else if (!scheduleKind) {
      scheduleKind = 'full';
    }
  } else if (!scheduleKind) {
    scheduleKind = 'full';
  }
  // Previous (commented out): only inferred schedule when CRM frequency was missing
  // if (!scheduleKind) {
  //   const probe = recurringAmount > 0 ? recurringAmount : lastPaymentAmount;
  //   ...
  // }
  // Previous (commented out): compared only to CRM pledge (e.g. $935), so a $187 Family
  // monthly payment was treated as Annual leftover instead of Monthly.
  // if (summary.annual > 0 && probe > 0) {
  //   if (amountsMatch(probe, summary.annual / 12)) scheduleKind = 'monthly';
  //   ...
  // }

  // Membership installment only — never Recurring Balance / non-membership program amount.
  let scheduledAmount = recurringAmount;
  if (!(scheduledAmount > 0)) {
    if (scheduleKind === 'monthly') {
      scheduledAmount = lastPaymentAmount > 0
        ? lastPaymentAmount
        : (catalogAnnual > 0
          ? Math.round((catalogAnnual / 12) * 100) / 100
          : Math.round((summary.annual / 12) * 100) / 100);
      // Previous (commented out): used CRM pledge/12 (935/12) which is not the monthly charge
      // scheduledAmount = summary.annual > 0
      //   ? Math.round((summary.annual / 12) * 100) / 100
      //   : lastPaymentAmount;
    } else if (scheduleKind === 'installments') {
      scheduledAmount = summary.annual > 0
        ? Math.min(Math.round((summary.annual / 2) * 100) / 100, summary.outstanding || summary.annual / 2)
        : lastPaymentAmount;
    } else {
      scheduledAmount = summary.outstanding;
    }
  }
  // Last installment can be smaller than a full month / half-year.
  if (summary.outstanding > 0 && scheduledAmount > summary.outstanding) {
    scheduledAmount = summary.outstanding;
  }

  // Next payment date rules:
  // - Half Yearly: first installment Sep–Nov → Dec 1 that year; Jan–Apr → May 1 that year.
  // - Monthly: 1st of every upcoming month (e.g. after Sep pay → Oct 1; after 2 pays → Nov 1).
  // - Full payment (paid in full): upcoming renewal = Sept 1 after membership year (e.g. 26-27 → Sep 1, 2027).
  // TEST MODE window: Monthly → 1 min, Half Yearly → 5 min, Full → 10 min (see isPaymentWindowOpen).
  let nextPaymentDate = '';
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  if (scheduleKind === 'installments') {
    const firstInstallmentDates = membershipPayments
      .map((payment) => {
        const ts = parseSortableDate(payment.sortDate || payment.date);
        return ts ? new Date(ts) : null;
      })
      .filter((date) => date && !Number.isNaN(date.getTime()))
      .sort((a, b) => a.getTime() - b.getTime());
    const firstPaidDate = firstInstallmentDates[0] || getPortalClock();
    nextPaymentDate = getHalfYearlySecondInstallmentDate(firstPaidDate);
    // Previous (commented out): 2nd installment always December 1
    // const decFirstThisYear = new Date(currentYear, 11, 1);
    // if (now < decFirstThisYear) {
    //   nextPaymentDate = `${currentYear}-12-01`;
    // } else {
    //   nextPaymentDate = `${currentYear + 1}-12-01`;
    // }
  } else if (scheduleKind === 'monthly') {
    // Advance displayed due date by one calendar month per membership payment.
    // (TEST: 1 minute ≈ 1 month for the pay window; date still shows next month.)
    const paidTimestamps = membershipPayments
      .map((payment) => parseSortableDate(payment.sortDate || payment.date))
      .filter((ts) => ts > 0)
      .sort((a, b) => a - b);
    if (paidTimestamps.length > 0) {
      const first = new Date(paidTimestamps[0]);
      const next = new Date(first.getFullYear(), first.getMonth() + paidTimestamps.length, 1);
      nextPaymentDate = toIsoDate(next);
    } else {
      nextPaymentDate = toIsoDate(new Date(currentYear, currentMonth + 1, 1));
    }
  } else if (scheduleKind === 'full' && summary.outstanding <= 0) {
    // Paid in full — upcoming membership year starts Sept 1 after current tier year (26-27 → 2027-09-01).
    const yearBlob = [
      membership.tier,
      sfData?.groups,
      sfData?.profile?.groups,
      sfData?.account?.groups,
    ].filter(Boolean).join(';');
    let maxEndYear = 0;
    for (const m of String(yearBlob).matchAll(/(\d{2})[-/](\d{2})/g)) {
      maxEndYear = Math.max(maxEndYear, 2000 + parseInt(m[2], 10));
    }
    // Previous (commented out): used Aug 1 next year / renewalDate month, which showed Aug 1, 2027.
    // const raw = activeRecurring?.nextDate || membership.renewalDate || membership.endDate || '';
    // const parsed = parseLocalDate(raw);
    // nextPaymentDate = parsed
    //   ? toIsoDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
    //   : toIsoDate(new Date(currentYear + 1, currentMonth, 1));
    nextPaymentDate = maxEndYear > 0
      ? `${maxEndYear}-09-01`
      : `${currentYear + 1}-09-01`;
  } else {
    const raw = activeRecurring?.nextDate || membership.renewalDate || membership.endDate || '';
    const parsed = parseLocalDate(raw);
    nextPaymentDate = parsed
      ? toIsoDate(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
      : toIsoDate(new Date(currentYear + 1, currentMonth, 1));
  }

  // TEST MODE: keep calendar due date (e.g. Oct 1) but attach the 1/5/10-min open time.
  const accelMinutes = acceleratedDelayForScheduleKind(scheduleKind)
    || (/month/i.test(frequency) ? 1 : 0)
    || (/half|semi/i.test(frequency) ? 5 : 0);
  if (accelMinutes > 0 && nextPaymentDate && summary.outstanding > 0) {
    const clockAt = getAcceleratedClockAt(sfData) || Date.now();
    const openAt = new Date(clockAt + accelMinutes * 60 * 1000);
    const [y, m, d] = String(nextPaymentDate).slice(0, 10).split('-').map(Number);
    if (y && m && d) {
      const withTime = new Date(y, m - 1, d, openAt.getHours(), openAt.getMinutes(), openAt.getSeconds());
      nextPaymentDate = withTime.toISOString();
    }
  }

  // Renewal Date always matches Next Payment date.
  const membershipRenewalDate = nextPaymentDate;

  const balanceLabel = scheduleKind === 'monthly' ? 'Monthly Payments' : 'Net Payment';
  const balanceAmount = scheduleKind === 'full' ? summary.outstanding : scheduledAmount;
  const nextPaymentAmountValue = scheduleKind === 'full' ? summary.outstanding : scheduledAmount;
  // Paid-in-full: show $0.00 (not em dash) for Upcoming Payment card.
  const nextPaymentAmountDisplay = nextPaymentAmountValue > 0
    ? formatMoney(nextPaymentAmountValue)
    : (scheduleKind === 'full' && summary.annual > 0 ? formatMoney(0) : '—');
  // Previous (commented out):
  // nextPaymentAmountDisplay: nextPaymentAmountValue > 0 ? formatMoney(nextPaymentAmountValue) : '—',

  return {
    scheduleKind,
    activeRecurring,
    balanceLabel,
    balanceAmount,
    balanceAmountDisplay: formatMoney(balanceAmount),
    nextPaymentDate,
    nextPaymentDateDisplay: formatDisplayDateTime(nextPaymentDate),
    nextPaymentAmount: nextPaymentAmountValue,
    nextPaymentAmountDisplay,
    membershipRenewalDate,
    membershipRenewalDateDisplay: formatDisplayDateTime(membershipRenewalDate),
    frequencyLabel: formatFrequencyLabel(
      frequency || (scheduleKind === 'monthly' ? 'Monthly' : scheduleKind === 'installments' ? 'Half Yearly' : 'Annual'),
    ),
    paidInFull: scheduleKind === 'full' && summary.outstanding <= 0 && summary.annual > 0,
  };
}

/**
 * Presets for dashboard / overview "Make Payment" → Quick Contribution.
 * Monthly members open Recurring + Monthly + installment (e.g. $187), not One-Time full year.
 */
export function buildMembershipMakePaymentPreset(sfData) {
  const schedule = getPaymentScheduleSummary(sfData);
  const amountValue = Number(schedule.nextPaymentAmount) > 0
    ? Number(schedule.nextPaymentAmount)
    : 0;
  const amount = amountValue > 0 ? amountValue.toFixed(2) : undefined;

  if (schedule.scheduleKind === 'monthly') {
    return {
      amount,
      type: 'Campaign',
      subType: 'Membership',
      billingMode: 'recurring',
      frequency: 'Monthly',
    };
  }
  if (schedule.scheduleKind === 'installments') {
    return {
      amount,
      type: 'Campaign',
      subType: 'Membership',
      billingMode: 'recurring',
      frequency: 'Half Yearly',
    };
  }
  return {
    amount,
    type: 'Campaign',
    subType: 'Membership',
    billingMode: 'one-time',
    frequency: 'Annual',
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

/**
 * Match portal tier to Salesforce-assigned commitment / group.
 * Prefer commitment amount so "…Membership 26-27" does not hit Single Parent ($1560).
 */
export function resolveMembershipTierFromSfData(sfData) {
  const membership = getMembership(sfData);
  const summary = getFinancialSummary(sfData);
  const annual = parseMoney(membership.annualCommitment)
    || parseMoney(summary.annual)
    || parseMoney(summary.outstanding)
    || 0;
  const blob = [
    membership.tier,
    sfData?.groups,
    sfData?.profile?.groups,
    sfData?.account?.groups,
    sfData?.membership?.tier,
  ].filter(Boolean).join(' ').toLowerCase();

  if (annual > 0) {
    const byPrice = ALL_MEMBERSHIP_TIERS.find(
      (tier) => Math.abs(Number(tier.annualPrice) - annual) < 1,
    );
    if (byPrice) return { ...byPrice, annualPrice: annual };
  }

  if (blob.includes('chai leadership')) {
    const tier = ALL_MEMBERSHIP_TIERS.find((item) => item.id === 'chai-leadership-circle');
    if (tier) return { ...tier, annualPrice: annual > 0 ? annual : tier.annualPrice };
  }
  if (blob.includes('chai rabbi')) {
    const tier = ALL_MEMBERSHIP_TIERS.find((item) => item.id === 'chai-rabbis-circle');
    if (tier) return { ...tier, annualPrice: annual > 0 ? annual : tier.annualPrice };
  }
  if (blob.includes('chai partner')) {
    const tier = ALL_MEMBERSHIP_TIERS.find((item) => item.id === 'chai-partner');
    if (tier) return { ...tier, annualPrice: annual > 0 ? annual : tier.annualPrice };
  }
  if (blob.includes('chai donor')) {
    const tier = ALL_MEMBERSHIP_TIERS.find((item) => item.id === 'chai-donor');
    if (tier) return { ...tier, annualPrice: annual > 0 ? annual : tier.annualPrice };
  }

  let best = null;
  let bestScore = 0;
  ALL_MEMBERSHIP_TIERS.forEach((tier) => {
    const needles = [
      String(tier.sfGroup || '').toLowerCase().replace(/\s*\(\s*household\s*\)/gi, '').trim(),
      String(tier.name || '').toLowerCase(),
    ].filter((needle) => needle && needle.length >= 12);

    needles.forEach((needle) => {
      if (blob.includes(needle) && needle.length > bestScore) {
        best = tier;
        bestScore = needle.length;
      }
    });
  });
  if (best) return { ...best, annualPrice: annual > 0 ? annual : best.annualPrice };

  if (annual > 0) {
    return {
      id: 'sf-assigned',
      name: membership.tier || 'Membership',
      sfGroup: membership.tier || 'Membership',
      annualPrice: annual,
    };
  }
  return null;
}

/**
 * CRM assigned membership — show Pay Membership → contribution schedule
 * (monthly / half-yearly / full). First login after Salesforce sets a group
 * with a commitment amount (portal tier OR other SF group e.g. Building Donors).
 */
export function needsSalesforceMembershipScheduleSetup(sfData) {
  if (!sfData || isGuestUser(sfData)) return false;

  const membership = getMembership(sfData);
  const tierName = membership.tier
    || sfData?.groups
    || sfData?.account?.groups
    || sfData?.profile?.groups
    || '';
  // Previous (commented out): only portal paid tiers (Family/Chai/…) showed Pay Membership,
  // so SF groups like "Building Donors HH" never got the dashboard button.
  // if (!hasRealMembershipGroup(tierName)) return false;
  const hasSfAssignedGroup = hasRealMembershipGroup(tierName)
    || hasAssignedSalesforceGroup(tierName)
    || Boolean(getSalesforceAssignedGroup(sfData));
  if (!hasSfAssignedGroup) return false;

  const resolvedTier = resolveMembershipTierFromSfData(sfData);
  const annualFromTier = Number(resolvedTier?.annualPrice) || 0;
  const summary = getFinancialSummary(sfData);
  const annual = parseMoney(membership.annualCommitment) || summary.annual || annualFromTier || 0;
  const outstanding = parseMoney(summary.outstanding) || parseMoney(membership.outstanding) || 0;
  const paid = parseMoney(summary.totalContributed)
    || parseMoney(summary.contributed)
    || parseMoney(membership.contributedYtd)
    || 0;
  const payments = getPayments(sfData);

  // Commented out: required pledge annual/outstanding > 0, which hid the dashboard
  // Pay button when Salesforce Groups had a membership but Make pledges were empty
  // (Family Membership 26-27 with Commitment $0 / Outstanding $0).
  // if (!(annual > 0) || !(outstanding > 0)) return false;
  // if (payments.length > 0 && paid > 0) return false;
  // return paid <= 0;

  // Building Prospects / empty-amount SF groups: no Pay Membership ($0 commitment).
  if (!(annual > 0)) return false;

  // Ignore tiny non-membership donations (e.g. $1 General Donation) as "already paid".
  const hasMembershipPayment = payments.some((payment) => {
    const amount = parseMoney(payment.amount || payment.total);
    if (amount <= 0) return false;
    const blob = `${payment.type || ''} ${payment.subType || ''} ${payment.name || ''} ${payment.purpose || ''}`.toLowerCase();
    if (blob.includes('donation') && !blob.includes('membership')) return false;
    if (amount < 50 && !blob.includes('membership')) return false;
    return blob.includes('membership')
      || blob.includes('campaign')
      || blob.includes('cash payment');
  });
  if (hasMembershipPayment) return false;

  // Real pledge already fully paid — no schedule setup needed.
  if (outstanding <= 0 && paid >= annual && annual > 0) {
    const pledges = (sfData?.financials?.pledges?.length ? sfData.financials.pledges : sfData?.pledges) || [];
    if (pledges.some((item) => parseMoney(item.paid) > 0)) return false;
  }

  return true;
}

export function isPaymentWindowOpen(sfData) {
  if (!sfData) return false;

  const summary = getFinancialSummary(sfData);
  const outstandingVal = parseMoney(summary.outstanding);
  if (outstandingVal <= 0) return false;

  // Salesforce-assigned unpaid membership: always allow pay setup.
  if (needsSalesforceMembershipScheduleSetup(sfData)) return true;

  const schedule = getPaymentScheduleSummary(sfData);

  // TEST MODE: never use calendar-month lock — only the 1/5/10 minute local clock.
  if (ACCELERATED_SCHEDULE_TEST) {
    let accelMinutes = acceleratedDelayForScheduleKind(schedule.scheduleKind);
    if (!accelMinutes && /month/i.test(schedule.frequencyLabel || '')) accelMinutes = 1;
    if (!accelMinutes && /half|semi/i.test(schedule.frequencyLabel || '')) accelMinutes = 5;
    if (!accelMinutes && /annual|year|full/i.test(schedule.frequencyLabel || '')) accelMinutes = 10;
    // Default membership installment testing to monthly cadence when kind is ambiguous.
    if (!accelMinutes && outstandingVal > 0) accelMinutes = 1;

    const clockAt = getAcceleratedClockAt(sfData);
    if (!clockAt) return true;
    return Date.now() >= (clockAt + accelMinutes * 60 * 1000);
  }

  const isMonthly = schedule.scheduleKind === 'monthly'
    || /month/i.test(schedule.frequencyLabel || '');

  // Monthly: once this month's installment is paid, hide until next month.
  if (isMonthly && hasPaymentInCurrentMonth(sfData)) {
    return false;
  }

  const nextDateStr = schedule.nextPaymentDate;

  if (!nextDateStr) {
    return outstandingVal > 0;
  }

  const now = new Date();
  const nextDate = new Date(
    String(nextDateStr).includes('T') ? nextDateStr : `${nextDateStr}T00:00:00`,
  );

  if (isNaN(nextDate.getTime())) {
    return outstandingVal > 0;
  }

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
