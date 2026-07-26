const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isBlank(value) {
  return !value || !String(value).trim();
}

/**
 * First/last name: at least 2 characters after trimming, and not made up
 * entirely of digits (catches someone fat-fingering a phone number in).
 */
export function isValidPersonName(value) {
  const trimmed = String(value || '').trim();
  if (trimmed.length < 2) return false;
  if (/^\d+$/.test(trimmed)) return false;
  return true;
}

export function isValidEmail(value) {
  return EMAIL_PATTERN.test(String(value || '').trim());
}

/**
 * Lenient postal code check (not US-only, since the country list includes
 * Canada/UK/Israel too): just requires a plausible-length alphanumeric code.
 */
export function isValidPostalCode(value) {
  const trimmed = String(value || '').trim();
  return trimmed.length >= 3 && /^[A-Za-z0-9\s-]+$/.test(trimmed);
}

/**
 * Accepts common US formatting ("(123) 456-7890", "123-456-7890",
 * "1234567890", "+1 123 456 7890") by checking the digit count once
 * formatting is stripped.
 */
export function isValidPhoneNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;
  return false;
}

function daysInMonth(month, year) {
  return new Date(year, month, 0).getDate();
}

/**
 * Validates a { month, day, year } birth date (all 1-indexed / 4-digit
 * strings or numbers). Rejects incomplete parts, impossible calendar dates
 * (Feb 30, accounting for leap years), and future dates.
 */
export function validateBirthDateParts({ month, day, year }, fieldLabel = 'birth date') {
  if (isBlank(month) || isBlank(day) || isBlank(year)) {
    return `Please select a complete ${fieldLabel}.`;
  }

  const monthNum = Number(month);
  const dayNum = Number(day);
  const yearNum = Number(year);

  if (!Number.isInteger(monthNum) || monthNum < 1 || monthNum > 12) {
    return 'Please choose a valid month.';
  }
  if (!Number.isInteger(yearNum) || String(yearNum).length !== 4) {
    return 'Please choose a valid year.';
  }
  if (!Number.isInteger(dayNum) || dayNum < 1 || dayNum > daysInMonth(monthNum, yearNum)) {
    return 'That day does not exist in the selected month.';
  }

  const date = new Date(yearNum, monthNum - 1, dayNum);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  if (date > today) {
    return `The ${fieldLabel} cannot be in the future.`;
  }

  return null;
}

/**
 * Validates a single "MM/DD/YYYY" date string (as produced by DateField),
 * reusing the same calendar/leap-year/future-date rules as
 * validateBirthDateParts. `fieldLabel` customizes error copy for non-birth
 * dates (e.g. "anniversary date").
 */
export function validateDateString(value, fieldLabel = 'birth date') {
  if (isBlank(value)) {
    return `Please enter your ${fieldLabel}.`;
  }

  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(value).trim());
  if (!match) {
    return 'Enter a valid date as MM/DD/YYYY.';
  }

  const [, month, day, year] = match;
  return validateBirthDateParts({ month, day, year }, fieldLabel);
}

/**
 * Basic card-number shape check (digit count only — this app never talks to
 * a real card network, so there's no reason to implement a Luhn check that
 * would just give false confidence).
 */
export function isValidCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 13 && digits.length <= 19;
}

export function isValidCvc(value) {
  return /^\d{3,4}$/.test(String(value || '').trim());
}

/**
 * Validates "MM/YY" and rejects an expiration date that has already passed.
 */
export function validateExpirationDate(value) {
  const match = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(value || '').trim());
  if (!match) return 'Enter a valid expiration date as MM/YY.';

  const month = Number(match[1]);
  if (month < 1 || month > 12) return 'Enter a valid expiration month.';

  const year = 2000 + Number(match[2]);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  if (year < currentYear || (year === currentYear && month < currentMonth)) {
    return 'This card has expired.';
  }

  return null;
}

export function isValidRoutingNumber(value) {
  return /^\d{9}$/.test(String(value || '').trim());
}

export function isValidAccountNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length >= 4 && digits.length <= 17;
}
