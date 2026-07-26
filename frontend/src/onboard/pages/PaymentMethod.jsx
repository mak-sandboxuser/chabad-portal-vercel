import { useState } from 'react';
import { CreditCard, Landmark, HelpCircle, ArrowLeft, Check } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import InfoPanel from '../components/InfoPanel';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  PAYMENT_METHOD_STEP_ID,
  CONTRIBUTION_SCHEDULE_STEP_ID,
  REVIEW_STEP_ID,
} from '../data/onboardingSteps';
import { US_STATES } from '../data/usStates';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import {
  isBlank,
  isValidPostalCode,
  isValidCardNumber,
  isValidCvc,
  validateExpirationDate,
  isValidRoutingNumber,
  isValidAccountNumber,
} from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = PAYMENT_METHOD_STEP_ID;
const PREVIOUS_STEP_ID = CONTRIBUTION_SCHEDULE_STEP_ID;
const NEXT_STEP_ID = REVIEW_STEP_ID;

const CARD_BRANDS = ['VISA', 'Mastercard', 'AMEX', 'Discover'];

const EMPTY_BILLING_ADDRESS = { line1: '', line2: '', city: '', state: '', zipCode: '' };

export default function PaymentMethod() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sensitive payment fields never touch the draft/cookie system — they
  // live only in this component's local state for as long as the page is
  // open, and are discarded the moment the applicant navigates away.
  const [cardNumber, setCardNumber] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [cvc, setCvc] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  const method = draft.data.payment?.method || null;
  const billingAddress = { ...EMPTY_BILLING_ADDRESS, ...draft.data.payment?.billingAddress };
  const accountHolderName = draft.data.payment?.accountHolderName || '';

  const updatePayment = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, payment: { ...prev.data.payment, ...patch } },
    }));
  };

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleSelectMethod = (nextMethod) => {
    updatePayment({ method: nextMethod });
    setErrors({});
  };

  const handleBillingChange = (field) => (event) => {
    const value = event.target.value;
    updatePayment({ billingAddress: { ...billingAddress, [field]: value } });
    clearError(field);
  };

  const handleAccountHolderChange = (event) => {
    updatePayment({ accountHolderName: event.target.value });
    clearError('accountHolderName');
  };

  const handleBack = () => {
    persistNow({ ...draft, currentStep: PREVIOUS_STEP_ID });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const focusFirstInvalid = (fieldErrors, order) => {
    const firstInvalid = order.find((field) => fieldErrors[field]);
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = {};

    if (!method) {
      setErrors({ method: 'Please select a payment method.' });
      return;
    }

    let fieldOrder = [];

    if (method === 'credit-card') {
      fieldOrder = ['cardNumber', 'expirationDate', 'cvc', 'line1', 'city', 'state', 'zipCode'];
      if (!isValidCardNumber(cardNumber)) nextErrors.cardNumber = 'Enter a valid card number.';
      const expError = validateExpirationDate(expirationDate);
      if (expError) nextErrors.expirationDate = expError;
      if (!isValidCvc(cvc)) nextErrors.cvc = 'Enter a valid CVC.';
      if (isBlank(billingAddress.line1)) nextErrors.line1 = 'Enter your billing address.';
      if (isBlank(billingAddress.city)) nextErrors.city = 'Enter your city.';
      if (isBlank(billingAddress.state)) nextErrors.state = 'Select a state.';
      if (isBlank(billingAddress.zipCode) || !isValidPostalCode(billingAddress.zipCode)) {
        nextErrors.zipCode = 'Enter a valid ZIP code.';
      }
    } else {
      fieldOrder = ['accountHolderName', 'routingNumber', 'accountNumber'];
      if (isBlank(accountHolderName)) nextErrors.accountHolderName = 'Enter the account holder name.';
      if (!isValidRoutingNumber(routingNumber)) nextErrors.routingNumber = 'Enter a valid 9-digit routing number.';
      if (!isValidAccountNumber(accountNumber)) nextErrors.accountNumber = 'Enter a valid account number.';
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalid(nextErrors, fieldOrder);
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, payment: { method, billingAddress, accountHolderName } },
    });
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
                <h2 className="onboard-about-title">Payment Method</h2>
                <p className="onboard-about-subtitle">
                  Please select your preferred payment method and provide your billing information.
                </p>
                <p className="onboard-about-subtitle onboard-about-subtitle-muted">
                  All fields marked with * are required.
                </p>
              </div>
            </div>

            <h3 className="onboard-section-heading">Select Payment Method</h3>

            <div
              className="onboard-payment-method-grid"
              role="radiogroup"
              aria-label="Payment method"
            >
              <label
                htmlFor="payment-method-card"
                className={`onboard-schedule-option onboard-tier-accent-blue ${method === 'credit-card' ? 'onboard-schedule-option-selected' : ''}`}
              >
                <input
                  type="radio"
                  id="payment-method-card"
                  name="paymentMethod"
                  className="onboard-radio-input"
                  checked={method === 'credit-card'}
                  onChange={() => handleSelectMethod('credit-card')}
                />
                <span className="onboard-schedule-radio" aria-hidden="true">
                  {method === 'credit-card' && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="onboard-schedule-icon" aria-hidden="true">
                  <CreditCard size={20} strokeWidth={1.75} />
                </span>
                <span className="onboard-schedule-copy">
                  <span className="onboard-schedule-title">Credit Card</span>
                  <span className="onboard-schedule-subtitle">Pay securely using your credit card</span>
                </span>
              </label>

              <label
                htmlFor="payment-method-ach"
                className={`onboard-schedule-option onboard-tier-accent-blue ${method === 'ach' ? 'onboard-schedule-option-selected' : ''}`}
              >
                <input
                  type="radio"
                  id="payment-method-ach"
                  name="paymentMethod"
                  className="onboard-radio-input"
                  checked={method === 'ach'}
                  onChange={() => handleSelectMethod('ach')}
                />
                <span className="onboard-schedule-radio" aria-hidden="true">
                  {method === 'ach' && <Check size={13} strokeWidth={3} />}
                </span>
                <span className="onboard-schedule-icon" aria-hidden="true">
                  <Landmark size={20} strokeWidth={1.75} />
                </span>
                <span className="onboard-schedule-copy">
                  <span className="onboard-schedule-title">ACH Bank Account</span>
                  <span className="onboard-schedule-subtitle">Pay securely from your bank account</span>
                </span>
              </label>
            </div>

            {errors.method && (
              <p className="onboard-error-message onboard-tier-error" role="alert">
                {errors.method}
              </p>
            )}

            <div className="onboard-payment-columns">
              <div className="onboard-payment-column">
                <h3 className="onboard-section-heading">Credit Card Information</h3>

                <FormField
                  id="cardNumber"
                  label="Card Number"
                  required
                  placeholder="1234 1234 1234 1234"
                  inputMode="numeric"
                  autoComplete="cc-number"
                  value={cardNumber}
                  onChange={(e) => { setCardNumber(e.target.value); clearError('cardNumber'); }}
                  error={errors.cardNumber}
                  trailingContent={
                    <span className="onboard-card-brands" aria-hidden="true">
                      {CARD_BRANDS.map((brand) => (
                        <span key={brand} className="onboard-card-brand-badge">{brand}</span>
                      ))}
                    </span>
                  }
                />

                <div className="onboard-form-grid">
                  <FormField
                    id="expirationDate"
                    label="Expiration Date"
                    required
                    placeholder="MM / YY"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    value={expirationDate}
                    onChange={(e) => { setExpirationDate(e.target.value); clearError('expirationDate'); }}
                    error={errors.expirationDate}
                  />
                  <FormField
                    id="cvc"
                    label="CVC"
                    required
                    placeholder="123"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    value={cvc}
                    onChange={(e) => { setCvc(e.target.value); clearError('cvc'); }}
                    error={errors.cvc}
                    trailingContent={<HelpCircle size={16} className="onboard-input-tooltip-icon" title="3-4 digit security code on your card" />}
                  />
                </div>

                <FormField
                  id="line1"
                  label="Billing Address"
                  required
                  placeholder="123 Main Street"
                  value={billingAddress.line1}
                  onChange={handleBillingChange('line1')}
                  error={errors.line1}
                />

                <FormField
                  id="line2"
                  label=""
                  placeholder="Apartment, suite, etc. (Optional)"
                  value={billingAddress.line2}
                  onChange={handleBillingChange('line2')}
                />

                <div className="onboard-form-grid onboard-form-grid-thirds">
                  <FormField
                    id="city"
                    label=""
                    placeholder="City"
                    value={billingAddress.city}
                    onChange={handleBillingChange('city')}
                    error={errors.city}
                  />
                  <SelectField
                    standalone
                    id="state"
                    label="State"
                    value={billingAddress.state}
                    onChange={handleBillingChange('state')}
                    options={US_STATES}
                    error={errors.state}
                  />
                  <FormField
                    id="zipCode"
                    label=""
                    placeholder="Zip Code"
                    value={billingAddress.zipCode}
                    onChange={handleBillingChange('zipCode')}
                    error={errors.zipCode}
                  />
                </div>
              </div>

              <div className="onboard-payment-divider" aria-hidden="true">
                <span>OR</span>
              </div>

              <div className="onboard-payment-column">
                <h3 className="onboard-section-heading">ACH Bank Account Information</h3>

                <FormField
                  id="accountHolderName"
                  label="Account Holder Name"
                  required
                  placeholder="Full name on account"
                  autoComplete="name"
                  value={accountHolderName}
                  onChange={handleAccountHolderChange}
                  error={errors.accountHolderName}
                />

                <div className="onboard-form-grid">
                  <FormField
                    id="routingNumber"
                    label="Routing Number"
                    required
                    placeholder="021000021"
                    inputMode="numeric"
                    value={routingNumber}
                    onChange={(e) => { setRoutingNumber(e.target.value); clearError('routingNumber'); }}
                    error={errors.routingNumber}
                    trailingContent={<HelpCircle size={16} className="onboard-input-tooltip-icon" title="9-digit number on your check" />}
                  />
                  <FormField
                    id="accountNumber"
                    label="Account Number"
                    required
                    placeholder="1234567890"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value); clearError('accountNumber'); }}
                    error={errors.accountNumber}
                    trailingContent={<HelpCircle size={16} className="onboard-input-tooltip-icon" title="Your bank account number" />}
                  />
                </div>

                <InfoPanel description="Your payment information is encrypted and secure. We never store your full financial information." />
              </div>
            </div>

            <div className="onboard-form-actions">
              <SecondaryButton variant="navy" icon={ArrowLeft} onClick={handleBack}>
                Back
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Continue
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
