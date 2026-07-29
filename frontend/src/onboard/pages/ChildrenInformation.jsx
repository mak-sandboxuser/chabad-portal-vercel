import { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
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
  CHILDREN_STEP_ID,
  MARITAL_INFORMATION_STEP_ID,
  YAHRZEIT_STEP_ID,
} from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import { isBlank, validateDateString } from '../utils/onboardingValidation';
import '../onboard.css';

const THIS_STEP_ID = CHILDREN_STEP_ID;
const PREVIOUS_STEP_ID = MARITAL_INFORMATION_STEP_ID;
const NEXT_STEP_ID = YAHRZEIT_STEP_ID;
const MAX_CHILDREN = 5;
const CHILD_BIRTH_DATE_LABEL = "child's birth date";

function createChildId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `child-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function validateChildren(children) {
  const errors = {};

  children.forEach((child) => {
    const childErrors = {};
    if (isBlank(child.name)) {
      childErrors.name = "Enter this child's name.";
    }
    const dateError = validateDateString(child.birthDate, CHILD_BIRTH_DATE_LABEL);
    if (dateError) childErrors.birthDate = dateError;

    if (Object.keys(childErrors).length > 0) {
      errors[child.id] = childErrors;
    }
  });

  return errors;
}

export default function ChildrenInformation() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const children = draft.data.children || [];

  const updateChildren = (nextChildren) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, children: nextChildren },
    }));
  };

  const handleAddChild = () => {
    if (children.length >= MAX_CHILDREN) return;
    updateChildren([...children, { id: createChildId(), name: '', birthDate: '' }]);
  };

  const handleRemoveChild = (id) => {
    const child = children.find((c) => c.id === id);
    const hasData = child && (!isBlank(child.name) || !isBlank(child.birthDate));
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

  const handleChildNameChange = (id) => (event) => {
    const value = event.target.value;
    updateChildren(children.map((c) => (c.id === id ? { ...c, name: value } : c)));

    setErrors((prev) => {
      if (!prev[id]?.name || isBlank(value)) return prev;
      const nextChildErrors = { ...prev[id] };
      delete nextChildErrors.name;
      const next = { ...prev, [id]: nextChildErrors };
      if (Object.keys(nextChildErrors).length === 0) delete next[id];
      return next;
    });
  };

  const handleChildBirthDateChange = (id) => (value) => {
    updateChildren(children.map((c) => (c.id === id ? { ...c, birthDate: value } : c)));

    setErrors((prev) => {
      if (!prev[id]?.birthDate || validateDateString(value, CHILD_BIRTH_DATE_LABEL)) return prev;
      const nextChildErrors = { ...prev[id] };
      delete nextChildErrors.birthDate;
      const next = { ...prev, [id]: nextChildErrors };
      if (Object.keys(nextChildErrors).length === 0) delete next[id];
      return next;
    });
  };

  const handleBack = () => {
    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
      data: { ...draft.data, children },
    });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const nextErrors = validateChildren(children);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidChild = children.find((c) => nextErrors[c.id]);
      if (firstInvalidChild) {
        const field = nextErrors[firstInvalidChild.id].name ? 'name' : 'birthDate';
        document.getElementById(`child-${firstInvalidChild.id}-${field}`)?.focus();
      }
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
      data: { ...draft.data, children },
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
                  <FormField
                    id={`child-${child.id}-name`}
                    label="Child Name"
                    required
                    placeholder="Child Name"
                    value={child.name}
                    onChange={handleChildNameChange(child.id)}
                    error={errors[child.id]?.name}
                  />
                  <DateField
                    id={`child-${child.id}-birthDate`}
                    label="Birth Date"
                    required
                    value={child.birthDate}
                    onChange={handleChildBirthDateChange(child.id)}
                    error={errors[child.id]?.birthDate}
                  />
                </div>
              </div>
            ))}

            <div className="onboard-add-child-row">
              <AddItemButton onClick={handleAddChild} disabled={children.length >= MAX_CHILDREN}>
                Add Child
              </AddItemButton>
              <span className="onboard-add-child-count">
                {children.length} of {MAX_CHILDREN} children added
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
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
