import { useId, useMemo } from 'react';
import {
  Heart,
  Clock,
  ShieldCheck,
  Users,
  IdCard,
  Flame,
  Package,
  Tag,
  ShoppingBasket,
  Wheat,
  HandHeart,
  UsersRound,
  ArrowRight,
} from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import PrimaryButton from '../components/PrimaryButton';
import SecurityNotice from '../components/SecurityNotice';
import MenorahIcon from '../components/icons/MenorahIcon';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import { getStepById, ABOUT_YOU_STEP_ID } from '../data/onboardingSteps';
import { ONBOARD_FIRST_FORM_PATH, LATEST_IMPLEMENTED_STEP_ID, goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

const MEMBERSHIP_BENEFITS = [
  { icon: Users, label: 'High Holiday Seats for immediate family members' },
  { icon: IdCard, label: 'Membership Directory Listing' },
  { icon: Flame, label: 'Yizkor Booklet listings' },
  { icon: Package, label: 'Shmurah Matzah for Passover' },
  { icon: Tag, label: 'Discounts on events & programs' },
  { icon: MenorahIcon, label: 'Menorah & Candles kit mailed to college age children' },
  { icon: ShoppingBasket, label: 'Purim Basket delivered to your home' },
  { icon: Wheat, label: 'Lulav & Etrog set for Sukkot' },
  { icon: HandHeart, label: 'Shiva services after the loss of a loved one' },
  { icon: UsersRound, label: 'Belonging to an amazing community & lifelong friendships' },
];

// Marketing preview of the flow shown on the welcome page. It intentionally
// uses simplified copy, distinct from the detailed step labels in
// onboardingSteps.js, matching the reference screenshot.
const APPLICATION_PROCESS_PREVIEW = [
  { number: 1, label: 'Household Information' },
  { number: 2, label: 'Membership Selection' },
  { number: 3, label: 'Family Details' },
  { number: 4, label: 'Contribution Setup' },
  { number: 5, label: 'Review & Submit' },
];

export default function MembershipWelcome() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, hasSavedDraft, persistNow } = useOnboardingDraft();
  const benefitsHeadingId = useId();
  const processHeadingId = useId();

  const resumePath = useMemo(() => {
    if (!hasSavedDraft) return ONBOARD_FIRST_FORM_PATH;
    // Clamp between the first real form step and the latest step that
    // actually has a page built. The lower bound matters because Welcome
    // itself is step 1 in the numbering — without it, a draft that never
    // got past Welcome (currentStep still at its default of 1) would
    // "resume" right back to this same page, a dead loop.
    const targetStepId = Math.min(
      Math.max(draft.currentStep, ABOUT_YOU_STEP_ID),
      LATEST_IMPLEMENTED_STEP_ID,
    );
    return getStepById(targetStepId)?.path || ONBOARD_FIRST_FORM_PATH;
  }, [hasSavedDraft, draft.currentStep]);

  const handleBeginClick = () => {
    if (hasSavedDraft) {
      persistNow(draft);
      goToOnboardingPath(resumePath);
      return;
    }

    // Don't persist anything here: writing the untouched default draft
    // (currentStep still 1) immediately flips hasSavedDraft to true for
    // someone who hasn't entered a single field yet, which caused the
    // Welcome-page dead loop described above. The About You page creates
    // and saves its own draft as soon as the applicant actually types.
    goToOnboardingPath(ONBOARD_FIRST_FORM_PATH);
  };

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="onboard-welcome">
        <div className="onboard-hero-photo" role="img" aria-label="Community gathering at Chabad of Bedford">
          <div className="onboard-hero-photo-building" aria-hidden="true" />
          <div className="onboard-hero-photo-lights" aria-hidden="true" />
        </div>

        <OnboardHeader theme={theme} onToggleTheme={toggleTheme} />

        <main className="onboard-welcome-main">
          <section className="onboard-hero">
            <div className="onboard-hero-copy">
              <span className="onboard-hero-badge">
                <Heart size={14} aria-hidden="true" />
                We&apos;d love your family to join our family
              </span>

              <h1 className="onboard-hero-title">
                We&apos;d Love Your Family
                <br />
                To Join Our Family
              </h1>

              <p className="onboard-hero-text">
                Chabad of Bedford is a thriving Jewish community. We welcome you to join our{' '}
                <strong>MEMBERSHIP FAMILY</strong> and become part of our wonderful community.
              </p>
              <p className="onboard-hero-text">
                Today, more than ever, Jewish people need to stand together, support each other, and
                support our community. Joining Chabad will help guarantee the strength of your family
                and that of our community.
              </p>

              <span className="onboard-hero-time-badge">
                <Clock size={16} aria-hidden="true" />
                Estimated time to complete: <strong>3&ndash;5 minutes</strong>
              </span>
            </div>
          </section>

          <section className="onboard-panel">
            <div className="onboard-panel-columns">
              <div className="onboard-panel-column" aria-labelledby={benefitsHeadingId}>
                <h2 id={benefitsHeadingId} className="onboard-panel-heading">
                  Membership Benefits
                </h2>

                <ul className="onboard-benefits-grid">
                  {MEMBERSHIP_BENEFITS.map((benefit) => (
                    <li key={benefit.label} className="onboard-benefit-item">
                      <span className="onboard-benefit-icon" aria-hidden="true">
                        <benefit.icon size={22} strokeWidth={1.75} />
                      </span>
                      <span className="onboard-benefit-label">{benefit.label}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="onboard-panel-divider" aria-hidden="true" />

              <div className="onboard-panel-column" aria-labelledby={processHeadingId}>
                <h2 id={processHeadingId} className="onboard-panel-heading">
                  Application Process
                </h2>

                <ol className="onboard-process-steps">
                  {APPLICATION_PROCESS_PREVIEW.map((step) => (
                    <li key={step.number} className="onboard-process-step">
                      <span className="onboard-process-step-circle">{step.number}</span>
                      {step.number === 1 && <span className="onboard-process-step-tag">Start Here</span>}
                      <span className="onboard-process-step-label">{step.label}</span>
                    </li>
                  ))}
                </ol>

                <p className="onboard-process-duration">
                  <Clock size={14} aria-hidden="true" />
                  Approx. 3&ndash;5 Minutes
                </p>
              </div>
            </div>

            <div className="onboard-cta-band">
              <SecurityNotice
                className="onboard-cta-security"
                icon={<ShieldCheck size={22} strokeWidth={1.75} aria-hidden="true" />}
                title="Secure Application"
                description="Your information is securely protected and used only for membership administration."
              />

              <div className="onboard-cta-community">
                <span className="onboard-cta-community-icon" aria-hidden="true">
                  <UsersRound size={22} strokeWidth={1.75} />
                </span>
                <p className="onboard-cta-community-text">
                  Join hundreds of members who help sustain Jewish life and community in Bedford.
                </p>
              </div>

              <PrimaryButton onClick={handleBeginClick} className="onboard-cta-button">
                {hasSavedDraft ? 'Continue Application' : 'Begin Membership Application'}
              </PrimaryButton>
            </div>
          </section>

          <footer className="onboard-welcome-footer">
            <span>Questions? We&apos;re here to help.</span>
            <a href="mailto:info@chabadbedford.com" className="onboard-footer-contact">
              Contact Us
              <ArrowRight size={14} aria-hidden="true" />
            </a>
          </footer>
        </main>
      </div>
    </div>
  );
}
