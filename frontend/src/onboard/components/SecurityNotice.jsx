export default function SecurityNotice({ icon, title, description, className = '' }) {
  return (
    <div className={`onboard-security-notice ${className}`.trim()}>
      <span className="onboard-security-notice-icon" aria-hidden="true">
        {icon}
      </span>
      <div className="onboard-security-notice-copy">
        {title && <p className="onboard-security-notice-title">{title}</p>}
        <p className="onboard-security-notice-description">{description}</p>
      </div>
    </div>
  );
}
