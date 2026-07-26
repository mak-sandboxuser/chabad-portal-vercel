import { Info } from 'lucide-react';

export default function InfoPanel({ title, description, className = '' }) {
  return (
    <div className={`onboard-info-panel ${className}`.trim()}>
      <span className="onboard-info-icon" aria-hidden="true">
        <Info size={18} strokeWidth={2} />
      </span>
      <div className="onboard-info-copy">
        {title && <p className="onboard-info-title">{title}</p>}
        <p className="onboard-info-description">{description}</p>
      </div>
    </div>
  );
}
