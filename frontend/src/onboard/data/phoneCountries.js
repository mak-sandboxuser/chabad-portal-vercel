/**
 * Single source of truth for the phone country selector.
 *
 * `digitLengths` is what validation accepts and `maxDigits` is what the input
 * allows to be typed — they must stay in sync, otherwise a country like Israel
 * caps input at 9 digits while validation still demands 10.
 */
export const PHONE_COUNTRIES = [
  {
    code: 'US',
    name: 'United States',
    dialCode: '+1',
    flag: '🇺🇸',
    maxDigits: 10,
    digitLengths: [10],
    example: '(123) 456-7890',
  },
  {
    code: 'CA',
    name: 'Canada',
    dialCode: '+1',
    flag: '🇨🇦',
    maxDigits: 10,
    digitLengths: [10],
    example: '(123) 456-7890',
  },
  {
    code: 'IL',
    name: 'Israel',
    dialCode: '+972',
    flag: '🇮🇱',
    maxDigits: 9,
    digitLengths: [8, 9],
    example: '50 123 4567',
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    dialCode: '+44',
    flag: '🇬🇧',
    maxDigits: 10,
    digitLengths: [10],
    example: '7400 123456',
  },
];

export const DEFAULT_PHONE_COUNTRY = PHONE_COUNTRIES[0];

export function getPhoneCountry(code) {
  return PHONE_COUNTRIES.find((country) => country.code === code) || DEFAULT_PHONE_COUNTRY;
}

/** Digits only, trimmed to the country's max, with a US/CA leading 1 dropped. */
export function normalizePhoneDigits(value, code) {
  const country = getPhoneCountry(code);
  let digits = String(value || '').replace(/\D/g, '');
  if (country.dialCode === '+1' && digits.length === 11 && digits.startsWith('1')) {
    digits = digits.slice(1);
  }
  return digits.slice(0, country.maxDigits);
}

/** "10-digit" / "8–9 digit", for error copy that matches the selected country. */
export function getPhoneLengthLabel(code) {
  const { digitLengths } = getPhoneCountry(code);
  if (digitLengths.length === 1) return `${digitLengths[0]}-digit`;
  return `${digitLengths[0]}–${digitLengths[digitLengths.length - 1]} digit`;
}
