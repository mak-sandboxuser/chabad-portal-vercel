import { useId } from 'react';

export default function YesNoToggle({
  label,
  icon: Icon,
  value,
  onChange,
  name,
  disabled = false,
}) {
  const generatedName = useId();
  const groupName = name || generatedName;

  return (
    <div className={`onboard-question-item${disabled ? ' onboard-question-item-disabled' : ''}`}>
      <span className="onboard-question-icon" aria-hidden="true">
        {Icon && <Icon size={18} strokeWidth={1.75} />}
      </span>
      <span className="onboard-question-text">{label}</span>

      <div
        className={`onboard-segmented-control${disabled ? ' onboard-segmented-control-disabled' : ''}`}
        role="radiogroup"
        aria-label={label}
        aria-disabled={disabled || undefined}
      >
        {[
          { text: 'Yes', optionValue: true },
          { text: 'No', optionValue: false },
        ].map(({ text, optionValue }) => {
          const inputId = `${groupName}-${text.toLowerCase()}`;
          const isActive = value === optionValue;
          return (
            <label
              key={text}
              htmlFor={disabled ? undefined : inputId}
              className={`onboard-segment-option ${isActive ? 'onboard-segment-option-active' : ''}${disabled ? ' onboard-segment-option-disabled' : ''}`}
            >
              <input
                type="radio"
                id={inputId}
                name={groupName}
                className="onboard-segment-input"
                checked={isActive}
                disabled={disabled}
                onChange={() => {
                  if (!disabled) onChange(optionValue);
                }}
              />
              {text}
            </label>
          );
        })}
      </div>
    </div>
  );
}
