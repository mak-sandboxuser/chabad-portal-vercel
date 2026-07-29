import { useState } from 'react';
import {
  ArrowLeft,
  Lock,
  Users,
  Heart,
  Baby,
  Flame,
  Star,
  DollarSign,
  CreditCard,
} from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  REVIEW_STEP_ID,
  PAYMENT_METHOD_STEP_ID,
  PROCESSING_STEP_ID,
} from '../data/onboardingSteps';
import { getMembershipTierById, formatCurrency } from '../data/membershipTiers';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

const THIS_STEP_ID = REVIEW_STEP_ID;
const PREVIOUS_STEP_ID = PAYMENT_METHOD_STEP_ID;
const NEXT_STEP_ID = PROCESSING_STEP_ID;

function displayValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function displayPhone(phone) {
  if (!phone?.number) return '—';
  const country = phone.country ? `${phone.country} ` : '';
  return `${country}${phone.number}`.trim();
}

function scheduleLabel(option) {
  if (option === 'full') return 'Full Payment';
  if (option === 'installments') return 'Two Installments';
  if (option === 'monthly') return 'Monthly Contributions';
  return option || '—';
}

function ReviewSection({ icon: Icon, title, accent = 'navy', children }) {
  return (
    <section className={`onboard-review-card onboard-review-card-${accent}`}>
      <div className="onboard-review-card-header">
        <span className="onboard-review-card-icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.75} />
        </span>
        <h3 className="onboard-review-card-title">{title}</h3>
      </div>
      <div className="onboard-review-grid">{children}</div>
    </section>
  );
}

function ReviewItem({ label, value, fullWidth = false }) {
  return (
    <div className={`onboard-review-item ${fullWidth ? 'onboard-review-item-full' : ''}`}>
      <span className="onboard-review-label">{label}</span>
      <span className="onboard-review-value">{displayValue(value)}</span>
    </div>
  );
}

export default function ReviewApplication() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, persistNow } = useOnboardingDraft();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const spouse = draft.data.spouse || {};
  const marital = draft.data.marital || {};
  const children = Array.isArray(draft.data.children) ? draft.data.children : [];
  const childrenExtra = draft.data.childrenAdditionalInfo || {};
  const yahrzeits = Array.isArray(draft.data.yahrzeitRecords) ? draft.data.yahrzeitRecords : [];
  const membership = draft.data.membership || {};
  const contribution = draft.data.contributionSchedule || {};
  const payment = draft.data.payment || {};
  const billing = payment.billingAddress || {};
  const tier = getMembershipTierById(membership.tier);
  const monthly = tier ? Math.floor(tier.annualPrice / 12) : null;

  const handleBack = () => {
    persistNow({ ...draft, currentStep: PREVIOUS_STEP_ID });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    persistNow({ ...draft, currentStep: NEXT_STEP_ID });
    goToOnboardingPath(getStepById(NEXT_STEP_ID).path);
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

        <OnboardStepper currentStepId={THIS_STEP_ID} />

        <main>
          <form className="onboard-about-card" onSubmit={handleSubmit} noValidate>
            <div className="onboard-about-header">
              <div>
                <h2 className="onboard-about-title">Review Application</h2>
                <p className="onboard-about-subtitle">
                  Please review all of your information below before submitting your membership application.
                </p>
              </div>
              <span className="onboard-about-security-note">
                <Lock size={14} aria-hidden="true" />
                Your information is secure and encrypted.
              </span>
            </div>

            <div className="onboard-review-summary-banner">
              <div>
                <p className="onboard-review-summary-label">Selected Membership</p>
                <p className="onboard-review-summary-value">{tier?.name || 'Not selected'}</p>
              </div>
              <div className="onboard-review-summary-price">
                <p className="onboard-review-summary-label">Annual Commitment</p>
                <p className="onboard-review-summary-value">
                  {tier ? `$${formatCurrency(tier.annualPrice)}` : '—'}
                  {monthly != null && (
                    <span className="onboard-review-summary-monthly">
                      (${formatCurrency(monthly)} / month)
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="onboard-review-summary-label">Payment Schedule</p>
                <p className="onboard-review-summary-value">{scheduleLabel(contribution.option)}</p>
              </div>
            </div>

            <ReviewSection icon={Users} title="Spouse Information" accent="blue">
              <ReviewItem label="Salutation" value={spouse.salutation} />
              <ReviewItem label="Gender" value={spouse.gender} />
              <ReviewItem label="First Name" value={spouse.firstName} />
              <ReviewItem label="Last Name" value={spouse.lastName} />
              <ReviewItem label="Email Address" value={spouse.email} />
              <ReviewItem label="Mobile Number" value={displayPhone(spouse.phone)} />
            </ReviewSection>

            {/* HIDDEN — Marital Information form removed from onboarding flow */}
            {false && (
            <ReviewSection icon={Heart} title="Marital Information" accent="gold">
              <ReviewItem label="Marital Status" value={marital.maritalStatus} />
              <ReviewItem label="Anniversary Date" value={marital.anniversaryDate} />
            </ReviewSection>
            )}

            <ReviewSection icon={Baby} title="Children" accent="green">
              {children.length === 0 ? (
                <ReviewItem label="Children" value="None added" fullWidth />
              ) : (
                children.map((child, index) => (
                  <div key={child.id || `child-${index}`} className="onboard-review-child-block">
                    <p className="onboard-review-child-heading">Child {index + 1}</p>
                    <div className="onboard-review-grid">
                      <ReviewItem label="Salutation" value={child.salutation} />
                      <ReviewItem label="Gender" value={child.gender} />
                      <ReviewItem label="First Name" value={child.firstName || child.name} />
                      <ReviewItem label="Last Name" value={child.lastName} />
                    </div>
                  </div>
                ))
              )}
              {/* HIDDEN — Additional Information (college) removed */}
              {false && (
              <ReviewItem
                label="Children in College"
                value={
                  childrenExtra.childrenInCollege === true
                    ? 'Yes'
                    : childrenExtra.childrenInCollege === false
                      ? 'No'
                      : '—'
                }
              />
              )}
            </ReviewSection>

            <ReviewSection icon={Flame} title="Yahrzeit Information" accent="orange">
              {yahrzeits.length === 0 ? (
                <ReviewItem label="Yahrzeit Records" value="None added" fullWidth />
              ) : (
                yahrzeits.map((record, index) => (
                  <div key={record.id || `yahrzeit-${index}`} className="onboard-review-child-block">
                    <p className="onboard-review-child-heading">Record {index + 1}</p>
                    <div className="onboard-review-grid">
                      <ReviewItem label="Full Name" value={record.fullName} />
                      <ReviewItem label="Hebrew Name" value={record.hebrewName} />
                      <ReviewItem label="Father's Hebrew Name" value={record.fathersHebrewName} />
                      <ReviewItem label="Date of Passing" value={record.dateOfPassing} />
                    </div>
                  </div>
                ))
              )}
            </ReviewSection>

            <ReviewSection icon={Star} title="Membership Selection" accent="purple">
              <ReviewItem label="Membership Tier" value={tier?.name || membership.tier} />
              <ReviewItem
                label="Annual Amount"
                value={tier ? `$${formatCurrency(tier.annualPrice)}${tier.isOpenEnded ? '+' : ''}` : '—'}
              />
              <ReviewItem
                label="Monthly Equivalent"
                value={monthly != null ? `$${formatCurrency(monthly)} / month` : '—'}
              />
              <ReviewItem label="Description" value={tier?.description} fullWidth />
            </ReviewSection>

            <ReviewSection icon={DollarSign} title="Contribution Schedule" accent="blue">
              <ReviewItem label="Selected Schedule" value={scheduleLabel(contribution.option)} />
              <ReviewItem
                label="Total Commitment"
                value={tier ? `$${formatCurrency(tier.annualPrice)} / year` : '—'}
              />
            </ReviewSection>

            <ReviewSection icon={CreditCard} title="Payment Method" accent="navy">
              <ReviewItem
                label="Payment Method"
                value={
                  payment.method === 'credit-card'
                    ? 'Credit Card'
                    : payment.method === 'ach'
                      ? 'ACH Bank Account'
                      : payment.method
                }
              />
              {payment.method === 'credit-card' && (
                <>
                  <ReviewItem label="Billing Address" value={billing.line1} />
                  <ReviewItem label="Address Line 2" value={billing.line2} />
                  <ReviewItem label="City" value={billing.city} />
                  <ReviewItem label="State" value={billing.state} />
                  <ReviewItem label="Zip Code" value={billing.zipCode} />
                </>
              )}
              {payment.method === 'ach' && (
                <ReviewItem label="Account Holder Name" value={payment.accountHolderName} />
              )}
            </ReviewSection>

            <div className="onboard-form-actions">
              <SecondaryButton variant="navy" icon={ArrowLeft} onClick={handleBack}>
                Back
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting} className="onboard-primary-button-blue">
                Confirm & Submit
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
