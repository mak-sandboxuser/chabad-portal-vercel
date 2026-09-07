export const ADDITIONAL_FIELD_KEYS = ['birthdate', 'age', 'gender'];

export const ADDITIONAL_FIELD_LABELS = {
  birthdate: 'Birthdate',
  age: 'Age',
  gender: 'Gender',
};

export const LIFECYCLE_FIELD_KEYS = [
  'hebrewName',
  'fathersHebrewName',
  'mothersHebrewName',
  'jewish',
  'hebrewBirthdate',
  'nextHebrewBirthday',
  'weddingDate',
  'lifecycleStatus',
];

export const LIFECYCLE_FIELD_LABELS = {
  hebrewName: 'Hebrew Name',
  fathersHebrewName: "Father's Hebrew Name",
  mothersHebrewName: "Mother's Hebrew Name",
  jewish: 'Jewish',
  hebrewBirthdate: 'Birthdate (Hebrew)',
  nextHebrewBirthday: 'Civil Date of Next Hebrew Birthday',
  weddingDate: 'Wedding Date',
  lifecycleStatus: 'Status',
};

export const EMPTY_PROFILE_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  homePhone: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
  nickname: '',
  title: '',
  hebrewName: '',
  fathersHebrewName: '',
  mothersHebrewName: '',
  jewish: '',
  hebrewBirthdate: '',
  nextHebrewBirthday: '',
  weddingDate: '',
  lifecycleStatus: '',
  birthdate: '',
  age: '',
  gender: '',
  groups: '',
};

function readLifecycleValues(sfData) {
  const profile = sfData?.profile || {};
  const lifecycle = profile.lifecycle || {};
  const additional = profile.additional || {};
  const values = {};

  for (const key of LIFECYCLE_FIELD_KEYS) {
    values[key] = lifecycle[key] || profile[key] || sfData?.[key] || '';
  }

  for (const key of ADDITIONAL_FIELD_KEYS) {
    values[key] = additional[key] || profile[key] || sfData?.[key] || '';
  }

  for (const dateKey of ['nextHebrewBirthday', 'weddingDate', 'birthdate']) {
    if (values[dateKey]) {
      values[dateKey] = toDateInputValue(values[dateKey]);
    }
  }

  return values;
}

function toDateInputValue(value) {
  const normalized = (value ?? '').toString().trim();
  if (!normalized || /^null$/i.test(normalized) || /^undefined$/i.test(normalized)) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) return normalized.slice(0, 10);

  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) return '';

  if (/T\d{2}:\d{2}/.test(normalized) || /Z$/i.test(normalized) || /[+-]\d{2}:?\d{2}$/.test(normalized)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  const local = new Date(parsed);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sfDataToProfileForm(sfData, email = '') {
  if (!sfData) return { ...EMPTY_PROFILE_FORM };

  const firstName = sfData.firstName || sfData.name?.split(/\s+/)[0] || '';
  const lastName = sfData.lastName || sfData.name?.split(/\s+/).slice(1).join(' ') || '';
  const profile = sfData.profile || {};

  return {
    firstName,
    lastName,
    phone: profile.phone || profile.mobile || sfData.mobile || sfData.phone || '',
    homePhone: profile.homePhone || sfData.homePhone || '',
    street: profile.street || profile.primaryStreet || sfData.street || '',
    city: profile.city || profile.primaryCity || sfData.city || '',
    state: profile.state || profile.primaryState || sfData.state || '',
    postalCode: profile.postalCode || profile.primaryPostalCode || sfData.postalCode || '',
    country: profile.country || profile.primaryCountry || sfData.country || '',
    nickname: profile.nickname || sfData.nickname || '',
    title: profile.title || sfData.title || '',
    email: sfData.email || email,
    groups: sfData.groups || sfData.account?.groups || sfData.profile?.groups || '',
    ...readLifecycleValues(sfData),
  };
}

export function profileFormToPayload(form, options = {}) {
  const allowedKeys = Array.isArray(options.keys) && options.keys.length > 0
    ? new Set(options.keys)
    : null;

  const include = (key) => !allowedKeys || allowedKeys.has(key);

  const payload = {};

  const scalarKeys = [
    'firstName',
    'lastName',
    'phone',
    'homePhone',
    'street',
    'city',
    'state',
    'postalCode',
    'country',
    'nickname',
    'title',
    'groups',
    ...LIFECYCLE_FIELD_KEYS,
    ...ADDITIONAL_FIELD_KEYS,
  ];

  for (const key of scalarKeys) {
    if (!include(key)) continue;
    payload[key] = form[key]?.trim?.() || form[key] || '';
  }

  if (allowedKeys) {
    payload.updateFields = [...allowedKeys];
  }

  return payload;
}

export function displayValue(value, fallback = '—') {
  const normalized = (value ?? '').toString().trim();
  return normalized || fallback;
}

export function formatProfileDate(value) {
  const normalized = (value ?? '').toString().trim();
  if (!normalized) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(normalized)) {
    const datePart = normalized.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);
    if (year && month && day) {
      return new Date(year, month - 1, day).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  }
  return normalized;
}

export function formatProfileDisplayValue(key, value) {
  if (key === 'birthdate' || key === 'nextHebrewBirthday' || key === 'weddingDate') {
    return formatProfileDate(value) || '—';
  }
  return displayValue(value);
}
