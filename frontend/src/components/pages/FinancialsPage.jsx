import React, { useEffect, useState } from 'react';
import { Wallet, Lock, ShieldCheck, RefreshCw, Info } from 'lucide-react';
import PortalPageLayout from '../shared/PortalPageLayout';
import SectionTabs from '../shared/SectionTabs';
import DataTable, { StatusIcon } from '../shared/DataTable';
import UpdatePaymentMethodModal from '../shared/UpdatePaymentMethodModal';
import {
  formatDisplayDate,
  formatMoney,
  getAccount,
  getPayments,
  getPledges,
  getRecurring,
  parseMoney,
  isPaymentWindowOpen,
  // hasRecentMembershipPayment,
} from '../../utils/portalData';

function isMembershipRecord(row = {}) {
  const blob = `${row.purpose || ''} ${row.name || ''} ${row.subType || ''} ${row.type || ''}`.toLowerCase();
  return blob.includes('member') || blob.includes('campaign');
}

function relatedPledgeForPayment(payment = {}, pledges = []) {
  if (!pledges.length) return null;
  const membershipPledges = pledges.filter(isMembershipRecord);
  if (isMembershipRecord(payment) && membershipPledges.length) {
    return membershipPledges[0];
  }
  const paymentBlob = `${payment.purpose || ''} ${payment.name || ''} ${payment.subType || ''}`.toLowerCase();
  const named = pledges.find((pledge) => {
    const pledgeBlob = `${pledge.purpose || ''} ${pledge.name || ''} ${pledge.subType || ''}`.toLowerCase();
    return pledgeBlob && paymentBlob && (pledgeBlob.includes(paymentBlob.slice(0, 10)) || paymentBlob.includes(pledgeBlob.slice(0, 10)));
  });
  return named || membershipPledges[0] || pledges[0];
}

function paymentPurposeLabel(payment = {}, pledge = null) {
  if (isMembershipRecord(payment) || isMembershipRecord(pledge || {})) return 'Membership';
  const raw = String(pledge?.purpose || pledge?.subType || payment.purpose || payment.subType || payment.name || '').trim();
  if (!raw) return 'Membership';
  if (/campaign\s*:\s*/i.test(raw)) {
    const after = raw.split(':').slice(1).join(':').trim();
    if (/member/i.test(after)) return 'Membership';
    return after || 'Membership';
  }
  return raw;
}

// Previous (commented out): only showed the notice when the payments table was empty
// function hasUnsyncedRecentPayment(sfData) {
//   const email = String(sfData?.email || '').trim().toLowerCase();
//   if (hasRecentMembershipPayment(email)) return true;
//   try {
//     if (sessionStorage.getItem('pending_checkout_session_id')) return true;
//   } catch {
//     // ignore
//   }
//   try {
//     const pending = JSON.parse(localStorage.getItem('pending_portal_payments') || '[]');
//     if (Array.isArray(pending) && pending.some((item) => !email || !item.email || item.email === email)) {
//       return true;
//     }
//   } catch {
//     // ignore
//   }
//   return false;
// }

const ALL_TABS = [
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'pledges', label: 'Outstanding Balance', icon: Wallet },
  { id: 'recurring', label: 'Recurring Billing', icon: RefreshCw },
];

// Hidden on Payments and Recurring Contributions pages — do not delete.
const TABS = ALL_TABS.filter((tab) => tab.id !== 'pledges');

export default function FinancialsPage({ theme, sfData, onDonate, defaultTab = 'payments', getAuthToken, onRefresh }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [showUpdateMethod, setShowUpdateMethod] = useState(false);
  const [updateMethodRow, setUpdateMethodRow] = useState(null);

  useEffect(() => {
    // Outstanding Balance tab is hidden — stay on Payments if that tab is requested.
    if (defaultTab === 'pledges') {
      setActiveTab('payments');
      return;
    }
    setActiveTab(defaultTab);
  }, [defaultTab]);
  const account = getAccount(sfData);
  const payments = getPayments(sfData);
  const pledges = getPledges(sfData);
  const recurring = getRecurring(sfData);
  const outstandingPledges = pledges.filter((item) => parseMoney(item.outstanding) > 0);
  const displayPledges = outstandingPledges.length > 0 ? outstandingPledges : pledges;
  const canPayNow = isPaymentWindowOpen(sfData);
  // Previous (commented out): notice replaced the table when CRM had 0 payments
  // const showRecentPaymentNotice = activeTab === 'payments'
  //   && payments.length === 0
  //   && hasUnsyncedRecentPayment(sfData);

  const counts = {
    payments: payments.length,
    pledges: displayPledges.length,
    recurring: recurring.length,
  };

  return (
    <PortalPageLayout
      theme={theme}
      showSketch={false}
    >
      <div className="account-header-card glass-panel">
        <div className="account-header-main">
          <div className="account-header-icon"><Wallet size={24} /></div>
          <div>
            <span className="account-header-type">Financials</span>
            <h2>{account.name}</h2>
          </div>
        </div>
        <div className="account-header-actions">
          {canPayNow && (
            <button type="button" className="dash-btn-gold" onClick={() => onDonate()}>
              <Lock size={16} /> General Payment
            </button>
          )}
        </div>
      </div>

      <div className="section-card glass-panel">
        <SectionTabs
          tabs={TABS}
          activeTab={activeTab}
          onChange={(nextTab) => {
            if (nextTab === 'pledges') return;
            setActiveTab(nextTab);
          }}
        />

        <div className="section-panel">
          <div className="section-panel-header">
            <div>
              <h3>
                {activeTab === 'payments' && 'All Payments'}
                {activeTab === 'pledges' && 'Outstanding Balance'}
                {activeTab === 'recurring' && 'Recurring Billing'}
              </h3>
              {activeTab === 'payments' && (
                <p className="section-panel-subcopy">
                  Showing all you performed payments
                </p>
              )}
            </div>
            <span className="section-count">{counts[activeTab]} items</span>
          </div>

          {/* Previous (commented out): centered empty-state notice instead of the table
          {activeTab === 'payments' && showRecentPaymentNotice && (
            <div className="recent-payment-notice">
              <div className="recent-payment-notice-icon" aria-hidden="true">
                <Wallet size={22} />
              </div>
              <h4>Recently made a payment?</h4>
              <p>
                It may take a few moments for your payment to appear in your transaction history. Please{' '}
                <button type="button" className="portal-table-link" onClick={() => window.location.reload()}>
                  refresh the page
                </button>
                {' '}to check for the latest updates.
              </p>
            </div>
          )}
          {activeTab === 'payments' && !showRecentPaymentNotice && (
            <DataTable ... />
          )}
          */}
          {activeTab === 'payments' && (
            <DataTable
              emptyMessage="No payments found."
              align="center"
              rows={payments}
              columns={[
                {
                  key: 'invoiceTotal',
                  label: 'Invoice Total',
                  render: (row) => {
                    const pledge = relatedPledgeForPayment(row, pledges);
                    return pledge?.total || pledge?.amount || '$0.00';
                  },
                },
                {
                  key: 'amountPaid',
                  label: 'Amount Paid',
                  render: (row) => row.amount || formatMoney(parseMoney(row.total)),
                },
                {
                  key: 'outstanding',
                  label: 'Outstanding Balance',
                  render: (row) => relatedPledgeForPayment(row, pledges)?.outstanding || '$0.00',
                },
                {
                  key: 'purpose',
                  label: 'Purpose',
                  render: (row) => paymentPurposeLabel(row, relatedPledgeForPayment(row, pledges)),
                },
                {
                  key: 'date',
                  label: 'Date',
                  render: (row) => formatDisplayDate(row.date),
                },
                // Previous (commented out): status checkmark, Paid, Outstanding, Total Amount
                // { key: 'status', label: '', render: (row) => <StatusIcon status={row.status} /> },
                // { key: 'paid', label: 'Paid', render: (row) => row.amount || formatMoney(parseMoney(row.total)) },
                // { key: 'totalAmount', label: 'Total Amount', ... },
              ]}
            />
          )}

          {/* Outstanding Balance table hidden (commented out, not deleted)
          {activeTab === 'pledges' && (
            <DataTable
              emptyMessage="No Outstanding Balance records found."
              rows={displayPledges}
              ...
            />
          )}
          */}
          {false && activeTab === 'pledges' && (
            <DataTable
              emptyMessage="No Outstanding Balance records found."
              rows={displayPledges}
              columns={[
                { key: 'status', label: '', render: (row) => <StatusIcon status={row.status} /> },
                {
                  key: 'paid',
                  label: 'Paid',
                  render: (row) => {
                    const relatedPaid = payments
                      .filter((payment) => relatedPledgeForPayment(payment, [row])?.id === row.id)
                      .reduce((sum, payment) => sum + parseMoney(payment.amount || payment.total), 0);
                    if (relatedPaid > 0) return formatMoney(relatedPaid);
                    return row.paid || '$0.00';
                  },
                },
                { key: 'outstanding', label: 'Outstanding' },
                {
                  key: 'totalAmount',
                  label: 'Total Amount',
                  render: (row) => row.total || row.amount || '$0.00',
                },
                {
                  key: 'purpose',
                  label: 'Purpose',
                  render: (row) => paymentPurposeLabel({}, row),
                },
                {
                  key: 'date',
                  label: 'Date',
                  render: (row) => {
                    const related = payments.find((payment) => relatedPledgeForPayment(payment, [row])?.id === row.id);
                    return formatDisplayDate(related?.date || row.date);
                  },
                },
                // Previous (commented out): Amount / Outstanding / Total / Paid / Purpose / Payment Date / Action
                // { key: 'amount', label: 'Amount' },
                // { key: 'outstanding', label: 'Outstanding' },
                // { key: 'total', label: 'Total' },
                // { key: 'paid', label: 'Paid' },
                // { key: 'purpose', label: 'Purpose', render: (row) => row.purpose || row.name },
                // { key: 'date', label: 'Payment Date', render: (row) => formatDisplayDate(row.date) },
                {
                  key: 'action',
                  label: 'Action',
                  render: (row) => {
                    const outstandingVal = parseFloat(String(row.outstanding || '').replace(/[^0-9.-]/g, '')) || 0;
                    if (outstandingVal <= 0) {
                      return (
                        <button
                          type="button"
                          className="dash-btn-gold"
                          disabled
                          style={{
                            padding: '4px 10px',
                            fontSize: '12px',
                            minHeight: 'auto',
                            opacity: 0.6,
                            cursor: 'not-allowed',
                          }}
                        >
                          Completed
                        </button>
                      );
                    }

                    const detectPaymentTypeAndSubType = (pledgeRow = {}) => {
                      const pledgeName = pledgeRow.name || pledgeRow.purpose || '';
                      const rawType = pledgeRow.type || pledgeRow.paymentType || '';
                      const rawSubType = pledgeRow.subType || pledgeRow.purpose || pledgeRow.name || '';
                      const name = pledgeName.trim().toLowerCase();
                      const typeStr = String(rawType).trim().toLowerCase();
                      const subTypeStr = String(rawSubType).trim().toLowerCase();

                      if (typeStr === 'campaign' || subTypeStr === 'membership' || name.includes('membership') || name.includes('member')) {
                        return { type: 'Campaign', subType: 'Membership' };
                      }
                      if (name.includes('tuition')) {
                        return { type: 'Payment', subType: rawSubType || 'Hebrew School Tuition' };
                      }
                      if (name.includes('event')) {
                        return { type: 'Payment', subType: rawSubType || 'Event Registration' };
                      }
                      if (name.includes('camp')) {
                        return { type: 'Payment', subType: rawSubType || 'Camp Bedford' };
                      }
                      if (name.includes('building')) {
                        return { type: 'Pledge', subType: rawSubType || 'Building Campaign' };
                      }
                      if (name.includes('capital')) {
                        return { type: 'Pledge', subType: rawSubType || 'Capital Campaign' };
                      }
                      if (name.includes('holiday')) {
                        return { type: 'Donation', subType: rawSubType || 'Holiday Contribution' };
                      }
                      if (name.includes('yizkor')) {
                        return { type: 'Donation', subType: rawSubType || 'Yizkor' };
                      }
                      if (name.includes('chai')) {
                        return { type: 'Donation', subType: rawSubType || 'Chai Club' };
                      }
                      return { type: rawType || 'Campaign', subType: rawSubType || 'Membership' };
                    };

                    const matched = detectPaymentTypeAndSubType(row);

                    if (!canPayNow) {
                      return <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Scheduled</span>;
                    }

                    return (
                      <button
                        type="button"
                        className="dash-btn-gold"
                        style={{ padding: '4px 10px', fontSize: '12px', minHeight: 'auto' }}
                        onClick={() => onDonate({
                          amount: outstandingVal.toFixed(2),
                          type: matched.type,
                          subType: matched.subType,
                        })}
                      >
                        Pay Now
                      </button>
                    );
                  }
                }
              ]}
            />
          )}

          {activeTab === 'recurring' && (
            <DataTable
              emptyMessage="No recurring billing profiles found."
              rows={recurring}
              align="center"
              columns={[
                {
                  key: 'status',
                  label: 'Status',
                  render: (row) => {
                    const waiting = String(row.status || '').trim().toLowerCase() === 'waiting';
                    return (
                      <span className={`badge ${waiting ? 'badge-waiting' : 'badge-active'}`}>
                        {row.status}
                      </span>
                    );
                  },
                },
                {
                  key: 'invoiceTotal',
                  label: 'Invoice Total',
                  render: (row) => row.invoiceTotal || formatMoney(row.OneCRM__Total_Estimated_Revenue__c) || '$0.00',
                },
                {
                  key: 'amountPerCharge',
                  label: 'Amount Per Charge',
                  render: (row) => row.amountPerCharge || formatMoney(row.OneCRM__Amount_Per_Charge__c) || '$0.00',
                },
                {
                  key: 'frequency',
                  label: 'Frequency',
                  align: 'center',
                  render: (row) => row.frequency || row.OneCRM__Schedule__c || '—',
                },
                {
                  key: 'chargesRemaining',
                  label: 'Charges Remaining',
                  render: (row) => {
                    const remaining = row.chargesRemaining ?? row.OneCRM__Charges_Remaining__c;
                    if (remaining === '' || remaining === null || remaining === undefined) return '—';
                    return remaining;
                  },
                },
                {
                  key: 'method',
                  label: 'Payment Method',
                  render: (row) => {
                    const paymentType = String(
                      row.paymentType || row.OneCRM__Payment_Type__c || row.method || '',
                    ).replace(/\s+/g, ' ').trim();
                    const last4 = String(row.last4 || row.OneCRM__Last4__c || '').replace(/\D/g, '').slice(-4);
                    if (last4 && /credit\s*card/i.test(paymentType)) {
                      const typeOnly = paymentType.replace(/[\s-]+\d{2,4}$/, '').replace(/\s+/g, ' ').trim() || 'Credit Card';
                      return `${typeOnly}-${last4}`;
                    }
                    return row.method || paymentType || '—';
                  },
                },
                { key: 'cardExpiry', label: 'Update Payment Method', render: (row) => {
                  const waiting = String(row.status || '').trim().toLowerCase() === 'waiting';
                  if (!waiting) return '—';
                  return (
                    <button
                      type="button"
                      className="dash-btn-gold update-method-btn"
                      onClick={() => {
                        setUpdateMethodRow(row);
                        setShowUpdateMethod(true);
                      }}
                    >
                      Update Method
                    </button>
                  );
                } },
              ]}
            />
          )}
        </div>
      </div>

      {activeTab === 'payments' && (
        <div className="recent-payment-notice">
          <div className="recent-payment-notice-icon" aria-hidden="true">
            <Info size={18} />
          </div>
          <div className="recent-payment-notice-copy">
            <h4>Recently made a payment?</h4>
            <p>
              It may take a few moments for your payment to appear in your transaction history. Please{' '}
              <button
                type="button"
                className="recent-payment-notice-refresh"
                onClick={() => window.location.reload()}
              >
                refresh the page
              </button>
              {' '}to check for the latest updates.
            </p>
          </div>
        </div>
      )}

      <div className="financial-note glass-panel">
        <ShieldCheck size={16} />
        <span>Secure payments processed by Stripe.</span>
      </div>

      <UpdatePaymentMethodModal
        open={showUpdateMethod}
        onClose={() => {
          setShowUpdateMethod(false);
          setUpdateMethodRow(null);
        }}
        sfData={sfData}
        getAuthToken={getAuthToken}
        recurringRow={updateMethodRow}
        onUpdated={onRefresh}
      />
    </PortalPageLayout>
  );
}
