function SelectShell({ id, label, value, onChange, options, icon: Icon, error, ariaDescribedBy }) {
  return (
    <div className={`onboard-select-shell ${error ? 'onboard-input-shell-error' : ''}`}>
      {Icon && <Icon size={16} className="onboard-input-icon" aria-hidden="true" />}
      <select
        id={id}
        className="onboard-select"
        value={value}
        onChange={onChange}
        aria-label={label}
        aria-invalid={Boolean(error)}
        aria-describedby={ariaDescribedBy}
      >
        <option value="" disabled>
          {label}
        </option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/**
 * Bare select shell by default (used inside grouped fields like
 * BirthDateGroup, which supplies its own shared label). Pass
 * `standalone` to get a fully labeled field — visible label, required
 * marker, and an error message below — matching FormField's layout for
 * selects used on their own (e.g. State, Country).
 */
export default function SelectField({ standalone = false, required = false, ...props }) {
  if (!standalone) {
    return <SelectShell {...props} />;
  }

  const { id, label, error } = props;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="onboard-field">
      <label className="onboard-field-label" htmlFor={id}>
        {label}
        {required && (
          <span className="onboard-required" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <SelectShell {...props} ariaDescribedBy={errorId} />

      {error && (
        <p id={errorId} className="onboard-error-message" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
