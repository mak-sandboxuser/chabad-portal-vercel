import { useId } from 'react';
import { ChevronDown } from 'lucide-react';

const COUNTRIES = [
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'IL', name: 'Israel', dialCode: '+972', flag: '🇮🇱' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
];

export default function PhoneField({
  id,
  label,
  required = false,
  value,
  onChange,
  error,
  placeholder = '(123) 456-7890',
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const countryId = `${fieldId}-country`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const selectedCountry = COUNTRIES.find((c) => c.code === value.country) || COUNTRIES[0];

  const handleCountryChange = (event) => {
    onChange({ ...value, country: event.target.value });
  };

  const handleNumberChange = (event) => {
    onChange({ ...value, number: event.target.value });
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
            {COUNTRIES.map((country) => (
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
          className="onboard-phone-number-input"
          value={value.number}
          placeholder={placeholder}
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
