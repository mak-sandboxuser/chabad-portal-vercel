const {
  getPortalFiscalYearRange,
  isDateInPortalFiscalYear,
  formatPortalFiscalYearLabel,
} = require('./portalFiscalYear');

function stripTrailingCommas(jsonText) {
  return jsonText.replace(/,\s*([}\]])/g, '$1');
}

/** Make sometimes embeds raw newlines inside JSON string values (e.g. street). */
function escapeNewlinesInJsonStrings(text) {
  if (!text || typeof text !== 'string') return text;

  let result = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        result += ch;
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        result += ch;
        escaped = true;
        continue;
      }
      if (ch === '"') {
        result += ch;
        inString = false;
        continue;
      }
      if (ch === '\n') {
        result += '\\n';
        continue;
      }
      if (ch === '\r') {
        result += '\\r';
        continue;
      }
      if (ch === '\t') {
        result += '\\t';
        continue;
      }
      result += ch;
      continue;
    }

    if (ch === '"') inString = true;
    result += ch;
  }

  return result;
}

/**
 * Make Array Aggregator sometimes returns `"contacts": {...}, {...}` instead of
 * `"contacts": [{...},{...}]`. Wrap consecutive bare objects into a JSON array.
 */
function wrapBareObjectListFields(text) {
  if (!text || typeof text !== 'string') return text;

  const fields = ['relationships', 'payments', 'pledges', 'recurring', 'contacts', 'paymentPrograms', 'members', 'householdMembers'];
  let result = text;

  for (const field of fields) {
    const key = `"${field}"`;
    let searchFrom = 0;

    while (searchFrom < result.length) {
      const idx = result.indexOf(key, searchFrom);
      if (idx === -1) break;

      let i = idx + key.length;
      while (i < result.length && /\s/.test(result[i])) i += 1;
      if (result[i] !== ':') {
        searchFrom = idx + key.length;
        continue;
      }
      i += 1;
      while (i < result.length && /\s/.test(result[i])) i += 1;

      // Already a proper array / scalar — leave alone.
      if (result[i] !== '{') {
        searchFrom = i + 1;
        continue;
      }

      const objects = [];
      while (i < result.length && result[i] === '{') {
        const start = i;
        let depth = 0;
        let inString = false;
        let escaped = false;

        for (; i < result.length; i += 1) {
          const ch = result[i];
          if (inString) {
            if (escaped) {
              escaped = false;
            } else if (ch === '\\') {
              escaped = true;
            } else if (ch === '"') {
              inString = false;
            }
            continue;
          }
          if (ch === '"') {
            inString = true;
          } else if (ch === '{') {
            depth += 1;
          } else if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
              i += 1;
              objects.push(result.slice(start, i));
              break;
            }
          }
        }

        while (i < result.length && /\s/.test(result[i])) i += 1;
        if (result[i] === ',') {
          const afterComma = i + 1;
          let j = afterComma;
          while (j < result.length && /\s/.test(result[j])) j += 1;
          if (result[j] === '{') {
            i = j;
          } else {
            // Trailing comma before the next object key — leave it for the suffix/rest.
            break;
          }
        } else {
          break;
        }
      }

      if (!objects.length) {
        searchFrom = idx + key.length;
        continue;
      }

      // Keep a separating comma when the next field key follows
      // (Make often emits ` {...}, {...}, "nextField": ...`).
      let suffix = '';
      const peek = i;
      if (result[peek] === '"' || /[}\]]/.test(result[peek] || '')) {
        suffix = ',';
      }

      const replacement = `${key}: [${objects.join(', ')}]${suffix}`;
      result = `${result.slice(0, idx)}${replacement}${result.slice(i)}`;
      searchFrom = idx + replacement.length;
    }
  }

  return result;
}

/** Make sometimes emits empty list values: `"payments":  }` or `"pledges": ,`. */
function repairEmptyListFieldValues(text) {
  if (!text || typeof text !== 'string') return text;
  const fields = 'relationships|payments|pledges|recurring|contacts|paymentPrograms|members|householdMembers|records';
  return text
    .replace(new RegExp(`"(${fields})"(\\s*:\\s*)([,}\\]])`, 'g'), '"$1"$2[]$3')
    .replace(new RegExp(`"(${fields})"(\\s*:\\s*)$`, 'g'), '"$1"$2[]');
}

/** Make Array Aggregator sometimes returns `{...}, {...}` instead of `[{...},{...}]` */
function repairMakeArrayFieldsJson(text) {
  if (!text || typeof text !== 'string') return text;
  return wrapBareObjectListFields(
    repairEmptyListFieldValues(escapeNewlinesInJsonStrings(text)),
  );
}

function repairMakePortalJson(text) {
  return repairMakeArrayFieldsJson(text);
}

function repairMakeRelationshipsJson(text) {
  return repairMakeArrayFieldsJson(text);
}

function parseMakePayload(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  let text = rawText.trim();
  if (!text) return null;

  // Make sometimes returns JSON as a quoted string.
  if (text.startsWith('"') && text.endsWith('"')) {
    try {
      text = JSON.parse(text);
    } catch {
      text = text.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, '\n');
    }
  }

  if (typeof text !== 'string') return text;

  const attempts = [
    text,
    escapeNewlinesInJsonStrings(text),
    repairEmptyListFieldValues(text),
    repairMakeRelationshipsJson(text),
    stripTrailingCommas(text),
    stripTrailingCommas(escapeNewlinesInJsonStrings(text)),
    stripTrailingCommas(repairEmptyListFieldValues(text)),
    stripTrailingCommas(repairMakeRelationshipsJson(text)),
    stripTrailingCommas(text.replace(/\\"/g, '"')),
    stripTrailingCommas(repairMakeRelationshipsJson(text.replace(/\\"/g, '"'))),
  ];

  for (const candidate of attempts) {
    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed === 'string') {
        try {
          return JSON.parse(stripTrailingCommas(repairMakePortalJson(parsed)));
        } catch {
          return null;
        }
      }
      return parsed;
    } catch {
      // try next
    }
  }

  return null;
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

/** Make.com Array Aggregator wraps lists as { array: [...], __IMTAGGLENGTH__: n } */
function unwrapMakeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object' && Array.isArray(value.array)) return value.array;
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const keys = Object.keys(value);
    if (keys.length && !keys.includes('array')) return [value];
  }
  return [];
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === 'true' || normalized === 'yes' || normalized === '1';
}

function resolveContactRole(raw = {}) {
  const explicitRole = raw.role
    || raw.contactRole
    || raw['Role']
    || raw.Roles
    || raw['Roles']
    || '';
  const normalizedRole = String(explicitRole || '').trim();
  if (normalizedRole && !/^member$/i.test(normalizedRole)) {
    return normalizedRole;
  }

  if (toBool(raw.isPrimary ?? raw.primaryMember ?? raw.primary ?? raw.IsPrimaryMember)) {
    return 'Parent';
  }
  if (toBool(raw.isSecondary ?? raw.secondaryMember ?? raw.secondary)) {
    return 'Parent';
  }

  const memberType = String(raw.memberType || '').trim().toLowerCase();
  if (memberType === 'child') return 'Child';
  if (memberType === 'primary' || memberType === 'secondary') return 'Parent';

  return normalizedRole || 'Member';
}

function getContactKey(contact = {}) {
  const key = String(contact.contactId || contact.id || '').trim();
  return key.startsWith('003') ? key : '';
}

function mergeContactsList(...lists) {
  const merged = new Map();

  lists.flat().filter(Boolean).forEach((contact, index) => {
    const normalized = normalizeContact(contact, index);
    const key = getContactKey(normalized);
    if (!key) return;
    const existing = merged.get(key) || {};
    merged.set(key, { ...existing, ...normalized });
  });

  return [...merged.values()];
}

function extractAllContactsFromPayload(payload = {}) {
  const sources = [
    payload.contacts,
    payload.householdContacts,
    payload.accountContacts,
    payload.householdMembers,
    payload.members,
    payload.accountContactRelations,
    payload.contactsByAccount,
    payload.searchResults,
  ];

  return mergeContactsList(...sources.map((source) => unwrapMakeArray(source)));
}

/** Normalize SF/Make date values to yyyy-mm-dd (or '' when empty/cleared). */
function toIsoDateOnly(value) {
  if (value == null || value === '') return '';
  const text = String(value).trim();
  if (!text || /^null$/i.test(text) || /^undefined$/i.test(text)) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) return '';

  // Salesforce date/datetime often arrives as UTC midnight — keep the calendar day.
  if (/T\d{2}:\d{2}/.test(text) || /Z$/i.test(text) || /[+-]\d{2}:?\d{2}$/.test(text)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }

  const local = new Date(parsed);
  const year = local.getFullYear();
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function firstContactField(raw = {}, keys = []) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) continue;
    const value = raw[key];
    if (value == null) return '';
    return String(value).trim();
  }
  for (const key of keys) {
    const value = raw[key];
    if (value == null || value === '') continue;
    return String(value).trim();
  }
  return '';
}

function normalizeContact(raw = {}, index = 0) {
  const contactId = String(
    raw.contactId
    || raw.Id
    || raw.id
    || raw['Contact ID']
    || raw['Record ID']
    || '',
  ).trim();
  const firstName = raw.firstName || raw.FirstName || raw['First Name'] || '';
  const lastName = raw.lastName || raw.LastName || raw['Last Name'] || '';
  const isPrimary = toBool(
    raw.isPrimary
    ?? raw.primaryMember
    ?? raw.primary
    ?? raw.IsPrimaryMember
    ?? raw['Primary Member']
    ?? raw.OneCRM__Primary_Member__c,
  );
  const isSecondary = toBool(
    raw.isSecondary
    ?? raw.secondaryMember
    ?? raw.secondary
    ?? raw.IsSecondaryMember
    ?? raw['Secondary Member']
    ?? raw.OneCRM__Secondary_Member__c,
  );

  const birthdate = toIsoDateOnly(firstContactField(raw, [
    'birthdate', 'Birthdate', 'BirthDate', 'birthDate',
  ]));
  const nextHebrewBirthday = toIsoDateOnly(firstContactField(raw, [
    'nextHebrewBirthday',
    'Civil Date of Next Hebrew Birthday',
    'Next Civil Birthday',
    'OneCRM__Civil_Date_of_Next_Hebrew_Birthday__c',
  ]));
  const weddingDate = toIsoDateOnly(firstContactField(raw, [
    'weddingDate', 'Wedding Date', 'Anniversary Date', 'OneCRM__Wedding_Date__c',
  ]));
  const hebrewBirthdate = firstContactField(raw, [
    'hebrewBirthdate',
    'Birthdate (Hebrew)',
    'OneCRM__Birthdate_Hebrew__c',
    'OneCRM__Hebrew_Birthdate__c',
  ]);
  const hebrewName = firstContactField(raw, [
    'hebrewName', 'Hebrew Name', 'OneCRM__Hebrew_Name__c',
  ]);
  const fathersHebrewName = firstContactField(raw, [
    'fathersHebrewName', "Father's Hebrew Name", 'OneCRM__Father_s_Hebrew_Name__c',
  ]);
  const mothersHebrewName = firstContactField(raw, [
    'mothersHebrewName', "Mother's Hebrew Name", 'OneCRM__Mother_s_Hebrew_Name__c',
  ]);
  const jewish = firstContactField(raw, ['jewish', 'Jewish', 'OneCRM__Jewish__c']);
  const lifecycleStatus = firstContactField(raw, [
    'lifecycleStatus', 'Status', 'status', 'OneCRM__Status__c',
  ]);
  const ageRaw = firstContactField(raw, ['age', 'Age', 'Stated Age', 'OneCRM__Age__c']);
  // SF Age formula is often 0 when Birthdate is blank — treat that as empty in the portal.
  const age = (!birthdate && (ageRaw === '' || ageRaw === '0')) ? '' : ageRaw;
  const gender = firstContactField(raw, ['gender', 'Gender', 'OneCRM__Gender__c']);
  const nickname = firstContactField(raw, ['nickname', 'Nickname', 'OneCRM__Nickname__c']);
  const title = firstContactField(raw, ['title', 'Title', 'Salutation', 'salutation']);
  const homePhone = firstContactField(raw, [
    'homePhone', 'Home Phone', 'HomePhone', 'home_phone',
  ]);
  const mobilePhone = firstContactField(raw, [
    'phone', 'mobile', 'MobilePhone', 'Mobile Phone', 'Phone', 'Business Phone',
  ]);

  return {
    id: contactId || raw.id || `contact_${index}`,
    name: raw.name
      || raw.Name
      || raw['Full Name']
      || [firstName, lastName].filter(Boolean).join(' ').trim()
      || 'Member',
    firstName,
    lastName,
    role: resolveContactRole({ ...raw, isPrimary, isSecondary }),
    isPrimary,
    isSecondary,
    contactId,
    email: raw.email || raw.Email || '',
    phone: mobilePhone,
    homePhone,
    street: raw.street
      || raw.MailingStreet
      || raw['Mailing Street']
      || raw['Primary Street']
      || raw.primaryStreet
      || '',
    city: raw.city
      || raw.MailingCity
      || raw['Mailing City']
      || raw['Primary City']
      || raw.primaryCity
      || '',
    state: raw.state
      || raw.MailingState
      || raw['Mailing State']
      || raw['Primary State']
      || raw.primaryState
      || '',
    postalCode: raw.postalCode
      || raw.MailingPostalCode
      || raw['Mailing Postal Code']
      || raw['Primary Postal Code']
      || raw.primaryPostalCode
      || '',
    country: raw.country
      || raw.MailingCountry
      || raw['Mailing Country']
      || raw['Primary Country']
      || raw.primaryCountry
      || '',
    groups: raw.groups || raw.Groups || raw.OneCRM__Groups__c || raw.OneCRM__Group__c || raw.group || raw.Group || '',
    nickname,
    title,
    hebrewName,
    fathersHebrewName,
    mothersHebrewName,
    jewish,
    hebrewBirthdate,
    nextHebrewBirthday,
    weddingDate,
    lifecycleStatus,
    birthdate,
    age,
    gender,
    profile: {
      phone: mobilePhone,
      mobile: mobilePhone,
      homePhone,
      street: raw.street || raw.MailingStreet || raw['Mailing Street'] || raw['Primary Street'] || '',
      city: raw.city || raw.MailingCity || raw['Mailing City'] || raw['Primary City'] || '',
      state: raw.state || raw.MailingState || raw['Mailing State'] || raw['Primary State'] || '',
      postalCode: raw.postalCode || raw.MailingPostalCode || raw['Mailing Postal Code'] || raw['Primary Postal Code'] || '',
      country: raw.country || raw.MailingCountry || raw['Mailing Country'] || raw['Primary Country'] || '',
      nickname,
      title,
      hebrewName,
      fathersHebrewName,
      mothersHebrewName,
      jewish,
      hebrewBirthdate,
      nextHebrewBirthday,
      weddingDate,
      lifecycleStatus,
      birthdate,
      age,
      gender,
      lifecycle: {
        hebrewName,
        fathersHebrewName,
        mothersHebrewName,
        jewish,
        hebrewBirthdate,
        nextHebrewBirthday,
        weddingDate,
        lifecycleStatus,
      },
      additional: {
        birthdate,
        age,
        gender,
      },
    },
  };
}

function markPrimaryHouseholdContact(contacts = [], memberDetails = {}) {
  if (!Array.isArray(contacts) || !contacts.length) return contacts;

  const ownerId = String(memberDetails.contactId || '').trim();
  const ownerEmail = String(memberDetails.email || '').trim().toLowerCase();
  let found = false;

  const next = contacts.map((contact) => {
    const id = String(contact.contactId || contact.id || '').trim();
    const email = String(contact.email || '').trim().toLowerCase();
    const isOwner = (ownerId && id === ownerId) || (ownerEmail && email && email === ownerEmail);
    if (!isOwner) return contact;
    found = true;
    return {
      ...contact,
      isPrimary: true,
      role: contact.role && contact.role !== 'Member' ? contact.role : 'Parent',
    };
  });

  if (found) return next;
  return next.map((contact, index) => (
    index === 0
      ? { ...contact, isPrimary: true, role: contact.role && contact.role !== 'Member' ? contact.role : 'Parent' }
      : contact
  ));
}

function mergeHouseholdPortalData(portalData = {}, householdData = null) {
  if (!householdData) return portalData;

  // Household webhook is the source of truth for who is on the account.
  // Replacing (not union-merging) lets Salesforce removals drop off the portal.
  // Previously this kept deleted members forever via:
  // contacts: mergeContactsList(portalData.contacts, householdData.contacts),
  const householdContacts = Array.isArray(householdData.contacts)
    ? householdData.contacts
    : [];
  const useHouseholdContactsAsSourceOfTruth = Boolean(
    householdData.fromSalesforce && Array.isArray(householdData.contacts),
  );

  return {
    ...portalData,
    fromSalesforce: Boolean(portalData.fromSalesforce || householdData.fromSalesforce),
    accountId: householdData.accountId || portalData.accountId || '',
    accountName: householdData.accountName || portalData.accountName || '',
    phone: householdData.phone || portalData.phone || '',
    email: householdData.email || portalData.email || '',
    street: householdData.street || portalData.street || '',
    city: householdData.city || portalData.city || '',
    state: householdData.state || portalData.state || '',
    postalCode: householdData.postalCode || portalData.postalCode || '',
    country: householdData.country || portalData.country || '',
    contacts: useHouseholdContactsAsSourceOfTruth
      ? householdContacts
      : mergeContactsList(portalData.contacts, householdContacts),
    // Same for relationships: empty SF list must clear stale portal relationships.
    // relationships: householdData.relationships?.length
    //   ? householdData.relationships
    //   : (portalData.relationships || []),
    relationships: householdData.fromSalesforce && Array.isArray(householdData.relationships)
      ? householdData.relationships
      : (householdData.relationships?.length
        ? householdData.relationships
        : (portalData.relationships || [])),
  };
}

function normalizeRelationship(raw = {}, index = 0) {
  let person1 = raw.person1
    || raw.relatedPerson
    || raw.fromName
    || raw['Person (Contact)']
    || raw.OneCRM__Related_Contact__c
    || '';
  const explanation = raw.explanation
    || raw.relationshipExplanation
    || raw['Relationship Explanation']
    || raw.OneCRM__Relationship_Explanation__c
    || '';
  let person2 = raw.person2
    || raw.person
    || raw.toName
    || raw['Full Name']
    || raw.Name
    || raw.OneCRM__Contact__c
    || '';

  // Make.com sometimes maps the related contact lookup ID instead of the display name.
  if (/^003[\w]{12,18}$/i.test(String(person1).trim()) && explanation) {
    const nameMatch = explanation.match(/^(.+?)\s+is\s+/i);
    if (nameMatch) person1 = nameMatch[1].trim();
  }
  if (!person1 && explanation) {
    const nameMatch = explanation.match(/^(.+?)\s+is\s+/i);
    if (nameMatch) person1 = nameMatch[1].trim();
  }
  if (/^003[\w]{12,18}$/i.test(String(person2).trim()) && explanation) {
    const nameMatch = explanation.match(/is\s+(.+?)'s\s/i);
    if (nameMatch) person2 = nameMatch[1].trim();
  }

  return {
    id: raw.id || `relationship_${index}`,
    person1,
    person2,
    status: raw.status || raw.Status || raw.OneCRM__Status__c || 'Current',
    type: raw.type || raw.Type || raw.relationshipType || raw.OneCRM__Type__c || '',
    explanation,
  };
}

function formatMoneyField(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'number') return `$${Math.abs(value).toFixed(2)}`;
  return String(value);
}

function parseMoneyValue(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Math.abs(value);
  const normalized = String(value).replace(/[^0-9.-]/g, '');
  const amount = parseFloat(normalized);
  return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function getRawPaymentAmount(raw = {}) {
  const positiveAmount = raw['Positive Amount'] ?? raw.OneCRM__Positive_Amount__c;
  if (positiveAmount != null && positiveAmount !== '' && parseMoneyValue(positiveAmount) > 0) {
    return parseMoneyValue(positiveAmount);
  }
  const rawAmount = raw.amount ?? raw.Amount ?? raw.OneCRM__Amount__c;
  if (typeof rawAmount === 'number' && rawAmount !== 0) {
    return Math.abs(rawAmount);
  }
  const paid = raw.paid ?? raw['Paid Amount'] ?? raw.OneCRM__Paid__c;
  return parseMoneyValue(paid);
}

function resolvePledgeAmount(raw = {}) {
  const positive = parseMoneyValue(raw.OneCRM__Positive_Amount__c ?? raw['Positive Amount']);
  const outstanding = parseMoneyValue(raw.OneCRM__Amount_Outstanding__c ?? raw['Outstanding Amount']);
  const paid = parseMoneyValue(raw.OneCRM__Paid__c ?? raw['Paid Amount'] ?? raw.paid);
  const rawAmount = parseMoneyValue(raw.OneCRM__Amount__c ?? raw.amount ?? raw.Amount ?? raw.pledgeAmount ?? raw.total ?? raw.Total);

  if (rawAmount > 0) return rawAmount;
  if (outstanding > 0 && paid > 0) return outstanding + paid;
  if (positive > 0) return positive;
  if (outstanding > 0) return outstanding;
  if (paid > 0) return paid;
  return 0;
}

function mergePledgeRecords(explicit = [], income = []) {
  const byId = new Map();
  [...explicit, ...income].forEach((raw) => {
    const id = raw.Id || raw.id || raw['Record ID'] || '';
    const key = id || `${raw.OneCRM__Date__c || raw.date}|${resolvePledgeAmount(raw)}|${raw.OneCRM__Paid__c || 0}`;
    if (!byId.has(key)) byId.set(key, raw);
  });
  return [...byId.values()];
}

function isSendInvoicesRecord(raw = {}) {
  const paymentType = String(raw.OneCRM__Payment_Type__c || raw['Payment Type'] || '').trim().toLowerCase();
  return paymentType === 'send invoices';
}

/** ChabadOne Financials → Payments: cash line items and fully paid parent income rows. */
function isSalesforcePaymentRecord(raw = {}) {
  if (isSendInvoicesRecord(raw)) return false;

  const status = String(raw.status || raw.Status || raw['Processing Status'] || raw.OneCRM__Status__c || '').trim().toLowerCase();
  const paymentType = String(raw.OneCRM__Payment_Type__c || raw['Payment Type'] || raw.type || raw.Type || '').trim().toLowerCase();
  const rawAmount = getRawPaymentAmount(raw);
  const paid = parseMoneyValue(raw.paid ?? raw['Paid Amount'] ?? raw.OneCRM__Paid__c ?? raw.paidAmount);
  const outstanding = parseMoneyValue(raw.outstanding ?? raw['Outstanding Amount'] ?? raw.OneCRM__Amount_Outstanding__c ?? raw.outstandingBalance);

  if (status === 'paid' || status === 'success' || status === 'completed') return true;
  if (rawAmount < 0 && paymentType === 'cash') return true;
  if (rawAmount > 0 && (paid > 0 || status === 'paid') && outstanding === 0) return true;
  if (paymentType === 'cash') return true;

  return false;
}

function isIncomePledgeRecord(raw = {}) {
  if (isSendInvoicesRecord(raw)) return false;

  const status = String(raw.status || raw.Status || raw['Processing Status'] || raw.OneCRM__Status__c || '').trim().toLowerCase();
  if (status === 'paid' || status === 'success' || status === 'completed') return false;

  if (isSalesforcePaymentRecord(raw)) return false;

  const amount = resolvePledgeAmount(raw) || getRawPaymentAmount(raw);
  const outstanding = parseMoneyValue(raw.outstanding ?? raw['Outstanding Amount'] ?? raw.OneCRM__Amount_Outstanding__c ?? raw.outstandingBalance);

  return amount > 0 && (outstanding > 0 || status === 'active' || status === 'pledged');
}

/** Match ChabadOne Contact → Financials → Payments tab. */
function shouldIncludePaymentRecord(raw = {}, normalized = {}) {
  const amount = getRawPaymentAmount(raw)
    || parseMoneyValue(normalized.amount)
    || parseMoneyValue(normalized.total);
  if (amount <= 0) return false;

  const paymentType = String(
    raw.OneCRM__Payment_Type__c ?? raw['Payment Type'] ?? raw.method ?? normalized.method ?? '',
  ).trim().toLowerCase();
  const method = String(normalized.method || raw.method || '').trim().toLowerCase();
  const status = String(normalized.status || raw.status || raw.Status || '').trim().toLowerCase();

  if (status === 'paid' || status === 'success' || status === 'completed') return true;
  if (paymentType === 'cash' || method === 'cash') return true;
  if (method.includes('stripe')) return true;
  if (method.includes('bank') || method.includes('transfer') || method.includes('ach')) return true;
  if (isSalesforcePaymentRecord(raw)) return true;

  return true;
}

function shouldIncludePledgeRecord(raw = {}, normalized = {}) {
  const paymentType = String(raw.OneCRM__Payment_Type__c || raw['Payment Type'] || normalized.method || '').trim().toLowerCase();
  if (paymentType === 'cash') return false;
  if (paymentType === 'send invoices') return false;

  const status = String(normalized.status || raw.status || raw.Status || raw.OneCRM__Status__c || '').trim().toLowerCase();
  const outstanding = parseMoneyValue(
    normalized.outstanding
    ?? raw.outstanding
    ?? raw.OneCRM__Amount_Outstanding__c
    ?? raw['Outstanding Amount'],
  );
  const paid = parseMoneyValue(
    normalized.paid ?? raw.paid ?? raw.OneCRM__Paid__c ?? raw['Paid Amount'],
  );

  // Fully paid rows belong in payment history, not pledges.
  if ((status === 'paid' || status === 'success' || status === 'completed') && outstanding <= 0 && paid > 0) {
    return false;
  }

  const amount = resolvePledgeAmount(raw)
    || parseMoneyValue(normalized.amount)
    || parseMoneyValue(normalized.total);
  return amount > 0;
}

function resolveRecurringAmount(raw = {}) {
  const perCharge = parseMoneyValue(
    raw.OneCRM__Amount_Per_Charge__c
    ?? raw.amountPerCharge
    ?? raw.amount
    ?? raw.Amount,
  );
  if (perCharge > 0) return perCharge;

  const totalEstimated = parseMoneyValue(
    raw.OneCRM__Total_Estimated_Revenue__c
    ?? raw.totalEstimatedRevenue
    ?? raw.OneCRM__Amount__c
    ?? raw.total
    ?? raw.Total,
  );
  const charges = Number(
    raw.OneCRM__Number_of_Charges__c
    ?? raw.OneCRM__Total_Number_of_Charges__c
    ?? raw.numberOfCharges
    ?? 0,
  );
  if (totalEstimated > 0 && charges > 1) {
    return Math.round((totalEstimated / charges) * 100) / 100;
  }
  if (totalEstimated > 0) return totalEstimated;
  return 0;
}

function isPaymentProgramRecord(raw = {}) {
  const type = String(raw.attributes?.type || raw.type || raw.Type || '').toLowerCase();
  return type.includes('payment_program') || type.includes('paymentprogram');
}

function shouldIncludeRecurringRecord(raw = {}, normalized = {}) {
  const amount = parseMoneyValue(normalized.amount) || resolveRecurringAmount(raw);
  const schedule = String(
    raw.OneCRM__Schedule__c || raw.Schedule || raw.schedule || normalized.frequency || '',
  ).trim();
  const frequency = String(
    raw.OneCRM__Frequency__c || raw.Frequency || raw.frequency || normalized.frequency || '',
  ).trim();
  const billingMode = String(raw.billingMode || raw.isRecurring || '').toLowerCase();
  const status = String(
    normalized.status || raw.status || raw.Status || raw.OneCRM__Status__c || '',
  ).trim().toLowerCase();

  // Salesforce Payment Program rows from MAKE_PAYMENTS_WEBHOOK_URL — keep even when
  // Amount_Per_Charge is 0 (Make often leaves it blank and only sends totals).
  if (isPaymentProgramRecord(raw) && (raw.Id || raw.id)) {
    if (status === 'cancelled' || status === 'canceled' || status === 'inactive') return false;
    return true;
  }

  if (amount <= 0) return false;
  return Boolean(schedule) || Boolean(frequency) || billingMode.includes('recurring');
}

function filterNormalizedRecurring(recurring = []) {
  return recurring
    .filter((item) => {
      const id = String(item.id || '');
      if (id && !id.startsWith('recurring_')) return true;
      return parseMoneyValue(item.amount) > 0;
    })
    .sort((a, b) => compareFinancialRecordsByRecent(
      { ...a, date: a.nextDate },
      { ...b, date: b.nextDate },
    ));
}

function filterNormalizedPledges(pledges = []) {
  const seen = new Set();
  return pledges
    .filter((pledge) => {
      const amount = parseMoneyValue(pledge.amount) || parseMoneyValue(pledge.total);
      if (amount <= 0) return false;
      const key = `${pledge.date || ''}|${amount.toFixed(2)}|${parseMoneyValue(pledge.paid).toFixed(2)}|${parseMoneyValue(pledge.outstanding).toFixed(2)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => compareFinancialRecordsByRecent(a, b));
}

function paymentDedupeKey(payment = {}) {
  const id = String(payment.id || '').trim();
  // Keep distinct Salesforce Income rows even when date + amount match
  // (monthly installments posted on the same day all look identical otherwise).
  // Old key collapsed real payment history:
  // const amount = parseMoneyValue(payment.amount) || parseMoneyValue(payment.total);
  // const date = String(payment.date || '').slice(0, 10);
  // return `${date}|${amount.toFixed(2)}`;
  if (id && !/^(payment_|local_|pending_)/i.test(id)) {
    return `id:${id}`;
  }
  const amount = parseMoneyValue(payment.amount) || parseMoneyValue(payment.total);
  const date = String(payment.date || '').slice(0, 10);
  return `${date}|${amount.toFixed(2)}|${id || 'anon'}`;
}

function compareFinancialRecordsByRecent(a, b) {
  const toTime = (record) => {
    const value = record.sortDate || record.date || '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      const [year, month, day] = value.slice(0, 10).split('-').map(Number);
      return new Date(year, month - 1, day).getTime();
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const dateDiff = toTime(b) - toTime(a);
  if (dateDiff !== 0) return dateDiff;
  return String(b.id || '').localeCompare(String(a.id || ''));
}

function filterNormalizedPayments(payments = []) {
  const seen = new Set();
  const hasRealSfPayments = payments.some((p) => p.id && !p.id.startsWith('payment_'));

  return payments
    .filter((payment) => {
      if (hasRealSfPayments && payment.id && payment.id.startsWith('payment_')) return false;
      const amount = parseMoneyValue(payment.amount) || parseMoneyValue(payment.total);
      if (amount <= 0) return false;
      // Always use content-based key for deduplication — never rely on ID alone
      // because Salesforce can return the same payment with different record IDs
      const key = paymentDedupeKey(payment);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort(compareFinancialRecordsByRecent);
}

function normalizeSfPaymentTypeLabel(value = '') {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  // Never surface Salesforce API names as display text.
  if (/^OneCRM__/i.test(raw) || /__c$/i.test(raw)) return '';
  const lower = raw.toLowerCase();
  // Previous (commented out): Card / Bank short labels for Description
  // if (lower.includes('stripe') || lower.includes('credit') || lower === 'card' || ...) return 'Card';
  // if (lower.includes('bank') || lower.includes('ach') || ...) return 'Bank';
  if (
    lower.includes('credit')
    || lower === 'card'
    || lower.includes('stripe')
    || lower.includes('visa')
    || lower.includes('master')
    || lower.includes('amex')
  ) {
    return 'Credit  Card';
  }
  if (lower.includes('ach') || lower.includes('bank') || lower.includes('transfer') || lower.includes('wire')) {
    return 'ACH';
  }
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('check') || lower.includes('cheque')) return 'Check';
  if (lower.includes('send invoice') || lower.includes('invoice')) return 'Invoice';
  return raw
    .split(/(\s+|[-_/])/g)
    .map((part) => {
      if (/^\s+$/.test(part) || /^[-_/]$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join('');
}

function normalizePayment(raw = {}, index = 0) {
  const positiveAmount = raw['Positive Amount'] ?? raw.OneCRM__Positive_Amount__c;
  const rawAmount = raw.amount ?? raw.Amount ?? raw.OneCRM__Amount__c;
  const paidRaw = raw.paid ?? raw['Paid Amount'] ?? raw.OneCRM__Paid__c ?? '';
  const positiveValue = parseMoneyValue(positiveAmount);
  const amount = (positiveValue > 0 ? positiveValue : null)
    ?? (typeof rawAmount === 'number' && rawAmount < 0 ? Math.abs(rawAmount) : null)
    ?? (typeof rawAmount === 'number' && rawAmount > 0 ? rawAmount : null)
    ?? parseMoneyValue(paidRaw)
    ?? raw['Income Total']
    ?? '';
  const total = raw.total ?? raw.totalAmount ?? raw.Total ?? raw['Income Total'] ?? amount;
  const paid = paidRaw;
  const outstanding = raw.outstanding ?? raw.outstandingBalance ?? raw.Outstanding
    ?? raw['Outstanding Amount'] ?? raw.OneCRM__Amount_Outstanding__c ?? 0;
  const rawDate = raw.date ?? raw.paymentDate ?? raw.PaymentDate ?? raw['Income Date']
    ?? raw['Payment Date'] ?? raw.Date ?? raw.OneCRM__Date__c ?? '';
  const sortDate = typeof rawDate === 'string' ? rawDate : '';
  const date = typeof rawDate === 'string' && rawDate.includes('T')
    ? rawDate.split('T')[0]
    : rawDate;

  // Description source of truth: OneCRM__Payment_Type__c (Cash, Credit Card, …).
  const paymentTypeRaw = raw.OneCRM__Payment_Type__c
    ?? raw['Payment Type']
    ?? raw.method
    ?? raw.paymentMethod
    ?? raw['Payment Method']
    ?? '';
  // Previous (commented out): also used Payment Plan, which is schedule not tender type.
  // raw['Payment Plan'] || raw.OneCRM__Payment_Type__c
  const methodLabel = normalizeSfPaymentTypeLabel(paymentTypeRaw)
    || (parseMoneyValue(raw.OneCRM__Paid__c ?? raw['Paid Amount']) > 0 ? 'Cash' : '');

  return {
    id: raw.id || raw.paymentId || raw['Record ID'] || raw.Id || `payment_${index}`,
    amount: formatMoneyField(amount) || formatMoneyField(paid) || formatMoneyField(total) || '',
    total: formatMoneyField(total) || formatMoneyField(amount),
    paid: formatMoneyField(paid) || '$0.00',
    date,
    sortDate,
    outstanding: formatMoneyField(outstanding) || '$0.00',
    payer: raw.payer || raw.payerName || raw.parent || raw.accountName || raw['Payer / Parent'] || raw['Parent Account'] || raw['Related Contact'] || '',
    type: (() => {
      const fromName = String(raw.Name || raw.name || '');
      const namedType = fromName.includes(':') ? fromName.split(':')[0].trim() : '';
      // Previous (commented out): raw['Payment Type'] mixed tender type into Campaign/Donation type.
      // return raw.OneCRM__Type__c || raw.type || raw.paymentType || raw.Type || raw['Payment Type'] || raw['Recognition Type']
      return raw.OneCRM__Type__c || raw.type || raw.Type || raw['Recognition Type']
        || namedType
        || 'Campaign';
    })(),
    subType: (() => {
      const fromName = String(raw.Name || raw.name || '');
      const namedSubType = fromName.includes(':') ? fromName.split(':').slice(1).join(':').trim() : fromName;
      return raw.OneCRM__Sub_Type__c || raw.subType || raw.subtype || raw['Sub-Type'] || raw['Sub Type']
        || raw['Income Name'] || raw.IncomeName || raw.purpose
        || namedSubType
        || 'Membership';
    })(),
    // Description: OneCRM__Payment_Type__c (Credit  Card / ACH / Cash).
    method: methodLabel,
    // Previous (commented out):
    // method: raw.method || raw.paymentMethod || raw['Payment Method'] || raw['Payment Plan'] || raw.OneCRM__Payment_Type__c
    //   || (parseMoneyValue(raw.OneCRM__Paid__c ?? raw['Paid Amount']) > 0 ? 'Cash' : ''),
    paymentType: methodLabel || String(paymentTypeRaw || '').trim(),
    OneCRM__Payment_Type__c: String(paymentTypeRaw || '').trim(),
    status: (() => {
      const s = raw.status || raw.Status || raw['Processing Status'] || raw.OneCRM__Status__c || 'Paid';
      const sl = s.toLowerCase();
      if (sl.includes('pending') || sl.includes('process') || sl.includes('unpaid') || sl.includes('hold')) {
        return 'Pending';
      }
      return 'Paid';
    })(),
  };
}

function normalizePledge(raw = {}, index = 0) {
  let amountValue = resolvePledgeAmount(raw);
  const paidVal = parseMoneyValue(raw.paid ?? raw.paidAmount ?? raw.Paid ?? raw.OneCRM__Paid__c);
  let outstandingVal = parseMoneyValue(raw.outstanding ?? raw.Outstanding ?? raw.OneCRM__Amount_Outstanding__c);

  const purpose = raw.OneCRM__Sub_Type__c || raw.subType || raw.subtype || raw['Sub-Type'] || raw['Sub Type']
    || raw['Income Name'] || raw.IncomeName
    || raw.purpose || raw.Purpose || raw.OneCRM__Purpose__c
    || raw.name || raw.pledgeName || raw.Name || raw['Pledge Name']
    || raw.OneCRM__Type__c || raw.type || raw.Type
    || 'Annual Membership';

  const tierPriceMap = {
    'family membership': 2244,
    'upgraded membership': 3000,
    'single parent family': 1560,
    'single membership': 1128,
    'senior citizen membership': 1800,
    'chai donor': 5000,
    'chai partner': 10000,
    "chai rabbi's circle": 18000,
    'chai leadership circle': 36000,
  };

  const lookupKey = purpose.toLowerCase().trim();
  const matchedTierPrice = Object.entries(tierPriceMap).find(([key]) => lookupKey.includes(key))?.[1];

  if (matchedTierPrice && amountValue < matchedTierPrice) {
    amountValue = matchedTierPrice;
  }

  const calculatedOutstanding = Math.max(0, amountValue - paidVal);
  if (outstandingVal <= 0 || (amountValue > (outstandingVal + paidVal))) {
    outstandingVal = calculatedOutstanding;
  }

  const rawDate = raw.date ?? raw.pledgeDate ?? raw.Date ?? raw['Pledge Date'] ?? raw.OneCRM__Date__c ?? '';
  const date = typeof rawDate === 'string' && rawDate.includes('T') ? rawDate.split('T')[0] : rawDate;

  return {
    id: raw.id || raw.Id || raw.pledgeId || raw['Record ID'] || `pledge_${index}`,
    amount: formatMoneyField(amountValue),
    outstanding: formatMoneyField(outstandingVal) || '$0.00',
    total: formatMoneyField(amountValue),
    paid: formatMoneyField(paidVal),
    name: raw.name || raw.pledgeName || raw.Name || raw['Pledge Name'] || raw.OneCRM__Sub_Type__c || raw.subType || 'Membership',
    purpose,
    parent: raw.parent || raw.parentAccount || raw.accountName || raw['Parent Account'] || raw['Related Contact'] || '',
    type: raw.OneCRM__Type__c || raw.type || raw.Type || 'Pledge',
    subType: raw.OneCRM__Sub_Type__c || raw.subType || raw.subtype || raw['Sub-Type'] || raw['Sub Type'] || 'Annual Membership',
    date,
    status: raw.status || raw.Status || raw.OneCRM__Status__c || 'Active',
  };
}

function extractLast4FromText(value = '') {
  const text = String(value || '');
  const endingIn = text.match(/ending\s+(?:in\s+)?(\d{4})\b/i);
  if (endingIn) return endingIn[1];
  const hyphenated = text.match(/credit\s*card\s*[-–]\s*(\d{4})\b/i);
  if (hyphenated) return hyphenated[1];
  const trailing = text.match(/(\d{4})\s*$/);
  if (trailing && /credit\s*card/i.test(text)) return trailing[1];
  return '';
}

function pickRelatedCreditCard(raw = {}) {
  return raw.OneCRM__Next_Charge_Credit_Card__r
    || raw.Next_Charge_Credit_Card__r
    || raw.OneCRM__Payment_Method__r
    || raw.Payment_Method__r
    || raw.OneCRM__Credit_Card__r
    || raw.Credit_Card__r
    || {};
}

function pickRecurringLast4(raw = {}) {
  const related = pickRelatedCreditCard(raw);
  const last4 = String(
    raw.OneCRM__Last4__c
    || raw.last4
    || raw.Last4
    || raw['Last 4']
    || raw.lastFour
    || raw['OneCRM__Next_Charge_Credit_Card__r.OneCRM__Last4__c']
    || related.OneCRM__Last4__c
    || related.last4
    || related.Last4
    || '',
  ).replace(/\D/g, '');
  if (last4) return last4.slice(-4);
  return extractLast4FromText(
    related.OneCRM__Label__c
    || related.label
    || raw.OneCRM__Label__c
    || raw.Name
    || raw.name
    || raw.OneCRM__Payment_Type__c
    || raw['Payment Type']
    || '',
  );
}

function formatRecurringPaymentMethod(paymentType = '', last4 = '') {
  const typeLabel = String(paymentType || '').replace(/\s+/g, ' ').trim();
  const digits = String(last4 || '').replace(/\D/g, '').slice(-4);
  if (digits && /credit\s*card/i.test(typeLabel)) {
    const typeOnly = typeLabel.replace(/[\s-]+\d{2,4}$/, '').trim() || 'Credit Card';
    return `${typeOnly}-${digits}`;
  }
  return typeLabel;
}

function normalizeRecurring(raw = {}, index = 0) {
  const rawNext = raw.nextDate ?? raw.nextChargeDate ?? raw['Next Charge Date'] ?? raw['Next Charge']
    ?? raw.OneCRM__Next_Charge_Date__c ?? raw.OneCRM__Next_Date__c ?? '';
  const nextDate = typeof rawNext === 'string' && rawNext.includes('T') ? rawNext.split('T')[0] : rawNext;
  const amountValue = resolveRecurringAmount(raw);
  const paymentType = raw.method || raw.paymentMethod || raw['Payment Method'] || raw.OneCRM__Payment_Type__c || '';
  const last4 = pickRecurringLast4(raw);

  return {
    id: raw.id || raw.Id || raw.recurringId || raw['Record ID'] || `recurring_${index}`,
    name: raw.Name || raw.name || raw.OneCRM__Name__c || '',
    amount: formatMoneyField(amountValue) || '$0.00',
    frequency: raw.frequency || raw.schedule || raw.Schedule || raw.OneCRM__Schedule__c
      || raw.Frequency || raw.OneCRM__Frequency__c || 'Monthly',
    nextDate,
    status: raw.status || raw.Status || raw.OneCRM__Status__c || 'Active',
    method: formatRecurringPaymentMethod(paymentType, last4) || paymentType,
    paymentType,
    last4,
    OneCRM__Payment_Type__c: String(paymentType || '').trim(),
    OneCRM__Last4__c: last4,
    cardExpiry: raw.cardExpiry || raw.expires || raw['Card Expiry'] || raw['Expires'] || raw.OneCRM__Card_Expiry__c || '',
    type: raw.type || raw.planType || raw.Type || raw.OneCRM__Type__c || '',
  };
}

function normalizeMembership(raw = {}) {
  if (!raw || typeof raw !== 'object') return null;
  const keys = Object.keys(raw);
  if (!keys.length) return null;
  const rawTier = String(raw.tier || raw.membershipTier || '').trim();
  const isBareTier = !rawTier || /^(member|guest|prospect|contact)$/i.test(rawTier);
  return {
    // Do not invent "Member" / "Active" for contacts who have not chosen a tier.
    tier: isBareTier ? '' : rawTier,
    status: isBareTier ? '' : (raw.status || raw.membershipStatus || ''),
    memberSince: raw.memberSince || raw.memberSinceDate || '',
    renewalDate: raw.renewalDate || raw.nextRenewalDate || '',
    annualCommitment: raw.annualCommitment || raw.annualAmount || '',
    contributedYtd: raw.contributedYtd || raw.contributed || '',
    outstanding: raw.outstanding || '',
    autoRenewal: raw.autoRenewal || (toBool(raw.autoRenew) ? 'Enabled' : 'Disabled'),
    paymentMethod: raw.paymentMethod || '',
    paymentMethodExpiry: raw.paymentMethodExpiry || raw.cardExpiry || '',
    notes: raw.notes || raw.membershipNotes || '',
  };
}

function buildContactsFromMemberDetails(memberDetails = {}) {
  if (!memberDetails.contactId && !memberDetails.name) return [];

  return [{
    id: memberDetails.contactId || 'primary_contact',
    name: memberDetails.name || memberDetails.email?.split('@')[0] || 'Member',
    role: memberDetails.role || 'Member',
    isPrimary: true,
    isSecondary: false,
    contactId: memberDetails.contactId || '',
    email: memberDetails.email || '',
    phone: memberDetails.mobile || memberDetails.phone || '',
  }];
}

function extractPortalDataFromPayload(payload, memberDetails = {}) {
  if (!payload || typeof payload !== 'object') {
    return {
      fromSalesforce: false,
      contacts: buildContactsFromMemberDetails(memberDetails),
      relationships: [],
      payments: [],
      pledges: [],
      recurring: [],
      membership: null,
    };
  }

  // MAKE_PAYMENTS_WEBHOOK_URL may return:
  // 1) Separated object: { pledges: [...], payments: [...] }  ← trust as-is
  // 2) Bare Salesforce Income__c array / { records: [...] } ← split by heuristics
  if (Array.isArray(payload)) {
    payload = { records: payload };
  }

  const contacts = extractAllContactsFromPayload(payload);
  const relationships = unwrapMakeArray(payload.relationships || payload.householdRelationships)
    .map(normalizeRelationship);

  // New Make payments hook may return a Salesforce query shape:
  // { totalSize, done, records: [ OneCRM__Income__c, ... ] }
  const sfIncomeRecords = unwrapMakeArray(payload.records).filter((record) => {
    if (!record || typeof record !== 'object') return false;
    const type = String(record.attributes?.type || record.type || '').toLowerCase();
    if (!type) return true;
    return type.includes('income') || type.includes('onecrm__income');
  });

  // Make scenario returns separated keys even when a value is a single object
  // or an empty/broken list — trust presence of pledges/payments keys.
  const hasMakeSeparatedFinancials = Object.prototype.hasOwnProperty.call(payload, 'payments')
    || Object.prototype.hasOwnProperty.call(payload, 'pledges')
    || Object.prototype.hasOwnProperty.call(payload, 'incomePayments')
    || Object.prototype.hasOwnProperty.call(payload, 'incomePledges')
    || Boolean(payload.financials && (
      Object.prototype.hasOwnProperty.call(payload.financials, 'payments')
      || Object.prototype.hasOwnProperty.call(payload.financials, 'pledges')
    ));

  let rawPaymentRecords = [];
  let rawPledgeRecords = [];

  if (hasMakeSeparatedFinancials) {
    // Make already separated pledges (commitment / outstanding) from payments (history).
    // Do not reclassify by Status — Salesforce pledges often use Status "Success"
    // even when Paid=0 and Amount_Outstanding > 0.
    rawPledgeRecords = unwrapMakeArray(
      payload.pledges || payload.incomePledges || payload.financials?.pledges,
    );
    rawPaymentRecords = unwrapMakeArray(
      payload.payments || payload.incomePayments || payload.financials?.payments,
    );
    const pledgeIdSet = new Set(
      rawPledgeRecords.map((record) => record.Id || record.id || record['Record ID']).filter(Boolean),
    );
    rawPaymentRecords = rawPaymentRecords.filter((record) => {
      const id = record.Id || record.id || record['Record ID'] || '';
      if (id && pledgeIdSet.has(id)) return false;
      // Parent campaign commitment rows belong only under pledges.
      if (isIncomePledgeRecord(record)) return false;
      const status = String(record.OneCRM__Status__c || record.status || record.Status || '').trim().toLowerCase();
      const outstanding = parseMoneyValue(
        record.OneCRM__Amount_Outstanding__c ?? record.outstanding ?? record['Outstanding Amount'],
      );
      const name = String(record.Name || record.name || '').toLowerCase();
      const paymentType = String(record.OneCRM__Payment_Type__c || record['Payment Type'] || '').trim().toLowerCase();
      if (paymentType === 'cash' || name.includes('cash payment')) return true;
      if (status === 'active' && outstanding > 0) return false;
      if (name.includes('campaign:membership') && outstanding > 0) return false;
      return true;
    });
  } else {
    const explicitPayments = unwrapMakeArray(
      payload.payments
      || payload.incomePayments
      || payload.financials?.payments
      || (sfIncomeRecords.length ? sfIncomeRecords : null),
    );
    const explicitPledges = unwrapMakeArray(
      payload.pledges || payload.incomePledges || payload.financials?.pledges,
    );
    const rawAllIncome = mergePledgeRecords(explicitPayments, explicitPledges);
    const incomePledges = rawAllIncome.filter(isIncomePledgeRecord);
    rawPledgeRecords = mergePledgeRecords(explicitPledges.filter(isIncomePledgeRecord), incomePledges);
    const pledgeIdSet = new Set(
      rawPledgeRecords.map((record) => record.Id || record.id || record['Record ID']).filter(Boolean),
    );
    rawPaymentRecords = rawAllIncome.filter((record) => {
      const id = record.Id || record.id || record['Record ID'] || '';
      if (id && pledgeIdSet.has(id)) return false;
      return !isIncomePledgeRecord(record);
    });
  }

  const payments = filterNormalizedPayments(
    rawPaymentRecords
      .map(normalizePayment)
      .filter((normalized, index) => shouldIncludePaymentRecord(rawPaymentRecords[index], normalized)),
  );
  const pledges = filterNormalizedPledges(
    rawPledgeRecords
      .map(normalizePledge)
      .filter((normalized, index) => shouldIncludePledgeRecord(rawPledgeRecords[index], normalized)),
  );
  const rawRecurring = unwrapMakeArray(
    payload.recurring || payload.recurringBilling || payload.recurringPayments || payload.paymentPrograms,
  );
  let recurring = filterNormalizedRecurring(
    rawRecurring
      .map(normalizeRecurring)
      .filter((normalized, index) => shouldIncludeRecurringRecord(rawRecurring[index], normalized)),
  );

  const fallbackLast4 = [...rawRecurring, ...rawPaymentRecords]
    .map((record) => pickRecurringLast4(record))
    .find(Boolean) || '';
  if (fallbackLast4) {
    recurring = recurring.map((item) => {
      if (item.last4) {
        return {
          ...item,
          method: formatRecurringPaymentMethod(item.paymentType || item.method, item.last4) || item.method,
        };
      }
      return {
        ...item,
        last4: fallbackLast4,
        OneCRM__Last4__c: fallbackLast4,
        method: formatRecurringPaymentMethod(item.paymentType || item.method, fallbackLast4) || item.method,
      };
    });
  }

  // When Make sends Payment Program with Amount_Per_Charge=0, derive installment
  // from the pledge commitment (monthly / half-yearly / annual).
  const pledgeAnnual = pledges.reduce(
    (max, item) => Math.max(max, parseMoneyValue(item.total || item.amount)),
    0,
  );
  if (pledgeAnnual > 0) {
    recurring = recurring.map((item) => {
      if (parseMoneyValue(item.amount) > 0) return item;
      const freq = String(item.frequency || '').toLowerCase();
      let amount = pledgeAnnual / 12;
      if (freq.includes('half') || freq.includes('semi') || freq.includes('bi')) {
        amount = pledgeAnnual / 2;
      } else if (freq.includes('year') || freq.includes('annual') || freq.includes('once')) {
        amount = pledgeAnnual;
      } else if (freq.includes('week')) {
        amount = pledgeAnnual / 52;
      } else if (freq.includes('quarter')) {
        amount = pledgeAnnual / 4;
      }
      return { ...item, amount: formatMoneyField(amount) || item.amount };
    });
  }
  const membership = normalizeMembership(payload.membership || (payload.groups || payload.Groups || payload.membershipTier ? {
    tier: payload.groups || payload.Groups || payload.membershipTier,
    status: 'Active'
  } : null));

  const hasRemotePortalData = contacts.length
    || relationships.length
    || payments.length
    || pledges.length
    || recurring.length
    || membership;

  return {
    fromSalesforce: Boolean(hasRemotePortalData || payload.fromSalesforce === true),
    accountId: payload.accountId || payload.AccountId || memberDetails.accountId || '',
    accountName: payload.accountName || payload.account || memberDetails.profile?.accountName || memberDetails.name || '',
    phone: payload.phone || payload.accountPhone || memberDetails.mobile || memberDetails.phone || '',
    email: payload.email || memberDetails.email || '',
    street: payload.street || payload.shippingStreet || memberDetails.street || '',
    city: payload.city || payload.shippingCity || memberDetails.city || '',
    state: payload.state || payload.shippingState || memberDetails.state || '',
    postalCode: payload.postalCode || payload.shippingPostalCode || memberDetails.postalCode || '',
    country: payload.country || payload.shippingCountry || memberDetails.country || '',
    contacts: contacts.length
      ? markPrimaryHouseholdContact(contacts, memberDetails)
      : buildContactsFromMemberDetails(memberDetails),
    relationships,
    payments,
    pledges,
    recurring,
    membership,
  };
}

function inferCardBrand(label = '') {
  const text = String(label).toLowerCase();
  if (text.includes('american express') || text.includes('amex')) return 'American Express';
  if (text.includes('mastercard') || text.includes('master card')) return 'Mastercard';
  if (text.includes('visa')) return 'Visa';
  if (text.includes('discover')) return 'Discover';
  return '';
}

function isCardRecord(raw = {}) {
  if (!raw || typeof raw !== 'object') return false;
  return Boolean(
    raw.cardId
    || raw.OneCRM__Last4__c
    || raw.OneCRM__Label__c
    || raw.OneCRM__Expiration_Date__c
    || raw.last4
    || raw.Last4
  );
}

function normalizeSavedCard(raw = {}, index = 0) {
  const last4 = String(raw.OneCRM__Last4__c || raw.last4 || raw.Last4 || '').trim();
  const expiration = String(
    raw.OneCRM__Expiration_Date__c || raw.expirationDate || raw.expires || raw.cardExpiry || '',
  ).trim();
  const label = String(raw.OneCRM__Label__c || raw.label || raw.Name || '').trim()
    || (last4 ? `Card ending in ${last4}` : `Card ${index + 1}`);

  return {
    id: raw.cardId || raw.Id || raw.id || `card_${index}`,
    cardId: raw.cardId || raw.Id || raw.id || '',
    label,
    last4,
    expiration,
    brand: inferCardBrand(label),
  };
}

function extractCardsFromPayload(payload) {
  if (!payload) return [];
  const source = Array.isArray(payload)
    ? payload
    : unwrapMakeArray(
      payload.records
      || payload.cards
      || payload.paymentMethods
      || payload.savedCards
      || payload.array,
    );
  return source
    .filter(isCardRecord)
    .map(normalizeSavedCard);
}

function mergePaymentsRemoteAndLocal(remotePayments = [], localPayments = []) {
  const merged = [...remotePayments];
  const seenIds = new Set(remotePayments.map((item) => item.id).filter(Boolean));
  const seenKeys = new Set(remotePayments.map((item) => paymentDedupeKey(item)));

  for (const payment of localPayments) {
    if (payment.id && seenIds.has(payment.id)) continue;
    const method = String(payment.method || payment.type || '').toLowerCase();
    const isStripe = method.includes('stripe') || String(payment.id || '').includes('stripe');
    if (!isStripe) continue;
    const normalized = normalizePayment(payment, merged.length);
    const key = paymentDedupeKey(normalized);
    if (seenKeys.has(key)) continue;
    merged.unshift(normalized);
    seenKeys.add(key);
    if (normalized.id) seenIds.add(normalized.id);
  }

  return merged;
}

function normalizeSearchContact(raw = {}, index = 0) {
  const contactId = raw.contactId
    || raw['Contact ID']
    || raw.Id
    || raw.id
    || raw['Record ID']
    || '';
  const firstName = raw.firstName || raw.FirstName || raw['First Name'] || '';
  const lastName = raw.lastName || raw.LastName || raw['Last Name'] || '';
  const name = raw.name
    || raw['Full Name']
    || raw.Name
    || raw.fullName
    || [firstName, lastName].filter(Boolean).join(' ').trim();

  return {
    contactId,
    name,
    currentFamily: raw.currentFamily
      || raw['Primary Family']
      || raw.accountName
      || raw['Current Family']
      || raw['Account Name']
      || raw.Account?.Name
      || '',
    street: raw.street
      || raw['Mailing Street']
      || raw.primaryStreet
      || raw['Primary Street']
      || raw.MailingStreet
      || '',
    city: raw.city
      || raw['Mailing City']
      || raw.primaryCity
      || raw['Primary City']
      || raw.MailingCity
      || '',
    phone: raw.phone
      || raw.mobile
      || raw['Mobile Phone']
      || raw.MobilePhone
      || raw.Phone
      || '',
    email: raw.email || raw.Email || '',
  };
}

function isValidSearchContact(contact = {}) {
  if (contact.contactId?.startsWith('003')) return true;
  if (contact.email?.includes('@')) return true;
  return Boolean((contact.name || '').trim());
}

function memberDetailsToSearchContact(memberDetails = {}) {
  return {
    contactId: memberDetails.contactId || '',
    name: memberDetails.name
      || [memberDetails.firstName, memberDetails.lastName].filter(Boolean).join(' ').trim()
      || memberDetails.email?.split('@')[0]
      || '',
    currentFamily: memberDetails.accountName || memberDetails.profile?.accountName || '',
    street: memberDetails.street || '',
    city: memberDetails.city || '',
    phone: memberDetails.mobile || memberDetails.phone || memberDetails.homePhone || '',
    email: memberDetails.email || '',
  };
}

function extractSearchContactsFromPayload(payload) {
  if (!payload) return [];

  const list = unwrapMakeArray(
    payload.contacts
    || payload.searchResults
    || payload.results
    || payload.records
    || (Array.isArray(payload) ? payload : []),
  );

  return list
    .map(normalizeSearchContact)
    .filter(isValidSearchContact);
}

module.exports = {
  parseMakePayload,
  extractPortalDataFromPayload,
  extractAllContactsFromPayload,
  extractSearchContactsFromPayload,
  isValidSearchContact,
  memberDetailsToSearchContact,
  normalizeSearchContact,
  buildContactsFromMemberDetails,
  mergeContactsList,
  mergeHouseholdPortalData,
  mergePaymentsRemoteAndLocal,
  extractCardsFromPayload,
  unwrapMakeArray,
  normalizeContact,
  normalizePayment,
  filterNormalizedPayments,
  parseMoneyValue,
  getPortalFiscalYearRange,
  formatPortalFiscalYearLabel,
};
