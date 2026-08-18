import { useState } from 'react';
import {
  Lock,
  ArrowLeft,
  ArrowRight,
  Home,
  Building2,
  MapPin,
  Hash,
  Globe,
  Phone,
} from 'lucide-react';
import PreLoginOnboardLayout from '../components/PreLoginOnboardLayout';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  HOUSEHOLD_STEP_ID,
  ABOUT_YOU_STEP_ID,
  MARITAL_INFORMATION_STEP_ID,
} from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, isValidPostalCode } from '../utils/onboardingValidation';
import { US_STATES } from '../data/usStates';

const THIS_STEP_ID = HOUSEHOLD_STEP_ID;
const PREVIOUS_STEP_ID = ABOUT_YOU_STEP_ID;
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

function formatPhoneDigits(raw) {
  let val = String(raw || '').replace(/\D/g, '').substring(0, 10);
  if (val.length > 6) {
    return `(${val.substring(0, 3)}) ${val.substring(3, 6)}-${val.substring(6)}`;
  }
  if (val.length > 3) {
    return `(${val.substring(0, 3)}) ${val.substring(3)}`;
  }
  return val;
}

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

  const handlePhoneChange = (field) => (event) => {
    const number = formatPhoneDigits(event.target.value);
    updateHousehold({
      [field]: {
        ...(household[field] || EMPTY_HOUSEHOLD[field]),
        number,
      },
    });
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
    <PreLoginOnboardLayout
      theme={theme}
      onToggleTheme={toggleTheme}
      footerNote="Your information is secure and will only be used for membership purposes."
    >
      <div className="ay-card">
        <div className="ay-card-head">
          <div>
            <h2>Household Information</h2>
            <p>Please provide your household address and contact information.</p>
          </div>
          <div className="ay-secure-note">
            <Lock size={14} />
            Your information is secure and encrypted.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <p className="ay-section-label">Household Address</p>

          <div className="ay-field" style={{ marginBottom: 18 }}>
            <label className="ay-label" htmlFor="addressLine1">
              Address Line 1<span>*</span>
            </label>
            <div className={`ay-input-wrap ${errors.addressLine1 ? 'has-error' : ''}`}>
              <Home size={16} />
              <input
                id="addressLine1"
                type="text"
                placeholder="123 Main Street"
                value={household.addressLine1}
                onChange={handleTextChange('addressLine1', (value) => !isBlank(value))}
              />
            </div>
            {errors.addressLine1 && <span className="ay-input-error">{errors.addressLine1}</span>}
          </div>

          <div className="ay-field" style={{ marginBottom: 18 }}>
            <label className="ay-label" htmlFor="addressLine2">
              Address Line 2 <span className="ay-optional-label">(Optional)</span>
            </label>
            <div className="ay-input-wrap">
              <Building2 size={16} />
              <input
                id="addressLine2"
                type="text"
                placeholder="Apt 4B, Building A (optional)"
                value={household.addressLine2}
                onChange={handleTextChange('addressLine2')}
              />
            </div>
          </div>

          <div className="ay-row">
            <div className="ay-field">
              <label className="ay-label" htmlFor="city">
                City<span>*</span>
              </label>
              <div className={`ay-input-wrap ${errors.city ? 'has-error' : ''}`}>
                <MapPin size={16} />
                <input
                  id="city"
                  type="text"
                  placeholder="Bedford"
                  value={household.city}
                  onChange={handleTextChange('city', (value) => !isBlank(value))}
                />
              </div>
              {errors.city && <span className="ay-input-error">{errors.city}</span>}
            </div>
            <div className="ay-field">
              <label className="ay-label" htmlFor="state">
                State<span>*</span>
              </label>
              <div className={`ay-input-wrap ${errors.state ? 'has-error' : ''}`}>
                <select id="state" value={household.state} onChange={handleSelectChange('state')}>
                  <option value="">State</option>
                  {US_STATES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              {errors.state && <span className="ay-input-error">{errors.state}</span>}
            </div>
          </div>

          <div className="ay-row">
            <div className="ay-field">
              <label className="ay-label" htmlFor="zipCode">
                Zip Code<span>*</span>
              </label>
              <div className={`ay-input-wrap ${errors.zipCode ? 'has-error' : ''}`}>
                <Hash size={16} />
                <input
                  id="zipCode"
                  type="text"
                  placeholder="10506"
                  value={household.zipCode}
                  onChange={handleTextChange('zipCode', isValidPostalCode)}
                />
              </div>
              {errors.zipCode && <span className="ay-input-error">{errors.zipCode}</span>}
            </div>
            <div className="ay-field">
              <label className="ay-label" htmlFor="country">
                Country<span>*</span>
              </label>
              <div className={`ay-input-wrap ${errors.country ? 'has-error' : ''}`}>
                <Globe size={16} />
                <select
                  id="country"
                  value={household.country}
                  onChange={handleSelectChange('country')}
                >
                  <option value="">Country</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              {errors.country && <span className="ay-input-error">{errors.country}</span>}
            </div>
          </div>

          <div className="ay-row">
            <div className="ay-field">
              <label className="ay-label" htmlFor="homePhone">Home Phone</label>
              <div className="ay-input-wrap">
                <Phone size={16} />
                <input
                  id="homePhone"
                  type="text"
                  placeholder="(914) 234-5678"
                  value={household.homePhone?.number || ''}
                  onChange={handlePhoneChange('homePhone')}
                />
              </div>
            </div>
            <div className="ay-field">
              <label className="ay-label" htmlFor="workPhone">Work Phone</label>
              <div className="ay-input-wrap">
                <Phone size={16} />
                <input
                  id="workPhone"
                  type="text"
                  placeholder="(914) 555-1234"
                  value={household.workPhone?.number || ''}
                  onChange={handlePhoneChange('workPhone')}
                />
              </div>
            </div>
          </div>

          <div className="ay-actions">
            <button type="button" className="ay-btn-outline" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <button type="submit" className="ay-btn-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : (
                <>
                  Next <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PreLoginOnboardLayout>
  );
}
