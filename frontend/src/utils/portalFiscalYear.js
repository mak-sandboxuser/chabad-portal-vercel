/** Portal payment window: Sep 1 through Aug 31 (resets each September). */
const FISCAL_START_MONTH = 9;

/**
 * Optional test clock for proration. Off by default — uses the real current date.
 * Stay logged in, then:
 *   localStorage.setItem('portal_test_date', 'YYYY-MM-DD'); location.reload();
 * Or open: /onboard/membership?mode=update&asOf=YYYY-MM-DD
 * Clear:
 *   localStorage.removeItem('portal_test_date'); location.reload();
 */
export function persistPortalTestDateFromUrl() {
  try {
    const asOf = new URLSearchParams(window.location.search).get('asOf');
    if (asOf && /^\d{4}-\d{2}-\d{2}$/.test(asOf)) {
      localStorage.setItem('portal_test_date', asOf);
      return asOf;
    }
  } catch {
    // ignore
  }
  return '';
}

// Previous (commented out): forced 5 March 2026 for remaining-months proration
// const PORTAL_PRORATION_TEST_DATE = '2026-03-05';

export function getPortalClock(fallback = new Date()) {
  try {
    persistPortalTestDateFromUrl();
    let fromStore = typeof localStorage !== 'undefined'
      ? localStorage.getItem('portal_test_date')
      : '';
    // Retired April 5 / March 5 test clocks — always use the live date unless asOf is set.
    if (String(fromStore || '').trim() === '2026-04-05'
      || String(fromStore || '').trim() === '2026-03-05') {
      try { localStorage.removeItem('portal_test_date'); } catch { /* ignore */ }
      fromStore = '';
    }
    // Previous (commented out): defaulted to 5 March 2026
    // const raw = String(fromStore || PORTAL_PRORATION_TEST_DATE).trim();
    const raw = String(fromStore || '').trim();
    if (!raw) return fallback;
    const parsed = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(`${raw}T12:00:00`)
      : new Date(raw);
    if (Number.isNaN(parsed.getTime())) return fallback;
    return parsed;
  } catch {
    return fallback;
  }
}

export function getPortalTestDateLabel() {
  try {
    const clock = getPortalClock();
    const today = new Date();
    const sameDay = clock.getFullYear() === today.getFullYear()
      && clock.getMonth() === today.getMonth()
      && clock.getDate() === today.getDate();
    if (sameDay) return '';
    return clock.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

function toYmd(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const normalized = String(value ?? '').trim();
  if (!normalized) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);

  const parsed = Date.parse(normalized);
  if (!Number.isFinite(parsed)) return '';
  return toYmd(new Date(parsed));
}

export function getPortalFiscalYearRange(referenceDate = getPortalClock()) {
  const refYmd = toYmd(referenceDate) || toYmd(getPortalClock());
  const [year, month] = refYmd.split('-').map(Number);
  const startYear = month >= FISCAL_START_MONTH ? year : year - 1;
  const endYear = startYear + 1;

  return {
    startDate: `${startYear}-09-01`,
    endDate: `${endYear}-08-31`,
    startYear,
    endYear,
  };
}

export function isDateInPortalFiscalYear(date, referenceDate = getPortalClock()) {
  const ymd = toYmd(date);
  if (!ymd) return false;
  const { startDate, endDate } = getPortalFiscalYearRange(referenceDate);
  return ymd >= startDate && ymd <= endDate;
}

export function formatPortalFiscalYearLabel(range = getPortalFiscalYearRange()) {
  const format = (iso) => {
    const [y, m, d] = iso.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return `${format(range.startDate)} – ${format(range.endDate)}`;
}

export function getPortalFiscalYearLabel() {
  return formatPortalFiscalYearLabel(getPortalFiscalYearRange());
}

/**
 * Membership year tag from last two digits.
 * 1 Sep–31 Dec: current year + next year (25 Oct 2026 → 26-27)
 * 1 Jan–31 Aug: previous year + current year (5 Apr 2027 → 26-27)
 */
export function getMembershipYearTag(referenceDate = getPortalClock()) {
  const range = getPortalFiscalYearRange(referenceDate);
  const start = String(range.startYear).slice(-2);
  const end = String(range.endYear).slice(-2);
  return `${start}-${end}`;
}

export function getMembershipYearSuffix(referenceDate = getPortalClock()) {
  return `${getMembershipYearTag(referenceDate)} (Household)`;
}

/**
 * Months from the current month through August, inclusive.
 * 20 Apr 2026 → Apr–Aug = 5. Sep 2026 → Sep–Aug = 12.
 */
export function getRemainingMembershipMonths(referenceDate = getPortalClock()) {
  const month = referenceDate.getMonth();
  if (month <= 7) {
    return 7 - month + 1;
  }
  return (12 - month) + 8;
}

/**
 * Update Membership: the current month is already paid, so the new tier is
 * charged from next month through August (e.g. paid October → Nov–Aug = 10).
 */
export function getRemainingMembershipMonthsFromNextMonth(referenceDate = getPortalClock()) {
  return Math.max(getRemainingMembershipMonths(referenceDate) - 1, 0);
}

/** 1st of next month (e.g. 12 Oct 2026 → 2026-11-01). */
export function getNextMonthStartDate(referenceDate = getPortalClock()) {
  return new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 1);
}

/**
 * Half-yearly 2nd installment date from the first payment.
 * Sep–Nov → Dec 1 of that year. Jan–Apr → May 1 of that year.
 */
export function getHalfYearlySecondInstallmentDate(firstPaidDate = getPortalClock()) {
  const paid = firstPaidDate instanceof Date && !Number.isNaN(firstPaidDate.getTime())
    ? firstPaidDate
    : getPortalClock();
  const year = paid.getFullYear();
  const month = paid.getMonth();
  if (month >= 8 && month <= 10) return `${year}-12-01`;
  if (month <= 3) return `${year}-05-01`;
  // Previous (commented out): always December 1 of this year or next year
  // const decFirst = new Date(year, 11, 1);
  // return paid < decFirst ? `${year}-12-01` : `${year + 1}-12-01`;
  if (paid < new Date(year, 11, 1)) return `${year}-12-01`;
  return `${year + 1}-12-01`;
}

/** annual / 12 * remaining months through August. 3000 in April → 5 * 250 = 1250. */
export function getProratedMembershipCommitment(annualPrice, referenceDate = getPortalClock()) {
  const months = getRemainingMembershipMonths(referenceDate);
  const monthly = Number(annualPrice || 0) / 12;
  return Math.round(monthly * months * 100) / 100;
}

// Previous (commented out): contribution schedule used the full annual price as Total Commitment
// export function getProratedMembershipCommitment(annualPrice) {
//   return Number(annualPrice || 0);
// }

/**
 * New-member membership selection is open 1 September – 31 May.
 * 1 June – 31 August: registration saves household details only; membership opens in September.
 */
export function isMembershipSelectionOpen(referenceDate = getPortalClock()) {
  const month = referenceDate.getMonth();
  return month >= 8 || month <= 4;
  // Previous (commented out): closed 1 January – 31 August
  // return referenceDate.getMonth() >= 8;
}

/** Next 1 September when new-member membership selection opens. */
export function getMembershipSelectionOpenDate(referenceDate = getPortalClock()) {
  const year = referenceDate.getFullYear();
  return referenceDate.getMonth() >= 8 ? new Date(year + 1, 8, 1) : new Date(year, 8, 1);
}

/** e.g. "1 September 2027" */
export function formatMembershipSelectionOpenDate(referenceDate = getPortalClock()) {
  const date = getMembershipSelectionOpenDate(referenceDate);
  return `1 September ${date.getFullYear()}`;
}

/**
 * Membership renewal season: the day after 31 August (1 September) through 31 December.
 * Hidden from 1 January through 31 August.
 */
export function isAfterAugust31(referenceDate = getPortalClock()) {
  return referenceDate.getMonth() > 7;
}

function hasMembershipPaymentThisFiscalYear(sfData, range) {
  const payments = [
    ...((sfData?.financials?.payments?.length ? sfData.financials.payments : null) || []),
    ...(sfData?.payments || []),
  ];
  return payments.some((payment) => {
    const ymd = toYmd(payment.sortDate || payment.date || '');
    return Boolean(ymd) && ymd >= range.startDate && ymd <= range.endDate;
  });
}

/** True when the dashboard / membership renewal flex should show. */
export function isMembershipRenewalWindowOpen(sfData, referenceDate = getPortalClock()) {
  if (!isAfterAugust31(referenceDate)) return false;

  const range = getPortalFiscalYearRange(referenceDate);
  if (hasMembershipPaymentThisFiscalYear(sfData, range)) return false;

  // Previous (commented out): extra hide rules (group year, recent checkout, recurring)
  // const currentTag = getMembershipYearTag(referenceDate);
  // try {
  //   if (localStorage.getItem('portal_renewed_membership_year') === currentTag) return false;
  // } catch {}
  // if (hasRecentMembershipCheckout()) return false;
  // if (membershipYearBlob(sfData).includes(currentTag)) return false;
  // if (hasActiveMembershipRecurring(sfData, currentTag)) return false;

  return true;
}
