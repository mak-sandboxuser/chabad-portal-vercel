import { useState } from 'react';
import { HelpCircle, Moon, Sun } from 'lucide-react';
import ChabadLogo from '../../components/shared/ChabadLogo';
import ContactSupportModal from '../../components/shared/ContactSupportModal';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../../constants/supportContact';
import './preLoginOnboard.css';

/**
 * Pre-login shell matching OnboardAboutYou header/layout (no building watermark).
 */
export default function PreLoginOnboardLayout({
  theme,
  onToggleTheme,
  children,
  footerNote,
}) {
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <div className="ay-page" data-onboard-theme={theme}>
      <header className="ay-header">
        <ChabadLogo className="chabad-logo" theme={theme} size={90} alt="Chabad of Bedford" />
        <div className="ay-header-title">
          <h1>Membership Onboarding</h1>
          <p>Join our community in a few simple steps.</p>
        </div>
        <div className="ay-header-actions">
          <button
            type="button"
            className="ay-theme-toggle"
            onClick={onToggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            type="button"
            className="ay-help-link"
            onClick={() => setShowContactModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            <HelpCircle size={16} /> Need Help?
          </button>
        </div>
      </header>

      <main className="ay-main">{children}</main>

      <footer className="ay-footer">
        {footerNote ? <p className="ay-footer-note">{footerNote}</p> : null}
        <p>
          Need help?{' '}
          <button
            type="button"
            onClick={() => setShowContactModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0, textDecoration: 'underline' }}
          >
            Contact Us
          </button>
          {' '}at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
          {' | '}
          <a href="tel:+19146666068">{SUPPORT_PHONE_DISPLAY}</a>
        </p>
      </footer>

      <ContactSupportModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
