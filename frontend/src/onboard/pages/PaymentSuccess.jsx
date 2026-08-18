import { useEffect, useMemo, useState } from 'react';
import { Check, DoorOpen } from 'lucide-react';
import OnboardHeader from '../components/OnboardHeader';
import useOnboardingTheme from '../hooks/useOnboardingTheme';
import { fetchPortalApi } from '../../utils/portalApi';
import { markSkipPortalFullLoader, storeDashboardPrefetch } from '../../utils/dashboardPrefetch';
import { navigateApp } from '../../utils/navigateApp';
import { readDraft } from '../utils/onboardingCookies';
import { getMembershipTierById } from '../data/membershipTiers';
import { clearPostLoginStepperPending } from '../utils/postLoginStepper';
import { markRecentMembershipPayment } from '../../utils/portalData';
import '../onboard.css';

export const PAYMENT_SUCCESS_PATH = '/payment-success';
export const PENDING_MEMBERSHIP_NAME_KEY = 'pending_paid_membership_name';

const REDIRECT_SECONDS = 10;

function resolveMembershipName() {
  try {
    const stored = sessionStorage.getItem(PENDING_MEMBERSHIP_NAME_KEY);
    if (stored && stored.trim()) return stored.trim();
  } catch {
    // ignore
  }

  try {
    const draft = readDraft();
    const tierId = draft?.data?.membership?.tier;
    const tier = getMembershipTierById(tierId);
    if (tier?.name) return tier.name;
  } catch {
    // ignore
  }

  return 'chosen membership';
}

function Sparkles() {
  const items = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) => ({
        id: index,
        left: `${8 + ((index * 17) % 84)}%`,
        top: `${6 + ((index * 13) % 38)}%`,
        delay: `${(index % 6) * 0.25}s`,
        size: 3 + (index % 4),
      })),
    []
  );

  return (
    <div className="pay-success-sparkles" aria-hidden="true">
      {items.map((item) => (
        <span
          key={item.id}
          className="pay-success-sparkle"
          style={{
            left: item.left,
            top: item.top,
            width: item.size,
            height: item.size,
            animationDelay: item.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function PaymentSuccess() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const [secondsLeft, setSecondsLeft] = useState(REDIRECT_SECONDS);
  const [prefetchReady, setPrefetchReady] = useState(false);
  const membershipName = useMemo(() => resolveMembershipName(), []);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const sessionId = query.get('session_id');
    const payment = query.get('payment');
    let cancelled = false;

    try {
      localStorage.removeItem('pending_post_login_membership_stepper');
      localStorage.setItem('completed_post_login_membership_stepper', '1');
    } catch {
      // ignore
    }
    clearPostLoginStepperPending();

    if (query.toString()) {
      window.history.replaceState({}, '', PAYMENT_SUCCESS_PATH);
    }

    // Prefetch dashboard during countdown so redirect opens dashboard directly
    // (no "Loading your Member Portal..." screen).
    const prefetchTimeout = window.setTimeout(() => {
      if (!cancelled) setPrefetchReady(true);
    }, 8000);

    (async () => {
      let confirmResult = null;
      try {
        if (payment === 'success' && sessionId) {
          confirmResult = await fetchPortalApi('/api/payments/confirm-checkout', {
            method: 'POST',
            body: { sessionId },
          });
        }
      } catch (err) {
        console.warn('Payment confirmation warning:', err);
      }

      // Even if CRM role is still Guest, treat this session as paid so Membership
      // shows member details / payment history instead of "Become a Member".
      try {
        let email = '';
        try {
          const stored = localStorage.getItem('sf_user_session');
          if (stored) email = JSON.parse(stored)?.email || '';
        } catch {
          // ignore
        }

        const draft = readDraft();
        const draftAmount = Number(draft?.data?.contributionSchedule?.amount) || 0;
        const confirmAmount = Number(confirmResult?.paymentAmount) || 0;
        // Prefer the charged installment; never invent a full-year pending payment.
        const amount = confirmAmount > 0 ? confirmAmount : draftAmount;
        const paymentDate = confirmResult?.paymentDate || new Date().toISOString().slice(0, 10);
        const subType = confirmResult?.subType
          || resolveMembershipName()
          || 'Membership';

        markRecentMembershipPayment(email || confirmResult?.email || '', amount > 0 ? {
          amount,
          date: paymentDate,
          subType,
          purpose: subType,
          method: 'Stripe',
          status: 'Paid',
          id: sessionId ? `stripe_${sessionId}` : undefined,
        } : null);
      } catch {
        // ignore
      }

      try {
        const data = await fetchPortalApi('/api/portal/dashboard');
        if (!cancelled) storeDashboardPrefetch(data);
      } catch (err) {
        console.warn('Dashboard prefetch warning:', err);
      } finally {
        if (!cancelled) setPrefetchReady(true);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(prefetchTimeout);
    };
  }, []);

  useEffect(() => {
    if (secondsLeft > 0) {
      const timer = window.setTimeout(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [secondsLeft]);

  useEffect(() => {
    // Wait for countdown AND prefetch so dashboard opens immediately.
    if (secondsLeft > 0 || !prefetchReady) return undefined;

    try {
      sessionStorage.removeItem(PENDING_MEMBERSHIP_NAME_KEY);
    } catch {
      // ignore
    }

    markSkipPortalFullLoader();
    navigateApp('/');
    return undefined;
  }, [secondsLeft, prefetchReady]);

  return (
    <div className="onboard-root" data-onboard-theme={theme}>
      <div className="pay-success-page">
        <div className="pay-success-wave pay-success-wave--top" aria-hidden="true" />
        <div className="pay-success-wave pay-success-wave--bottom" aria-hidden="true" />
        <div className="pay-success-building" aria-hidden="true" />
        <Sparkles />

        <OnboardHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          showContactSupport
          logoVariant="full"
          logoSize={56}
        />

        <main className="pay-success-main">
          <section className="pay-success-hero">
            <div className="pay-success-check" aria-hidden="true">
              <span className="pay-success-check-glow" />
              <span className="pay-success-check-ring" />
              <span className="pay-success-check-badge">
                <Check size={36} strokeWidth={3} />
              </span>
              <span className="pay-success-ray pay-success-ray--1" />
              <span className="pay-success-ray pay-success-ray--2" />
              <span className="pay-success-ray pay-success-ray--3" />
              <span className="pay-success-ray pay-success-ray--4" />
            </div>

            <h1 className="pay-success-title">Payment Successful!</h1>
            <div className="pay-success-diamond" aria-hidden="true" />

            <p className="pay-success-status">
              You are now a <strong>{membershipName}</strong>.
              <span> Your membership is activated.</span>
            </p>
          </section>

          <section className="pay-success-redirect" aria-live="polite">
            <div className="pay-success-redirect-icon" aria-hidden="true">
              <DoorOpen size={26} strokeWidth={1.75} />
            </div>
            <div className="pay-success-redirect-copy">
              <h2>Redirecting you back to the portal...</h2>
              <p>You will be redirected automatically in a few seconds.</p>
              <div className="pay-success-countdown" aria-label={`Redirecting in ${secondsLeft} seconds`}>
                <span className="pay-success-countdown-dot is-active" aria-hidden="true">
                  {secondsLeft}
                </span>
                <span className="pay-success-countdown-label">
                  second{secondsLeft === 1 ? '' : 's'} remaining
                </span>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
