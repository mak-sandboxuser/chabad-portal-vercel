import { useState } from 'react';
import { Lock, ArrowLeft, ArrowRight, Heart, Calendar } from 'lucide-react';
import PreLoginOnboardLayout from '../components/PreLoginOnboardLayout';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  MARITAL_INFORMATION_STEP_ID,
  HOUSEHOLD_STEP_ID,
  ABOUT_YOU_STEP_ID,
} from '../data/onboardingSteps';
import { goToOnboardingPath, ONBOARD_SUCCESS_PATH } from '../utils/onboardingRoutes';
import { submitPreLoginOnboardingApplication } from '../utils/submitPreLoginOnboarding';
import { readDraft } from '../utils/onboardingCookies';
import { showToast } from '../../utils/toast';
import { isBlank } from '../utils/onboardingValidation';

const THIS_STEP_ID = MARITAL_INFORMATION_STEP_ID;
const PREVIOUS_STEP_ID = HOUSEHOLD_STEP_ID;

const MARITAL_STATUS_OPTIONS = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Domestic Partnership', label: 'Domestic Partnership' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
  { value: 'Separated', label: 'Separated' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

const EMPTY_MARITAL = {
  maritalStatus: '',
  anniversaryDate: '',
  anniversaryMonth: '',
  anniversaryDay: '',
  anniversaryYear: '',
};

function partsToDateString(month, day, year) {
  if (!month || !day || !year) return '';
  const monthIndex = MONTHS.indexOf(month) + 1;
  if (monthIndex < 1) return '';
  const mm = String(monthIndex).padStart(2, '0');
  const dd = String(day).padStart(2, '0');
  // Store ISO for Salesforce Date fields (YYYY-MM-DD)
  return `${year}-${mm}-${dd}`;
}

function dateStringToParts(value) {
  const raw = String(value || '').trim();
  // YYYY-MM-DD
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const month = MONTHS[Number(iso[2]) - 1] || '';
    return {
      anniversaryMonth: month,
      anniversaryDay: String(Number(iso[3])),
      anniversaryYear: iso[1],
    };
  }
  // MM/DD/YYYY
  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slash) {
    const monthNum = Number(slash[1]);
    const day = String(Number(slash[2]));
    const year = slash[3];
    const month = MONTHS[monthNum - 1] || '';
    return { anniversaryMonth: month, anniversaryDay: day, anniversaryYear: year };
  }
  // "June 15, 2015"
  const named = raw.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
  if (named) {
    const month = MONTHS.find((m) => m.toLowerCase() === named[1].toLowerCase()) || '';
    return {
      anniversaryMonth: month,
      anniversaryDay: String(Number(named[2])),
      anniversaryYear: named[3],
    };
  }
  return { anniversaryMonth: '', anniversaryDay: '', anniversaryYear: '' };
}

function validateAll(marital) {
  const errors = {};

  if (isBlank(marital.maritalStatus)) {
    errors.maritalStatus = 'Select your marital status.';
  }

  if (marital.maritalStatus === 'Married') {
    const hasAny =
      marital.anniversaryMonth || marital.anniversaryDay || marital.anniversaryYear;
    if (!hasAny && !marital.anniversaryDate) {
      errors.anniversaryDate = 'Enter your anniversary date.';
    } else if (
      marital.anniversaryMonth || marital.anniversaryDay || marital.anniversaryYear
    ) {
      if (!marital.anniversaryMonth || !marital.anniversaryDay || !marital.anniversaryYear) {
        errors.anniversaryDate = 'Complete Anniversary Date or leave all fields blank.';
      }
    } else {
      const iso = String(marital.anniversaryDate || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) && !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(iso)) {
        errors.anniversaryDate = 'Enter a valid anniversary date.';
      }
    }
  }

  return errors;
}

export default function MaritalInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const saved = draft.data.marital || {};
  const fromDate = !saved.anniversaryMonth && saved.anniversaryDate
    ? dateStringToParts(saved.anniversaryDate)
    : {};
  const marital = {
    ...EMPTY_MARITAL,
    ...saved,
    ...fromDate,
    anniversaryMonth: saved.anniversaryMonth || fromDate.anniversaryMonth || '',
    anniversaryDay: saved.anniversaryDay || fromDate.anniversaryDay || '',
    anniversaryYear: saved.anniversaryYear || fromDate.anniversaryYear || '',
  };
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
    if (value !== 'Married') {
      setErrors((prev) => {
        if (!prev.anniversaryDate) return prev;
        const next = { ...prev };
        delete next.anniversaryDate;
        return next;
      });
    }
  };

  const handleAnniversaryPartChange = (field) => (event) => {
    const value = event.target.value;
    const nextParts = {
      anniversaryMonth: field === 'anniversaryMonth' ? value : marital.anniversaryMonth,
      anniversaryDay: field === 'anniversaryDay' ? value : marital.anniversaryDay,
      anniversaryYear: field === 'anniversaryYear' ? value : marital.anniversaryYear,
    };
    const anniversaryDate = partsToDateString(
      nextParts.anniversaryMonth,
      nextParts.anniversaryDay,
      nextParts.anniversaryYear,
    );
    updateMarital({ ...nextParts, anniversaryDate });
    if (errors.anniversaryDate) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.anniversaryDate;
        return next;
      });
    }
  };

  const focusFirstInvalidField = (fieldErrors) => {
    if (fieldErrors.maritalStatus) {
      document.getElementById('maritalStatus')?.focus();
    } else if (fieldErrors.anniversaryDate) {
      document.getElementById('anniversaryMonth')?.focus();
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const anniversaryDate = showAnniversary
      ? partsToDateString(
        marital.anniversaryMonth,
        marital.anniversaryDay,
        marital.anniversaryYear,
      ) || marital.anniversaryDate
      : '';

    const payloadMarital = {
      ...marital,
      anniversaryDate,
    };

    const nextErrors = validateAll(payloadMarital);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidField(nextErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      persistNow({
        ...draft,
        currentStep: THIS_STEP_ID,
        data: { ...draft.data, marital: payloadMarital },
      });

      const latest = readDraft() || draft;
      const primaryMember = latest.data?.primaryMember || {};
      const household = latest.data?.household || {};

      if (!primaryMember.email || !primaryMember.firstName || !primaryMember.lastName) {
        showToast({
          message: 'Primary member details are missing. Please go back to About You.',
          type: 'error',
        });
        goToOnboardingPath(getStepById(ABOUT_YOU_STEP_ID).path);
        setIsSubmitting(false);
        return;
      }

      if (!household.addressLine1 || !household.city) {
        showToast({
          message: 'Household details are missing. Please go back to Household.',
          type: 'error',
        });
        goToOnboardingPath(getStepById(HOUSEHOLD_STEP_ID).path);
        setIsSubmitting(false);
        return;
      }

      await submitPreLoginOnboardingApplication({
        primaryMember,
        household,
        marital: latest.data?.marital || payloadMarital,
      });

      showToast({ message: 'Registration & Membership assigned successfully!', type: 'success' });
      window.location.assign(ONBOARD_SUCCESS_PATH);
    } catch (err) {
      if (err?.code === 'email_registered') {
        setErrors((prev) => ({
          ...prev,
          maritalStatus: prev.maritalStatus || 'This email is already registered. Please log in.',
        }));
      }
      setIsSubmitting(false);
    }
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
            <h2>Marital Information</h2>
            <p>Please let us know your current marital status.</p>
          </div>
          <div className="ay-secure-note">
            <Lock size={14} />
            Your information is secure and encrypted.
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <p className="ay-section-label">Marital Details</p>

          <div className="ay-row">
            <div className="ay-field">
              <label className="ay-label" htmlFor="maritalStatus">
                Marital Status<span>*</span>
              </label>
              <div className={`ay-input-wrap ${errors.maritalStatus ? 'has-error' : ''}`}>
                <Heart size={16} />
                <select
                  id="maritalStatus"
                  value={marital.maritalStatus}
                  onChange={handleStatusChange}
                >
                  <option value="">Marital Status</option>
                  {MARITAL_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {errors.maritalStatus && (
                <span className="ay-input-error">{errors.maritalStatus}</span>
              )}
            </div>

            {showAnniversary ? (
              <div className="ay-field">
                <label className="ay-label">
                  Anniversary Date<span>*</span>
                </label>
                <div className="ay-birth-row">
                  <div className={`ay-input-wrap ${errors.anniversaryDate ? 'has-error' : ''}`}>
                    <Calendar size={16} />
                    <select
                      id="anniversaryMonth"
                      value={marital.anniversaryMonth}
                      onChange={handleAnniversaryPartChange('anniversaryMonth')}
                    >
                      <option value="">Month</option>
                      {MONTHS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`ay-input-wrap ${errors.anniversaryDate ? 'has-error' : ''}`}>
                    <select
                      id="anniversaryDay"
                      value={marital.anniversaryDay}
                      onChange={handleAnniversaryPartChange('anniversaryDay')}
                    >
                      <option value="">Day</option>
                      {DAYS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className={`ay-input-wrap ${errors.anniversaryDate ? 'has-error' : ''}`}>
                    <select
                      id="anniversaryYear"
                      value={marital.anniversaryYear}
                      onChange={handleAnniversaryPartChange('anniversaryYear')}
                    >
                      <option value="">Year</option>
                      {YEARS.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </div>
                {errors.anniversaryDate && (
                  <span className="ay-input-error">{errors.anniversaryDate}</span>
                )}
              </div>
            ) : (
              <div className="ay-field" aria-hidden="true" />
            )}
          </div>

          {showAnniversary && (
            <p className="ay-helper-hint">
              Please enter your wedding anniversary date.
            </p>
          )}

          <div className="ay-actions">
            <button type="button" className="ay-btn-outline" onClick={handleBack}>
              <ArrowLeft size={16} /> Back
            </button>
            <button type="submit" className="ay-btn-solid" disabled={isSubmitting}>
              {isSubmitting ? 'Please wait…' : (
                <>
                  Confirm &amp; Continue <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </PreLoginOnboardLayout>
  );
}
