import React, { useEffect, useState } from 'react';
import {
  DollarSign,
  Calendar,
  TrendingUp,
  ArrowUpRight,
  // ShieldCheck, // was used for Auto-pay on Next Payment
  Handshake,
  Star,
  Heart,
  Shield,
} from 'lucide-react';
import PaymentActionButton from './shared/PaymentActionButton';
import BuildingSketch from './shared/BuildingSketch';
import {
  formatDisplayDate,
  formatMoney,
  formatPaymentDescription,
  getPaymentHistoryDescription,
  parseMoney,
  getContacts,
  getFinancialSummary,
  getMembership,
  getPaymentScheduleSummary,
  getPayments,
  isPaymentWindowOpen,
  isAcceleratedMembershipRenewalDue,
  needsSalesforceMembershipScheduleSetup,
  getSalesforceAssignedGroup,
  hasRealMembershipGroup,
} from '../utils/portalData';
import {
  markPostLoginStepperPending,
  // getPostLoginStepperEntryPath,
  startChooseMembershipStepper,
  startSalesforceMembershipSchedulePayment,
} from '../onboard/utils/postLoginStepper';
import { showToast } from '../utils/toast';

function MembershipRenewalDueBanner({ amountDisplay, renewalDateDisplay, onRenew }) {
  return (
    <div className="renewed-membership-banner expired-membership-banner" style={{ marginTop: '18px', width: '100%' }}>
      <div className="renewed-banner-left">
        <div className="renewed-banner-icon-wrapper">
          <span className="renewed-banner-sparkle sp-top-left">✦</span>
          <span className="renewed-banner-sparkle sp-top-right">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-left">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-right">✦</span>
          <div className="renewed-banner-shield-circle">
            <Shield size={38} strokeWidth={2.2} />
          </div>
        </div>
        <div className="renewed-banner-body">
          <h2 className="renewed-banner-title">Membership Renewal</h2>
          <p className="renewed-banner-sub">
            Your membership year is complete
            {amountDisplay ? ` · renew for ${amountDisplay}` : ''}
            {renewalDateDisplay && renewalDateDisplay !== '—' ? ` · available ${renewalDateDisplay}` : ''}.
          </p>
          <button type="button" className="dash-btn-primary expired-renew-btn" onClick={onRenew}>
            Renew Membership
          </button>
        </div>
      </div>
      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge">Renew</div>
          <p className="renewed-right-text">Continue your support for the coming membership year.</p>
          <span className="renewed-script-note">Thank you! ♡</span>
        </div>
      </div>
    </div>
  );
}

function GuestMembershipInviteBanner({ firstName, onBecomeMember }) {
  return (
    <div className="renewed-membership-banner guest-membership-invite-banner">
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
          <h2 className="renewed-banner-title">Join Our Community, {firstName}!</h2>
          <p className="renewed-banner-sub">
            You haven&apos;t selected a membership yet. Choose a plan to unlock payments,
            household benefits, and full access to Chabad of Bedford.
          </p>
          <div className="renewed-banner-pill">
            <div className="renewed-pill-icon">
              <Heart size={18} />
            </div>
            <div className="renewed-pill-text">
              <strong>Membership unlocks payments and community benefits</strong>
              <span>Select your tier in a few quick steps to get started.</span>
            </div>
          </div>
          <div className="expired-banner-actions">
            <button
              type="button"
              className="dash-btn-primary expired-renew-btn"
              onClick={onBecomeMember}
            >
              Become a Member
              <ArrowUpRight size={16} style={{ marginLeft: 6 }} />
            </button>
          </div>
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
          <span className="renewed-script-note">We can&apos;t wait to welcome you! ♡</span>
        </div>
      </div>
    </div>
  );
}

export default function DashboardHome({
  theme,
  user,
  sfData,
  paymentsDisabled = false,
  onNavigate,
  onDonate,
}) {
  const firstName =
    sfData?.name?.split(' ')[0] ||
    user?.name?.split(' ')[0] ||
    user?.email?.split('@')[0] ||
    'Member';

  const contacts = getContacts(sfData);
  const membership = getMembership(sfData);
  const summary = getFinancialSummary(sfData);
  const payments = getPayments(sfData);
  const recentPayments = payments.slice(0, 4);
  const totalContributed = formatMoney(summary.totalContributed || summary.contributed);
  const schedule = getPaymentScheduleSummary(sfData);

  const contributedYtd = summary.contributedYtd || totalContributed || '$2824.00';
  const needsSfMembershipPay = needsSalesforceMembershipScheduleSetup(sfData);
  const [, setRenewalTick] = useState(0);
  useEffect(() => {
    // Poll so Membership Renewal appears when the simulated year (10 min) completes.
    if (!(schedule.paidInFull || parseMoney(summary.outstanding) <= 0)) return undefined;
    if (parseMoney(summary.annual) <= 0) return undefined;
    const id = window.setInterval(() => setRenewalTick((n) => n + 1), 5000);
    return () => window.clearInterval(id);
  }, [schedule.paidInFull, summary.outstanding, summary.annual]);
  // TEST: 10 minutes after full pay ≈ 1 membership year complete → open renewal.
  const renewalDue = isAcceleratedMembershipRenewalDue(sfData);
  const canPayNow = isPaymentWindowOpen(sfData) || needsSfMembershipPay || renewalDue;
  // Full membership payment complete → hide Upcoming/Next Payment card (code kept below).
  const isFullPaymentComplete = Boolean(schedule.paidInFull) && !needsSfMembershipPay && !renewalDue;
  const hideUpcomingPaymentCard = !needsSfMembershipPay
    && parseMoney(summary.outstanding) <= 0
    && parseMoney(membership.annualCommitment) > 0
    && !renewalDue;
  const renewalAmountDisplay = membership.annualCommitment || formatMoney(summary.annual);

  const handleBecomeMember = () => {
    // Previous (commented out): always opened full stepper (Spouse first)
    // markPostLoginStepperPending();
    // window.location.assign(getPostLoginStepperEntryPath());
    startChooseMembershipStepper(sfData);
  };

  const handleRenewMembership = () => {
    markPostLoginStepperPending();
    sessionStorage.setItem('is_portal_renewal_mode', 'true');
    window.location.href = '/onboard/membership?mode=renew';
  };

  const handleSfMembershipPay = () => {
    try {
      startSalesforceMembershipSchedulePayment(sfData);
    } catch (err) {
      showToast({ message: err.message || 'Unable to start membership payment.', type: 'error' });
    }
  };

  const handlePayClick = () => {
    if (renewalDue) {
      handleRenewMembership();
      return;
    }
    if (needsSfMembershipPay) {
      handleSfMembershipPay();
      return;
    }
    onDonate?.();
  };

  if (paymentsDisabled) {
    // Previous (commented out): special $0 + group badge layout for non-portal SF groups.
    // Now those users use the same paid-tier dashboard (via isGuestUser=false) with $0 amounts.
    // const sfGroup = getSalesforceAssignedGroup(sfData);
    // const isUndefinedPortalGroup = Boolean(sfGroup && !hasRealMembershipGroup(sfGroup));
    // if (isUndefinedPortalGroup) { return ( ... $0 cards ... ); }

    return (
      <div className="member-dashboard" style={{ width: '100%' }}>
        <div className="member-dashboard-main" style={{ width: '100%' }}>
          <div className="dash-welcome-card glass-panel" style={{ width: '100%' }}>
            <div className="dash-welcome-text">
              <h2>Welcome, {firstName}!</h2>
              <p>Explore membership benefits and join our Chabad Bedford community.</p>
            </div>
            <BuildingSketch theme={theme} className="dash-welcome-sketch" />
          </div>

          <GuestMembershipInviteBanner
            firstName={firstName}
            onBecomeMember={handleBecomeMember}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="member-dashboard" style={{ width: '100%' }}>
      <div className="member-dashboard-main" style={{ width: '100%' }}>
        {/* Welcome Header */}
        <div className="dash-welcome-card glass-panel" style={{ width: '100%' }}>
          <div className="dash-welcome-text">
            <h2>Welcome back, {firstName}!</h2>
            <p>Here&apos;s an overview of your membership and financial activity.</p>
          </div>
          <BuildingSketch theme={theme} className="dash-welcome-sketch" />
        </div>

        {renewalDue && (
          <MembershipRenewalDueBanner
            amountDisplay={renewalAmountDisplay}
            renewalDateDisplay={schedule.membershipRenewalDateDisplay}
            onRenew={handleRenewMembership}
          />
        )}

        {needsSfMembershipPay && (
          <div
            className="glass-panel"
            style={{
              width: '100%',
              marginTop: '18px',
              padding: '18px 22px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              flexWrap: 'wrap',
              border: '1px solid rgba(196, 149, 74, 0.35)',
              background: 'linear-gradient(135deg, rgba(196, 149, 74, 0.08), rgba(255,255,255,0.4))',
            }}
          >
            <div>
              <strong style={{ display: 'block', fontSize: '16px', marginBottom: '4px' }}>
                Complete your membership payment
              </strong>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Your membership is ready. Choose the payment option that works best for you.
                {/* Previous (commented out):
                Your membership was set in Salesforce. Choose monthly, half-yearly, or pay in full to continue.
                */}
              </span>
            </div>
            <PaymentActionButton className="dash-btn-gold" onClick={handleSfMembershipPay}>
              Pay Membership
              <ArrowUpRight size={14} style={{ marginLeft: '4px' }} />
            </PaymentActionButton>
          </div>
        )}

        {/* 3 Executive Summary Cards (2 when Upcoming Payment is hidden after full pay) */}
        <div className="dash-balance-row" style={{ display: 'grid', gridTemplateColumns: hideUpcomingPaymentCard ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '22px', width: '100%' }}>
          
          {/* Card 1: Total Contributed YTD */}
          <div className="dash-balance-card glass-panel dash-card-fancy" style={{ padding: '28px 30px', minHeight: '195px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="dash-icon-wrapper gold-glow">
                  <TrendingUp size={18} />
                </div>
                <span className="dash-card-title">Total Contributed (YTD)</span>
              </div>
              <span className="dash-pill-badge gold">
                {summary.paymentCount ? `${summary.paymentCount} Payments` : 'CRM Synced'}
              </span>
            </div>

            <div style={{ margin: '14px 0 6px 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#10b981', letterSpacing: '-0.5px' }}>
                {contributedYtd}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Since 2026 To Till Date</span>
            </div>
          </div>

          {/* Card 2: Outstanding Balance */}
          <div className="dash-balance-card glass-panel dash-card-fancy" style={{ padding: '28px 30px', minHeight: '195px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="dash-icon-wrapper red-glow">
                  <DollarSign size={18} />
                </div>
                <span className="dash-card-title">Outstanding Balance</span>
              </div>
              <span className="dash-pill-badge red">
                {membership.annualCommitment ? `Commitment ${membership.annualCommitment}` : 'Due Balance'}
              </span>
            </div>

            <div style={{ margin: '14px 0 6px 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: '#ef4444', letterSpacing: '-0.5px' }}>
                {formatMoney(summary.outstanding)}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingTop: '4px' }}>
              {(canPayNow || renewalDue) && (
                <PaymentActionButton
                  className="dash-btn-gold-action"
                  onClick={handlePayClick}
                >
                  {renewalDue ? 'Renew Membership' : (needsSfMembershipPay ? 'Pay Membership' : 'Make Payment')}
                  <ArrowUpRight size={14} style={{ marginLeft: '4px' }} />
                </PaymentActionButton>
              )}
            </div>
          </div>

          {/* Card 3: Next / Upcoming Payment — hidden when paid in full (do not delete) */}
          {!hideUpcomingPaymentCard && (
          <div className="dash-balance-card glass-panel dash-card-fancy" style={{ padding: '28px 30px', minHeight: '195px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="dash-icon-wrapper blue-glow">
                  <Calendar size={18} />
                </div>
                <span className="dash-card-title">
                  {renewalDue ? 'Membership Renewal' : 'Upcoming Payment'}
                  {/* Previous (commented out): Next Payment, or Upcoming only when paid in full
                  {isFullPaymentComplete ? 'Upcoming Payment' : 'Next Payment'}
                  Next Payment
                  */}
                </span>
              </div>
              {/* SF membership set but schedule not chosen yet — no Annual/frequency badge */}
              {renewalDue ? (
                <span className="dash-pill-badge blue">Annual</span>
              ) : (!needsSfMembershipPay && schedule.frequencyLabel && schedule.frequencyLabel !== '—' && (
                <span className="dash-pill-badge blue">
                  {schedule.frequencyLabel}
                </span>
              ))}
              {/* Previous (commented out): always showed frequency even before Pay Membership schedule setup
              {schedule.frequencyLabel && schedule.frequencyLabel !== '—' && (
                <span className="dash-pill-badge blue">
                  {schedule.frequencyLabel}
                </span>
              )}
              */}
            </div>

            <div style={{ margin: '14px 0 6px 0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, fontFamily: 'var(--font-heading)', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {/* Renewal year / awaiting SF setup / paid in full */}
                {renewalDue
                  ? renewalAmountDisplay
                  : (needsSfMembershipPay || isFullPaymentComplete
                    ? formatMoney(0)
                    : schedule.nextPaymentAmountDisplay)}
                {/* Previous (commented out):
                {needsSfMembershipPay ? formatMoney(0) : schedule.nextPaymentAmountDisplay}
                {schedule.nextPaymentAmountDisplay}
                */}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {renewalDue
                  ? (schedule.nextPaymentDate
                    ? `Renewal: ${schedule.nextPaymentDateDisplay}`
                    : 'Membership year complete — renew now')
                  : (needsSfMembershipPay
                    ? 'No scheduled billing'
                    : (schedule.nextPaymentDate
                      ? `Scheduled: ${schedule.nextPaymentDateDisplay}`
                      : 'No scheduled billing'))}
                {/* Previous (commented out): invented Scheduled date before contribution schedule was chosen
                {schedule.nextPaymentDate ? `Scheduled: ${schedule.nextPaymentDateDisplay}` : 'No scheduled billing'}
                */}
              </span>
              {/* Auto-pay removed from Next Payment card
              {!needsSfMembershipPay && (
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={14} /> Auto-pay
                </span>
              )}
              <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <ShieldCheck size={14} /> Auto-pay
              </span>
              */}
            </div>
          </div>
          )}
          {/* Previous (commented out): always showed Upcoming/Next Payment after full pay
          <div className="dash-balance-card ... Upcoming Payment ... />
          */}

        </div>

        {/* Recent Payments & Household Summary */}
        <div className="dash-split-row" style={{ width: '100%' }}>
          <div className="dash-panel glass-panel">
            <div className="dash-panel-header">
              <h3>Recent Payments</h3>
            </div>
            <div className="table-wrapper">
              <table className="members-table dash-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length ? recentPayments.map((row, i) => (
                    <tr key={row.id || i}>
                      <td>{formatDisplayDate(row.date)}</td>
                      <td>{getPaymentHistoryDescription(row)}</td>
                      {/* Previous (commented out): showed Stripe when method was the processor
                      <td>{formatPaymentDescription(row.method || row.type)}</td>
                      <td>{row.method || row.type || '—'}</td>
                      */}
                      <td>{row.amount || '—'}</td>
                      <td><span className="badge badge-active">{row.status || '—'}</span></td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="portal-empty-table">No payments on file.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" className="dash-view-all" onClick={() => onNavigate('payments')}>
              View all payments
            </button>
          </div>

          <div className="dash-panel glass-panel">
            <div className="dash-panel-header">
              <h3>Household Summary</h3>
            </div>
            {contacts.length ? (
              <ul className="dash-household-list">
                {contacts.map((person) => {
                  const initials = person.name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase() || '?';
                  const tag = person.isPrimary ? 'Owner' : 'Member';
                  const tagClass = person.isPrimary ? 'owner' : 'member';
                  return (
                    <li key={person.id || person.contactId || person.name} className="dash-household-item">
                      <div className="dash-household-avatar">{initials}</div>
                      <div className="dash-household-info">
                        <strong>{person.name}</strong>
                        <span>{person.role}</span>
                      </div>
                      <span className={`dash-role-tag ${tagClass}`}>{tag}</span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="portal-empty-table">No household members on file.</div>
            )}
            <button type="button" className="dash-view-all" onClick={() => onNavigate('household')}>
              View all members
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
