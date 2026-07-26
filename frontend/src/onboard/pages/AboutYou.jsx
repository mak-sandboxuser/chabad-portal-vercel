import { useState } from 'react';
import { User, Mail, Phone, Briefcase, Lock, LogOut, HeartHandshake, Users2, Star } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import FormField from '../components/FormField';
import BirthDateGroup from '../components/BirthDateGroup';
import CollapsibleSection from '../components/CollapsibleSection';
import YesNoToggle from '../components/YesNoToggle';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, ABOUT_YOU_STEP_ID, SPOUSE_INFORMATION_STEP_ID } from '../data/onboardingSteps';
import { ONBOARD_EXIT_PATH, goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, isValidPersonName, isValidEmail, isValidPhoneNumber, validateBirthDateParts } from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = ABOUT_YOU_STEP_ID;
const NEXT_STEP_ID = SPOUSE_INFORMATION_STEP_ID;

const EMPTY_PRIMARY_MEMBER = {
  firstName: '',
  lastName: '',
  email: '',
  mobilePhone: '',
  birthDate: { month: '', day: '', year: '' },
  hebrewName: '',
  fathersHebrewName: '',
  mothersHebrewName: '',
  occupation: '',
  hasSpouse: null,
  hasChildren: null,
  addYahrzeitRecords: null,
};

const FIELD_ORDER = ['firstName', 'lastName', 'email', 'mobilePhone', 'birthDate'];

function validateAll(primaryMember) {
  const errors = {};

  if (!isValidPersonName(primaryMember.firstName)) {
    errors.firstName = 'Enter a first name (at least 2 letters).';
  }
  if (!isValidPersonName(primaryMember.lastName)) {
    errors.lastName = 'Enter a last name (at least 2 letters).';
  }
  if (isBlank(primaryMember.email) || !isValidEmail(primaryMember.email)) {
    errors.email = 'Enter a valid email address.';
  }
  if (isBlank(primaryMember.mobilePhone) || !isValidPhoneNumber(primaryMember.mobilePhone)) {
    errors.mobilePhone = 'Enter a valid 10-digit phone number.';
  }
  const birthDateError = validateBirthDateParts(primaryMember.birthDate);
  if (birthDateError) errors.birthDate = birthDateError;

  return errors;
}

export default function AboutYou() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const primaryMember = {
    ...EMPTY_PRIMARY_MEMBER,
    ...draft.data.primaryMember,
    birthDate: { ...EMPTY_PRIMARY_MEMBER.birthDate, ...draft.data.primaryMember?.birthDate },
  };

  const updatePrimaryMember = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        primaryMember: { ...prev.data.primaryMember, ...patch },
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
    updatePrimaryMember({ [field]: value });
    clearErrorIfValid(field, validator(value));
  };

  const handleOptionalTextChange = (field) => (event) => {
    updatePrimaryMember({ [field]: event.target.value });
  };

  const handleBirthDateChange = (nextBirthDate) => {
    updatePrimaryMember({ birthDate: nextBirthDate });
    clearErrorIfValid('birthDate', !validateBirthDateParts(nextBirthDate));
  };

  const handleFlagChange = (field) => (value) => {
    updatePrimaryMember({ [field]: value });
  };

  const focusFirstInvalidField = (fieldErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (!firstInvalid) return;
    const targetId = firstInvalid === 'birthDate' ? 'birthDate-month' : firstInvalid;
    document.getElementById(targetId)?.focus();
  };

  const handleSaveExit = () => {
    persistNow({
      ...draft,
      currentStep: THIS_STEP_ID,
      data: { ...draft.data, primaryMember },
    });
    goToOnboardingPath(ONBOARD_EXIT_PATH);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateAll(primaryMember);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, primaryMember },
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
                <h2 className="onboard-about-title">About You</h2>
                <p className="onboard-about-subtitle">Let&apos;s begin with some basic information about you.</p>
              </div>
              <span className="onboard-about-security-note">
                <Lock size={14} aria-hidden="true" />
                Your information is secure and encrypted.
              </span>
            </div>

            <h3 className="onboard-section-heading">Primary Member</h3>

            <div className="onboard-form-grid">
              <FormField
                id="firstName"
                label="First Name"
                required
                icon={User}
                placeholder="First Name"
                value={primaryMember.firstName}
                onChange={handleTextChange('firstName', isValidPersonName)}
                error={errors.firstName}
              />
              <FormField
                id="lastName"
                label="Last Name"
                required
                icon={User}
                placeholder="Last Name"
                value={primaryMember.lastName}
                onChange={handleTextChange('lastName', isValidPersonName)}
                error={errors.lastName}
              />
              <FormField
                id="email"
                label="Email"
                required
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                value={primaryMember.email}
                onChange={handleTextChange('email', isValidEmail)}
                error={errors.email}
              />
              <FormField
                id="mobilePhone"
                label="Mobile Phone"
                required
                type="tel"
                icon={Phone}
                placeholder="(123) 456-7890"
                value={primaryMember.mobilePhone}
                onChange={handleTextChange('mobilePhone', isValidPhoneNumber)}
                error={errors.mobilePhone}
              />
            </div>

            <BirthDateGroup
              groupId="birthDate"
              label="Birth Date"
              required
              value={primaryMember.birthDate}
              onChange={handleBirthDateChange}
              error={errors.birthDate}
            />

            <CollapsibleSection
              title="Community Information"
              optional
              description="This information helps us personalize your membership experience."
            >
              <div className="onboard-form-grid">
                <FormField
                  id="hebrewName"
                  label="Hebrew Name"
                  placeholder="Hebrew Name"
                  value={primaryMember.hebrewName}
                  onChange={handleOptionalTextChange('hebrewName')}
                />
                <FormField
                  id="fathersHebrewName"
                  label="Father's Hebrew Name"
                  placeholder="Father's Hebrew Name"
                  value={primaryMember.fathersHebrewName}
                  onChange={handleOptionalTextChange('fathersHebrewName')}
                />
              </div>
              <div className="onboard-form-grid">
                <FormField
                  id="mothersHebrewName"
                  label="Mother's Hebrew Name"
                  placeholder="Mother's Hebrew Name"
                  value={primaryMember.mothersHebrewName}
                  onChange={handleOptionalTextChange('mothersHebrewName')}
                />
                <FormField
                  id="occupation"
                  label="Occupation"
                  icon={Briefcase}
                  placeholder="Occupation"
                  value={primaryMember.occupation}
                  onChange={handleOptionalTextChange('occupation')}
                />
              </div>
            </CollapsibleSection>

            <div className="onboard-questions-panel">
              <h3 className="onboard-questions-title">
                Help Us Know You Better <span className="onboard-optional-label">(Optional)</span>
              </h3>

              <div className="onboard-questions-grid">
                <YesNoToggle
                  name="hasSpouse"
                  label="Do you have a spouse?"
                  icon={HeartHandshake}
                  value={primaryMember.hasSpouse}
                  onChange={handleFlagChange('hasSpouse')}
                />
                <YesNoToggle
                  name="hasChildren"
                  label="Do you have children?"
                  icon={Users2}
                  value={primaryMember.hasChildren}
                  onChange={handleFlagChange('hasChildren')}
                />
                <YesNoToggle
                  name="addYahrzeitRecords"
                  label="Would you like to add Yahrzeit records?"
                  icon={Star}
                  value={primaryMember.addYahrzeitRecords}
                  onChange={handleFlagChange('addYahrzeitRecords')}
                />
              </div>
            </div>

            <div className="onboard-form-actions">
              <SecondaryButton icon={LogOut} onClick={handleSaveExit}>
                Save &amp; Exit
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Save &amp; Next
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter />
      </div>
    </div>
  );
}
