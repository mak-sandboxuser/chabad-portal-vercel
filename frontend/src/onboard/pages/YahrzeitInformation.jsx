import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import KnowYouBetterPanel from '../components/KnowYouBetterPanel';
import FormField from '../components/FormField';
import DateField from '../components/DateField';
import InfoPanel from '../components/InfoPanel';
import AddItemButton from '../components/AddItemButton';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  YAHRZEIT_STEP_ID,
} from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import {
  getHouseholdPreferences,
  getNextPreferenceStepId,
  getPreviousPreferenceStepId,
  getRedirectPathIfStepDisallowed,
} from '../utils/householdPreferences';
import { isBlank, validateDateString } from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = YAHRZEIT_STEP_ID;
const MAX_RECORDS = 4;
const PASSING_DATE_LABEL = 'date of passing';

function createRecordId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `yahrzeit-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateRecords(records) {
  const errors = {};

  records.forEach((record) => {
    const recordErrors = {};
    if (isBlank(record.fullName)) {
      recordErrors.fullName = 'Enter a full name.';
    }
    const dateError = validateDateString(record.dateOfPassing, PASSING_DATE_LABEL);
    if (dateError) recordErrors.dateOfPassing = dateError;

    if (Object.keys(recordErrors).length > 0) {
      errors[record.id] = recordErrors;
    }
  });

  return errors;
}

export default function YahrzeitInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefs = getHouseholdPreferences(draft);
  const records = draft.data.yahrzeitRecords || [];

  useEffect(() => {
    const redirect = getRedirectPathIfStepDisallowed(THIS_STEP_ID, prefs);
    if (redirect && redirect !== window.location.pathname) {
      goToOnboardingPath(redirect);
    }
  }, [prefs.hasSpouse, prefs.hasChildren, prefs.addYahrzeit]);

  const updateRecords = (nextRecords) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, yahrzeitRecords: nextRecords },
    }));
  };

  const handleAddRecord = () => {
    if (records.length >= MAX_RECORDS) return;
    updateRecords([
      ...records,
      { id: createRecordId(), fullName: '', hebrewName: '', fathersHebrewName: '', dateOfPassing: '' },
    ]);
  };

  const handleRemoveRecord = (id) => {
    const record = records.find((r) => r.id === id);
    const hasData = record && Object.entries(record).some(([key, value]) => key !== 'id' && !isBlank(value));
    if (hasData && !window.confirm('Remove this Yahrzeit record? Any entered information will be lost.')) {
      return;
    }

    updateRecords(records.filter((r) => r.id !== id));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearFieldError = (id, field, isNowValid) => {
    setErrors((prev) => {
      if (!prev[id]?.[field] || !isNowValid) return prev;
      const nextRecordErrors = { ...prev[id] };
      delete nextRecordErrors[field];
      const next = { ...prev, [id]: nextRecordErrors };
      if (Object.keys(nextRecordErrors).length === 0) delete next[id];
      return next;
    });
  };

  const handleTextFieldChange = (id, field) => (event) => {
    const value = event.target.value;
    updateRecords(records.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    if (field === 'fullName') clearFieldError(id, field, !isBlank(value));
  };

  const handleDateChange = (id) => (value) => {
    updateRecords(records.map((r) => (r.id === id ? { ...r, dateOfPassing: value } : r)));
    clearFieldError(id, 'dateOfPassing', !validateDateString(value, PASSING_DATE_LABEL));
  };

  const handleBack = () => {
    const previousStepId = getPreviousPreferenceStepId(THIS_STEP_ID, prefs);
    persistNow({
      ...draft,
      currentStep: previousStepId,
      data: { ...draft.data, yahrzeitRecords: records },
    });
    goToOnboardingPath(getStepById(previousStepId).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!prefs.addYahrzeit) return;

    const nextErrors = validateRecords(records);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalid = records.find((r) => nextErrors[r.id]);
      if (firstInvalid) {
        const field = nextErrors[firstInvalid.id].fullName ? 'fullName' : 'dateOfPassing';
        document.getElementById(`yahrzeit-${firstInvalid.id}-${field}`)?.focus();
      }
      return;
    }

    const nextStepId = getNextPreferenceStepId(THIS_STEP_ID, prefs);
    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: nextStepId,
      data: { ...draft.data, yahrzeitRecords: records },
    });
    goToOnboardingPath(getStepById(nextStepId).path);
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
          {prefs.addYahrzeit && (
          <form className="onboard-about-card" onSubmit={handleSubmit} noValidate>
            <div className="onboard-about-header">
              <div>
                <h2 className="onboard-about-title">Yahrzeit Information</h2>
                <p className="onboard-about-subtitle">
                  Please provide information for Yahrzeit records you would like us to honor.
                </p>
              </div>
            </div>

            <InfoPanel description={`You can add up to ${MAX_RECORDS} Yahrzeit records.`} />

            {records.map((record, index) => (
              <div className="onboard-child-card" key={record.id}>
                <div className="onboard-child-card-header">
                  <h4 className="onboard-child-card-title">Record {index + 1}</h4>
                  <button
                    type="button"
                    className="onboard-child-remove-button"
                    onClick={() => handleRemoveRecord(record.id)}
                    aria-label={`Remove Record ${index + 1}`}
                  >
                    <Trash2 size={18} aria-hidden="true" />
                  </button>
                </div>

                <div className="onboard-form-grid">
                  <FormField
                    id={`yahrzeit-${record.id}-fullName`}
                    label="Full Name"
                    required
                    value={record.fullName}
                    onChange={handleTextFieldChange(record.id, 'fullName')}
                    error={errors[record.id]?.fullName}
                  />
                  <FormField
                    id={`yahrzeit-${record.id}-hebrewName`}
                    label="Hebrew Name"
                    value={record.hebrewName}
                    onChange={handleTextFieldChange(record.id, 'hebrewName')}
                  />
                </div>

                <div className="onboard-form-grid">
                  <FormField
                    id={`yahrzeit-${record.id}-fathersHebrewName`}
                    label="Father's Hebrew Name"
                    value={record.fathersHebrewName}
                    onChange={handleTextFieldChange(record.id, 'fathersHebrewName')}
                  />
                  <DateField
                    id={`yahrzeit-${record.id}-dateOfPassing`}
                    label="Date of Passing"
                    required
                    value={record.dateOfPassing}
                    onChange={handleDateChange(record.id)}
                    error={errors[record.id]?.dateOfPassing}
                  />
                </div>
              </div>
            ))}

            <div className="onboard-add-child-row">
              <AddItemButton onClick={handleAddRecord} disabled={records.length >= MAX_RECORDS}>
                Add Record
              </AddItemButton>
              <span className="onboard-add-child-count">
                {records.length} of {MAX_RECORDS} records added
              </span>
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
          )}
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
