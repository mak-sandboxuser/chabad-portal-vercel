import { useState, useEffect } from 'react';
import { Users, Heart, ArrowLeft, LogOut } from 'lucide-react';
import { fetchPortalApi } from '../../utils/portalApi';
import { showToast } from '../../utils/toast';
import OnboardHeader from '../components/OnboardHeader';
import OnboardStepper from '../components/OnboardStepper';
import OnboardFooter from '../components/OnboardFooter';
import KnowYouBetterPanel from '../components/KnowYouBetterPanel';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import useOnboardingDraft from '../hooks/useOnboardingDraft';
import {
  getStepById,
  MEMBERSHIP_STEP_ID,
  CONTRIBUTION_SCHEDULE_STEP_ID,
} from '../data/onboardingSteps';
import { GENERAL_TIERS, CHAI_TIERS, formatCurrency } from '../data/membershipTiers';
import { goToOnboardingPath } from '../utils/onboardingRoutes';
import {
  getHouseholdPreferences,
  getNextPreferenceStepId,
  getPreviousPreferenceStepId,
  isFirstPreferenceStep,
} from '../utils/householdPreferences';
import { signOutFromOnboarding, isPostLoginStepperPending, dismissPostLoginStepperPending } from '../utils/postLoginStepper';
import '../onboard.css';

const THIS_STEP_ID = MEMBERSHIP_STEP_ID;

function TierRow({ tier, selected, onSelect, isSubmitting }) {
  const Icon = tier.icon;
  const monthlyAmount = Math.floor(tier.annualPrice / 12);
  const monthly = tier.isOpenEnded
    ? tier.tagline
    : `$${formatCurrency(monthlyAmount)} / month`;

  return (
    <div
      className={`onboard-tier-row onboard-tier-accent-${tier.accent}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px',
        borderRadius: '12px',
        border: selected ? '2px solid #c4841f' : '1px solid var(--onboard-border)',
        background: selected ? 'rgba(196, 132, 31, 0.05)' : 'var(--onboard-card-bg)',
        cursor: isSubmitting ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s ease',
        marginBottom: '12px',
      }}
      onClick={() => {
        if (!isSubmitting) onSelect(tier);
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
        <span className="onboard-tier-icon" aria-hidden="true" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(196, 132, 31, 0.1)', color: '#c4841f' }}>
          {tier.glyph ? <span className="onboard-tier-icon-glyph" style={{ fontSize: '16px', fontWeight: '800' }}>{tier.glyph}</span> : <Icon size={20} strokeWidth={1.75} />}
        </span>

        <span className="onboard-tier-copy" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span className="onboard-tier-name" style={{ fontSize: '15px', fontWeight: '700', color: 'var(--onboard-navy)' }}>{tier.name}</span>
          <span className="onboard-tier-description" style={{ fontSize: '12px', color: 'var(--onboard-text-secondary)', lineHeight: '1.4' }}>{tier.description}</span>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <span className="onboard-tier-price-block" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
          <span className="onboard-tier-price" style={{ fontSize: '16px', fontWeight: '800', color: 'var(--onboard-navy)' }}>
            ${formatCurrency(tier.annualPrice)}
            {tier.isOpenEnded ? '+' : ''} <span className="onboard-tier-period" style={{ fontSize: '11px', fontWeight: '500', color: 'var(--onboard-text-secondary)' }}>/ year</span>
          </span>
          <span className="onboard-tier-monthly" style={{ fontSize: '11px', color: '#c4841f', fontWeight: '600' }}>{monthly}</span>
        </span>

        <button
          type="button"
          className="onboard-tier-select-btn"
          disabled={isSubmitting}
          style={{
            padding: '8px 16px',
            background: '#c4841f',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontWeight: '700',
            fontSize: '13px',
            cursor: isSubmitting ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
        >
          Select & Pay
        </button>
      </div>
    </div>
  );
}

export default function MembershipSelection() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const { draft, updateDraft, persistNow } = useOnboardingDraft();
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const prefs = getHouseholdPreferences(draft);
  const isFirstForm = isFirstPreferenceStep(THIS_STEP_ID, prefs);
  const selectedTier = draft.data.membership?.tier || '';
  const isPaid = draft.data.membership?.isPaid || false;

  const query = new URLSearchParams(window.location.search);
  const paymentStatus = query.get('payment');
  const sessionId = query.get('session_id');

  useEffect(() => {
    if (query.get('payment') === 'cancel') {
      showToast({ message: 'Stripe checkout cancelled. Please select a membership option and try again.', type: 'warning' });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (paymentStatus === 'success' && sessionId) {
      // Stripe now returns to /payment-success; keep a safety redirect if an
      // old success URL still lands on this page.
      const next = new URLSearchParams({ payment: 'success', session_id: sessionId });
      window.location.replace(`/payment-success?${next.toString()}`);
    }
  }, [paymentStatus, sessionId]);

  if (paymentStatus === 'success') {
    return (
      <div className="verify-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '16px' }}>
        <div className="spinner"></div>
        <p style={{ color: 'var(--text-secondary)', fontSize: '16px', fontWeight: '500' }}>
          Confirming payment & updating membership...
        </p>
      </div>
    );
  }

  const handleSelectTier = async (tier) => {
    setIsSubmitting(true);
    setError('');

    try {
      persistNow({
        ...draft,
        currentStep: CONTRIBUTION_SCHEDULE_STEP_ID,
        data: {
          ...draft.data,
          membership: {
            ...draft.data.membership,
            tier: tier.id,
          },
        },
      });

      goToOnboardingPath(getStepById(CONTRIBUTION_SCHEDULE_STEP_ID).path);
    } catch (err) {
      setError(err.message || 'Failed to update selected membership tier.');
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    if (isPostLoginStepperPending() || new URLSearchParams(window.location.search).get('mode') === 'renew') {
      dismissPostLoginStepperPending();
      try {
        sessionStorage.removeItem('is_portal_renewal_mode');
      } catch {
        // ignore
      }
      window.location.replace('/');
      return;
    }
    if (isFirstForm) {
      signOutFromOnboarding();
      return;
    }
    const previousStepId = getPreviousPreferenceStepId(THIS_STEP_ID, prefs);
    persistNow({
      ...draft,
      currentStep: previousStepId,
    });
    goToOnboardingPath(getStepById(previousStepId).path);
  };

  const handleContinuePaid = () => {
    sessionStorage.setItem('show_onboarding_complete', 'true');
    window.location.replace('/');
  };

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="onboard-about-page">
        <div className="onboard-about-watermark" aria-hidden="true" />

        <OnboardHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          title={isPostLoginStepperPending() ? "Membership Renewal" : "Membership Onboarding"}
          subtitle={isPostLoginStepperPending() ? "Select your membership tier to renew your account." : "Join our community in a few simple steps."}
        />

        <OnboardStepper currentStepId={THIS_STEP_ID} draft={draft} />

        <KnowYouBetterPanel
          draft={draft}
          updateDraft={updateDraft}
          persistNow={persistNow}
          currentStepId={THIS_STEP_ID}
        />

        <main>
          {isPaid ? (
            <div className="onboard-about-card">
              <div className="onboard-about-header">
                <div>
                  <h2 className="onboard-about-title">Membership Selection</h2>
                  <p className="onboard-about-subtitle">Your membership has been successfully set up.</p>
                </div>
              </div>

              <div className="onboard-search-selected-card" style={{ marginBottom: '32px' }}>
                <div className="onboard-selected-meta">
                  <span className="onboard-selected-tag">Paid Membership</span>
                  <div className="onboard-selected-name">
                    {GENERAL_TIERS.find((t) => t.id === selectedTier)?.name || CHAI_TIERS.find((t) => t.id === selectedTier)?.name || selectedTier}
                  </div>
                  <div className="onboard-selected-details">
                    Status: Completed & Synced to Salesforce
                  </div>
                </div>
              </div>

              <div className="onboard-form-actions">
                <SecondaryButton
                  variant="navy"
                  icon={isPostLoginStepperPending() ? ArrowLeft : (isFirstForm ? LogOut : ArrowLeft)}
                  onClick={handleBack}
                >
                  {isPostLoginStepperPending() ? 'Back to Portal' : (isFirstForm ? 'Sign Out' : 'Back')}
                </SecondaryButton>
                <PrimaryButton onClick={handleContinuePaid}>
                  Continue
                </PrimaryButton>
              </div>
            </div>
          ) : (
            <div className="onboard-about-card">
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
                  <TierRow key={tier.id} tier={tier} selected={selectedTier === tier.id} onSelect={handleSelectTier} isSubmitting={isSubmitting} />
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
                  <TierRow key={tier.id} tier={tier} selected={selectedTier === tier.id} onSelect={handleSelectTier} isSubmitting={isSubmitting} />
                ))}
              </div>

              {error && (
                <p className="onboard-error-message onboard-tier-error" role="alert">
                  {error}
                </p>
              )}

              <div className="onboard-form-actions">
                <SecondaryButton
                  variant="navy"
                  icon={isPostLoginStepperPending() ? ArrowLeft : (isFirstForm ? LogOut : ArrowLeft)}
                  onClick={handleBack}
                >
                  {isPostLoginStepperPending() ? 'Back to Portal' : (isFirstForm ? 'Sign Out' : 'Back')}
                </SecondaryButton>
              </div>
            </div>
          )}
        </main>

        <OnboardFooter securityNote="Your information is secure and will only be used for membership purposes." />
      </div>
    </div>
  );
}
