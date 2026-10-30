import { useEffect, useRef, useState } from 'react';
import { apiUrl } from '../config/api';
import { authTrace } from '../utils/authTrace';
import { showToast } from '../utils/toast';
import { clearRecentMembershipPayment } from '../utils/portalData';
import { clearDraft } from '../onboard/utils/onboardingCookies';
import {
  releasePostLoginStepperPending,
  prepareOnboardingDraftForLogin,
} from '../onboard/utils/postLoginStepper';

export const VERIFY_LOGIN_PATH = '/verify-login';

/**
 * Emailed magic link lands here: exchange the one-time link token for a
 * portal session, then open the dashboard (same session shape Login used).
 */
export default function VerifyLogin() {
  const [error, setError] = useState('');
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const linkToken = new URLSearchParams(window.location.search).get('token') || '';

    const finish = async () => {
      try {
        authTrace('VERIFY_LINK_START', {});
        const response = await fetch(apiUrl('/api/auth/verify-link'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: linkToken }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.token) {
          throw new Error(data.message || 'This sign-in link is invalid or has expired. Please request a new one.');
        }

        const email = String(data.email || '').toLowerCase();
        const memberRole = data.member?.role || '';
        // Same rule as the previous direct login: Guest / empty role → Portal decides on the stepper.
        const needsMembershipStepper = /^guest$/i.test(memberRole) || memberRole === '';
        const userSession = {
          email,
          name: data.member?.name || data.member?.firstName || email.split('@')[0],
          token: data.token,
          role: needsMembershipStepper ? 'Guest' : (memberRole || 'Member'),
          memberDetails: data.member,
        };

        localStorage.setItem('sf_user_session', JSON.stringify(userSession));
        prepareOnboardingDraftForLogin(email);
        if (needsMembershipStepper) clearRecentMembershipPayment();
        releasePostLoginStepperPending();
        clearDraft();

        authTrace('VERIFY_LINK_OK', { email });
        showToast({ message: `Welcome back, ${userSession.name}!`, type: 'success' });
        // Drop the token from the address bar / history.
        window.location.replace('/');
      } catch (err) {
        authTrace('VERIFY_LINK_FAIL', { error: err.message });
        setError(err.message);
      }
    };

    finish();
  }, []);

  if (error) {
    return (
      <div className="verify-container">
        <p style={{ color: 'var(--text-secondary)', maxWidth: 460, textAlign: 'center', lineHeight: 1.6 }}>
          {error}
        </p>
        <button
          type="button"
          className="submit-continue-btn"
          style={{ marginTop: '1.5rem' }}
          onClick={() => window.location.replace('/')}
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="verify-container">
      <div className="spinner"></div>
      <p style={{ color: 'var(--text-secondary)' }}>Signing you in...</p>
    </div>
  );
}
