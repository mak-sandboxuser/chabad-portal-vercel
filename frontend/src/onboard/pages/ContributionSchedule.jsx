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
import { getMembershipTierById, formatCurrency } from '../data/membershipTiers';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

const THIS_STEP_ID = CONTRIBUTION_SCHEDULE_STEP_ID;
const PREVIOUS_STEP_ID = MEMBERSHIP_STEP_ID;
const FALLBACK_ANNUAL_PRICE = 1800;

function buildScheduleOptions(annualPrice) {
  return [
    {
      id: 'full',
      number: 1,
      title: 'Full Payment',
      subtitle: 'One-Time Payment',
      icon: CreditCard,
      accent: 'blue',
      amountLabel: `$${formatCurrency(annualPrice)}`,
      billingLines: ['One-time charge today'],
    },
    {
      id: 'installments',
      number: 2,
      title: 'Two Installments',
      subtitle: '50% + 50%',
      icon: PieChart,
      accent: 'purple',
      amountLabel: `$${formatCurrency(annualPrice / 2)}`,
      amountSuffix: ' / installment',
      billingLines: [
        '2 payments',
        '1st payment today (50%)',
        '2nd payment in 6 months (50%)',
      ],
    },
    {
      id: 'monthly',
      number: 3,
      title: 'Monthly Contributions',
      subtitle: '12 Monthly Payments',
      icon: Calendar,
      accent: 'green',
      amountLabel: `$${formatCurrency(annualPrice / 12)}`,
      amountSuffix: ' / month',
      billingLines: ['12 monthly payments', 'First payment today'],
    },
  ].map((option) => ({ ...option, totalCommitment: `$${formatCurrency(annualPrice)}` }));
}

export default function ContributionSchedule() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const selectedMembershipTier = getMembershipTierById(draft.data.membership?.tier) || {
    name: 'Membership',
    annualPrice: FALLBACK_ANNUAL_PRICE,
  };
  const annualPrice = selectedMembershipTier.annualPrice;
  const scheduleOptions = buildScheduleOptions(annualPrice);

  const selectedOption = draft.data.contributionSchedule?.option || 'full';

  const sfUserSession = localStorage.getItem('sf_user_session');
  const sfUser = sfUserSession ? JSON.parse(sfUserSession) : {};
  const email = sfUser.email || draft.email || '';

  const primaryMember = draft.data.primaryMember || {};
  const contactId = primaryMember.contactId || '';
  const accountId = draft.data.household?.accountId || sfUser.householdAccountId || '';

  // Determine details of the selected option
  const option = scheduleOptions.find((o) => o.id === selectedOption) || scheduleOptions[0];

  let paymentAmount = annualPrice;
  let billingMode = 'regular';
  let frequency = 'Annual';

  if (selectedOption === 'installments') {
    paymentAmount = annualPrice / 2;
    billingMode = 'recurring';
    frequency = 'Half Yearly';
  } else if (selectedOption === 'monthly') {
    paymentAmount = annualPrice / 12;
    billingMode = 'recurring';
    frequency = 'Monthly';
  }

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
    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
    });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
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
          title="Membership Onboarding"
          subtitle="Join our community in a few simple steps."
        />

        <OnboardStepper currentStepId={THIS_STEP_ID} draft={draft} />

        <main>
          <form className="onboard-about-card" onSubmit={handleSubmit} noValidate>
            <div className="onboard-about-header">
              <div>
                <h2 className="onboard-about-title">Contribution Schedule</h2>
                <p className="onboard-about-subtitle">Choose the payment structure that works best for you.</p>
                <p className="onboard-about-subtitle onboard-about-subtitle-muted">All amounts are in USD.</p>
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
          pledgeAmount={selectedMembershipTier.annualPrice}
          defaultAmount={paymentAmount.toFixed(2)}
          defaultType="Membership"
          defaultSubType={selectedMembershipTier.name}
          defaultBillingMode={billingMode === 'recurring' ? 'recurring' : 'one-time'}
          defaultFrequency={frequency}
          defaultMemo={`Onboarding Membership Selection: ${selectedMembershipTier.name} (${option.title})`}
          source="onboarding"
          groups={selectedMembershipTier.name}
          readOnly={true}
        />
      )}
    </div>
  );
}
