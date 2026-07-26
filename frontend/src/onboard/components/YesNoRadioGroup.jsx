import { useId } from 'react';

/**
 * Plain circular Yes/No radio buttons — visually distinct from
 * YesNoToggle's gold segmented-pill control. Both wrap real radio inputs;
 * this one matches pages that show a simple inline yes/no question rather
 * than a "Help Us Know You Better"-style highlighted panel.
 */
export default function YesNoRadioGroup({ name, value, onChange, label }) {
  const generatedName = useId();
  const groupName = name || generatedName;

  return (
    <div className="onboard-radio-group" role="radiogroup" aria-label={label}>
      {[
        { text: 'Yes', optionValue: true },
        { text: 'No', optionValue: false },
      ].map(({ text, optionValue }) => {
        const inputId = `${groupName}-${text.toLowerCase()}`;
        return (
          <label key={text} htmlFor={inputId} className="onboard-radio-option">
            <input
              type="radio"
              id={inputId}
              name={groupName}
              className="onboard-radio-input"
              checked={value === optionValue}
              onChange={() => onChange(optionValue)}
            />
            <span className="onboard-radio-dot" aria-hidden="true" />
            {text}
          </label>
        );
      })}
    </div>
  );
}
