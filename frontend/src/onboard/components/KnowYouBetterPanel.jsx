import { useEffect } from 'react';
import { Heart, Users } from 'lucide-react';
import YesNoToggle from './YesNoToggle';
import StarOfDavidIcon from './icons/StarOfDavidIcon';
import {
  getHouseholdPreferences,
  getRedirectPathIfStepDisallowed,
  HOUSEHOLD_PREFERENCES_VERSION,
} from '../utils/householdPreferences';
import { getStepById, SPOUSE_INFORMATION_STEP_ID, CHILDREN_STEP_ID } from '../data/onboardingSteps';
import { goToOnboardingPath } from '../utils/onboardingRoutes';

function createChildId() {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `child-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createEmptyChild() {
  return {
    id: createChildId(),
    salutation: '',
    gender: '',
    firstName: '',
    lastName: '',
    name: '',
    birthDate: '',
    syncFingerprint: '',
  };
}

/**
 * Preference panel shown directly under the stepper.
 * Spouse defaults to Yes; Children + Yahrzeit default to No.
 * Yahrzeit is toggle-only (no form opens).
 */
export default function KnowYouBetterPanel({
  draft,
  updateDraft,
  persistNow,
  currentStepId,
}) {
  const prefs = getHouseholdPreferences(draft);

  // One-time migration: older drafts without preference version 2 keep a stale
  // Children=Yes from earlier testing. Rewrite them to the current defaults.
  useEffect(() => {
    if (draft?.data?.householdPreferences?.version === HOUSEHOLD_PREFERENCES_VERSION) return;
    const migrated = {
      ...draft,
      data: {
        ...draft.data,
        householdPreferences: { ...prefs },
      },
    };
    if (persistNow) persistNow(migrated);
    else updateDraft(() => migrated);

    const redirect = getRedirectPathIfStepDisallowed(currentStepId, prefs);
    if (redirect && redirect !== window.location.pathname) {
      goToOnboardingPath(redirect);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount for draft migration
  }, []);

  const commitPreferences = (key, value) => {
    const nextPrefs = {
      ...prefs,
      [key]: value,
      version: HOUSEHOLD_PREFERENCES_VERSION,
    };
    const nextData = {
      ...draft.data,
      householdPreferences: nextPrefs,
    };

    // Children Yes → ensure Child 1 form exists by default.
    if (key === 'hasChildren' && value) {
      const existing = Array.isArray(draft.data.children) ? draft.data.children : [];
      if (existing.length === 0) {
        nextData.children = [createEmptyChild()];
      }
    }

    // Turning a form on opens it right away, from whichever step the user is on.
    const enabledStepId =
      key === 'hasSpouse' ? SPOUSE_INFORMATION_STEP_ID : key === 'hasChildren' ? CHILDREN_STEP_ID : null;
    const targetStepId = value && enabledStepId ? enabledStepId : currentStepId;

    const nextDraft = {
      ...draft,
      currentStep: targetStepId,
      data: nextData,
    };

    // persistNow writes synchronously, so the draft is on disk before navigating.
    if (persistNow) persistNow(nextDraft);
    else updateDraft(() => nextDraft);

    // Yahrzeit is toggle-only — save preference, never open a form.
    if (key === 'addYahrzeit') return;

    if (value && enabledStepId) {
      const path = getStepById(enabledStepId).path;
      if (window.location.pathname !== path) goToOnboardingPath(path);
      return;
    }

    const disallowedRedirect = getRedirectPathIfStepDisallowed(currentStepId, nextPrefs);
    if (disallowedRedirect && disallowedRedirect !== window.location.pathname) {
      goToOnboardingPath(disallowedRedirect);
    }
  };

  return (
    <section className="onboard-know-you-panel" aria-label="Help Us Know You Better">
      <div className="onboard-know-you-header">
        <span className="onboard-know-you-header-icon" aria-hidden="true">
          <Heart size={18} strokeWidth={1.75} />
        </span>
        <div className="onboard-know-you-header-copy">
          <div className="onboard-know-you-title-row">
            <h3 className="onboard-know-you-title">Help Us Know You Better</h3>
            <span className="onboard-know-you-badge">Optional</span>
          </div>
          <p className="onboard-know-you-subtitle">
            You can update these preferences at any time during your onboarding.
          </p>
        </div>
      </div>

      <div className="onboard-know-you-grid">
        <div className="onboard-know-you-column">
          <YesNoToggle
            name="hasSpouse"
            label="Do you have a spouse?"
            icon={Users}
            value={prefs.hasSpouse}
            onChange={(value) => commitPreferences('hasSpouse', value)}
          />
        </div>
        <div className="onboard-know-you-column">
          <YesNoToggle
            name="hasChildren"
            label="Do you have children?"
            icon={Users}
            value={prefs.hasChildren}
            onChange={(value) => commitPreferences('hasChildren', value)}
          />
        </div>
        <div className="onboard-know-you-column">
          <YesNoToggle
            name="addYahrzeit"
            label="Add Yahrzeit records?"
            icon={StarOfDavidIcon}
            value={prefs.addYahrzeit}
            onChange={(value) => commitPreferences('addYahrzeit', value)}
          />
        </div>
      </div>
    </section>
  );
}
