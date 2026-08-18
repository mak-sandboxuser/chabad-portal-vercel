import { useState } from 'react';
import { HelpCircle, Moon, Sun } from 'lucide-react';
import ChabadLogo from '../../components/shared/ChabadLogo';
import ContactSupportModal from '../../components/shared/ContactSupportModal';

export default function OnboardHeader({
  theme,
  onToggleTheme,
  title,
  subtitle,
  showContactSupport = false,
  showWordmark = false,
  logoSize = 72,
  logoVariant = 'full',
}) {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <>
      <header className={`onboard-header ${title ? 'onboard-header-with-title' : ''}`.trim()}>
        <div className="onboard-header-brand">
          <ChabadLogo
            className={showWordmark ? 'onboard-header-mark' : 'onboard-header-logo'}
            theme={theme}
            size={logoSize}
            variant={logoVariant}
            alt="Chabad of Bedford"
          />
          {showWordmark && (
            <span className="onboard-header-wordmark">
              <span className="onboard-header-wordmark-main">CHABAD OF BEDFORD</span>
            </span>
          )}
        </div>

        {title && (
          <div className="onboard-header-title-block">
            <h1 className="onboard-header-title">{title}</h1>
            {subtitle && <p className="onboard-header-subtitle">{subtitle}</p>}
          </div>
        )}

        <div className="onboard-header-links">
          <button
            type="button"
            className="onboard-need-help"
            onClick={() => setShowContactModal(true)}
          >
            <HelpCircle size={18} aria-hidden="true" />
            <span>Need Help?</span>
          </button>
          {showContactSupport && (
            <button
              type="button"
              className="onboard-contact-support"
              onClick={() => setShowContactModal(true)}
            >
              Contact Support
            </button>
          )}
          {typeof onToggleTheme === 'function' && (
            <button
              type="button"
              className="onboard-theme-toggle"
              onClick={onToggleTheme}
              aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {theme === 'light' ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>
          )}
        </div>
      </header>

      <ContactSupportModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </>
  );
}
