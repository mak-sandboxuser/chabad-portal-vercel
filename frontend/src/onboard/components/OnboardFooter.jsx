import { Headphones, Phone, Mail, Lock } from 'lucide-react';

/**
 * Richer onboarding footer (optional security note + assistance panel +
 * copyright/legal) used by the multi-step form pages. The public welcome
 * page keeps its own simpler single-line footer since its content is
 * intentionally lighter.
 */
export default function OnboardFooter({ securityNote }) {
  const year = new Date().getFullYear();

  return (
    <footer className="onboard-form-footer-wrap">
      {securityNote && (
        <p className="onboard-form-security-note">
          <Lock size={13} aria-hidden="true" />
          {securityNote}
        </p>
      )}

      <div className="onboard-assistance-panel">
        <div className="onboard-assistance-copy">
          <span className="onboard-assistance-icon" aria-hidden="true">
            <Headphones size={18} strokeWidth={1.75} />
          </span>
          <div>
            <p className="onboard-assistance-title">Need Assistance?</p>
            <p className="onboard-assistance-description">
              Our team is here to help you every step of the way.
            </p>
          </div>
        </div>

        <div className="onboard-assistance-contact">
          <a href="mailto:support@chabadbedford.org">
            <Mail size={15} aria-hidden="true" />
            support@chabadbedford.org
          </a>
          <span className="onboard-form-footer-divider" aria-hidden="true">|</span>
          <a href="tel:+19142341234">
            <Phone size={15} aria-hidden="true" />
            (914) 234-1234
          </a>
        </div>
      </div>

      <div className="onboard-form-footer-bottom">
        <p className="onboard-form-footer-copyright">
          &copy; {year} Chabad Bedford. All rights reserved.
        </p>

        <div className="onboard-form-footer-legal">
          <span>Privacy Policy</span>
          <span className="onboard-form-footer-divider" aria-hidden="true">|</span>
          <span>Terms &amp; Conditions</span>
        </div>
      </div>
    </footer>
  );
}
