import React, { useEffect, useState, useRef } from 'react';
import {
  X, Heart, Calendar, Gift, RefreshCw, Lock, Shield, CreditCard, Landmark
} from 'lucide-react';
import { fetchPortalApi } from '../../utils/portalApi';
import { showToast } from '../../utils/toast';
import { ALL_MEMBERSHIP_TIERS } from '../../onboard/data/membershipTiers';
import { getMembership, getRecurring, parseMoney } from '../../utils/portalData';

const TYPE_OPTIONS = [
  { id: 'Campaign', label: 'Campaign' },
  { id: 'Donation', label: 'Donation' },
];

const MEMBERSHIP_SUB_TYPES = ALL_MEMBERSHIP_TIERS.map((tier) => ({
  id: tier.name,
  label: tier.name,
}));

const SUB_TYPES = {
  Campaign: [
    { id: 'Membership', label: 'Membership' },
    { id: 'Building Campaign', label: 'Building Campaign' },
    { id: 'Capital Campaign', label: 'Capital Campaign' },
  ],
  Donation: [
    { id: 'General Donation', label: 'General Donation' },
    { id: 'Holiday Contribution', label: 'Holiday Contribution' },
    { id: 'Event', label: 'Event' },
    { id: 'Administration', label: 'Administration' },
    { id: 'Miscellaneous', label: 'Miscellaneous' },
  ],
};

const DEDICATION_TYPES = [
  { id: 'In Honor Of', label: 'In Honor Of' },
  { id: 'In Memory Of', label: 'In Memory Of' },
  { id: 'None', label: 'None (No Dedication)' },
];

const FREQUENCIES = [
  { id: 'Monthly', label: 'Monthly' },
  { id: 'Half Yearly', label: 'Half Yearly' },
  { id: 'Annual', label: 'Annual' },
  { id: 'Weekly', label: 'Weekly' },
];

function todayIsoDate() {
  return new Date().toISOString().split('T')[0];
}

function normalizeLookup(value = '') {
  return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ');
}

function findMembershipTier(value) {
  const needle = normalizeLookup(value);
  if (!needle) return null;

  return ALL_MEMBERSHIP_TIERS.find((tier) => {
    const name = normalizeLookup(tier.name);
    const id = normalizeLookup(tier.id);
    return needle === name
      || needle === id
      || needle.includes(name)
      || name.includes(needle)
      || needle.includes(id);
  }) || null;
}

function getMembershipPaymentAmount(annualPrice, frequency) {
  const price = Number(annualPrice) || 0;
  const freq = normalizeLookup(frequency);
  let amount = price;

  if (freq.includes('week')) amount = price / 52;
  else if (freq.includes('month') && !freq.includes('semi')) amount = price / 12;
  else if (freq.includes('quarter')) amount = price / 4;
  else if (freq.includes('semi') || freq.includes('half')) amount = price / 2;

  return Math.round(amount * 100) / 100;
}

function resolveMembershipDefaults({ sfData, defaultSubType, groups, defaultAmount, defaultFrequency }) {
  const membership = getMembership(sfData);
  const recurring = getRecurring(sfData);
  const activeRecurring = recurring.find((item) => (item.status || '').toLowerCase() === 'active')
    || recurring[0]
    || null;

  const candidates = [
    defaultSubType,
    groups,
    membership.tier,
    sfData?.account?.groups,
    sfData?.groups,
    sfData?.profile?.groups,
  ].filter(Boolean);

  let tier = null;
  let subTypeName = MEMBERSHIP_SUB_TYPES[0]?.id || 'Family Membership';
  for (const candidate of candidates) {
    const matched = findMembershipTier(candidate);
    if (matched) {
      tier = matched;
      subTypeName = matched.name;
      break;
    }
  }
  if (!tier && defaultSubType) {
    subTypeName = defaultSubType;
  }

  const frequency = defaultFrequency
    || activeRecurring?.frequency
    || 'Monthly';

  const recurringAmount = parseMoney(activeRecurring?.amount);
  const computedAmount = tier
    ? getMembershipPaymentAmount(tier.annualPrice, frequency)
    : 0;
  const amountNumber = parseFloat(defaultAmount)
    || recurringAmount
    || computedAmount
    || 0;

  return {
    subType: subTypeName,
    frequency: /semi[-\s]?annual/i.test(String(frequency)) ? 'Half Yearly' : frequency,
    amount: amountNumber > 0 ? amountNumber.toFixed(2) : '0.00',
    annualPrice: tier?.annualPrice || 0,
  };
}

export default function QuickPaymentModal({
  open,
  onClose,
  user,
  getAuthToken,
  sfData,
  onSuccess,
  defaultAmount,
  defaultType,
  defaultSubType,
  defaultBillingMode,
  defaultFrequency,
  source,
  groups,
  defaultMemo,
  readOnly = false,
  pledgeAmount = 0,
  theme,
}) {
  const [billingMode, setBillingMode] = useState('one-time'); // 'one-time' or 'recurring'
  const [paymentType, setPaymentType] = useState('Donation');
  const [subType, setSubType] = useState('General Donation');
  const [amount, setAmount] = useState('100.00');
  const [frequency, setFrequency] = useState('Monthly');
  const [startDate, setStartDate] = useState(todayIsoDate());
  const [dedicationType, setDedicationType] = useState('In Honor Of');
  const [dedicationName, setDedicationName] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentMethodType, setPaymentMethodType] = useState('us_bank_account'); // 'card' or 'us_bank_account'
  const amountInputRef = useRef(null);

  const isMembership = (paymentType === 'Campaign' && subType === 'Membership') || paymentType === 'Membership';

  const applyMembershipAmount = (tierName, nextFrequency) => {
    const tier = findMembershipTier(tierName || defaultSubType || groups || sfData?.account?.groups || 'Family Membership');
    if (!tier) return;
    const nextAmount = getMembershipPaymentAmount(tier.annualPrice, nextFrequency);
    if (nextAmount > 0) setAmount(nextAmount.toFixed(2));
  };

  useEffect(() => {
    if (!open) return;

    let nextType = defaultType || 'Campaign';
    let nextSubType = defaultSubType || 'Membership';

    if (nextType === 'Membership') {
      nextType = 'Campaign';
      nextSubType = 'Membership';
    }

    const nextBillingMode = defaultBillingMode === 'recurring' ? 'recurring' : 'one-time';

    setBillingMode(nextBillingMode);
    setPaymentType(nextType);
    setSubType(nextSubType);
    setStartDate(todayIsoDate());
    setDedicationType(readOnly ? 'None' : 'In Honor Of');
    setDedicationName('');
    setNote(defaultMemo || '');
    setPaymentMethodType('us_bank_account');
    setLoading(false);

    if (nextType === 'Campaign' && nextSubType === 'Membership') {
      const membershipDefaults = resolveMembershipDefaults({
        sfData,
        defaultSubType: defaultSubType === 'Membership' ? null : defaultSubType,
        groups,
        defaultAmount,
        defaultFrequency,
      });
      setFrequency(membershipDefaults.frequency);
      setAmount(membershipDefaults.amount);
      if (nextBillingMode === 'one-time' && !defaultFrequency) {
        const tier = findMembershipTier(membershipDefaults.subType);
        if (tier && !defaultAmount) {
          setAmount(tier.annualPrice.toFixed(2));
        }
      }
    } else {
      setAmount(defaultAmount || '100.00');
      setFrequency(defaultFrequency || 'Monthly');
    }
  }, [open, defaultAmount, defaultType, defaultSubType, defaultBillingMode, defaultFrequency, defaultMemo, readOnly, sfData, groups]);

  if (!open) return null;

  const handleTypeChange = (typeVal) => {
    setPaymentType(typeVal);
    if (typeVal === 'Campaign') {
      setSubType('Membership');
      const membershipDefaults = resolveMembershipDefaults({
        sfData,
        defaultSubType,
        groups,
        defaultAmount,
        defaultFrequency: frequency,
      });
      setFrequency(membershipDefaults.frequency);
      setAmount(membershipDefaults.amount);
      return;
    }

    const subOpts = SUB_TYPES[typeVal] || [];
    if (subOpts.length > 0) {
      setSubType(subOpts[0].id);
    }
    if (!defaultAmount) setAmount('100.00');
  };

  const handleSubTypeChange = (nextSubType) => {
    setSubType(nextSubType);
    if ((paymentType === 'Campaign' && nextSubType === 'Membership') || paymentType === 'Membership') {
      applyMembershipAmount(defaultSubType || groups || 'Family Membership', frequency);
    }
  };

  const handleFrequencyChange = (nextFrequency) => {
    setFrequency(nextFrequency);
    if ((paymentType === 'Campaign' && subType === 'Membership') || paymentType === 'Membership') {
      applyMembershipAmount(defaultSubType || groups || 'Family Membership', nextFrequency);
    }
  };

  const handleAmountPillClick = (val) => {
    if (val === 'Other') {
      setAmount('');
      if (amountInputRef.current) {
        amountInputRef.current.focus();
      }
    } else {
      setAmount(Number(val).toFixed(2));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const parsedAmount = parseFloat(amount) || 0;
    if (parsedAmount <= 0) {
      showToast({ message: 'Please enter a valid amount greater than 0.', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      const payloadType = paymentType === 'Membership' ? 'Campaign' : paymentType;
      const payloadSubType = paymentType === 'Membership' ? 'Membership' : subType;

      const data = await fetchPortalApi('/api/payments/quick-payment', {
        getAuthToken,
        method: 'POST',
        body: {
          email: user?.email,
          contactId: sfData?.contactId || '',
          accountId: sfData?.accountId || sfData?.account?.id || '',
          purpose: paymentType === 'Membership' ? `Campaign — Membership` : subType,
          type: payloadType,
          paymentType: payloadType,
          subType: payloadSubType,
          membershipTier: subType,
          memo: note || dedicationName ? `${dedicationType}: ${dedicationName}. Note: ${note}` : '',
          pledgeAmount: pledgeAmount || 0,
          paymentAmount: parsedAmount,
          billingMode: billingMode === 'recurring' ? 'recurring' : 'regular',
          frequency: frequency,
          paymentDate: startDate,
          paymentMethodType: paymentMethodType,
          source: source || '',
          groups: groups || '',
        },
      });

      if (data.url) {
        showToast({ message: 'Redirecting to secure Stripe checkout...', type: 'success', duration: 2500 });
        window.location.href = data.url;
        return;
      }

      if (data.success) {
        showToast({
          message: data.message || 'Saved to ChabadOne CRM successfully.',
          type: 'success',
        });
        if (onSuccess) {
          await onSuccess();
        }
        onClose();
      }
    } catch (err) {
      showToast({ message: err.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const displayAmount = parseFloat(amount) || 0;
  const formattedBtnAmount = displayAmount > 0 ? `$${displayAmount.toFixed(2)}` : '';
  const membershipSubTypeOptions = (() => {
    const options = [...(SUB_TYPES.Membership || [])];
    if (isMembership && subType && !options.some((option) => option.id === subType)) {
      options.unshift({ id: subType, label: subType });
    }
    return options;
  })();
  const subTypeOptions = isMembership ? membershipSubTypeOptions : (SUB_TYPES[paymentType] || []);

  const themeClass = theme === 'light'
    ? 'qc-theme-light'
    : theme === 'dark'
      ? 'qc-theme-dark'
      : '';

  return (
    <div className={`qc-modal-backdrop ${themeClass}`.trim()} onClick={onClose}>
      <style>{`
        .qc-modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1100;
          backdrop-filter: blur(8px);
          padding: 12px;
        }
        /* Follow onboarding / portal theme when passed explicitly */
        .qc-modal-backdrop.qc-theme-light {
          --bg-main: #fbfaf7;
          --bg-card: #ffffff;
          --bg-card-hover: #f3ede3;
          --border-color: #e9e3d6;
          --border-focus: #c4841f;
          --color-primary: #c4841f;
          --color-primary-hover: #a86d16;
          --color-primary-light: #fbe7c8;
          --text-primary: #0b1f4d;
          --text-secondary: #4b5670;
          --text-muted: #8791a7;
          --glass-shadow: 0 20px 50px rgba(11, 31, 77, 0.12);
        }
        .qc-modal-backdrop.qc-theme-dark {
          --bg-main: #060b16;
          --bg-card: #101b30;
          --bg-card-hover: #16223a;
          --border-color: #26334d;
          --border-focus: #e2a542;
          --color-primary: #e2a542;
          --color-primary-hover: #c4841f;
          --color-primary-light: rgba(226, 165, 66, 0.16);
          --text-primary: #f4f6fb;
          --text-secondary: #b9c2d6;
          --text-muted: #8c98aa;
          --glass-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
        }
        .qc-modal-card {
          width: 100%;
          max-width: 410px;
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: var(--glass-shadow);
          overflow: hidden;
          color: var(--text-primary);
          font-family: var(--font-body), sans-serif;
          position: relative;
          display: flex;
          flex-direction: column;
        }
        .qc-modal-header {
          padding: 14px 20px 6px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid var(--border-color);
        }
        .qc-header-info {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        .qc-icon-wrapper {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--color-primary-light);
          color: var(--color-primary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .qc-header-text h2 {
          font-size: 15.5px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .qc-close-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 4px;
          border-radius: 50%;
          transition: background 0.2s;
        }
        .qc-close-btn:hover {
          background: var(--border-color);
          color: var(--text-primary);
        }
        .qc-form-body {
          padding: 14px 20px;
          max-height: 85vh;
          overflow-y: auto;
        }
        .qc-toggle-group {
          display: grid;
          grid-template-columns: 1fr 1fr;
          background: var(--bg-main);
          padding: 3px;
          border-radius: 10px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color);
        }
        .qc-toggle-btn {
          border: none;
          background: none;
          padding: 7px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 7px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.2s;
        }
        .qc-toggle-btn.active {
          background: var(--color-primary);
          color: #ffffff;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }
        .qc-field {
          margin-bottom: 10px;
        }
        .qc-label {
          display: block;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .qc-input-box {
          position: relative;
          display: flex;
          align-items: center;
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          transition: border-color 0.2s;
        }
        .qc-input-box:focus-within {
          border-color: var(--border-focus);
        }
        .qc-input-icon {
          position: absolute;
          left: 10px;
          color: var(--text-secondary);
        }
        .qc-select {
          width: 100%;
          padding: 8px 10px 8px 30px;
          border: none;
          background: transparent;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          outline: none;
          cursor: pointer;
          -webkit-appearance: none;
          appearance: none;
        }
        /* Style standard options to render correctly in dark/light mode */
        .qc-select option {
          background-color: var(--bg-main);
          color: var(--text-primary);
        }
        .qc-select-arrow {
          position: absolute;
          right: 10px;
          pointer-events: none;
          color: var(--text-secondary);
          font-size: 9px;
        }
        .qc-amount-input-box {
          display: flex;
          align-items: center;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          background: var(--bg-main);
          padding: 0 10px;
          transition: border-color 0.2s;
        }
        .qc-amount-input-box:focus-within {
          border-color: var(--border-focus);
        }
        .qc-amount-symbol {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-secondary);
          margin-right: 6px;
        }
        .qc-amount-input {
          width: 100%;
          border: none;
          background: transparent;
          padding: 8px 0;
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          outline: none;
        }
        .qc-pills-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          margin-top: 6px;
        }
        .qc-pill {
          border: 1px solid var(--border-color);
          background: var(--bg-main);
          padding: 6px;
          font-size: 11.5px;
          font-weight: 600;
          color: var(--text-secondary);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }
        .qc-pill:hover {
          background: var(--bg-card-hover);
          border-color: var(--text-secondary);
        }
        .qc-pill.active {
          background: var(--color-primary-light);
          border-color: var(--color-primary);
          color: var(--color-primary);
        }
        .qc-text-input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          outline: none;
          background: var(--bg-main);
          transition: border-color 0.2s;
        }
        .qc-text-input:focus {
          border-color: var(--border-focus);
        }
        .qc-textarea {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-primary);
          outline: none;
          background: var(--bg-main);
          resize: none;
          height: 48px;
          transition: border-color 0.2s;
        }
        .qc-textarea:focus {
          border-color: var(--border-focus);
        }
        .qc-char-counter {
          text-align: right;
          font-size: 9.5px;
          color: var(--text-muted);
          margin-top: 1px;
        }
        .qc-pay-btn {
          width: 100%;
          background: var(--color-primary);
          border: none;
          padding: 11px;
          border-radius: 8px;
          color: #ffffff;
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: 12px;
          transition: background 0.2s;
        }
        .qc-pay-btn:hover {
          background: var(--color-primary-hover);
        }
        .qc-pay-btn:disabled {
          background: var(--border-color);
          color: var(--text-muted);
          cursor: not-allowed;
        }
        .qc-footer-text {
          text-align: center;
          font-size: 11px;
          color: var(--text-secondary);
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }
        .qc-bottom-banner {
          background: var(--bg-main);
          padding: 10px 20px;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .qc-bb-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .qc-bb-icon {
          color: var(--color-primary);
        }
        .qc-bb-text h4 {
          font-size: 11px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
        }
        .qc-bb-text p {
          font-size: 9px;
          color: var(--text-secondary);
          margin: 1px 0 0;
        }
        .qc-bb-badges {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 9px;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
        }
        .qc-type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          margin-bottom: 10px;
        }
        .qc-payment-methods {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
          margin-top: 6px;
        }
        @media (max-width: 480px) {
          .qc-modal-backdrop {
            align-items: flex-end;
            padding: 0;
          }
          .qc-modal-card {
            max-width: none;
            border-radius: 16px 16px 0 0;
            max-height: 92vh;
          }
          .qc-form-body {
            max-height: calc(92vh - 110px);
            padding: 12px 16px;
          }
          .qc-type-grid {
            grid-template-columns: 1fr;
          }
          .qc-pills-row {
            grid-template-columns: repeat(2, 1fr);
          }
          .qc-payment-methods {
            gap: 12px 16px;
          }
          .qc-bottom-banner {
            flex-wrap: wrap;
            gap: 8px;
            padding: 10px 16px;
          }
        }
      `}</style>

      <div className="qc-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="qc-modal-header">
          <div className="qc-header-info">
            <div className="qc-icon-wrapper">
              <Gift size={16} />
            </div>
            <div className="qc-header-text">
              <h2>Quick Contribution</h2>
            </div>
          </div>
          <button type="button" className="qc-close-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="qc-form-body">
          <div className="qc-toggle-group" style={readOnly ? { pointerEvents: 'none', opacity: 0.85 } : {}}>
            <button
              type="button"
              className={`qc-toggle-btn ${billingMode === 'one-time' ? 'active' : ''}`}
              onClick={() => setBillingMode('one-time')}
            >
              <Heart size={13} /> One-Time
            </button>
            <button
              type="button"
              className={`qc-toggle-btn ${billingMode === 'recurring' ? 'active' : ''}`}
              onClick={() => setBillingMode('recurring')}
            >
              <Calendar size={13} /> Recurring
            </button>
          </div>

          <div className="qc-field" style={{ marginBottom: '12px' }}>
            <label className="qc-label">Payment Method</label>
            <div className="qc-payment-methods">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="us_bank_account"
                  checked={paymentMethodType === 'us_bank_account'}
                  onChange={() => setPaymentMethodType('us_bank_account')}
                  style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <Landmark size={14} style={{ color: 'var(--color-primary)' }} />
                Bank Transfer
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: 'var(--text-primary)' }}>
                <input
                  type="radio"
                  name="paymentMethod"
                  value="card"
                  checked={paymentMethodType === 'card'}
                  onChange={() => setPaymentMethodType('card')}
                  style={{ accentColor: 'var(--color-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                />
                <CreditCard size={14} style={{ color: 'var(--color-primary)' }} />
                Card
              </label>
            </div>
          </div>

          <div className="qc-type-grid">
            <div className="qc-field">
              <label className="qc-label">Type</label>
              <div className="qc-input-box">
                <Gift size={14} className="qc-input-icon" />
                <select
                  className="qc-select"
                  value={paymentType}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  style={{ paddingLeft: '30px' }}
                  disabled={readOnly}
                >
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </select>
                <span className="qc-select-arrow" style={{ right: '8px' }}>▼</span>
              </div>
            </div>

            <div className="qc-field">
              <label className="qc-label">Sub-Type</label>
              <div className="qc-input-box">
                <Gift size={14} className="qc-input-icon" />
                <select
                  className="qc-select"
                  value={subType}
                  onChange={(e) => handleSubTypeChange(e.target.value)}
                  style={{ paddingLeft: '30px' }}
                  disabled={readOnly}
                >
                  {(subTypeOptions).map((st) => (
                    <option key={st.id} value={st.id}>{st.label}</option>
                  ))}
                </select>
                <span className="qc-select-arrow" style={{ right: '8px' }}>▼</span>
              </div>
            </div>
          </div>

          <div className="qc-field" style={{ marginTop: '10px' }}>
            <label className="qc-label">Amount (USD)</label>
            <div className="qc-amount-input-box" style={readOnly ? { backgroundColor: 'var(--bg-card-hover)', opacity: 0.8 } : {}}>
              <span className="qc-amount-symbol">$</span>
              <input
                ref={amountInputRef}
                type="number"
                min="1"
                step="0.01"
                className="qc-amount-input"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                disabled={readOnly}
                readOnly={readOnly}
              />
            </div>
          </div>

          {!readOnly && !isMembership && (
            <div style={{ marginBottom: '10px' }}>
              <div className="qc-pills-row">
                {['50', '100', '250'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`qc-pill ${parseFloat(amount) === Number(val) ? 'active' : ''}`}
                    onClick={() => handleAmountPillClick(val)}
                  >
                    ${val}
                  </button>
                ))}
                <button
                  type="button"
                  className={`qc-pill ${!['50', '100', '250'].includes(parseFloat(amount).toString()) ? 'active' : ''}`}
                  onClick={() => handleAmountPillClick('Other')}
                >
                  Other
                </button>
              </div>
            </div>
          )}

          {isMembership && (
            <div style={{ marginBottom: '10px' }}>
              <div className="qc-pills-row">
                <button
                  type="button"
                  className="qc-pill active"
                  onClick={() => {
                    if (!readOnly) applyMembershipAmount(subType, frequency);
                  }}
                >
                  {formattedBtnAmount || '$0.00'}
                  {billingMode === 'recurring' ? ` / ${frequency === 'Half Yearly' ? 'half year' : frequency.toLowerCase()}` : ''}
                </button>
              </div>
            </div>
          )}

          {billingMode === 'recurring' && (
            <>
              <div className="qc-field">
                <label className="qc-label">Frequency</label>
                <div className="qc-input-box">
                  <RefreshCw size={14} className="qc-input-icon" />
                  <select
                    className="qc-select"
                    value={frequency}
                    onChange={(e) => handleFrequencyChange(e.target.value)}
                    disabled={readOnly}
                  >
                    {FREQUENCIES.map((f) => (
                      <option key={f.id} value={f.id}>{f.label}</option>
                    ))}
                  </select>
                  <span className="qc-select-arrow">▼</span>
                </div>
              </div>

              <div className="qc-field" style={{ marginTop: '10px' }}>
                <label className="qc-label">Payment Date</label>
                <div className="qc-input-box">
                  <Calendar size={14} className="qc-input-icon" />
                  <input
                    type="date"
                    className="qc-select"
                    style={{ paddingLeft: '30px' }}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled={readOnly}
                  />
                </div>
              </div>
            </>
          )}

          {!readOnly && (
            <>
              <div className="qc-field" style={{ marginTop: '10px' }}>
                <label className="qc-label">Dedication (Optional)</label>
                <div className="qc-input-box">
                  <Gift size={14} className="qc-input-icon" />
                  <select
                    className="qc-select"
                    value={dedicationType}
                    onChange={(e) => setDedicationType(e.target.value)}
                  >
                    {DEDICATION_TYPES.map((d) => (
                      <option key={d.id} value={d.id}>{d.label}</option>
                    ))}
                  </select>
                  <span className="qc-select-arrow">▼</span>
                </div>
              </div>

              {dedicationType !== 'None' && (
                <>
                  <div className="qc-field" style={{ marginTop: '10px' }}>
                    <label className="qc-label">Dedication Name</label>
                    <input
                      type="text"
                      className="qc-text-input"
                      value={dedicationName}
                      onChange={(e) => setDedicationName(e.target.value)}
                      placeholder="Someone's Name"
                    />
                  </div>

                  <div style={{ marginTop: '10px', marginBottom: '10px' }}>
                    <textarea
                      className="qc-textarea"
                      maxLength={150}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note (optional)"
                    />
                    <div className="qc-char-counter">{note.length}/150</div>
                  </div>
                </>
              )}
            </>
          )}

          <button type="submit" className="qc-pay-btn" disabled={loading}>
            <Lock size={14} />
            {loading ? (
              'Processing...'
            ) : billingMode === 'one-time' ? (
              `Pay ${formattedBtnAmount} Now`
            ) : (
              'Start Monthly Giving'
            )}
          </button>

          {billingMode === 'one-time' && (
            <div className="qc-footer-text">
              <Lock size={11} /> Secure payment powered by Stripe
            </div>
          )}
        </form>

        <div className="qc-bottom-banner">
          <div className="qc-bb-left">
            <Shield size={16} className="qc-bb-icon" />
            <div className="qc-bb-text">
              <h4>Secure & Trusted</h4>
              <p>All payments are encrypted and securely processed by Stripe.</p>
            </div>
          </div>
          <div className="qc-bb-badges">
            <span>stripe</span>
            <Lock size={11} style={{ color: '#94a3b8' }} />
            <span style={{ fontSize: '8.5px', border: '1px solid var(--border-color)', padding: '0px 2px', borderRadius: '2px' }}>PCI</span>
          </div>
        </div>
      </div>
    </div>
  );
}
