import { useId, useMemo } from 'react';
import { Calendar } from 'lucide-react';
import SelectField from './SelectField';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
].map((name, index) => ({ value: String(index + 1), label: name }));

const DAYS = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));

function useYearOptions() {
  return useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let year = currentYear; year >= currentYear - 110; year -= 1) {
      years.push({ value: String(year), label: String(year) });
    }
    return years;
  }, []);
}

export default function BirthDateGroup({ label, value, onChange, required, error, groupId }) {
  const generatedId = useId();
  const fieldsetId = groupId || generatedId;
  const years = useYearOptions();
  const errorId = error ? `${fieldsetId}-error` : undefined;

  const handlePartChange = (part) => (event) => {
    onChange({ ...value, [part]: event.target.value });
  };

  return (
    <div className="onboard-field" role="group" aria-labelledby={`${fieldsetId}-legend`} aria-describedby={errorId}>
      <p className="onboard-field-label" id={`${fieldsetId}-legend`}>
        {label}
        {required && (
          <span className="onboard-required" aria-hidden="true">
            *
          </span>
        )}
      </p>

      <div className="onboard-birth-date-group">
        <SelectField
          id={`${fieldsetId}-month`}
          label="Month"
          value={value.month}
          onChange={handlePartChange('month')}
          options={MONTHS}
          icon={Calendar}
          error={error}
        />
        <SelectField
          id={`${fieldsetId}-day`}
          label="Day"
          value={value.day}
          onChange={handlePartChange('day')}
          options={DAYS}
          error={error}
        />
        <SelectField
          id={`${fieldsetId}-year`}
          label="Year"
          value={value.year}
          onChange={handlePartChange('year')}
          options={years}
          error={error}
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
