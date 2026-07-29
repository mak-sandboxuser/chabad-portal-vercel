import { useState } from 'react';
import { Mail, Briefcase, Lock } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import FormField from '../components/FormField';
import DateField from '../components/DateField';
import PhoneField from '../components/PhoneField';
import InfoPanel from '../components/InfoPanel';
import PrimaryButton from '../components/PrimaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, SPOUSE_INFORMATION_STEP_ID, MARITAL_INFORMATION_STEP_ID } from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, isValidPersonName, isValidEmail, isValidPhoneNumber, validateDateString } from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = SPOUSE_INFORMATION_STEP_ID;
const NEXT_STEP_ID = MARITAL_INFORMATION_STEP_ID;

const EMPTY_SPOUSE = {
  firstName: '',
  lastName: '',
  hebrewName: '',
  fathersHebrewName: '',
  mothersHebrewName: '',
  occupation: '',
  email: '',
  phone: { country: 'US', number: '' },
  birthDate: '',
};

const FIELD_ORDER = ['firstName', 'lastName', 'email', 'phone', 'birthDate'];

function validateAll(spouse) {
  const errors = {};

  if (!isValidPersonName(spouse.firstName)) {
    errors.firstName = 'Enter a first name (at least 2 letters).';
  }
  if (!isValidPersonName(spouse.lastName)) {
    errors.lastName = 'Enter a last name (at least 2 letters).';
  }
  if (isBlank(spouse.email) || !isValidEmail(spouse.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (isBlank(spouse.phone.number) || !isValidPhoneNumber(spouse.phone.number)) {
    errors.phone = 'Enter a valid 10-digit phone number.';
  }
  const birthDateError = validateDateString(spouse.birthDate);
  if (birthDateError) errors.birthDate = birthDateError;

  return errors;
}

export default function SpouseInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const spouse = {
    ...EMPTY_SPOUSE,
    ...draft.data.spouse,
    phone: { ...EMPTY_SPOUSE.phone, ...draft.data.spouse?.phone },
  };

  const updateSpouse = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        spouse: { ...prev.data.spouse, ...patch },
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
    updateSpouse({ [field]: value });
    if (validator) clearErrorIfValid(field, validator(value));
  };

  const handlePhoneChange = (nextPhone) => {
    updateSpouse({ phone: nextPhone });
    clearErrorIfValid('phone', isValidPhoneNumber(nextPhone.number));
  };

  const handleBirthDateChange = (nextValue) => {
    updateSpouse({ birthDate: nextValue });
    clearErrorIfValid('birthDate', !validateDateString(nextValue));
  };

  const focusFirstInvalidField = (fieldErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateAll(spouse);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, spouse },
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
                <h2 className="onboard-about-title">Spouse Information</h2>
                <p className="onboard-about-subtitle">Please provide information about your spouse.</p>
              </div>
              <span className="onboard-about-security-note">
                <Lock size={14} aria-hidden="true" />
                Your information is secure and encrypted.
              </span>
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="firstName"
                label="First Name"
                required
                placeholder="Enter first name"
                value={spouse.firstName}
                onChange={handleTextChange('firstName', isValidPersonName)}
                error={errors.firstName}
              />
              <FormField
                id="lastName"
                label="Last Name"
                required
                placeholder="Enter last name"
                value={spouse.lastName}
                onChange={handleTextChange('lastName', isValidPersonName)}
                error={errors.lastName}
              />
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="hebrewName"
                label="Hebrew Name"
                placeholder="Enter Hebrew name"
                value={spouse.hebrewName}
                onChange={handleTextChange('hebrewName')}
              />
              <FormField
                id="fathersHebrewName"
                label="Father's Hebrew Name"
                placeholder="Enter father's Hebrew name"
                value={spouse.fathersHebrewName}
                onChange={handleTextChange('fathersHebrewName')}
              />
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="mothersHebrewName"
                label="Mother's Hebrew Name"
                placeholder="Enter mother's Hebrew name"
                value={spouse.mothersHebrewName}
                onChange={handleTextChange('mothersHebrewName')}
              />
              <FormField
                id="occupation"
                label="Occupation"
                icon={Briefcase}
                placeholder="Enter your occupation"
                value={spouse.occupation}
                onChange={handleTextChange('occupation')}
              />
            </div>

            <div className="onboard-form-grid">
              <FormField
                id="email"
                label="Email Address"
                required
                type="email"
                icon={Mail}
                placeholder="Enter your email address"
                value={spouse.email}
                onChange={handleTextChange('email', isValidEmail)}
                error={errors.email}
                autoComplete="email"
              />
              <PhoneField
                id="phone"
                label="Mobile Number"
                required
                value={spouse.phone}
                onChange={handlePhoneChange}
                error={errors.phone}
              />
            </div>

            <div className="onboard-form-field-full">
              <DateField
                id="birthDate"
                label="Birth Date"
                required
                value={spouse.birthDate}
                onChange={handleBirthDateChange}
                error={errors.birthDate}
              />
            </div>

            <InfoPanel
              title="Why we ask for this information"
              description="This helps us create a complete household record and provide the best experience for your family."
            />

            <div className="onboard-form-actions onboard-form-actions-end">
              <PrimaryButton type="submit" loading={isSubmitting}>
                Continue
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter />
      </div>
    </div>
  );
}
