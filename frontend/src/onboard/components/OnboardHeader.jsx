import { HelpCircle, Moon, Sun } from 'lucide-react';
import ChabadLogo from '../../components/shared/ChabadLogo';

export default function OnboardHeader({ theme, onToggleTheme, title, subtitle }) {
  return (
    <header className={`onboard-header ${title ? 'onboard-header-with-title' : ''}`.trim()}>
      <div className="onboard-header-brand">
        <ChabadLogo className="onboard-header-mark" alt="Chabad Bedford" />
        <span className="onboard-header-wordmark">
          <span className="onboard-header-wordmark-main">CHABAD</span>
          <span className="onboard-header-wordmark-sub">BEDFORD</span>
        </span>
      </div>

      {title && (
        <div className="onboard-header-title-block">
          <h1 className="onboard-header-title">{title}</h1>
          {subtitle && <p className="onboard-header-subtitle">{subtitle}</p>}
        </div>
      )}

      <div className="onboard-header-links">
        <a className="onboard-need-help" href="mailto:info@chabadbedford.com">
          <HelpCircle size={18} aria-hidden="true" />
          <span>Need Help?</span>
        </a>
        <button
          type="button"
          className="onboard-theme-toggle"
          onClick={onToggleTheme}
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
      </div>
    </header>
  );
}
