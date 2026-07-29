import { Check } from 'lucide-react';
import { stepperSteps as defaultStepperSteps, getStepById } from '../data/onboardingSteps';
import { getPreferenceDrivenStepIds, getHouseholdPreferences } from '../utils/householdPreferences';

function stepStatus(stepId, currentStepId) {
  if (stepId === currentStepId) return 'active';
  if (stepId < currentStepId) return 'completed';
  return 'upcoming';
}

/**
 * About You–style horizontal stepper. When draft preferences are provided,
 * Spouse / Children / Yahrzeit only appear when their Yes toggle is on.
 */
export default function OnboardStepper({ currentStepId, draft }) {
  const prefs = draft ? getHouseholdPreferences(draft) : null;
  const steps = prefs
    ? getPreferenceDrivenStepIds(prefs).map((id) => getStepById(id)).filter(Boolean)
    : defaultStepperSteps;

  return (
    <nav className="onboard-stepper" aria-label="Onboarding progress">
      <div className="onboard-stepper-list" role="list">
        {steps.map((step, index) => {
          const status = stepStatus(step.id, currentStepId);
          const StepIcon = step.icon;
          const displayNumber = index + 1;

          return (
            <div
              key={step.key}
              role="listitem"
              className={`onboard-stepper-item onboard-stepper-item-${status}`}
              aria-current={status === 'active' ? 'step' : undefined}
            >
              <span className="onboard-stepper-icon-circle">
                {status === 'completed' ? (
                  <Check size={17} strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <StepIcon size={17} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className="onboard-stepper-badge" aria-hidden="true">{displayNumber}</span>
              </span>
              <span className="onboard-stepper-label">{step.label}</span>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
