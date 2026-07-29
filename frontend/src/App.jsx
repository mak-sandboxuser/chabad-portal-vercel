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
import MaritalInformation from './onboard/pages/MaritalInformation';
import ChildrenInformation from './onboard/pages/ChildrenInformation';
import YahrzeitInformation from './onboard/pages/YahrzeitInformation';
import MembershipSelection from './onboard/pages/MembershipSelection';
import ContributionSchedule from './onboard/pages/ContributionSchedule';
import PaymentMethod from './onboard/pages/PaymentMethod';
import ProcessingApplication from './onboard/pages/ProcessingApplication';
import { getPostLoginStepperEntryPath, isPostLoginStepperPending } from './onboard/utils/postLoginStepper';
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

function usePostLoginStepperRedirect() {
  useEffect(() => {
    if (!isPostLoginStepperPending()) return;
    if (window.location.pathname.startsWith('/onboard/')) return;
    window.location.replace(getPostLoginStepperEntryPath());
  }, []);
}

function SfPortal({ sfUser, onLogout }) {
  usePostLoginStepperRedirect();

  useEffect(() => {
    if (sessionStorage.getItem(ONBOARDING_COMPLETE_FLAG)) {
      sessionStorage.removeItem(ONBOARDING_COMPLETE_FLAG);
      showToast({ message: 'Membership application submitted successfully.', type: 'success' });
    }
  }, []);

  if (isPostLoginStepperPending() && !window.location.pathname.startsWith('/onboard/')) {
    return <LoadingScreen message="Opening membership steps..." />;
  }

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

  usePostLoginStepperRedirect();

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

  if (isPostLoginStepperPending() && !window.location.pathname.startsWith('/onboard/')) {
    return <LoadingScreen message="Opening membership steps..." />;
  }

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
    setSfUser(null);
    window.location.replace('/');
  };

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

  // Existing pre-login onboarding — unchanged.
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

  // Post-login zip stepper (Welcome + Primary Member removed from UI).
  if (window.location.pathname === ONBOARD_SPOUSE_INFORMATION_PATH) {
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
        <RedirectToPath path={ONBOARD_MARITAL_INFORMATION_PATH} />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_MARITAL_INFORMATION_PATH) {
    return (
      <>
        <ToastHost />
        <MaritalInformation />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_CHILDREN_PATH) {
    return (
      <>
        <ToastHost />
        <ChildrenInformation />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_YAHRZEIT_PATH) {
    return (
      <>
        <ToastHost />
        <YahrzeitInformation />
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
        <ContributionSchedule />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_PAYMENT_METHOD_PATH) {
    return (
      <>
        <ToastHost />
        <PaymentMethod />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_REVIEW_PATH) {
    return (
      <>
        <ToastHost />
        <RedirectToPath path={ONBOARD_PROCESSING_PATH} />
      </>
    );
  }

  if (window.location.pathname === ONBOARD_PROCESSING_PATH) {
    return (
      <>
        <ToastHost />
        <ProcessingApplication />
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
