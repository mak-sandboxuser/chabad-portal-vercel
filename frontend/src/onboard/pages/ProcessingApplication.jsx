import { useEffect, useState } from 'react';
import { LoaderCircle, User, Home, Users, CreditCard, Check } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { PROCESSING_STEP_ID } from '../data/onboardingSteps';
import { ONBOARD_CONFIRMATION_PATH, goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

const THIS_STEP_ID = PROCESSING_STEP_ID;
const STEP_DELAY_MS = 900;
const REDIRECT_DELAY_MS = 700;

const PROCESSING_STEPS = [
  {
    id: 'membership',
    title: 'Creating Membership',
    description: 'Setting up your membership in our system...',
    icon: User,
  },
  {
    id: 'household',
    title: 'Creating Household',
    description: 'Creating your household record...',
    icon: Home,
  },
  {
    id: 'contacts',
    title: 'Creating Contacts',
    description: 'Saving member and family contacts...',
    icon: Users,
  },
  {
    id: 'stripe',
    title: 'Creating Stripe Customer',
    description: 'Setting up your payment profile securely...',
    glyph: 'stripe',
  },
  {
    id: 'subscription',
    title: 'Creating Subscription',
    description: 'Activating your membership subscription...',
    icon: CreditCard,
  },
];

export default function ProcessingApplication() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { updateDraft } = useOnboardingDraft();
  const [completedCount, setCompletedCount] = useState(0);

  // Mark this step reached once, on mount.
  useEffect(() => {
    updateDraft((prev) => ({ ...prev, currentStep: THIS_STEP_ID }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulate the backend provisioning steps completing one at a time. Timer
  // ids are collected and cleared on cleanup so React Strict Mode's
  // mount→unmount→mount dev cycle can't schedule the sequence twice.
  useEffect(() => {
    const timers = PROCESSING_STEPS.map((_, index) =>
      setTimeout(() => setCompletedCount(index + 1), (index + 1) * STEP_DELAY_MS)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (completedCount < PROCESSING_STEPS.length) return undefined;
    const timer = setTimeout(() => {
      goToOnboardingPath(ONBOARD_CONFIRMATION_PATH);
    }, REDIRECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [completedCount]);

  const progressPercent = Math.round((completedCount / PROCESSING_STEPS.length) * 100);

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="onboard-about-page">
        <div className="onboard-about-watermark" aria-hidden="true" />

        <OnboardHeader theme={theme} onToggleTheme={toggleTheme} />

        <OnboardStepper currentStepId={THIS_STEP_ID} />

        <main>
          <div className="onboard-about-card">
            <div className="onboard-processing-hero">
              <span className="onboard-processing-spinner-badge" aria-hidden="true">
                <LoaderCircle size={40} strokeWidth={2} />
              </span>
              <h2 className="onboard-processing-title">Your application is being processed</h2>
              <p className="onboard-processing-subtitle">
                Please wait while we create your membership. This may take a few moments.
              </p>
            </div>

            <ol className="onboard-processing-list" aria-live="polite">
              {PROCESSING_STEPS.map((step, index) => {
                const isDone = index < completedCount;
                const isLast = index === PROCESSING_STEPS.length - 1;
                const StepIcon = step.icon;

                return (
                  <li key={step.id} className="onboard-processing-item">
                    <span className="onboard-processing-timeline" aria-hidden="true">
                      <span className={`onboard-processing-dot ${isDone ? '' : 'onboard-processing-dot-pending'}`}>
                        {isDone && <Check size={16} strokeWidth={3} />}
                      </span>
                      {!isLast && (
                        <span className={`onboard-processing-line ${isDone ? '' : 'onboard-processing-line-pending'}`} />
                      )}
                    </span>

                    <span className="onboard-processing-icon" aria-hidden="true">
                      {step.glyph ? (
                        <span className="onboard-processing-icon-glyph">{step.glyph}</span>
                      ) : (
                        <StepIcon size={22} strokeWidth={1.75} />
                      )}
                    </span>

                    <span className="onboard-processing-copy">
                      <span className="onboard-processing-item-title">{step.title}</span>
                      <span className="onboard-processing-item-description">{step.description}</span>
                    </span>

                    {isDone && (
                      <span className="onboard-processing-status" aria-label="Completed">
                        <Check size={16} strokeWidth={3} />
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            <div
              className="onboard-processing-progress-track"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div className="onboard-processing-progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="onboard-processing-progress-label">
              {completedCount} of {PROCESSING_STEPS.length} completed
            </p>
          </div>
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
