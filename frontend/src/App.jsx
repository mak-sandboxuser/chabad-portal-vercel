import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/clerk-react';
import { authTrace } from './utils/authTrace';
import { getEffectiveAuthState } from './utils/clerkMagicLink';
import { getFreshClerkToken } from './utils/clerkAuth';
import { showToast } from './utils/toast';
import Login from './components/Login';
import Portal from './components/Portal';
import EmailLinkVerifier, { shouldRunEmailLinkVerifier } from './components/EmailLinkVerifier';
import ToastHost from './components/shared/ToastHost';
import OnboardWelcome, { ONBOARD_PATH } from './components/onboard/OnboardWelcome';
import OnboardAboutYou, { ONBOARD_ABOUT_YOU_PATH } from './components/onboard/OnboardAboutYou';
import SpouseInformation from './onboard/pages/SpouseInformation';
// HIDDEN forms (code kept): MaritalInformation, PaymentMethod, ProcessingApplication
import ChildrenInformation from './onboard/pages/ChildrenInformation';
// HIDDEN — Yahrzeit is toggle-only (no form). Code kept in YahrzeitInformation.jsx.
// import YahrzeitInformation from './onboard/pages/YahrzeitInformation';
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
    window.location.replace(path);
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
        role: 'Member',
      }}
      getAuthToken={async () => `dev:${sfUser.email}`}
      onLogout={onLogout}
    />
  );
}

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

export default function App() {
  const clerk = useClerk();
  const { signOut, isLoaded, userId, isSignedIn } = useAuth();
  const [restoringSession, setRestoringSession] = useState(false);
  const auth = getEffectiveAuthState(clerk, { isSignedIn, userId, isLoaded });

  // Direct Salesforce Login Session (Bypassing Clerk)
  const [sfUser, setSfUser] = useState(() => {
    try {
      const stored = localStorage.getItem('sf_user_session');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const handleSfLogout = () => {
    localStorage.removeItem('sf_user_session');
    try {
      localStorage.removeItem('pending_post_login_membership_stepper');
    } catch {
      // ignore
    }
    clearDraft();
    setSfUser(null);
    window.location.replace('/');
  };

  // Redirect onboarding returns to the onboarding membership page if they hit the home page with payment params
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const payment = query.get('payment');
    if (payment && (payment === 'success' || payment === 'cancel')) {
      if (window.location.pathname !== '/onboard/membership') {
        const draftData = readDraft();
        if (draftData && draftData.currentStep) {
          window.location.replace(`/onboard/membership${window.location.search}`);
        }
      }
    }
  }, []);

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

  // Existing pre-login onboarding — unchanged (public).
  if (window.location.pathname === ONBOARD_PATH) {
    return (
      <>
        <ToastHost />
        <OnboardWelcome />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_ABOUT_YOU_PATH) {
    return (
      <>
        <ToastHost />
        <OnboardAboutYou />
      </>
    );
  }

  const isPostLoginStepperPath = [
    ONBOARD_SPOUSE_INFORMATION_PATH,
    ONBOARD_HOUSEHOLD_PATH,
    ONBOARD_MARITAL_INFORMATION_PATH,
    ONBOARD_CHILDREN_PATH,
    ONBOARD_YAHRZEIT_PATH,
    ONBOARD_MEMBERSHIP_PATH,
    ONBOARD_CONTRIBUTION_SCHEDULE_PATH,
    ONBOARD_PAYMENT_METHOD_PATH,
    ONBOARD_REVIEW_PATH,
    ONBOARD_PROCESSING_PATH,
  ].includes(window.location.pathname);

  // Zip stepper requires login — send unauthenticated visitors to the login page.
  const isLoggedInForStepper = Boolean(sfUser) || auth.authenticated;
  if (isPostLoginStepperPath && !isLoggedInForStepper) {
    // Wait for Clerk to finish loading before deciding auth for stepper routes.
    if (!isLoaded) {
      return (
        <>
          <ToastHost />
          <LoadingScreen message="Loading authentication state..." />
        </>
      );
    }
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // Post-login zip stepper (Welcome + Primary Member removed from UI).
  if (window.location.pathname === ONBOARD_SPOUSE_INFORMATION_PATH) {
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

  if (window.location.pathname === ONBOARD_HOUSEHOLD_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path={ONBOARD_CHILDREN_PATH} />
      </>
    );
  }

  // Marital Information form hidden — skip to Children.
  if (window.location.pathname === ONBOARD_MARITAL_INFORMATION_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path={ONBOARD_CHILDREN_PATH} />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_CHILDREN_PATH) {
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
  if (window.location.pathname === ONBOARD_YAHRZEIT_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path={ONBOARD_MEMBERSHIP_PATH} />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_MEMBERSHIP_PATH) {
    return (
      <>
        <ToastHost />
        <MembershipSelection />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_CONTRIBUTION_SCHEDULE_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // Payment Method form hidden — return to portal.
  if (window.location.pathname === ONBOARD_PAYMENT_METHOD_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_REVIEW_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path="/" />
      </>
    );
  }

  // Processing form hidden — return to portal.
  if (window.location.pathname === ONBOARD_PROCESSING_PATH) {
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

  return (
    <>
      <ToastHost />
      <Login />
    </>
  );
}
