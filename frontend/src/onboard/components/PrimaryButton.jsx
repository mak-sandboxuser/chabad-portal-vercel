import { ArrowRight } from 'lucide-react';

export default function PrimaryButton({
  children,
  onClick,
  type = 'button',
  disabled = false,
  loading = false,
  showArrow = true,
  className = '',
}) {
  return (
    <button
      type={type}
      className={`onboard-primary-button ${className}`.trim()}
      onClick={onClick}
      disabled={disabled || loading}
    >
      <span>{loading ? 'Please wait…' : children}</span>
      {showArrow && !loading && <ArrowRight size={18} className="onboard-primary-button-icon" aria-hidden="true" />}
    </button>
  );
}
