import React, { useEffect, useState } from 'react';
import {
  ShieldCheck, Calendar, CircleDollarSign, Gem,
  FileText, Users, Edit, CalendarOff, Heart, ArrowRight,
  Handshake, Star,
} from 'lucide-react';
import PortalPageLayout from '../shared/PortalPageLayout';
import EditFamilyMemberModal from '../shared/EditFamilyMemberModal';
import { fetchPortalApi } from '../../utils/portalApi';
import {
  formatDisplayDate,
  getFinancialSummary,
  getMembership,
  getContacts,
  getPayments,
  isGuestUser,
  parseMoney,
} from '../../utils/portalData';
import GuestMembershipPage from './GuestMembershipPage';
import { markPostLoginStepperPending } from '../../onboard/utils/postLoginStepper';

function NewMemberJoiningBanner({ dates }) {
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
            We truly appreciate your timely payment and your commitment to Chabad of Bedford.
          </p>
          <div className="renewed-banner-pill">
            <div className="renewed-pill-icon">
              <Calendar size={18} />
            </div>
            <div className="renewed-pill-text">
              <strong>Your membership will commence on {dates.startDate}</strong>
              <span>You'll start enjoying all membership benefits from this date.</span>
            </div>
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
          <span className="renewed-script-note">Thank you! ♡</span>
        </div>
      </div>
    </div>
  );
}

function RenewedMembershipBanner({ dates }) {
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
          <h2 className="renewed-banner-title">Your Membership is Renewed!</h2>
          <p className="renewed-banner-sub">
            Thank you for renewing your membership and continuing to be a valued part of our community.
          </p>
          <div className="renewed-banner-pill">
            <div className="renewed-pill-icon">
              <Calendar size={18} />
            </div>
            <div className="renewed-pill-text">
              <strong>Your renewed membership is active from {dates.startDate}</strong>
              <span>It will remain active until {dates.endDate}.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge">
            <Users size={16} />
          </div>
          <p className="renewed-right-text">Together, we make a stronger community.</p>
          <span className="renewed-script-note">Thank, you for renewing! ♡</span>
        </div>
      </div>
    </div>
  );
}

function ExpiredMembershipBanner({ dates, isExpiringSoon, onRenew }) {
  return (
    <div className="renewed-membership-banner expired-membership-banner">
      <div className="renewed-banner-left">
        <div className="renewed-banner-icon-wrapper">
          <span className="renewed-banner-sparkle sp-top-left">✦</span>
          <span className="renewed-banner-sparkle sp-top-right">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-left">✦</span>
          <span className="renewed-banner-sparkle sp-bottom-right">✦</span>
          <div className="renewed-banner-shield-circle">
            <CalendarOff size={38} strokeWidth={2.2} />
          </div>
        </div>

        <div className="renewed-banner-body">
          <h2 className="renewed-banner-title">
            {isExpiringSoon ? 'Your Membership is Expiring Soon' : 'Your Membership Has Expired'}
          </h2>
          <p className="renewed-banner-sub">
            {isExpiringSoon
              ? `Your membership ends on ${dates.endDate}. Renew now for the upcoming year to ensure uninterrupted benefits!`
              : `Your membership expired on ${dates.endDate}. Renew your membership today to stay connected with our community.`}
          </p>
          <div className="expired-banner-actions">
            <button
              type="button"
              className="dash-btn-primary expired-renew-btn"
              onClick={onRenew}
            >
              Renew Membership Now
            </button>
          </div>
        </div>
      </div>

      <div className="renewed-banner-right">
        <div className="renewed-right-divider" aria-hidden="true" />
        <div className="renewed-right-content">
          <div className="renewed-right-badge">
            <Heart size={16} />
          </div>
          <p className="renewed-right-text">
            {isExpiringSoon ? 'Renew today to continue supporting our community.' : 'We miss having you as part of our community.'}
          </p>
          <span className="renewed-script-note">Thank you for your support! ♡</span>
        </div>
      </div>
    </div>
  );
}

export default function MembershipPage({
  theme,
  sfData,
  user,
  getAuthToken,
  onHouseholdUpdated,
  onNavigate,
  onDonate,
}) {
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    if (!getAuthToken || isGuestUser(sfData)) return;
    let cancelled = false;

    const loadHouseholdData = async () => {
      try {
        const data = await fetchPortalApi('/api/household/data', {
          getAuthToken,
          method: 'POST',
        });
        if (!cancelled && data.sfData) {
          await onHouseholdUpdated?.(data.sfData);
        }
      } catch (err) {
        // ignore background fetch errors
      }
    };

    loadHouseholdData();

    return () => {
      cancelled = true;
    };
  }, [getAuthToken]);

  if (isGuestUser(sfData)) {
    return (
      <GuestMembershipPage
        theme={theme}
        onNavigate={onNavigate}
        user={user}
        sfData={sfData}
      />
    );
  }

  const membership = getMembership(sfData);
  const summary = getFinancialSummary(sfData);
  const contacts = getContacts(sfData);
  const payments = getPayments(sfData);

  const getDatesFromTier = (tierStr) => {
    const raw = String(tierStr || '') + ';' + String(sfData?.groups || '') + ';' + String(sfData?.profile?.groups || '');
    const matches = [...raw.matchAll(/(\d{2})[-/](\d{2})/g)];
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
    return {
      startDate: membership.startDate ? formatDisplayDate(membership.startDate) : '—',
      endDate: membership.endDate ? formatDisplayDate(membership.endDate) : '—',
    };
  };

  const dates = getDatesFromTier(membership.tier);
  const hasMembershipDates = Boolean(membership.tier) && dates.startDate !== '—' && dates.endDate !== '—';

  const now = new Date();
  const currentYear = now.getFullYear();
  const startYearMatch = dates.startDate.match(/\d{4}/);
  const startYear = startYearMatch ? parseInt(startYearMatch[0], 10) : 2026;
  const septFirst = new Date(startYear, 8, 1);
  const isBeforeSeptFirst = now < septFirst;

  const memberSinceYear = membership.memberSince ? parseInt(membership.memberSince.match(/\d{4}/)?.[0] || '0', 10) : 0;
  const isExplicitRenewal = Boolean(sfData?.isRenewal || sfData?.membership?.isRenewal || sfData?.account?.isRenewal);
  const hasPriorHistory = Boolean((memberSinceYear > 0 && memberSinceYear < startYear) || (sfData?.pledges && sfData?.pledges?.length > 1));

  const isNewMember = !isExplicitRenewal && !hasPriorHistory && Boolean(
    sfData?.isNewMember
    || sfData?.account?.isNew
    || sfData?.membership?.isNewMember
    || (memberSinceYear >= startYear)
    || (!sfData?.pledges?.length && !sfData?.payments?.length)
  );

  const statusLower = (membership.status || '').toLowerCase();
  const isExplicitExpired = statusLower.includes('expire') || statusLower.includes('ended') || statusLower.includes('inactive') || statusLower.includes('lapsed');
  const endDateParsed = dates.endDate ? Date.parse(dates.endDate) : 0;
  const isPastEndDate = Number.isFinite(endDateParsed) && now.getTime() > endDateParsed;

  const endYearMatch = dates.endDate.match(/\d{4}/);
  const endYear = endYearMatch ? parseInt(endYearMatch[0], 10) : 2026;
  const augFirstRenewalDate = new Date(endYear, 7, 1);
  const isPastAugustFirst = now >= augFirstRenewalDate;
  const nextYearTag = `${endYear.toString().slice(-2)}-${(endYear + 1).toString().slice(-2)}`;
  const allGroupsStr = String(sfData?.groups || '') + ';' + String(sfData?.membership?.tier || '') + ';' + String(sfData?.profile?.groups || '') + ';' + String(sfData?.account?.groups || '');
  const hasNextYearGroup = allGroupsStr.includes(nextYearTag) || allGroupsStr.includes('26-27');
  const hasNextYearPledge = Boolean(sfData?.pledges?.some((p) => String(p.name || p.subType || p.purpose || p.type || '').includes('26-27') || String(p.name || p.subType || p.purpose || p.type || '').includes('2026-2027')));
  const hasRenewedForNextYear = hasNextYearGroup || hasNextYearPledge;

  const isExpiringSoon = isPastAugustFirst && !isPastEndDate && !hasRenewedForNextYear;
  const isExpired = isExplicitExpired || isPastEndDate || isExpiringSoon;

  const stats = [
    {
      label: 'Group',
      value: membership.tier || '—',
      sub: isExpired ? (isExpiringSoon ? 'Renewal Due' : 'Expired') : (membership.status || '—'),
      subClass: isExpired ? 'text-danger-red' : '',
      icon: Gem,
      badge: membership.tier || '—',
      badgeClass: 'blue',
    },
    {
      label: 'Status',
      value: isExpired ? (isExpiringSoon ? 'Expiring Soon' : 'Expired') : membership.status,
      sub: isExpired ? (isExpiringSoon ? 'Renewal window open' : 'Membership has ended') : 'In good standing',
      icon: ShieldCheck,
      valueClass: isExpired ? 'text-danger-red' : 'text-success',
    },
    { label: 'Start Date', value: dates.startDate, sub: 'Start of year', icon: Calendar },
    {
      label: 'End Date',
      value: dates.endDate,
      sub: 'End of year',
      icon: Calendar,
      subClass: isExpired ? 'text-danger-red' : '',
    },
  ];

  const details = [
    {
      icon: Calendar,
      label: 'Start Date',
      value: dates.startDate,
      sub: null,
      action: null,
    },
    {
      icon: Calendar,
      label: 'End Date',
      value: dates.endDate,
      isExpiredTag: isExpired,
      sub: null,
      action: null,
    },
    {
      icon: FileText,
      label: 'Receipts & Statements',
      value: 'View and download your membership receipts.',
      sub: null,
      action: 'View All',
      actionTab: 'payments',
    },
  ];

  const showHeaderHero = !isBeforeSeptFirst && !isExpired;

  const handleRenewMembership = () => {
    markPostLoginStepperPending();
    sessionStorage.setItem('is_portal_renewal_mode', 'true');
    window.location.href = '/onboard/membership?mode=renew';
  };

  return (
    <PortalPageLayout
      theme={theme}
      title={showHeaderHero ? (membership.tier?.toLowerCase().includes('membership') ? membership.tier : `${membership.tier} Membership`) : null}
      subtitle={showHeaderHero ? "Thank you for your ongoing commitment to our community." : null}
      breadcrumbs={[
        { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
        { label: 'Membership' },
      ]}
      showSketch={false}
    >
      {hasMembershipDates && isExpired ? (
        <ExpiredMembershipBanner
          dates={dates}
          isExpiringSoon={isExpiringSoon}
          onRenew={handleRenewMembership}
        />
      ) : hasMembershipDates && isBeforeSeptFirst ? (
        isNewMember ? (
          <NewMemberJoiningBanner dates={dates} />
        ) : (
          <RenewedMembershipBanner dates={dates} />
        )
      ) : null}
      <div className="membership-page-grid">
        <div className="membership-main">
          <div className="membership-hero-badge-row">
            <span className={`badge ${isExpired ? 'badge-danger' : 'badge-active'}`}>
              {isExpired ? 'Expired' : (membership.status ? `${membership.status} Member` : 'No Membership')}
            </span>
          </div>

          <div className="membership-stats-row">
            {stats.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="membership-stat-card glass-panel">
                  <Icon size={18} className="membership-stat-icon" />
                  <span className="dash-stat-label">{s.label}</span>
                  <strong className={s.valueClass}>{s.value}</strong>
                  {s.badge ? <span className={`role-badge ${s.badgeClass}`}>{s.badge}</span> : null}
                  {s.sub ? <small className={s.subClass}>{s.sub}</small> : null}
                </div>
              );
            })}
          </div>

          <div className="membership-details-card glass-panel">
            <h3>Membership Details</h3>
            {details.map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="membership-detail-row">
                  <Icon size={18} />
                  <div className="membership-detail-body">
                    <span className="membership-detail-label">{row.label}</span>
                    <strong className={row.valueClass}>
                      {row.value}
                      {row.isExpiredTag && <span className="badge-expired-pill">Expired</span>}
                    </strong>
                    {row.sub && <small>{row.sub}</small>}
                  </div>
                  {row.action && (
                    <button type="button" className="portal-text-link" onClick={() => row.actionTab && onNavigate(row.actionTab)}>
                      {row.action}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="membership-details-card glass-panel" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Users size={20} className="text-accent" />
              <h3 style={{ margin: 0 }}>Household Members</h3>
            </div>
            <div className="table-wrapper">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th style={{ textAlign: 'center', width: '120px' }}>Edit Profile</th>
                  </tr>
                </thead>
                <tbody>
                  {contacts.length > 0 ? (
                    contacts.map((contact) => {
                      const displayRole = contact.isPrimary || contact.isSecondary ? 'Parent' : (contact.role || 'Member');
                      return (
                        <tr key={contact.id || contact.contactId || contact.name}>
                          <td style={{ fontWeight: '500' }}>{contact.name}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{contact.email || '—'}</td>
                          <td>{displayRole}</td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              className="dash-btn-icon-only"
                              onClick={() => setEditingMember(contact)}
                              aria-label={`Edit ${contact.name}`}
                              title="Edit Profile"
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--color-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '4px',
                                transition: 'background 0.2s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                            >
                              <Edit size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={4} className="portal-empty-table">
                        No household contacts found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="membership-details-card glass-panel" style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CircleDollarSign size={20} className="text-accent" />
                <h3 style={{ margin: 0 }}>Payment History</h3>
              </div>
              {onNavigate && (
                <button type="button" className="portal-text-link" onClick={() => onNavigate('payments')}>
                  View all →
                </button>
              )}
            </div>
            <div className="table-wrapper">
              <table className="members-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.length > 0 ? (
                    payments.slice(0, 5).map((payment, index) => (
                      <tr key={payment.id || `${payment.date}-${index}`}>
                        <td>{formatDisplayDate(payment.date)}</td>
                        <td>{payment.amount || payment.total || '—'}</td>
                        <td>
                          <span className="badge badge-active">{payment.status || 'Paid'}</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="portal-empty-table">
                        {summary.paymentCount
                          ? 'No recent payments to display.'
                          : 'No payment history yet. Payments will appear here after Salesforce sync.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {editingMember && (
        <EditFamilyMemberModal
          open={Boolean(editingMember)}
          onClose={() => setEditingMember(null)}
          member={editingMember}
          user={user}
          getAuthToken={getAuthToken}
          sfData={sfData}
          onSuccess={async (nextSfData) => {
            if (nextSfData) {
              await onHouseholdUpdated?.(nextSfData);
            } else {
              await onHouseholdUpdated?.();
            }
          }}
        />
      )}
    </PortalPageLayout>
  );
}
