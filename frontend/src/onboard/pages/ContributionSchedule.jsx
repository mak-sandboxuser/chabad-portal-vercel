import { useState } from 'react';
import { CreditCard, PieChart, Calendar, Check, ArrowLeft, Clock } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import InfoPanel from '../components/InfoPanel';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { fetchPortalApi } from '../../utils/portalApi';
import { showToast } from '../../utils/toast';
import QuickPaymentModal from '../../components/shared/QuickPaymentModal';
import {
  getStepById,
  CONTRIBUTION_SCHEDULE_STEP_ID,
  MEMBERSHIP_STEP_ID,
} from '../data/onboardingSteps';
import { getMembershipTierById, formatCurrency, formatMembershipSalesforceGroup } from '../data/membershipTiers';
import { getProratedMembershipCommitment, getRemainingMembershipMonths, getPortalTestDateLabel } from '../../utils/portalFiscalYear';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import {
  isPostLoginStepperPending,
  isSalesforceMembershipScheduleOnly,
  clearSalesforceMembershipScheduleOnly,
  dismissPostLoginStepperPending,
  isPortalUpdateMembershipMode,
  readSelectedMembershipTier,
} from '../utils/postLoginStepper';
import '../onboard.css';

const THIS_STEP_ID = CONTRIBUTION_SCHEDULE_STEP_ID;
const PREVIOUS_STEP_ID = MEMBERSHIP_STEP_ID;
const FALLBACK_ANNUAL_PRICE = 1800;

function buildScheduleOptions(commitmentPrice, remainingMonths, annualPrice) {
  const monthlyRate = Number(annualPrice || 0) / 12;
  const monthCount = remainingMonths > 0 ? remainingMonths : 12;
  return [
    {
      id: 'full',
      number: 1,
      title: 'Full Payment',
      subtitle: 'One-Time Payment',
      icon: CreditCard,
      accent: 'blue',
      amountLabel: `$${formatCurrency(commitmentPrice)}`,
      billingLines: ['One-time charge today'],
    },
    {
      id: 'installments',
      number: 2,
      title: 'Two Installments',
      subtitle: '50% + 50%',
      icon: PieChart,
      accent: 'purple',
      amountLabel: `$${formatCurrency(commitmentPrice / 2)}`,
      amountSuffix: ' / installment',
      billingLines: [
        '2 payments',
        '1st payment today (50%)',
        '2nd payment on December 26 (50%)',
      ],
    },
    {
      id: 'monthly',
      number: 3,
      title: 'Monthly Contributions',
      subtitle: `${monthCount} Monthly Payments`,
      icon: Calendar,
      accent: 'green',
      amountLabel: `$${formatCurrency(monthlyRate)}`,
      amountSuffix: ' / month',
      billingLines: [`${monthCount} monthly payments`, 'First payment today'],
    },
  ].map((option) => ({ ...option, totalCommitment: `$${formatCurrency(commitmentPrice)}` }));
}

// Previous (commented out): Total Commitment was always the full annual price
// function buildScheduleOptions(annualPrice) {
//   return [
//     {
//       id: 'full',
//       number: 1,
//       title: 'Full Payment',
//       subtitle: 'One-Time Payment',
//       icon: CreditCard,
//       accent: 'blue',
//       amountLabel: `$${formatCurrency(annualPrice)}`,
//       billingLines: ['One-time charge today'],
//     },
//     {
//       id: 'installments',
//       number: 2,
//       title: 'Two Installments',
//       subtitle: '50% + 50%',
//       icon: PieChart,
//       accent: 'purple',
//       amountLabel: `$${formatCurrency(annualPrice / 2)}`,
//       amountSuffix: ' / installment',
//       billingLines: [
//         '2 payments',
//         '1st payment today (50%)',
//         '2nd payment on December 26 (50%)',
//       ],
//     },
//     {
//       id: 'monthly',
//       number: 3,
//       title: 'Monthly Contributions',
//       subtitle: '12 Monthly Payments',
//       icon: Calendar,
//       accent: 'green',
//       amountLabel: `$${formatCurrency(annualPrice / 12)}`,
//       amountSuffix: ' / month',
//       billingLines: ['12 monthly payments', 'First payment today'],
//     },
//   ].map((option) => ({ ...option, totalCommitment: `$${formatCurrency(annualPrice)}` }));
// }

export default function ContributionSchedule() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const draftMembership = draft.data.membership || {};
  const isUpdateMembership = isPortalUpdateMembershipMode()
    || draftMembership.source === 'update_membership';
  // Update Membership is a new catalog pick — do not reuse Pay Membership leftovers
  // (sf_membership_schedule_only / salesforce_assigned), which showed $1800 instead
  // of the selected tier (e.g. Single Parent Family $1560).
  const isExistingMembershipPay = !isUpdateMembership && (
    isSalesforceMembershipScheduleOnly()
    || draftMembership.source === 'salesforce_assigned'
  );
  // URL/sessionStorage survive a wiped draft (Select & Pay writes both).
  // Previous (commented out): only draft.tier, which was empty after App.jsx
  // markPostLoginStepperPending() and always fell back to $1800.
  // const catalogTier = getMembershipTierById(draftMembership.tier);
  const catalogTier = getMembershipTierById(
    readSelectedMembershipTier() || draftMembership.tier,
  );
  // Salesforce-assigned groups (e.g. Building Donors HH) may use tier id "sf-assigned"
  // or a price-matched catalog tier — always prefer draft annualPrice when set.
  const draftAnnual = Number(draftMembership.annualPrice) || 0;
  // Previous (commented out): catalog-only lookup fell back to $1800 and ignored SF commitment.
  // const selectedMembershipTier = getMembershipTierById(draft.data.membership?.tier) || {
  //   name: 'Membership',
  //   annualPrice: FALLBACK_ANNUAL_PRICE,
  // };
  // const annualPrice = selectedMembershipTier.annualPrice;
  const selectedMembershipTier = catalogTier || {
    name: draftMembership.name || draftMembership.sfGroup || 'Membership',
    annualPrice: draftAnnual > 0 ? draftAnnual : FALLBACK_ANNUAL_PRICE,
  };
  // Catalog Select & Pay / Update Membership: use the clicked tier list price
  // (e.g. Single Parent Family $1560), not a leftover draft/fallback $1800.
  // Pay Membership keeps the Salesforce draft amount when it differs from catalog.
  // Previous (commented out): leftover draftAnnual (often FALLBACK 1800) won over the selected tier
  // const annualPrice = draftAnnual > 0 ? draftAnnual : selectedMembershipTier.annualPrice;
  const annualPrice = (!isExistingMembershipPay && catalogTier)
    ? Number(catalogTier.annualPrice)
    : (draftAnnual > 0 ? draftAnnual : selectedMembershipTier.annualPrice);
  const remainingMonths = getRemainingMembershipMonths();
  const commitmentPrice = getProratedMembershipCommitment(annualPrice);
  const testDateLabel = getPortalTestDateLabel();
  // Previous (commented out): Pay Membership used the full annual unless the renewal banner was showing
  // const applyProration = !isExistingMembershipPay || isMembershipRenewalWindowOpen();
  // const remainingMonths = applyProration ? getRemainingMembershipMonths() : 12;
  // const commitmentPrice = applyProration
  //   ? getProratedMembershipCommitment(annualPrice)
  //   : annualPrice;
  // Previous (commented out): used leftover draft months from Select & Pay (e.g. 12 from September)
  // so April test date never changed Total Commitment until a new click.
  // const remainingMonths = Number(draftMembership.remainingMonths) > 0
  //   ? Number(draftMembership.remainingMonths)
  //   : getRemainingMembershipMonths();
  // const commitmentPrice = Number(draftMembership.proratedCommitment) > 0
  //   ? Number(draftMembership.proratedCommitment)
  //   : getProratedMembershipCommitment(annualPrice);
  const assignedGroupName = isExistingMembershipPay
    ? (draftMembership.sfGroup || draftMembership.name || '')
    : formatMembershipSalesforceGroup(selectedMembershipTier.name);
  const checkoutGroups = isExistingMembershipPay ? '' : assignedGroupName;
  // Previous (commented out): Pay Membership rebuilt the group from the catalog tier
  // (e.g. $3000 matched Upgraded) and sent it on checkout, which overwrote Family Membership.
  // const assignedGroupName = formatMembershipSalesforceGroup(selectedMembershipTier.name);
  // Previous (commented out): preferred stored/catalog sfGroup, which could keep a stale year
  // const assignedGroupName = draftMembership.sfGroup
  //   || catalogTier?.sfGroup
  //   || formatMembershipSalesforceGroup(selectedMembershipTier.name);
  // const assignedGroupName = selectedMembershipTier.sfGroup || selectedMembershipTier.name;
  const scheduleOptions = buildScheduleOptions(commitmentPrice, remainingMonths, annualPrice);
  // Previous (commented out): Total Commitment used the full annual price
  // const scheduleOptions = buildScheduleOptions(annualPrice);

  const selectedOption = draft.data.contributionSchedule?.option || 'full';

  const sfUserSession = localStorage.getItem('sf_user_session');
  const sfUser = sfUserSession ? JSON.parse(sfUserSession) : {};
  const email = sfUser.email || draft.email || '';

  const primaryMember = draft.data.primaryMember || {};
  const contactId = primaryMember.contactId || '';
  const accountId = draft.data.household?.accountId || sfUser.householdAccountId || '';

  // Determine details of the selected option
  const option = scheduleOptions.find((o) => o.id === selectedOption) || scheduleOptions[0];

  let paymentAmount = commitmentPrice;
  let billingMode = 'regular';
  let frequency = 'Annual';

  if (selectedOption === 'installments') {
    paymentAmount = commitmentPrice / 2;
    billingMode = 'recurring';
    frequency = 'Half Yearly';
  } else if (selectedOption === 'monthly') {
    paymentAmount = annualPrice / 12;
    billingMode = 'recurring';
    frequency = 'Monthly';
  }

  // Previous (commented out): checkout amounts used the full annual price
  // let paymentAmount = annualPrice;
  // if (selectedOption === 'installments') {
  //   paymentAmount = annualPrice / 2;
  // } else if (selectedOption === 'monthly') {
  //   paymentAmount = annualPrice / 12;
  // }

  // Round to 2 decimal places
  paymentAmount = Math.round(paymentAmount * 100) / 100;

  const handleSelectOption = (optionId) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        contributionSchedule: { ...prev.data.contributionSchedule, option: optionId },
      },
    }));
  };

  const handleBack = () => {
    // Salesforce-assigned membership pay flow (Pay Membership from dashboard):
    // Back returns to dashboard, not Membership Selection.
    const isSfMembershipPay = isSalesforceMembershipScheduleOnly()
      || draft?.data?.membership?.source === 'salesforce_assigned';
    if (isSfMembershipPay) {
      clearSalesforceMembershipScheduleOnly();
      dismissPostLoginStepperPending();
      window.location.replace('/');
      return;
    }

    // Previous (commented out): always went to Membership Selection.
    // persistNow({
    //   ...draft,
    //   currentStep: PREVIOUS_STEP_ID,
    // });
    // goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);

    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
    });
    const membershipPath = getStepById(PREVIOUS_STEP_ID).path;
    goToOnboardingPath(isUpdateMembership ? `${membershipPath}?mode=update` : membershipPath);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        contributionSchedule: {
          ...prev.data.contributionSchedule,
          option: selectedOption,
          amount: paymentAmount,
          frequency,
          billingMode,
        },
      },
    }));
    setShowPaymentModal(true);
  };

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="onboard-about-page">
        <div className="onboard-about-watermark" aria-hidden="true" />

        <OnboardHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          title={isUpdateMembership
            ? 'Update Membership'
            : (isPostLoginStepperPending() ? 'Membership Renewal' : 'Membership Onboarding')}
          subtitle={isUpdateMembership
            ? 'Choose your contribution schedule. Amounts use remaining months through August.'
            : (isPostLoginStepperPending() ? 'Choose your contribution schedule to complete renewal.' : 'Join our community in a few simple steps.')}
        />

        {!isPostLoginStepperPending() && (
          <OnboardStepper currentStepId={THIS_STEP_ID} draft={draft} />
        )}

        <main>
          <form className="onboard-about-card" onSubmit={handleSubmit} noValidate>
            <div className="onboard-about-header">
              <div>
                <h2 className="onboard-about-title">Contribution Schedule</h2>
                <p className="onboard-about-subtitle">Choose the payment structure that works best for you.</p>
                <p className="onboard-about-subtitle onboard-about-subtitle-muted">All amounts are in USD.</p>
                {testDateLabel ? (
                  <p className="onboard-about-subtitle onboard-about-subtitle-muted">
                    Test date {testDateLabel}: {remainingMonths} month{remainingMonths === 1 ? '' : 's'} through August.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="onboard-schedule-list" role="radiogroup" aria-label="Contribution schedule options">
              {scheduleOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedOption === option.id;

                return (
                  <label
                    key={option.id}
                    htmlFor={`schedule-${option.id}`}
                    className={`onboard-schedule-option onboard-tier-accent-${option.accent} ${isSelected ? 'onboard-schedule-option-selected' : ''}`}
                  >
                    <input
                      type="radio"
                      id={`schedule-${option.id}`}
                      name="contributionSchedule"
                      className="onboard-radio-input"
                      checked={isSelected}
                      onChange={() => handleSelectOption(option.id)}
                    />
                    <span className="onboard-schedule-radio" aria-hidden="true">
                      {isSelected && <Check size={13} strokeWidth={3} />}
                    </span>

                    <span className="onboard-schedule-icon" aria-hidden="true">
                      <Icon size={22} strokeWidth={1.75} />
                    </span>

                    <span className="onboard-schedule-copy">
                      <span className="onboard-schedule-option-label">Option {option.number}</span>
                      <span className="onboard-schedule-title">{option.title}</span>
                      <span className="onboard-schedule-subtitle">{option.subtitle}</span>
                    </span>

                    <span className="onboard-schedule-details">
                      <span className="onboard-schedule-detail-row">
                        <span className="onboard-schedule-detail-label">Contribution Amount</span>
                        <span className="onboard-schedule-detail-value">
                          {option.amountLabel}
                          {option.amountSuffix && <span className="onboard-schedule-detail-suffix">{option.amountSuffix}</span>}
                        </span>
                      </span>

                      <span className="onboard-schedule-detail-row">
                        <span className="onboard-schedule-detail-label">Billing Schedule</span>
                        <span className="onboard-schedule-detail-lines">
                          {option.billingLines.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                        </span>
                      </span>

                      <span className="onboard-schedule-detail-row">
                        <span className="onboard-schedule-detail-label">Total Commitment</span>
                        <span className="onboard-schedule-detail-value">{option.totalCommitment}</span>
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            <InfoPanel description="You can update your contribution schedule at any time." />

            {error && (
              <p className="onboard-error-message onboard-tier-error" role="alert" style={{ marginTop: '16px', marginBottom: '16px' }}>
                {error}
              </p>
            )}

            <div className="onboard-form-actions">
              <SecondaryButton variant="navy" icon={ArrowLeft} onClick={handleBack}>
                Back
              </SecondaryButton>
              <PrimaryButton type="submit" loading={false}>
                Continue
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>

      {showPaymentModal && (
        <QuickPaymentModal
          open={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          user={{ email }}
          getAuthToken={() => Promise.resolve(`dev:${email}`)}
          sfData={{ contactId, accountId }}
          pledgeAmount={commitmentPrice}
          remainingMonths={remainingMonths}
          // Previous (commented out): checkout pledge used the full annual price
          // pledgeAmount={selectedMembershipTier.annualPrice}
          defaultAmount={paymentAmount.toFixed(2)}
          defaultType="Membership"
          defaultSubType={assignedGroupName}
          defaultBillingMode={billingMode === 'recurring' ? 'recurring' : 'one-time'}
          defaultFrequency={frequency}
          defaultMemo={isExistingMembershipPay
            ? `Membership payment: ${assignedGroupName || selectedMembershipTier.name} (${option.title})`
            : `Onboarding Membership Selection: ${selectedMembershipTier.name} (${option.title})`}
          source={isUpdateMembership
            ? 'update_membership'
            : (isExistingMembershipPay ? 'member_portal' : 'onboarding')}
          groups={checkoutGroups}
          // Previous (commented out): Pay Membership sent a rebuilt Salesforce group on checkout
          // groups={assignedGroupName}
          // source="onboarding"
          readOnly={true}
          theme={theme}
          onBeforeCheckout={() => {
            try {
              sessionStorage.setItem(
                'pending_paid_membership_name',
                isExistingMembershipPay
                  ? (assignedGroupName || selectedMembershipTier.name || 'Membership')
                  : (selectedMembershipTier.name || 'Membership')
              );
              // Previous (commented out): Pay Membership stored the catalog price-match name (Upgraded)
              // sessionStorage.setItem(
              //   'pending_paid_membership_name',
              //   selectedMembershipTier.name || 'Membership'
              // );
            } catch {
              // ignore
            }
          }}
        />
      )}
    </div>
  );
}
