import { ArrowRight, Check, Headphones, IdCard, ShieldCheck, User, Users } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import { SUPPORT_EMAIL } from '../../constants/supportContact';
import { ONBOARD_EXIT_PATH, goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

export const ONBOARD_SUCCESS_PATH = '/onboard/success';

const NEXT_STEPS = [
  {
    number: 1,
    title: 'Complete Your Information',
    description:
      "Tell us about yourself and your household. We'll need your personal details, spouse information, and basic household information.",
    icon: User,
  },
  {
    number: 2,
    title: 'Tell Us About Your Family',
    description:
      'Add details about your children, Yahrzeits, and any additional information that helps us serve you better.',
    icon: Users,
  },
  {
    number: 3,
    title: 'Choose Your Membership Plan',
    description:
      "Select the membership plan that's right for you and review the contribution schedule.",
    icon: IdCard,
  },
  {
    number: 4,
    title: 'Complete Your Payment',
    description:
      'Securely complete your payment. Once done, your membership will be activated.',
    icon: ShieldCheck,
  },
];

export default function OnboardingSuccess() {
  const [theme, toggleTheme] = useOnboardingTheme();

  const handleLoginClick = () => {
    goToOnboardingPath(ONBOARD_EXIT_PATH);
  };

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="onboard-success-page">
        <OnboardHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          showContactSupport
          logoVariant="full"
          logoSize={64}
        />

        <main className="onboard-success-main">
          <div className="onboard-success-layout">
            <section className="onboard-success-hero">
              <div className="onboard-success-hero-bg" aria-hidden="true" />

              <div className="onboard-success-check" aria-hidden="true">
                <span className="onboard-success-check-ring onboard-success-check-ring--outer" />
                <span className="onboard-success-check-ring onboard-success-check-ring--inner" />
                <span className="onboard-success-check-badge">
                  <Check size={28} strokeWidth={2.75} />
                </span>
                <span className="onboard-success-spark onboard-success-spark-1" />
                <span className="onboard-success-spark onboard-success-spark-2" />
                <span className="onboard-success-spark onboard-success-spark-3" />
              </div>

              <h1 className="onboard-success-title">
                You&apos;re successfully
                <br />
                onboarded!
              </h1>

              <div className="onboard-success-divider" aria-hidden="true" />

              <p className="onboard-success-welcome">
                Welcome to the family of Chabad Bedford.
                <br />
                We are grateful to have you with us.
              </p>

              <p className="onboard-success-lead">
                Your account has been created successfully.
                <br />
                Let&apos;s take the next steps together.
              </p>
            </section>

            <section className="onboard-success-card" aria-labelledby="onboard-success-next-heading">
              <h2 id="onboard-success-next-heading" className="onboard-success-card-title">
                Here&apos;s what happens next
              </h2>

              <ol className="onboard-success-steps">
                {NEXT_STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isLast = index === NEXT_STEPS.length - 1;
                  return (
                    <li key={step.number} className="onboard-success-step">
                      <span className="onboard-success-step-icon" aria-hidden="true">
                        <StepIcon size={18} strokeWidth={1.75} />
                      </span>

                      <span className="onboard-success-step-timeline" aria-hidden="true">
                        <span className="onboard-success-step-number">{step.number}</span>
                        {!isLast && <span className="onboard-success-step-line" />}
                      </span>

                      <span className="onboard-success-step-copy">
                        <span className="onboard-success-step-title">{step.title}</span>
                        <span className="onboard-success-step-description">{step.description}</span>
                      </span>
                    </li>
                  );
                })}
              </ol>

              <div className="onboard-success-cta">
                <p className="onboard-success-cta-label">✦ Next Step</p>
                <p className="onboard-success-cta-text">
                  You will be redirected to the login page. Please log in using the same email address
                  to access your dashboard and complete the above steps.
                </p>
                <button type="button" className="onboard-success-login-btn" onClick={handleLoginClick}>
                  Login to Member Portal
                  <ArrowRight size={18} aria-hidden="true" />
                </button>
              </div>
            </section>
          </div>

          <footer className="onboard-success-footer">
            <Headphones size={16} aria-hidden="true" />
            <span>Need help getting started? We&apos;re here for you.</span>
            <a href={`mailto:${SUPPORT_EMAIL}`}>
              Contact Support
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
