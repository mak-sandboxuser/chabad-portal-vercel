import { useId } from 'react';

export default function FormField({
  label,
  value,
  onChange,
  onBlur,
  error,
  required = false,
  optional = false,
  type = 'text',
  placeholder = '',
  icon: Icon,
  id,
  trailingContent,
  inputMode,
  maxLength,
  autoComplete,
}) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const errorId = error ? `${fieldId}-error` : undefined;

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
        {Icon && <Icon size={16} className="onboard-input-icon" aria-hidden="true" />}
        <input
          id={fieldId}
          className="onboard-input"
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={onChange}
          onBlur={onBlur}
          aria-invalid={Boolean(error)}
          aria-describedby={errorId}
          inputMode={inputMode}
          maxLength={maxLength}
          autoComplete={autoComplete}
        />
        {trailingContent}
      </div>

      {error && (
        <p id={errorId} className="onboard-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
