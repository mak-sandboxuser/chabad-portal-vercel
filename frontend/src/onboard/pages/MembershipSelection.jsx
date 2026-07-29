import { useState } from 'react';
import { Users, Heart, ArrowLeft } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  MEMBERSHIP_STEP_ID,
  YAHRZEIT_STEP_ID,
  CONTRIBUTION_SCHEDULE_STEP_ID,
} from '../data/onboardingSteps';
import { GENERAL_TIERS, CHAI_TIERS, formatCurrency } from '../data/membershipTiers';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import '../onboard.css';

const THIS_STEP_ID = MEMBERSHIP_STEP_ID;
const PREVIOUS_STEP_ID = YAHRZEIT_STEP_ID;
const NEXT_STEP_ID = CONTRIBUTION_SCHEDULE_STEP_ID;

function TierRow({ tier, selected, onChange }) {
  const Icon = tier.icon;
  const monthlyAmount = Math.floor(tier.annualPrice / 12);
  const monthly = tier.isOpenEnded
    ? tier.tagline
    : `$${formatCurrency(monthlyAmount)} / month`;

  return (
    <label className={`onboard-tier-row onboard-tier-accent-${tier.accent}`} htmlFor={`tier-${tier.id}`}>
      <span className="onboard-radio-dot-wrap">
        <input
          type="radio"
          id={`tier-${tier.id}`}
          name="membershipTier"
          className="onboard-radio-input"
          checked={selected}
          onChange={() => onChange(tier.id)}
        />
        <span className="onboard-radio-dot" aria-hidden="true" />
      </span>

      <span className="onboard-tier-icon" aria-hidden="true">
        {tier.glyph ? <span className="onboard-tier-icon-glyph">{tier.glyph}</span> : <Icon size={20} strokeWidth={1.75} />}
      </span>

      <span className="onboard-tier-copy">
        <span className="onboard-tier-name">{tier.name}</span>
        <span className="onboard-tier-description">{tier.description}</span>
      </span>

      <span className="onboard-tier-price-block">
        <span className="onboard-tier-price">
          ${formatCurrency(tier.annualPrice)}
          {tier.isOpenEnded ? '+' : ''} <span className="onboard-tier-period">/ year</span>
        </span>
        <span className="onboard-tier-monthly">{monthly}</span>
      </span>
    </label>
  );
}

export default function MembershipSelection() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedTier = draft.data.membership?.tier || '';

  const handleSelectTier = (tierId) => {
    updateDraft((prev) => ({
      ...prev,
      currentStep: THIS_STEP_ID,
      data: { ...prev.data, membership: { ...prev.data.membership, tier: tierId } },
    }));
    if (error) setError('');
  };

  const handleBack = () => {
    persistNow({
      ...draft,
      currentStep: PREVIOUS_STEP_ID,
    });
    goToOnboardingPath(getStepById(PREVIOUS_STEP_ID).path);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (!selectedTier) {
      setError('Please select a membership option to continue.');
      return;
    }

    setIsSubmitting(true);
    persistNow({
      ...draft,
      currentStep: NEXT_STEP_ID,
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
                <h2 className="onboard-about-title">Membership Selection</h2>
                <p className="onboard-about-subtitle">
                  Please choose the membership type that best fits you and your family.
                </p>
              </div>
            </div>

            <div className="onboard-tier-section" role="radiogroup" aria-label="General Membership options">
              <div className="onboard-tier-section-header onboard-tier-section-header-blue">
                <span className="onboard-tier-section-header-icon" aria-hidden="true">
                  <Users size={20} strokeWidth={1.75} />
                </span>
                <span>
                  <p className="onboard-tier-section-header-title">A. General Membership</p>
                  <p className="onboard-tier-section-header-description">
                    Our general membership options are designed to meet the needs of individuals and
                    families at every stage.
                  </p>
                </span>
              </div>

              {GENERAL_TIERS.map((tier) => (
                <TierRow key={tier.id} tier={tier} selected={selectedTier === tier.id} onChange={handleSelectTier} />
              ))}
            </div>

            <div className="onboard-tier-section" role="radiogroup" aria-label="Chai Society Membership options">
              <div className="onboard-tier-section-header onboard-tier-section-header-gold">
                <span className="onboard-tier-section-header-icon onboard-tier-section-header-icon-gold" aria-hidden="true">
                  <Heart size={20} strokeWidth={1.75} />
                </span>
                <span>
                  <p className="onboard-tier-section-header-title">B. Chai Society Membership</p>
                  <p className="onboard-tier-section-header-description">
                    Join our Chai Society and make a lasting impact on Jewish life in our community.
                  </p>
                </span>
              </div>

              {CHAI_TIERS.map((tier) => (
                <TierRow key={tier.id} tier={tier} selected={selectedTier === tier.id} onChange={handleSelectTier} />
              ))}
            </div>

            {error && (
              <p className="onboard-error-message onboard-tier-error" role="alert">
                {error}
              </p>
            )}

            <div className="onboard-form-actions">
              <SecondaryButton variant="navy" icon={ArrowLeft} onClick={handleBack}>
                Back
              </SecondaryButton>
              <PrimaryButton type="submit" loading={isSubmitting}>
                Select Membership
              </PrimaryButton>
            </div>
          </form>
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
