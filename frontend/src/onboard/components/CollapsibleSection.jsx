import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function CollapsibleSection({
  title,
  optional = false,
  description,
  defaultExpanded = true,
  children,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  return (
    <div className="onboard-community-section">
      <button
        type="button"
        className="onboard-community-toggle"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
      >
        <span className="onboard-community-toggle-copy">
          <span className="onboard-community-toggle-title">
            {title}
            {optional && <span className="onboard-optional-label">(Optional)</span>}
          </span>
          {description && <span className="onboard-community-toggle-description">{description}</span>}
        </span>
        <ChevronDown
          size={18}
          className={`onboard-community-chevron ${expanded ? 'onboard-community-chevron-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      <div
        id={panelId}
        className={`onboard-community-panel ${expanded ? 'onboard-community-panel-open' : ''}`}
      >
        <div className="onboard-community-panel-inner">{children}</div>
      </div>
    </div>
  );
}
