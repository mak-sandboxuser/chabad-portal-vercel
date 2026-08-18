import { useEffect, useState } from 'react';
import { ArrowLeft, Mail, Lock, LogOut } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import KnowYouBetterPanel from '../components/KnowYouBetterPanel';
import FormField from '../components/FormField';
import PhoneField from '../components/PhoneField';
import SelectField from '../components/SelectField';
import BirthDateGroup from '../components/BirthDateGroup';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, SPOUSE_INFORMATION_STEP_ID } from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import {
  getHouseholdPreferences,
  getNextPreferenceStepId,
  getPreviousPreferenceStepId,
  getRedirectPathIfStepDisallowed,
  isFirstPreferenceStep,
} from '../utils/householdPreferences';
import { signOutFromOnboarding } from '../utils/postLoginStepper';
import {
  createFamilyMemberViaWebhook,
  fingerprintFamilyMember,
} from '../utils/addFamilyMemberApi';
import { showToast } from '../../utils/toast';
import { isBlank, isValidPersonName, isValidEmail, isValidPhoneForCountry } from '../utils/onboardingValidation';
import { getPhoneLengthLabel } from '../data/phoneCountries';
import { SALUTATIONS, GENDER_OPTIONS } from '../../constants/householdMembers';
import '../onboard.css';

const THIS_STEP_ID = SPOUSE_INFORMATION_STEP_ID;

const SALUTATION_OPTIONS = SALUTATIONS.map((value) => ({ value, label: value }));
const GENDER_SELECT_OPTIONS = GENDER_OPTIONS.map((value) => ({ value, label: value }));

const EMPTY_SPOUSE = {
  salutation: '',
  gender: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: { country: 'US', number: '' },
  hebrewName: '',
  fathersHebrewName: '',
  mothersHebrewName: '',
  occupation: '',
  birthDate: { month: '', day: '', year: '' },
};

const FIELD_ORDER = ['firstName', 'lastName', 'email', 'phone'];

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
  if (isBlank(spouse.phone.number) || !isValidPhoneForCountry(spouse.phone.number, spouse.phone.country)) {
    errors.phone = `Enter a valid ${getPhoneLengthLabel(spouse.phone.country)} phone number.`;
  }

  return errors;
}

export default function SpouseInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefs = getHouseholdPreferences(draft);
  const isFirstForm = isFirstPreferenceStep(THIS_STEP_ID, prefs);
  const spouse = {
    ...EMPTY_SPOUSE,
    ...draft.data.spouse,
    phone: { ...EMPTY_SPOUSE.phone, ...draft.data.spouse?.phone },
    birthDate: { ...EMPTY_SPOUSE.birthDate, ...draft.data.spouse?.birthDate },
  };

  const fingerprint = fingerprintFamilyMember({
    ...spouse,
    contactEmail: spouse.email,
    mobilePhone: spouse.phone?.number,
  });
  const isSpouseSaved =
    draft.data.spouseSyncFingerprint === fingerprint && Boolean(spouse.firstName || spouse.lastName);

  useEffect(() => {
    const redirect = getRedirectPathIfStepDisallowed(THIS_STEP_ID, prefs);
    if (redirect && redirect !== window.location.pathname) {
      goToOnboardingPath(redirect);
    }
  }, [prefs.hasSpouse, prefs.hasChildren, prefs.addYahrzeit]);

  const updateSpouse = (patch) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: {
        ...prev.data,
        spouse: { ...prev.data.spouse, ...patch },
        spouseSyncFingerprint: '', // edited fields require a re-save
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
    clearErrorIfValid('phone', isValidPhoneForCountry(nextPhone.number, nextPhone.country));
  };

  const handleBirthDateChange = (nextBirthDate) => {
    updateSpouse({ birthDate: nextBirthDate });
  };

  const handleRemoveSpouse = () => {
    persistNow({
      ...draft,
      currentStep: THIS_STEP_ID,
      data: {
        ...draft.data,
        spouse: EMPTY_SPOUSE,
        spouseSyncFingerprint: '',
      },
    });
    setErrors({});
  };

  const focusFirstInvalidField = (fieldErrors) => {
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]);
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();
  };

  const goToNextStep = () => {
    const nextStepId = getNextPreferenceStepId(THIS_STEP_ID, prefs);
    goToOnboardingPath(getStepById(nextStepId).path);
  };

  const handleBack = () => {
    if (isFirstForm) {
      signOutFromOnboarding();
      return;
    }
    const previousStepId = getPreviousPreferenceStepId(THIS_STEP_ID, prefs);
    persistNow({
      ...draft,
      currentStep: previousStepId,
      data: { ...draft.data, spouse },
    });
    goToOnboardingPath(getStepById(previousStepId).path);
  };

  const handleContinue = () => {
    const nextStepId = getNextPreferenceStepId(THIS_STEP_ID, prefs);
    persistNow({ ...draft, currentStep: nextStepId });
    goToOnboardingPath(getStepById(nextStepId).path);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!prefs.hasSpouse) return;

    const nextErrors = validateAll(spouse);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    const nextStepId = getNextPreferenceStepId(THIS_STEP_ID, prefs);
    setIsSubmitting(true);
    try {
      // Same webhook as Household → Add Family Members → Save & Create Contact.
      // Skipped when the user returned via Back without changing any field.
      if (!isSpouseSaved) {
        await createFamilyMemberViaWebhook({
          memberType: 'secondary',
          salutation: spouse.salutation,
          firstName: spouse.firstName,
          lastName: spouse.lastName,
          gender: spouse.gender,
          contactEmail: spouse.email,
          mobilePhone: spouse.phone?.number || '',
          hebrewName: spouse.hebrewName,
          fathersHebrewName: spouse.fathersHebrewName,
          mothersHebrewName: spouse.mothersHebrewName,
          occupation: spouse.occupation,
          birthDate: spouse.birthDate,
        });
        showToast({ message: 'Spouse contact created successfully.', type: 'success' });
      }

      persistNow({
        ...draft,
        currentStep: nextStepId,
        data: {
          ...draft.data,
          spouse,
          spouseSyncFingerprint: fingerprint,
        },
      });
      goToOnboardingPath(getStepById(nextStepId).path);
    } catch (err) {
      showToast({ message: err.message || 'Failed to save spouse contact.', type: 'error' });
      setIsSubmitting(false);
    }
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

        <KnowYouBetterPanel
          draft={draft}
          updateDraft={updateDraft}
          persistNow={persistNow}
          currentStepId={THIS_STEP_ID}
        />

        <main>
          {prefs.hasSpouse && (
            <div className="onboard-about-card">
              <div className="onboard-about-header">
                <div>
                  <h2 className="onboard-about-title">Spouse Information</h2>
                  <p className="onboard-about-subtitle">
                    {isSpouseSaved
                      ? 'Your spouse has been successfully added to your household.'
                      : 'Please provide information about your spouse.'}
                  </p>
                </div>
                <span className="onboard-about-security-note">
                  <Lock size={14} aria-hidden="true" />
                  Your information is secure and encrypted.
                </span>
              </div>

              {isSpouseSaved ? (
                <>
                  <div className="onboard-search-selected-card" style={{ marginBottom: '32px' }}>
                    <div className="onboard-selected-meta">
                      <span className="onboard-selected-tag">Added Spouse</span>
                      <div className="onboard-selected-name">
                        {spouse.firstName} {spouse.lastName}
                      </div>
                      <div className="onboard-selected-details">
                        {spouse.email && <span>{spouse.email}</span>}
                        {spouse.phone?.number && <span> • {spouse.phone.number}</span>}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="onboard-selected-change-btn"
                      onClick={handleRemoveSpouse}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="onboard-form-actions">
                    <SecondaryButton
                      variant="navy"
                      icon={isFirstForm ? LogOut : ArrowLeft}
                      onClick={handleBack}
                    >
                      {isFirstForm ? 'Sign Out' : 'Back'}
                    </SecondaryButton>
                    <PrimaryButton onClick={handleContinue}>Save &amp; Continue</PrimaryButton>
                  </div>
                </>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <div className="onboard-form-grid">
                    <SelectField
                      standalone
                      id="salutation"
                      label="Salutation"
                      placeholder="-- Select --"
                      value={spouse.salutation}
                      onChange={handleTextChange('salutation')}
                      options={SALUTATION_OPTIONS}
                    />
                    <SelectField
                      standalone
                      id="gender"
                      label="Gender"
                      placeholder="--None--"
                      value={spouse.gender}
                      onChange={handleTextChange('gender')}
                      options={GENDER_SELECT_OPTIONS}
                    />
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
                      id="email"
                      label="Email"
                      required
                      type="email"
                      icon={Mail}
                      placeholder="Enter email address"
                      value={spouse.email}
                      onChange={handleTextChange('email', isValidEmail)}
                      error={errors.email}
                      autoComplete="email"
                    />
                    <PhoneField
                      id="phone"
                      label="Mobile Phone"
                      required
                      value={spouse.phone}
                      onChange={handlePhoneChange}
                      error={errors.phone}
                    />
                  </div>

                  <div className="onboard-form-grid">
                    <FormField
                      id="hebrewName"
                      label="Hebrew Name"
                      placeholder="Hebrew Name"
                      value={spouse.hebrewName}
                      onChange={handleTextChange('hebrewName')}
                    />
                    <FormField
                      id="fathersHebrewName"
                      label="Father's Hebrew Name"
                      placeholder="Father's Hebrew Name"
                      value={spouse.fathersHebrewName}
                      onChange={handleTextChange('fathersHebrewName')}
                    />
                  </div>

                  <div className="onboard-form-grid">
                    <FormField
                      id="mothersHebrewName"
                      label="Mother's Hebrew Name"
                      placeholder="Mother's Hebrew Name"
                      value={spouse.mothersHebrewName}
                      onChange={handleTextChange('mothersHebrewName')}
                    />
                    <FormField
                      id="occupation"
                      label="Occupation"
                      placeholder="Occupation"
                      value={spouse.occupation}
                      onChange={handleTextChange('occupation')}
                    />
                  </div>

                  <BirthDateGroup
                    groupId="spouseBirthDate"
                    label="Birth Date"
                    value={spouse.birthDate}
                    onChange={handleBirthDateChange}
                  />

                  <div className="onboard-form-actions">
                    <SecondaryButton
                      variant="navy"
                      icon={isFirstForm ? LogOut : ArrowLeft}
                      onClick={handleBack}
                    >
                      {isFirstForm ? 'Sign Out' : 'Back'}
                    </SecondaryButton>
                    <PrimaryButton type="submit" loading={isSubmitting}>
                      Save &amp; Continue
                    </PrimaryButton>
                  </div>
                </form>
              )}
            </div>
          )}
        </main>

        <OnboardFooter />
      </div>
    </div>
  );
}
