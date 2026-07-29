import { useEffect, useState } from 'react';
import { ArrowLeft, Trash2, LogOut } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import KnowYouBetterPanel from '../components/KnowYouBetterPanel';
import FormField from '../components/FormField';
import SelectField from '../components/SelectField';
import InfoPanel from '../components/InfoPanel';
import AddItemButton from '../components/AddItemButton';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, CHILDREN_STEP_ID } from '../data/onboardingSteps';
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
import { isBlank, isValidPersonName } from '../utils/onboardingValidation';
import { SALUTATIONS, GENDER_OPTIONS } from '../../constants/householdMembers';
import '../onboard.css';

const THIS_STEP_ID = CHILDREN_STEP_ID;
const MAX_CHILDREN = 5;

const SALUTATION_OPTIONS = SALUTATIONS.map((value) => ({ value, label: value }));
const GENDER_SELECT_OPTIONS = GENDER_OPTIONS.map((value) => ({ value, label: value }));

function createChildId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `child-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyChild() {
  return {
    id: createChildId(),
    salutation: '',
    gender: '',
    firstName: '',
    lastName: '',
    name: '',
    birthDate: '',
    // Fingerprint of the values last sent to the CRM, stored on the record
    // itself (same idea as draft.data.spouseSyncFingerprint) so it survives
    // reloads and can't be orphaned by an id change.
    syncFingerprint: '',
  };
}

/** A row the applicant hasn't started filling in yet. */
function isChildBlank(child) {
  return (
    isBlank(child.salutation) &&
    isBlank(child.gender) &&
    isBlank(child.firstName) &&
    isBlank(child.lastName)
  );
}

function validateChild(child) {
  const childErrors = {};
  if (!isValidPersonName(child.firstName)) {
    childErrors.firstName = "Enter this child's first name.";
  }
  if (!isValidPersonName(child.lastName)) {
    childErrors.lastName = "Enter this child's last name.";
  }
  return childErrors;
}

/**
 * Blank rows are skipped so the empty row that "Add Child" appends never blocks
 * the next Add Child / Save & Continue (which is what stopped the webhook firing).
 */
function validateChildren(children) {
  const errors = {};

  children.forEach((child) => {
    if (isChildBlank(child)) return;
    const childErrors = validateChild(child);
    if (Object.keys(childErrors).length > 0) {
      errors[child.id] = childErrors;
    }
  });

  return errors;
}

/**
 * Collapses the list to the filled rows plus at most one trailing blank row.
 * Without this, every "Add Child" click left another empty form behind in the
 * draft; those pile up, hit MAX_CHILDREN, and silently disable the button.
 */
function normalizeChildren(list) {
  const filled = list.filter((child) => !isChildBlank(child));
  const firstBlank = list.find((child) => isChildBlank(child));
  if (filled.length === 0) return [firstBlank || createEmptyChild()];
  return firstBlank ? [...filled, firstBlank] : filled;
}

export default function ChildrenInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefs = getHouseholdPreferences(draft);
  const isFirstForm = isFirstPreferenceStep(THIS_STEP_ID, prefs);
  const children = normalizeChildren(
    (draft.data.children || []).map((child) => ({
      ...createEmptyChild(),
      ...child,
      id: child.id || createChildId(),
      firstName: child.firstName || child.name || '',
    })),
  );
  // Only real children count toward the cap — the trailing blank row doesn't.
  const filledCount = children.filter((child) => !isChildBlank(child)).length;

  useEffect(() => {
    const redirect = getRedirectPathIfStepDisallowed(THIS_STEP_ID, prefs);
    if (redirect && redirect !== window.location.pathname) {
      goToOnboardingPath(redirect);
    }
  }, [prefs.hasSpouse, prefs.hasChildren, prefs.addYahrzeit]);

  // Open Child 1 by default, and flush any leftover blank rows from earlier
  // sessions back into the draft so the cap reflects real children only.
  useEffect(() => {
    if (!prefs.hasChildren) return;
    const stored = draft.data.children || [];
    if (stored.length === children.length) return;
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, children },
    }));
  }, [prefs.hasChildren, draft.data.children, children, updateDraft]);

  const updateChildren = (nextChildren) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, children: nextChildren },
    }));
  };

  /**
   * Sends every child that isn't already in the CRM through the same webhook as
   * Household → Add Family Members → Save & Create Contact, one at a time, and
   * returns the list with each sent child stamped so it isn't sent twice.
   */
  const syncUnsavedChildren = async (list) => {
    const nextList = [...list];
    let created = 0;

    for (let index = 0; index < nextList.length; index += 1) {
      const child = nextList[index];
      if (isChildBlank(child)) continue;

      const fingerprint = fingerprintFamilyMember(child);
      if (child.syncFingerprint && child.syncFingerprint === fingerprint) continue;

      await createFamilyMemberViaWebhook({
        memberType: 'child',
        salutation: child.salutation,
        firstName: child.firstName,
        lastName: child.lastName,
        gender: child.gender,
        contactEmail: '',
        mobilePhone: '',
      });
      nextList[index] = { ...child, syncFingerprint: fingerprint };
      created += 1;
    }

    return { nextList, created };
  };

  const focusFirstInvalidChild = (childErrors) => {
    const firstInvalidChild = children.find((c) => childErrors[c.id]);
    if (!firstInvalidChild) return;
    const field = childErrors[firstInvalidChild.id].firstName ? 'firstName' : 'lastName';
    document.getElementById(`child-${firstInvalidChild.id}-${field}`)?.focus();
  };

  const handleAddChild = async () => {
    if (isSubmitting) return;
    if (filledCount >= MAX_CHILDREN) {
      showToast({ message: `You can add up to ${MAX_CHILDREN} children.`, type: 'error' });
      return;
    }

    // Every visible row must be complete before another one is opened, so the
    // row just filled in gets sent to the CRM on this click.
    const nextErrors = {};
    children.forEach((child) => {
      const childErrors = validateChild(child);
      if (Object.keys(childErrors).length > 0) nextErrors[child.id] = childErrors;
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidChild(nextErrors);
      showToast({
        message: 'Complete the current child before adding another.',
        type: 'error',
      });
      return;
    }

    setIsSubmitting(true);
    let synced = children;
    try {
      const result = await syncUnsavedChildren(children);
      synced = result.nextList;
      if (result.created > 0) {
        showToast({ message: 'Child contact created.', type: 'success' });
      }
    } catch (err) {
      showToast({ message: err.message || 'Failed to create child contact.', type: 'error' });
      setIsSubmitting(false);
      return;
    }

    persistNow({
      ...draft,
      currentStep: THIS_STEP_ID,
      data: {
        ...draft.data,
        children: [...synced, createEmptyChild()],
      },
    });
    setIsSubmitting(false);
  };

  const handleRemoveChild = (id) => {
    const child = children.find((c) => c.id === id);
    const hasData =
      child &&
      (!isBlank(child.firstName) ||
        !isBlank(child.lastName) ||
        !isBlank(child.salutation) ||
        !isBlank(child.gender));
    if (hasData && !window.confirm('Remove this child? Any entered information will be lost.')) {
      return;
    }

    updateChildren(children.filter((c) => c.id !== id));
    setErrors((prev) => {
      if (!prev[id]) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const clearChildFieldError = (id, field, isNowValid) => {
    setErrors((prev) => {
      if (!prev[id]?.[field] || !isNowValid) return prev;
      const nextChildErrors = { ...prev[id] };
      delete nextChildErrors[field];
      const next = { ...prev, [id]: nextChildErrors };
      if (Object.keys(nextChildErrors).length === 0) delete next[id];
      return next;
    });
  };

  const handleChildChange = (id, field, validator) => (event) => {
    const value = event.target.value;
    updateChildren(children.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
    if (validator) clearChildFieldError(id, field, validator(value));
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
      data: { ...draft.data, children },
    });
    goToOnboardingPath(getStepById(previousStepId).path);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!prefs.hasChildren) return;

    const nextErrors = validateChildren(children);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstInvalidChild(nextErrors);
      return;
    }

    // The trailing empty row that "Add Child" leaves behind is dropped rather
    // than sent, so it never blocks Save & Continue.
    const filledChildren = children.filter((child) => !isChildBlank(child));
    const nextStepId = getNextPreferenceStepId(THIS_STEP_ID, prefs);
    setIsSubmitting(true);
    try {
      const { nextList, created } = await syncUnsavedChildren(filledChildren);
      if (created > 0) {
        showToast({ message: 'Child contact(s) created.', type: 'success' });
      }

      persistNow({
        ...draft,
        currentStep: nextStepId,
        data: {
          ...draft.data,
          children: nextList.length > 0 ? nextList : children,
        },
      });
      goToOnboardingPath(getStepById(nextStepId).path);
    } catch (err) {
      showToast({ message: err.message || 'Failed to create child contact.', type: 'error' });
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
          {prefs.hasChildren && (
            <form className="onboard-about-card" onSubmit={handleSubmit} noValidate>
              <div className="onboard-about-header">
                <div>
                  <h2 className="onboard-about-title">Children Information</h2>
                  <p className="onboard-about-subtitle">Please provide information about your children.</p>
                </div>
              </div>

              <InfoPanel description={`You can add up to ${MAX_CHILDREN} children.`} />

              <h3 className="onboard-section-heading">Children</h3>

              {children.map((child, index) => (
                <div className="onboard-child-card" key={child.id}>
                  <div className="onboard-child-card-header">
                    <h4 className="onboard-child-card-title">Child {index + 1}</h4>
                    <button
                      type="button"
                      className="onboard-child-remove-button"
                      onClick={() => handleRemoveChild(child.id)}
                      aria-label={`Remove Child ${index + 1}`}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                    </button>
                  </div>

                  <div className="onboard-form-grid">
                    <SelectField
                      standalone
                      id={`child-${child.id}-salutation`}
                      label="Salutation"
                      placeholder="-- Select --"
                      value={child.salutation}
                      onChange={handleChildChange(child.id, 'salutation')}
                      options={SALUTATION_OPTIONS}
                    />
                    <SelectField
                      standalone
                      id={`child-${child.id}-gender`}
                      label="Gender"
                      placeholder="--None--"
                      value={child.gender}
                      onChange={handleChildChange(child.id, 'gender')}
                      options={GENDER_SELECT_OPTIONS}
                    />
                  </div>

                  <div className="onboard-form-grid">
                    <FormField
                      id={`child-${child.id}-firstName`}
                      label="First Name"
                      required
                      placeholder="First Name"
                      value={child.firstName}
                      onChange={handleChildChange(child.id, 'firstName', isValidPersonName)}
                      error={errors[child.id]?.firstName}
                    />
                    <FormField
                      id={`child-${child.id}-lastName`}
                      label="Last Name"
                      required
                      placeholder="Last Name"
                      value={child.lastName}
                      onChange={handleChildChange(child.id, 'lastName', isValidPersonName)}
                      error={errors[child.id]?.lastName}
                    />
                  </div>
                </div>
              ))}

              <div className="onboard-add-child-row">
                <AddItemButton
                  onClick={handleAddChild}
                  disabled={filledCount >= MAX_CHILDREN || isSubmitting}
                >
                  Add Child
                </AddItemButton>
                <span className="onboard-add-child-count">
                  {filledCount} of {MAX_CHILDREN} children added
                </span>
              </div>

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
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
