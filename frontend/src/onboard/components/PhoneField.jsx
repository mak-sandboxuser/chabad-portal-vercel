import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { PHONE_COUNTRIES, getPhoneCountry, normalizePhoneDigits } from '../data/phoneCountries';

/**
 * The draft stores digits only, so the CRM payload stays clean; the grouping
 * below is display formatting applied as the applicant types.
 */
function formatPhoneDigits(digits, dialCode) {
  if (dialCode !== '+1') {
    return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export default function PhoneField({
  id,
  label,
  required = false,
  value,
  onChange,
  error,
  placeholder,
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const countryId = `${fieldId}-country`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const selectedCountry = getPhoneCountry(value.country);

  const digits = normalizePhoneDigits(value.number, selectedCountry.code);

  const handleCountryChange = (event) => {
    const nextCountry = getPhoneCountry(event.target.value);
    onChange({
      ...value,
      country: nextCountry.code,
      number: normalizePhoneDigits(digits, nextCountry.code),
    });
  };

  const handleNumberChange = (event) => {
    onChange({
      ...value,
      number: normalizePhoneDigits(event.target.value, selectedCountry.code),
    });
  };

  return (
    <div className="onboard-field">
      <label className="onboard-field-label" htmlFor={fieldId}>
        {label}
        {required && (
          <span className="onboard-required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className={`onboard-phone-field ${error ? 'onboard-input-shell-error' : ''}`}>
        <div className="onboard-phone-country">
          <span aria-hidden="true">{selectedCountry.flag}</span>
          <select
            id={countryId}
            className="onboard-phone-country-select"
            value={selectedCountry.code}
            onChange={handleCountryChange}
            aria-label="Country"
          >
            {PHONE_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.flag} {country.dialCode}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="onboard-phone-country-chevron" aria-hidden="true" />
        </div>

        <input
          id={fieldId}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          className="onboard-phone-number-input"
          value={formatPhoneDigits(digits, selectedCountry.dialCode)}
          placeholder={placeholder || selectedCountry.example}
          onChange={handleNumberChange}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
        />
      </div>

      {error && (
        <p id={errorId} className="onboard-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
