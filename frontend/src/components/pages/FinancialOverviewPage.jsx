import React from 'react';
import {
  Wallet, Calendar, Lock, Heart,
  User, Mail, Phone, MapPin, ShieldCheck,
  Handshake, Star,
} from 'lucide-react';
import PortalPageLayout from '../shared/PortalPageLayout';
import {
  formatAddress,
  formatDisplayDate,
  formatMoney,
  getAccount,
  getFinancialSummary,
  getMembership,
  getPaymentScheduleSummary,
  buildMembershipMakePaymentPreset,
  getPayments,
  isPaymentWindowOpen,
  parseMoney,
  needsSalesforceMembershipScheduleSetup,
} from '../../utils/portalData';
import { startSalesforceMembershipSchedulePayment } from '../../onboard/utils/postLoginStepper';
import { showToast } from '../../utils/toast';

function UnpaidMembershipBanner({ dates, onPay, payLabel }) {
  return (
    <div className="renewed-membership-banner new-joining-banner">
      <div className="renewed-banner-left">
        <div className="renewed-banner-icon-wrapper">
          <span className="renewed-banner-sparkle sp-top-left">✦</span>
          <span className="renewed-banner-sparkle sp-top-right">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-left">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-right">✦</span>
          <div className="renewed-banner-shield-circle">
            <Handshake size={38} strokeWidth={2.2} />
          </div>
        </div>
        <div className="renewed-banner-body">
          <h2 className="renewed-banner-title">Thank You for Joining Our Community!</h2>
          <p className="renewed-banner-sub">
            Complete your membership payment to stay current with your commitment to Chabad of Bedford.
          </p>
          <div className="renewed-banner-pill">
            <div className="renewed-pill-icon">
              <Calendar size={18} />
            </div>
            <div className="renewed-pill-text">
              <strong>Your membership will commence on {dates.startDate}</strong>
              <span>Choose monthly, half-yearly, or pay in full to continue.</span>
            </div>
          </div>
          {onPay && (
            <button type="button" className="dash-btn-gold" onClick={onPay} style={{ marginTop: '14px' }}>
              <Lock size={16} /> {payLabel}
            </button>
          )}
        </div>
      </div>
      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge">
            <Star size={16} />
          </div>
          <p className="renewed-right-text">
            Your support helps us strengthen our community and make a lasting impact.
          </p>
          <span className="renewed-script-note">Thank you! ♡</span>
        </div>
      </div>
    </div>
  );
}

function PaidInFullBanner({ dates }) {
  return (
    <div className="renewed-membership-banner">
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
          <h2 className="renewed-banner-title">Thank You for Your Payment!</h2>
          <p className="renewed-banner-sub">
            Your membership is paid in full. We truly appreciate your commitment to Chabad of Bedford.
          </p>
          <div className="renewed-banner-pill">
            <div className="renewed-pill-icon">
              <Calendar size={18} />
            </div>
            <div className="renewed-pill-text">
              <strong>Your membership is active from {dates.startDate}</strong>
              <span>It will remain active until {dates.endDate}.</span>
            </div>
          </div>
        </div>
      </div>
      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge">
            <Heart size={16} />
          </div>
          <p className="renewed-right-text">Your generosity helps sustain our community programs and services.</p>
          <span className="renewed-script-note">Thank you! ♡</span>
        </div>
      </div>
    </div>
  );
}

function membershipYearDates(sfData, membership) {
  const raw = [
    membership?.tier,
    sfData?.groups,
    sfData?.profile?.groups,
    sfData?.account?.groups,
  ].filter(Boolean).join(';');
  const matches = [...String(raw).matchAll(/(\d{2})[-/](\d{2})/g)];
  if (matches.length > 0) {
    let maxEndYear = 0;
    let maxStartYear = 0;
    for (const m of matches) {
      const sy = 2000 + parseInt(m[1], 10);
      const ey = 2000 + parseInt(m[2], 10);
      if (ey > maxEndYear) {
        maxEndYear = ey;
        maxStartYear = sy;
      }
    }
    if (maxEndYear > 0) {
      return {
        startDate: `1 September ${maxStartYear}`,
        endDate: `31 August ${maxEndYear}`,
      };
    }
  }
  const year = new Date().getFullYear();
  return {
    startDate: `1 September ${year}`,
    endDate: `31 August ${year + 1}`,
  };
}

export default function FinancialOverviewPage({ theme, sfData, onNavigate, onDonate }) {
  const summary = getFinancialSummary(sfData);
  const membership = getMembership(sfData);
  const account = getAccount(sfData);
  const payments = getPayments(sfData);
  const schedule = getPaymentScheduleSummary(sfData);
  const canPayNow = isPaymentWindowOpen(sfData);
  const needsSfMembershipPay = needsSalesforceMembershipScheduleSetup(sfData);
  const dates = membershipYearDates(sfData, membership);
  const noPayments = !payments.length && !(summary.paymentCount > 0);
  const paidInFull = Number(summary.outstanding) <= 0
    && (Number(summary.contributed) > 0 || Number(summary.totalContributed) > 0);
  // Hide Upcoming Payment box with no payments or after full pay — banners show instead.
  const hideUpcomingPaymentBox = noPayments || paidInFull;
  // Previous (commented out): only hid when there was no payment history
  // const hideUpcomingPaymentBox = !payments.length && !(summary.paymentCount > 0);

  const handlePay = () => {
    if (needsSfMembershipPay) {
      try {
        startSalesforceMembershipSchedulePayment(sfData);
      } catch (err) {
        showToast({ message: err.message || 'Unable to start membership payment.', type: 'error' });
      }
      return;
    }
    onDonate?.(buildMembershipMakePaymentPreset(sfData));
  };

  return (
    <PortalPageLayout
      theme={theme}
      title="Financial Overview"
      subtitle="View your financial commitments and contribution activity."
    >
      {noPayments && parseMoney(membership.annualCommitment) > 0 && (
        <UnpaidMembershipBanner
          dates={dates}
          onPay={handlePay}
          payLabel={needsSfMembershipPay ? 'Pay Membership' : 'Make a Payment'}
        />
      )}
      {paidInFull && (
        <PaidInFullBanner dates={dates} />
      )}

      {/* Hidden when there is no payment history, or when paid in full. Monthly/half-yearly remaining balance still shows. */}
      {!hideUpcomingPaymentBox && (
      <div className="financial-top-card glass-panel">
        <div className="financial-top-col">
          <Wallet size={24} className="text-accent" />
          <div>
            <span className="dash-stat-label">Upcoming Payment</span>
            {/* Previous (commented out): {schedule.balanceLabel}  (Net Payment / Monthly Payments) */}
            <strong className="financial-big">${Number(schedule.balanceAmount || 0).toFixed(2)}</strong>
            <small className="text-warn">
              {summary.paymentCount ? `${summary.paymentCount} payments · ${formatMoney(summary.totalContributed)} contributed` : 'No payment history yet'}
            </small>
          </div>
        </div>
        <div className="financial-top-col">
          <Calendar size={20} className="text-accent" />
          <div>
            <span className="dash-stat-label">Upcoming Payment</span>
            {/* Previous (commented out): Next Payment */}
            <strong>{schedule.nextPaymentDateDisplay}</strong>
            <strong className="financial-amount">{schedule.nextPaymentAmountDisplay}</strong>
          </div>
        </div>
        <div className="financial-top-col actions">
          {canPayNow && (
            <button type="button" className="dash-btn-gold" onClick={onDonate}>
              <Lock size={16} /> Make a Payment
            </button>
          )}
          <small className="stripe-note"><ShieldCheck size={12} /> Secure payments by Stripe</small>
        </div>
      </div>
      )}
      {/* Previous (commented out): always showed Upcoming Payment box even with no payments
      <div className="financial-top-card glass-panel">...</div>
      */}

      <div className="financial-mid-row">
        <div className="financial-donut-card glass-panel">
          <h3>Annual Commitment Progress</h3>
          <div className="financial-donut-wrap">
            <div className="financial-donut" style={{ '--pct': summary.progressPct }}>
              <span>{summary.progressPct}%<small>of commitment met</small></span>
            </div>
            <ul className="financial-legend">
              <li><span className="dot blue" /> Contributed — {membership.contributedYtd} ({summary.progressPct}%)</li>
              <li><span className="dot gold" /> Remaining — ${summary.outstanding.toFixed(2)} ({100 - summary.progressPct}%)</li>
              <li><span className="dot gray" /> Total Commitment — {membership.annualCommitment}</li>
            </ul>
          </div>
        </div>
        <div className="membership-thanks-card glass-panel compact">
          <Heart size={22} className="text-accent" />
          <div>
            <strong>Thank you!</strong>
            <p>Your generosity helps sustain our community programs and services.</p>
          </div>
        </div>
      </div>

      <div className="financial-bottom-grid">
        <div className="dash-panel glass-panel">
          <div className="dash-panel-header">
            <h3>Recent Payments</h3>
            <button type="button" className="portal-text-link" onClick={() => onNavigate('payments')}>View all →</button>
          </div>
          <table className="members-table dash-table">
            <thead>
              <tr><th>Date</th><th>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {payments.length ? payments.slice(0, 5).map((p, i) => (
                <tr key={p.id || i}>
                  <td>{formatDisplayDate(p.date)}</td>
                  <td>{p.amount}</td>
                  <td><span className="badge badge-active">{p.status || 'Paid'}</span></td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="portal-empty-table">No payments on file.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="financial-side-stack">
          <div className="dash-panel glass-panel">
            <h3>My Account</h3>
            {[
              ['Group', membership.tier],
              ['Membership Status', (membership.status || '').toLowerCase() === 'living' ? 'Active' : membership.status, 'badge'],
              ['Renewal Date', schedule.membershipRenewalDateDisplay],
              [`Household (${sfData?.contacts?.length || 1})`, account.name, 'link'],
            ].map(([label, val, type]) => (
              <div key={label} className="financial-info-row">
                <span>{label}</span>
                {type === 'badge' ? <span className="badge badge-active">{val}</span>
                  : type === 'link' ? <button type="button" className="portal-text-link" onClick={() => onNavigate('household')}>{val}</button>
                  : <strong>{val}</strong>}
              </div>
            ))}
          </div>

          <div className="dash-panel glass-panel">
            <div className="dash-panel-header">
              <h3>Billing Contact</h3>
            </div>
            <div className="billing-contact">
              <p><User size={14} /> {sfData?.name}</p>
              <p><Mail size={14} /> {sfData?.email}</p>
              <p><Phone size={14} /> {account.phone || '—'}</p>
              <p><MapPin size={14} /> {formatAddress(account)}</p>
            </div>
          </div>
        </div>
      </div>
    </PortalPageLayout>
  );
}
