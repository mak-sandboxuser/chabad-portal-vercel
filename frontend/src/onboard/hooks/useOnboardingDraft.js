import { useCallback, useEffect, useRef, useState } from 'react';
import { readDraft, writeDraft, clearDraft, createEmptyDraft, bindDraftToUser } from '../utils/onboardingCookies';

const SAVE_DEBOUNCE_MS = 400;

function getSessionEmail() {
  try {
    const stored = localStorage.getItem('sf_user_session');
    if (!stored) return '';
    return String(JSON.parse(stored)?.email || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Loads/persists the shared onboarding draft (cookie, overflowing to
 * localStorage for large payloads — see onboardingCookies.js). Changes are
 * saved on a ~400ms debounce, plus flushed immediately on tab-hide/unload so
 * nothing is lost mid-typing.
 *
 * The draft is scoped to the logged-in email via bindDraftToUser, so a new
 * login never inherits the previous applicant's spouse/children/stepper data.
 */
export default function useOnboardingDraft() {
  const [draft, setDraft] = useState(() => {
    const email = getSessionEmail();
    if (email) return bindDraftToUser(email);
    return readDraft() || createEmptyDraft();
  });
  // Captured once at mount: was there a real draft in the cookie/localStorage
  // already, as opposed to one we just created empty? Pages use this to tell
  // "returning applicant" apart from "currentStep happens to be 1".
  const [hasSavedDraft] = useState(() => Boolean(readDraft()));
  const draftRef = useRef(draft);
  const debounceRef = useRef(null);
  const savedSerializedRef = useRef();
  if (savedSerializedRef.current === undefined) {
    savedSerializedRef.current = JSON.stringify(draft);
  }

  draftRef.current = draft;

  const flushSave = useCallback(() => {
    const serialized = JSON.stringify(draftRef.current);
    if (serialized === savedSerializedRef.current) return;
    savedSerializedRef.current = serialized;
    writeDraft(draftRef.current);
  }, []);

  useEffect(() => {
    debounceRef.current = setTimeout(flushSave, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [draft, flushSave]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') flushSave();
    };
    const handleUnload = () => flushSave();

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleUnload);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleUnload);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [flushSave]);

  const updateDraft = useCallback((patch) => {
    setDraft((prev) => (typeof patch === 'function' ? patch(prev) : { ...prev, ...patch }));
  }, []);

  const saveNow = useCallback(() => {
    clearTimeout(debounceRef.current);
    flushSave();
  }, [flushSave]);

  /**
   * Applies a known next-draft value and writes it immediately (no debounce).
   * Used for handlers — Continue/Back/Save & Exit — that must guarantee the
   * write has happened before navigating away. Takes the resolved object
   * (not an updater function) so it can safely run outside of setState,
   * which keeps it a plain event-handler side effect rather than logic
   * inside a setState updater that Strict Mode would invoke twice.
   */
  const persistNow = useCallback((nextDraft) => {
    clearTimeout(debounceRef.current);
    const email = getSessionEmail();
    const withOwner = email && !nextDraft.ownerEmail
      ? { ...nextDraft, ownerEmail: email }
      : nextDraft;
    setDraft(withOwner);
    savedSerializedRef.current = JSON.stringify(withOwner);
    writeDraft(withOwner);
  }, []);

  const resetDraft = useCallback(() => {
    clearDraft();
    const empty = createEmptyDraft(getSessionEmail());
    savedSerializedRef.current = JSON.stringify(empty);
    setDraft(empty);
  }, []);

  return { draft, hasSavedDraft, updateDraft, saveNow, persistNow, resetDraft };
}
