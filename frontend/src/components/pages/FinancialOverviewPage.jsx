import React from 'react';
import {
  Wallet, Calendar, Lock, Heart,
  User, Mail, Phone, MapPin, ShieldCheck,
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
  getPayments,
  isPaymentWindowOpen,
} from '../../utils/portalData';

export default function FinancialOverviewPage({ theme, sfData, onNavigate, onDonate }) {
  const summary = getFinancialSummary(sfData);
  const membership = getMembership(sfData);
  const account = getAccount(sfData);
  const payments = getPayments(sfData);
  const schedule = getPaymentScheduleSummary(sfData);
  const canPayNow = isPaymentWindowOpen(sfData);

  return (
    <PortalPageLayout
      theme={theme}
      title="Financial Overview"
      subtitle="View your financial commitments and contribution activity."
    >
      <div className="financial-top-card glass-panel">
        <div className="financial-top-col">
          <Wallet size={24} className="text-accent" />
          <div>
            <span className="dash-stat-label">{schedule.balanceLabel}</span>
            <strong className="financial-big">${Number(schedule.balanceAmount || 0).toFixed(2)}</strong>
            <small className="text-warn">
              {summary.paymentCount ? `${summary.paymentCount} payments · ${formatMoney(summary.totalContributed)} contributed` : 'No payment history yet'}
            </small>
          </div>
        </div>
        <div className="financial-top-col">
          <Calendar size={20} className="text-accent" />
          <div>
            <span className="dash-stat-label">Next Payment</span>
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
              ['Membership Status', membership.status, 'badge'],
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
