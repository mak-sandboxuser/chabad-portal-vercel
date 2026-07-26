export default function SecondaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  icon: Icon,
  variant = 'gold',
  className = '',
}) {
  return (
    <button
      type={type}
      className={`onboard-secondary-button onboard-secondary-button-${variant} ${className}`.trim()}
      onClick={onClick}
      disabled={disabled}
    >
      {Icon && <Icon size={16} aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}
