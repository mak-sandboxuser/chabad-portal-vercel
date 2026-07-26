import { Check, ArrowRight } from 'lucide-react';
import { onboardingSteps } from '../data/onboardingSteps';

function stepStatus(stepId, currentStepId) {
  if (stepId === currentStepId) return 'active';
  if (stepId < currentStepId) return 'completed';
  return 'upcoming';
}

export default function OnboardStepper({ currentStepId }) {
  return (
    <nav className="onboard-stepper" aria-label="Onboarding progress">
      {/* role="list" (not a real <ol>) so a decorative connector can sit
          between each step without violating <ol>'s li-only content model. */}
      <div className="onboard-stepper-list" role="list">
        {onboardingSteps.map((step, index) => {
          const status = stepStatus(step.id, currentStepId);
          // The very first step doubles as the flow's entry point, so when
          // it's active it keeps the gold "Start Here" treatment; every
          // later active step uses the standard solid-navy active look.
          const isStartStep = status === 'active' && step.id === onboardingSteps[0].id;
          const reached = step.id <= currentStepId;
          const StepIcon = step.icon;

          return (
            <div className="onboard-stepper-row" key={step.key}>
              {index > 0 && (
                <span
                  className={`onboard-stepper-connector ${reached ? 'onboard-stepper-connector-reached' : ''}`}
                  aria-hidden="true"
                >
                  <ArrowRight size={14} />
                </span>
              )}
              <div
                role="listitem"
                className={`onboard-stepper-item onboard-stepper-item-${status} ${isStartStep ? 'onboard-stepper-item-start' : ''}`}
                aria-current={status === 'active' ? 'step' : undefined}
              >
                <span className="onboard-stepper-icon-circle">
                  {status === 'completed' ? (
                    <Check size={17} strokeWidth={2.5} aria-hidden="true" />
                  ) : (
                    <StepIcon size={17} strokeWidth={1.75} aria-hidden="true" />
                  )}
                  <span className="onboard-stepper-badge" aria-hidden="true">{step.id}</span>
                </span>
                {isStartStep && <span className="onboard-stepper-tag">Start Here</span>}
                <span className="onboard-stepper-label">{step.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
