import React, { useCallback, useEffect, useRef, useState } from 'react';
// import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { authTrace } from './utils/authTrace';
// import { getEffectiveAuthState } from './utils/clerkMagicLink';
// import { getFreshClerkToken } from './utils/clerkAuth';
import { showToast } from './utils/toast';
import Login from './components/Login';
import Portal from './components/Portal';
// import EmailLinkVerifier, { shouldRunEmailLinkVerifier } from './components/EmailLinkVerifier';
import ToastHost from './components/shared/ToastHost';
import OnboardWelcome, { ONBOARD_PATH } from './components/onboard/OnboardWelcome';
import OnboardAboutYou, { ONBOARD_ABOUT_YOU_PATH } from './components/onboard/OnboardAboutYou';
import OnboardingSuccess, { ONBOARD_SUCCESS_PATH } from './onboard/pages/OnboardingSuccess';
import PaymentSuccess, { PAYMENT_SUCCESS_PATH } from './onboard/pages/PaymentSuccess';
import SpouseInformation from './onboard/pages/SpouseInformation';
import HouseholdInformation from './onboard/pages/HouseholdInformation';
import MaritalInformation from './onboard/pages/MaritalInformation';
import ChildrenInformation from './onboard/pages/ChildrenInformation';
// HIDDEN — Yahrzeit is toggle-only (no form). Code kept in YahrzeitInformation.jsx.
// import YahrzeitInformation from './onboard/pages/YahrzeitInformation';
// HIDDEN forms (code kept): PaymentMethod, ProcessingApplication
import MembershipSelection from './onboard/pages/MembershipSelection';
import ContributionSchedule from './onboard/pages/ContributionSchedule';
// import PaymentMethod from './onboard/pages/PaymentMethod';
// import ProcessingApplication from './onboard/pages/ProcessingApplication';
import {
  getStepById,
  SPOUSE_INFORMATION_STEP_ID,
  HOUSEHOLD_STEP_ID,
  MARITAL_INFORMATION_STEP_ID,
  CHILDREN_STEP_ID,
  YAHRZEIT_STEP_ID,
  MEMBERSHIP_STEP_ID,
  CONTRIBUTION_SCHEDULE_STEP_ID,
  PAYMENT_METHOD_STEP_ID,
  REVIEW_STEP_ID,
  PROCESSING_STEP_ID,
} from './onboard/data/onboardingSteps';
import { getHouseholdPreferences, getRedirectPathIfStepDisallowed } from './onboard/utils/householdPreferences';
import { readDraft, clearDraft } from './onboard/utils/onboardingCookies';
import { isPostLoginStepperPending } from './onboard/utils/postLoginStepper';
import { markRecentMembershipPayment } from './utils/portalData';
import { navigateApp } from './utils/navigateApp';

const ONBOARD_SPOUSE_INFORMATION_PATH = getStepById(SPOUSE_INFORMATION_STEP_ID).path;
const ONBOARD_HOUSEHOLD_PATH = getStepById(HOUSEHOLD_STEP_ID).path;
const ONBOARD_MARITAL_INFORMATION_PATH = getStepById(MARITAL_INFORMATION_STEP_ID).path;
const ONBOARD_CHILDREN_PATH = getStepById(CHILDREN_STEP_ID).path;
const ONBOARD_YAHRZEIT_PATH = getStepById(YAHRZEIT_STEP_ID).path;
const ONBOARD_MEMBERSHIP_PATH = getStepById(MEMBERSHIP_STEP_ID).path;
const ONBOARD_CONTRIBUTION_SCHEDULE_PATH = getStepById(CONTRIBUTION_SCHEDULE_STEP_ID).path;
const ONBOARD_PAYMENT_METHOD_PATH = getStepById(PAYMENT_METHOD_STEP_ID).path;
const ONBOARD_REVIEW_PATH = getStepById(REVIEW_STEP_ID).path;
const ONBOARD_PROCESSING_PATH = getStepById(PROCESSING_STEP_ID).path;

const LOGIN_SUCCESS_FLAG = 'show_login_success';
const ONBOARDING_COMPLETE_FLAG = 'show_onboarding_complete';
const TOKEN_KEEPALIVE_MS = 30_000;

function LoadingScreen({ message }) {
  return (
    <div className="verify-container">
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-secondary)' }}>{message}</p>
    </div>
  );
}

function RedirectToPath({ path }) {
  useEffect(() => {
    navigateApp(path);
  }, [path]);

  return <LoadingScreen message="Redirecting..." />;
}

function SfPortal({ sfUser, onLogout }) {
  useEffect(() => {
    if (sessionStorage.getItem(ONBOARDING_COMPLETE_FLAG)) {
      sessionStorage.removeItem(ONBOARDING_COMPLETE_FLAG);
      showToast({ message: 'Membership application submitted successfully.', type: 'success' });
    }
  }, []);

  return (
    <Portal
      user={{
        id: sfUser.email,
        email: sfUser.email,
        name: sfUser.name,
        role: sfUser.role || 'Member',
      }}
      getAuthToken={async () => sfUser.token || `dev:${sfUser.email}`}
      onLogout={onLogout}
    />
  );
}

/* ==========================================================================
   AUTHENTICATED PORTAL (CLERK AUTH) (COMMENTED OUT FOR DIRECT JWT LOGIN)
   ==========================================================================
function AuthenticatedPortal({ onLogout, resolvedUserId }) {
  const clerk = useClerk();
  const { userId, getToken } = useAuth();
  const { user: hookUser } = useUser();
  const [authReady, setAuthReady] = useState(false);
  const getTokenRef = useRef(getToken);
  const clerkRef = useRef(clerk);

  getTokenRef.current = getToken;
  clerkRef.current = clerk;

  const activeUserId = userId || resolvedUserId || clerk.user?.id;
  const user = hookUser || clerk.user;

  const getAuthToken = useCallback(
    () => getFreshClerkToken(getTokenRef.current, clerkRef.current),
    [],
  );

  useEffect(() => {
    let cancelled = false;

    const ensureSession = async () => {
      if (!activeUserId) {
        if (!cancelled) setAuthReady(false);
        return;
      }

      const token = await getAuthToken();
      if (cancelled) return;

      setAuthReady(Boolean(token));
      if (token && sessionStorage.getItem(LOGIN_SUCCESS_FLAG)) {
        sessionStorage.removeItem(LOGIN_SUCCESS_FLAG);
        showToast({ message: 'Welcome! You are signed in successfully.', type: 'success' });
      }
      if (token && sessionStorage.getItem(ONBOARDING_COMPLETE_FLAG)) {
        sessionStorage.removeItem(ONBOARDING_COMPLETE_FLAG);
        showToast({ message: 'Membership application submitted successfully.', type: 'success' });
      }
    };

    ensureSession();
    const keepAlive = setInterval(ensureSession, TOKEN_KEEPALIVE_MS);

    return () => {
      cancelled = true;
      clearInterval(keepAlive);
    };
  }, [activeUserId, getAuthToken]);

  if (!activeUserId || !user || !authReady) {
    return <LoadingScreen message="Loading your portal..." />;
  }

  return (
    <Portal
      user={{
        id: activeUserId,
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName || user.primaryEmailAddress?.emailAddress?.split('@')[0],
        role: 'Member',
      }}
      getAuthToken={getAuthToken}
      onLogout={onLogout}
    />
  );
}
========================================================================== */

export default function App() {
  // const clerk = useClerk();
  // const { signOut, isLoaded, userId, isSignedIn } = useAuth();
  // const [restoringSession, setRestoringSession] = useState(false);
  // const auth = getEffectiveAuthState(clerk, { isSignedIn, userId, isLoaded });

  // Direct Salesforce Login Session (Bypassing Clerk)
  const [sfUser, setSfUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sf_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncPath = () => setPath(window.location.pathname);
    window.addEventListener('popstate', syncPath);
    window.addEventListener('app:navigate', syncPath);
    return () => {
      window.removeEventListener('popstate', syncPath);
      window.removeEventListener('app:navigate', syncPath);
    };
  }, []);

  const handleSfLogout = () => {
    localStorage.removeItem('sf_user_session');
    try {
      localStorage.removeItem('pending_post_login_membership_stepper');
      localStorage.removeItem('completed_post_login_membership_stepper');
      localStorage.removeItem('dismissed_post_login_membership_stepper');
      localStorage.removeItem('recent_membership_payment');
      localStorage.removeItem('pending_portal_payments');
    } catch {
      // ignore
    }
    clearDraft();
    setSfUser(null);
    navigateApp('/');
  };

  // When Stripe returns from checkout, confirm payment then show the celebratory
  // payment-success page (which auto-redirects to the dashboard).
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const payment = query.get('payment');
    const sessionId = query.get('session_id');
    const onPaymentSuccessPage = path === PAYMENT_SUCCESS_PATH;

    if (payment === 'success') {
      if (onPaymentSuccessPage) return;

      try {
        localStorage.removeItem('pending_post_login_membership_stepper');
        localStorage.setItem('completed_post_login_membership_stepper', '1');
        markRecentMembershipPayment(sfUser?.email || '');
      } catch {
        // ignore
      }

      const next = new URLSearchParams();
      next.set('payment', 'success');
      if (sessionId) next.set('session_id', sessionId);
      window.location.replace(`${PAYMENT_SUCCESS_PATH}?${next.toString()}`);
      return;
    }

    if (payment === 'cancel') {
      showToast({ message: 'Stripe checkout cancelled.', type: 'warning' });
      window.location.replace('/');
    }
  }, []);

  /* ==========================================================================
     CLERK ROUTE LOGGING (COMMENTED OUT FOR DIRECT JWT LOGIN)
     ==========================================================================
  useEffect(() => {
    if (!isLoaded) return;

    const route =
      sfUser ? 'sf_dashboard'
      : shouldRunEmailLinkVerifier() ? 'verify'
      : auth.authenticated ? 'dashboard'
      : restoringSession ? 'restoring_session'
      : 'login';

    authTrace('APP_ROUTE', {
      route,
      isSignedIn,
      userId: userId || null,
      clerkUserId: auth.clerkUserId,
      effectiveUserId: auth.effectiveUserId,
      restoringSession,
    });
  }, [isLoaded, isSignedIn, userId, restoringSession, clerk, auth.authenticated, auth.clerkUserId, auth.effectiveUserId, sfUser]);
  ========================================================================== */

  useEffect(() => {
    authTrace('APP_ROUTE', {
      route: sfUser ? 'sf_dashboard' : 'login',
      email: sfUser?.email || null,
    });
  }, [sfUser]);

  // Existing pre-login onboarding — unchanged (public).
  if (path === ONBOARD_PATH) {
    return (
      <>
        <ToastHost />
        <OnboardWelcome />
      </>
    );
  }

  if (path === ONBOARD_ABOUT_YOU_PATH) {
    return (
      <>
        <ToastHost />
        <OnboardAboutYou />
      </>
    );
  }

  // Pre-login continuation: About You → Household → Marital (public, no auth).
  if (path === ONBOARD_HOUSEHOLD_PATH) {
    return (
      <>
        <ToastHost />
        <HouseholdInformation />
      </>
    );
  }

  if (path === ONBOARD_MARITAL_INFORMATION_PATH) {
    return (
      <>
        <ToastHost />
        <MaritalInformation />
      </>
    );
  }

  if (path === ONBOARD_SUCCESS_PATH) {
    return (
      <>
        <ToastHost />
        <OnboardingSuccess />
      </>
    );
  }

  if (path === PAYMENT_SUCCESS_PATH) {
    return (
      <>
        <ToastHost />
        <PaymentSuccess />
      </>
    );
  }

  const isPostLoginStepperPath = [
    ONBOARD_SPOUSE_INFORMATION_PATH,
    ONBOARD_CHILDREN_PATH,
    ONBOARD_YAHRZEIT_PATH,
    ONBOARD_MEMBERSHIP_PATH,
    ONBOARD_CONTRIBUTION_SCHEDULE_PATH,
    ONBOARD_PAYMENT_METHOD_PATH,
    ONBOARD_REVIEW_PATH,
    ONBOARD_PROCESSING_PATH,
  ].includes(path);

  // sfUser.groups is NOT set (Make.com check-member doesn't return it). Use role only.
  const isMemberUser = Boolean(sfUser) && sfUser.role === 'Member';

  // Active members who are not in a pending onboarding stepper should never land on onboarding URLs.
  if (isPostLoginStepperPath && isMemberUser && !isPostLoginStepperPending()) {
    return <RedirectToPath path="/" />;
  }

  // Zip stepper requires login — send unauthenticated visitors to the login page.
  // Commented out clerk auth.authenticated check for direct JWT session check
  const isLoggedInForStepper = Boolean(sfUser) /* || auth.authenticated */;
  if (isPostLoginStepperPath && !isLoggedInForStepper) {
    /* ==========================================================================
       CLERK STEPPER LOADING WAIT (COMMENTED OUT FOR DIRECT JWT LOGIN)
       ==========================================================================
    // Wait for Clerk to finish loading before deciding auth for stepper routes.
    if (!isLoaded) {
      return (
        <>
          <ToastHost />
          <LoadingScreen message="Loading authentication state..." />
        </>
      );
    }
    ========================================================================== */
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // Post-login zip stepper (Welcome + Primary Member removed from UI).
  if (path === ONBOARD_SPOUSE_INFORMATION_PATH) {
    const prefs = getHouseholdPreferences(readDraft());
    const redirect = getRedirectPathIfStepDisallowed(SPOUSE_INFORMATION_STEP_ID, prefs);
    if (redirect) {
      return (
        <>
          <ToastHost />
          <RedirectToPath path={redirect} />
        </>
      );
    }
    return (
      <>
        <ToastHost />
        <SpouseInformation />
      </>
    );
  }

  if (path === ONBOARD_CHILDREN_PATH) {
    const prefs = getHouseholdPreferences(readDraft());
    const redirect = getRedirectPathIfStepDisallowed(CHILDREN_STEP_ID, prefs);
    if (redirect) {
      return (
        <>
          <ToastHost />
          <RedirectToPath path={redirect} />
        </>
      );
    }
    return (
      <>
        <ToastHost />
        <ChildrenInformation />
      </>
    );
  }

  // Yahrzeit form hidden — preference toggle only; always skip to Membership.
  if (path === ONBOARD_YAHRZEIT_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path={ONBOARD_MEMBERSHIP_PATH} />
      </>
    );
  }

  if (path === ONBOARD_MEMBERSHIP_PATH) {
    return (
      <>
        <ToastHost />
        <MembershipSelection />
      </>
    );
  }

  if (path === ONBOARD_CONTRIBUTION_SCHEDULE_PATH) {
    return (
      <>
        <ToastHost />
        <ContributionSchedule />
      </>
    );
  }

  // Payment Method form hidden — return to portal.
  if (path === ONBOARD_PAYMENT_METHOD_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  if (path === ONBOARD_REVIEW_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // Processing form hidden — return to portal.
  if (path === ONBOARD_PROCESSING_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // If Direct Salesforce Login session exists, bypass Clerk authentication
  if (sfUser) {
    return (
      <>
        <ToastHost />
        <SfPortal sfUser={sfUser} onLogout={handleSfLogout} />
      </>
    );
  }

  /* ==========================================================================
     CLERK REDIRECTS/PAGES (COMMENTED OUT FOR DIRECT JWT LOGIN)
     ==========================================================================
  if (shouldRunEmailLinkVerifier()) {
    return (
      <>
        <ToastHost />
        <EmailLinkVerifier />
      </>
    );
  }

  if (!isLoaded || restoringSession) {
    return (
      <>
        <ToastHost />
        <LoadingScreen message="Loading authentication state..." />
      </>
    );
  }

  if (auth.authenticated) {
    return (
      <>
        <ToastHost />
        <AuthenticatedPortal
          onLogout={() => {
            sessionStorage.removeItem(LOGIN_SUCCESS_FLAG);
            signOut();
          }}
          resolvedUserId={auth.effectiveUserId}
        />
      </>
    );
  }
  ========================================================================== */

  return (
    <>
      <ToastHost />
      <Login />
    </>
  );
}
