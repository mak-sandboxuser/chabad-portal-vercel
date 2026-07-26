import { useId } from 'react';

export default function YesNoToggle({ label, icon: Icon, value, onChange, name }) {
  const generatedName = useId();
  const groupName = name || generatedName;

  return (
    <div className="onboard-question-item">
      <span className="onboard-question-icon" aria-hidden="true">
        {Icon && <Icon size={18} strokeWidth={1.75} />}
      </span>
      <span className="onboard-question-text">{label}</span>

      <div className="onboard-segmented-control" role="radiogroup" aria-label={label}>
        {[
          { text: 'Yes', optionValue: true },
          { text: 'No', optionValue: false },
        ].map(({ text, optionValue }) => {
          const inputId = `${groupName}-${text.toLowerCase()}`;
          const isActive = value === optionValue;
          return (
            <label
              key={text}
              htmlFor={inputId}
              className={`onboard-segment-option ${isActive ? 'onboard-segment-option-active' : ''}`}
            >
              <input
                type="radio"
                id={inputId}
                name={groupName}
                className="onboard-segment-input"
                checked={isActive}
                onChange={() => onChange(optionValue)}
              />
              {text}
            </label>
          );
        })}
      </div>
    </div>
  );
}
