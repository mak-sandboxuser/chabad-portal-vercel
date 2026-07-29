import { useId } from 'react';
import { Calendar } from 'lucide-react';

/**
 * Single MM/DD/YYYY text field (as opposed to BirthDateGroup's three
 * separate month/day/year selects) — auto-inserts the slashes as the
 * applicant types digits.
 */
export default function DateField({
  id,
  label,
  required = false,
  optional = false,
  value,
  onChange,
  error,
  placeholder = 'MM/DD/YYYY',
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;

  const handleChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
    else if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    onChange(formatted);
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
        {optional && <span className="onboard-optional-label">(Optional)</span>}
      </label>

      <div className={`onboard-input-shell ${error ? 'onboard-input-shell-error' : ''}`}>
        <Calendar size={16} className="onboard-input-icon" aria-hidden="true" />
        <input
          id={fieldId}
          type="text"
          inputMode="numeric"
          className="onboard-input"
          value={value}
          placeholder={placeholder}
          onChange={handleChange}
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
