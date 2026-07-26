import { useState } from 'react';
import { Lock, ArrowLeft } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import SelectField from '../components/SelectField';
import DateField from '../components/DateField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  MARITAL_INFORMATION_STEP_ID,
  HOUSEHOLD_STEP_ID,
  CHILDREN_STEP_ID,
} from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, validateDateString } from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = MARITAL_INFORMATION_STEP_ID;
const PREVIOUS_STEP_ID = HOUSEHOLD_STEP_ID;
const NEXT_STEP_ID = CHILDREN_STEP_ID;

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Domestic Partnership', label: 'Domestic Partnership' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
];

const EMPTY_MARITAL = {
  maritalStatus: '',
  anniversaryDate: '',
};

function validateAll(marital) {
  const errors = {};

  if (isBlank(marital.maritalStatus)) {
    errors.maritalStatus = 'Select your marital status.';
  }

  if (marital.maritalStatus === 'Married') {
    const dateError = validateDateString(marital.anniversaryDate, 'anniversary date');
    if (dateError) errors.anniversaryDate = dateError;
  }

  return errors;
}

export default function MaritalInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const marital = { ...EMPTY_MARITAL, ...draft.data.marital };
  const showAnniversary = marital.maritalStatus === 'Married';

  const updateMarital = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        marital: { ...prev.data.marital, ...patch },
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

  const handleStatusChange = (event) => {
    const value = event.target.value;
    updateMarital({ maritalStatus: value });
    clearErrorIfValid('maritalStatus', !isBlank(value));
    // Marital status no longer "Married" — the anniversary date field is
    // hidden and shouldn't block submission with a stale error.
    if (value !== 'Married') {
      setErrors((prev) => {
        if (!prev.anniversaryDate) return prev;
        const next = { ...prev };
        delete next.anniversaryDate;
        return next;
      });
    }
  };

  const handleAnniversaryChange = (nextValue) => {
    updateMarital({ anniversaryDate: nextValue });
    clearErrorIfValid('anniversaryDate', !validateDateString(nextValue, 'anniversary date'));
  };

  const focusFirstInvalidField = (fieldErrors) => {
    if (fieldErrors.maritalStatus) {
      document.getElementById('maritalStatus')?.focus();
    } else if (fieldErrors.anniversaryDate) {
      document.getElementById('anniversaryDate')?.focus();
    }
  };

  const handleBack = () => {
    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
      data: { ...draft.data, marital },
    });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateAll(marital);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, marital },
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
                <h2 className="onboard-about-title">Marital Information</h2>
                <p className="onboard-about-subtitle">Please let us know your current marital status.</p>
              </div>
              <span className="onboard-about-security-note">
                <Lock size={14} aria-hidden="true" />
                Your information is secure and encrypted.
              </span>
            </div>

            <div className="onboard-form-field-full">
              <SelectField
                standalone
                id="maritalStatus"
                label="Marital Status"
                required
                value={marital.maritalStatus}
                onChange={handleStatusChange}
                options={MARITAL_STATUS_OPTIONS}
                error={errors.maritalStatus}
              />
            </div>

            {showAnniversary && (
              <div className="onboard-conditional-panel">
                <h3 className="onboard-conditional-panel-title">Anniversary Date</h3>
                <p className="onboard-conditional-panel-description">
                  Please enter your wedding anniversary date.
                </p>

                <DateField
                  id="anniversaryDate"
                  label="Anniversary Date"
                  required
                  value={marital.anniversaryDate}
                  onChange={handleAnniversaryChange}
                  error={errors.anniversaryDate}
                />
              </div>
            )}

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
