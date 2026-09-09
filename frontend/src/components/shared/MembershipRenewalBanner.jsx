import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { formatMoney, getMembership, parseMoney } from '../../utils/portalData';
import { getProratedMembershipCommitment } from '../../utils/portalFiscalYear';

export default function MembershipRenewalBanner({ sfData, onRenew, actionLabel = 'Renew Membership' }) {
  const membership = getMembership(sfData);
  const annual = parseMoney(membership.annualCommitment) || 0;
  const amount = formatMoney(getProratedMembershipCommitment(annual));
  // Previous (commented out): banner showed the full annual commitment
  // const amount = membership.annualCommitment || formatMoney(0);
  const availableLabel = new Date().toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
  // Previous (commented out): banner always said Renew Membership
  // const actionLabel = 'Renew Membership';

  return (
    <div className="renewed-membership-banner membership-renewal-flex">
      <div className="renewed-banner-left">
        <div className="renewed-banner-icon-wrapper">
          <span className="renewed-banner-sparkle sp-top-left">✦</span>
          <span className="renewed-banner-sparkle sp-top-right">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-left">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-right">✦</span>
          <div className="renewed-banner-shield-circle">
            <ShieldCheck size={38} strokeWidth={2.2} />
          </div>
        </div>

        <div className="renewed-banner-body">
          <h2 className="renewed-banner-title">Membership Renewal</h2>
          <p className="renewed-banner-sub">
            Your membership year is ready to renew - {amount} - available {availableLabel}.
          </p>
          <div className="expired-banner-actions">
            <button
              type="button"
              className="dash-btn-primary expired-renew-btn"
              onClick={onRenew}
            >
              {actionLabel}
              {/* Previous (commented out): Renew Membership */}
            </button>
          </div>
        </div>
      </div>

      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge membership-renewal-right-label">
            Renew
          </div>
          <p className="renewed-right-text">
            Continue your support for the coming membership year.
          </p>
          <span className="renewed-script-note">Thank you! ♡</span>
        </div>
      </div>
    </div>
  );
}
