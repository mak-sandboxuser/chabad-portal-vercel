import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import PhoneField from '../components/PhoneField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, HOUSEHOLD_STEP_ID, SPOUSE_INFORMATION_STEP_ID, MARITAL_INFORMATION_STEP_ID } from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, isValidPostalCode } from '../utils/onboardingValidation';
import { US_STATES } from '../data/usStates';
import '../onboard.css';

const THIS_STEP_ID = HOUSEHOLD_STEP_ID;
const PREVIOUS_STEP_ID = SPOUSE_INFORMATION_STEP_ID;
const NEXT_STEP_ID = MARITAL_INFORMATION_STEP_ID;

const COUNTRIES = [
  { value: 'United States', label: 'United States' },
  { value: 'Canada', label: 'Canada' },
  { value: 'Israel', label: 'Israel' },
  { value: 'United Kingdom', label: 'United Kingdom' },
];

const EMPTY_HOUSEHOLD = {
  addressLine1: '',
  addressLine2: '',
  city: '',
  state: '',
  zipCode: '',
  country: 'United States',
  homePhone: { country: 'US', number: '' },
  workPhone: { country: 'US', number: '' },
};

const FIELD_ORDER = ['addressLine1', 'city', 'state', 'zipCode', 'country'];

function validateAll(household) {
  const errors = {};

  if (isBlank(household.addressLine1)) {
    errors.addressLine1 = 'Enter your street address.';
  }
  if (isBlank(household.city)) {
    errors.city = 'Enter your city.';
  }
  if (isBlank(household.state)) {
    errors.state = 'Select a state.';
  }
  if (isBlank(household.zipCode) || !isValidPostalCode(household.zipCode)) {
    errors.zipCode = 'Enter a valid ZIP/postal code.';
  }
  if (isBlank(household.country)) {
    errors.country = 'Select a country.';
  }

  return errors;
}

export default function HouseholdInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const household = {
    ...EMPTY_HOUSEHOLD,
    ...draft.data.household,
    homePhone: { ...EMPTY_HOUSEHOLD.homePhone, ...draft.data.household?.homePhone },
    workPhone: { ...EMPTY_HOUSEHOLD.workPhone, ...draft.data.household?.workPhone },
  };

  const updateHousehold = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        household: { ...prev.data.household, ...patch },
      },
    }));
  };

  const clearErrorIfValid = (field, isNowValid) => {
    setErrors((prev) => {
      if (!prev[field] || !isNowValid) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleTextChange = (field, validator) => (event) => {
    const value = event.target.value;
    updateHousehold({ [field]: value });
    if (validator) clearErrorIfValid(field, validator(value));
  };

  const handleSelectChange = (field) => (event) => {
    const value = event.target.value;
    updateHousehold({ [field]: value });
    clearErrorIfValid(field, !isBlank(value));
  };

  const focusFirstInvalidField = (fieldErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
  };

  const handleBack = () => {
    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
      data: { ...draft.data, household },
    });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateAll(household);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, household },
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
                <h2 className="onboard-about-title">Household Information</h2>
                <p className="onboard-about-subtitle">
                  Please provide your household address and contact information.
                </p>
              </div>
              <span className="onboard-about-security-note">
                <Lock size={14} aria-hidden="true" />
                Your information is secure and encrypted.
              </span>
            </div>

            <div className="onboard-form-field-full">
              <FormField
                id="addressLine1"
                label="Address Line 1"
                required
                placeholder="123 Main Street"
                value={household.addressLine1}
                onChange={handleTextChange('addressLine1', (value) => !isBlank(value))}
                error={errors.addressLine1}
              />
            </div>

            <div className="onboard-form-field-full">
              <FormField
                id="addressLine2"
                label="Address Line 2"
                placeholder="Apt 4B, Building A (optional)"
                value={household.addressLine2}
                onChange={handleTextChange('addressLine2')}
              />
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="city"
                label="City"
                required
                placeholder="Bedford"
                value={household.city}
                onChange={handleTextChange('city', (value) => !isBlank(value))}
                error={errors.city}
              />
              <SelectField
                standalone
                id="state"
                label="State"
                required
                value={household.state}
                onChange={handleSelectChange('state')}
                options={US_STATES}
                error={errors.state}
              />
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="zipCode"
                label="Zip Code"
                required
                placeholder="10506"
                value={household.zipCode}
                onChange={handleTextChange('zipCode', isValidPostalCode)}
                error={errors.zipCode}
              />
              <SelectField
                standalone
                id="country"
                label="Country"
                required
                value={household.country}
                onChange={handleSelectChange('country')}
                options={COUNTRIES}
                error={errors.country}
              />
            </div>

            <div className="onboard-form-grid">
              <PhoneField
                id="homePhone"
                label="Home Phone"
                value={household.homePhone}
                onChange={(nextPhone) => updateHousehold({ homePhone: nextPhone })}
                placeholder="(914) 234-5678"
              />
              <PhoneField
                id="workPhone"
                label="Work Phone"
                value={household.workPhone}
                onChange={(nextPhone) => updateHousehold({ workPhone: nextPhone })}
                placeholder="(914) 555-1234"
              />
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
