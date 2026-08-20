import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HelpCircle,
  Home,
  Languages,
  Lock,
  Mail,
  Moon,
  Phone,
  Star,
  Sun,
  User,
  Users,
  Wallet,
  ClipboardList,
  CheckCircle,
  Building,
  DollarSign,
  ShieldCheck,
  CreditCard as CardIcon
} from 'lucide-react';
import ChabadLogo from '../shared/ChabadLogo';
import ContactSupportModal from '../shared/ContactSupportModal';
import useOnboardingTheme from '../../onboard/hooks/useOnboardingTheme';
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY } from '../../constants/supportContact';
import { showToast } from '../../utils/toast';
import { fetchPortalApi } from '../../utils/portalApi';
import { SALUTATIONS, GENDER_OPTIONS } from '../../constants/householdMembers';
import { apiUrl } from '../../config/api';
import { createEmptyDraft, readDraft, writeDraft } from '../../onboard/utils/onboardingCookies';
import { getStepById, HOUSEHOLD_STEP_ID } from '../../onboard/data/onboardingSteps';
import { goToOnboardingPath } from '../../onboard/utils/onboardingRoutes';

export const ONBOARD_ABOUT_YOU_PATH = '/onboard/about-you';

const WIZARD_STEPS = [
  { icon: User, label: 'About You' },
  // HIDDEN for now — keep for later restore
  // { icon: Star, label: 'Membership Selection' },
  // { icon: ClipboardList, label: 'Confirmation' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 100 }, (_, i) => CURRENT_YEAR - i);

const MEMBERSHIP_TIERS = [
  {
    id: 'family',
    name: 'Family Membership',
    description: 'Perfect for families who want to be actively involved in our community and programs.',
    annualPrice: 2244,
    icon: Users,
    category: 'General',
  },
  {
    id: 'upgraded',
    name: 'Upgraded Membership',
    description: 'Enhanced benefits and opportunities for deeper engagement and impact.',
    annualPrice: 3000,
    icon: Star,
    category: 'General',
  },
  {
    id: 'single-parent',
    name: 'Single Parent Family',
    description: 'Supporting single parents and their children with connection and care.',
    annualPrice: 1560,
    icon: Users,
    category: 'General',
  },
  {
    id: 'single',
    name: 'Single Membership',
    description: 'For individuals seeking connection and Jewish life enrichment.',
    annualPrice: 1128,
    icon: User,
    category: 'General',
  },
  {
    id: 'senior',
    name: 'Senior Citizen Membership',
    description: 'Special rate for seniors (65+) to stay engaged and inspired.',
    annualPrice: 1800,
    icon: User,
    category: 'General',
  },
  {
    id: 'chai-donor',
    name: 'Chai Donor',
    description: 'Your generosity helps sustain our daily operations and essential programs.',
    annualPrice: 5000,
    icon: DollarSign,
    category: 'Chai Club',
  },
  {
    id: 'chai-partner',
    name: 'Chai Partner',
    description: 'Partner with us to expand programs and reach more families.',
    annualPrice: 10000,
    icon: DollarSign,
    category: 'Chai Club',
  },
  {
    id: 'chai-rabbis-circle',
    name: "Chai Rabbi's Circle",
    description: 'Invest in leadership, education, and inspiring Jewish experiences.',
    annualPrice: 18000,
    icon: DollarSign,
    category: 'Chai Club',
  },
  {
    id: 'chai-leadership-circle',
    name: 'Chai Leadership Circle',
    description: 'Make a transformational impact and help shape the future of our community.',
    annualPrice: 36000,
    icon: DollarSign,
    category: 'Chai Club',
  },
];

function YesNoToggle({ value, onChange }) {
  return (
    <div className="ay-toggle">
      <button
        type="button"
        className={`ay-toggle-btn${value === true ? ' is-active' : ''}`}
        onClick={() => onChange(true)}
      >
        Yes
      </button>
      <button
        type="button"
        className={`ay-toggle-btn${value === false ? ' is-active' : ''}`}
        onClick={() => onChange(false)}
      >
        No
      </button>
    </div>
  );
}

export default function OnboardAboutYou() {
  const [theme, toggleTheme] = useOnboardingTheme();
  const [currentStep, setCurrentStep] = useState(0); // 0: About You, 1: Membership, 2: Payment, 3: Confirm, 4: Success
  const [communityOpen, setCommunityOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  const [form, setForm] = useState({
    // Step 1: About You
    salutation: '',
    gender: '',
    firstName: '',
    lastName: '',
    email: '',
    mobilePhone: '',
    birthMonth: '',
    birthDay: '',
    birthYear: '',
    hebrewName: '',
    fatherHebrewName: '',
    motherHebrewName: '',
    occupation: '',
    hasSpouse: false,
    hasChildren: false,
    addYahrzeit: false,

    // Spouse Details (only if hasSpouse is true)
    spouseSalutation: '',
    spouseGender: '',
    spouseFirstName: '',
    spouseLastName: '',
    spouseEmail: '',
    spousePhone: '',

    // Children details list (only if hasChildren is true)
    children: [],

    // Step 2: Membership Select
    membershipTier: 'family',
    paymentFrequency: 'monthly', // monthly, annual

    // Step 3: Payment
    paymentType: 'card', // card, bank
    cardName: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
    bankName: '',
    bankRouting: '',
    bankAccount: '',
    bankType: 'checking',
    sameAsPrimaryAddress: true,
    billingAddress: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const draft = readDraft();
    const saved = draft?.data?.primaryMember;
    if (!saved || typeof saved !== 'object') return;
    setForm((f) => ({
      ...f,
      salutation: saved.salutation || f.salutation,
      gender: saved.gender || f.gender,
      firstName: saved.firstName || f.firstName,
      lastName: saved.lastName || f.lastName,
      email: saved.email || f.email,
      mobilePhone: saved.mobilePhone || f.mobilePhone,
      birthMonth: saved.birthMonth || saved.birthDate?.month || f.birthMonth,
      birthDay: saved.birthDay || saved.birthDate?.day || f.birthDay,
      birthYear: saved.birthYear || saved.birthDate?.year || f.birthYear,
      hebrewName: saved.hebrewName || f.hebrewName,
      fatherHebrewName: saved.fathersHebrewName || saved.fatherHebrewName || f.fatherHebrewName,
      motherHebrewName: saved.mothersHebrewName || saved.motherHebrewName || f.motherHebrewName,
      occupation: saved.occupation || f.occupation,
      membershipTier: saved.membershipTier || f.membershipTier,
    }));
  }, []);

  const update = (field) => (e) => {
    let val = e.target.value;
    if (field === 'cardNumber') {
      val = val.replace(/\D/g, '').substring(0, 16);
      val = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    } else if (field === 'cardExpiry') {
      val = val.replace(/\D/g, '').substring(0, 4);
      if (val.length >= 2) {
        val = val.substring(0, 2) + '/' + val.substring(2);
      }
    } else if (field === 'cardCvv') {
      val = val.replace(/\D/g, '').substring(0, 4);
    } else if (field === 'bankRouting') {
      val = val.replace(/\D/g, '').substring(0, 9);
    } else if (field === 'bankAccount') {
      val = val.replace(/\D/g, '').substring(0, 17);
    } else if (field === 'mobilePhone' || field === 'spousePhone') {
      val = val.replace(/\D/g, '').substring(0, 10);
      if (val.length > 6) {
        val = `(${val.substring(0, 3)}) ${val.substring(3, 6)}-${val.substring(6)}`;
      } else if (val.length > 3) {
        val = `(${val.substring(0, 3)}) ${val.substring(3)}`;
      }
    }

    setForm((f) => ({ ...f, [field]: val }));
    if (errors[field] || (['birthMonth', 'birthDay', 'birthYear'].includes(field) && errors.birthDate)) {
      setErrors((errs) => {
        const copy = { ...errs };
        delete copy[field];
        if (['birthMonth', 'birthDay', 'birthYear'].includes(field)) delete copy.birthDate;
        return copy;
      });
    }
  };

  const handleEmailBlur = async () => {
    const emailVal = form.email.trim().toLowerCase();
    if (!emailVal || !/\S+@\S+\.\S+/.test(emailVal)) {
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(apiUrl('/api/auth/check-member'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailVal }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.allowed) {
          setErrors((prev) => ({ ...prev, email: 'This email is already registered. Please log in.' }));
          showToast({ message: 'This email is already registered. Please log in.', type: 'warning' });
        }
      }
    } catch (err) {
      console.error('Error checking email registration:', err);
    } finally {
      setCheckingEmail(false);
    }
  };

  const addChild = () => {
    setForm((f) => ({
      ...f,
      children: [
        ...f.children,
        { salutation: '', gender: '', firstName: '', lastName: '', email: '', phone: '' }
      ]
    }));
  };

  const removeChild = (index) => {
    setForm((f) => ({
      ...f,
      children: f.children.filter((_, i) => i !== index)
    }));
  };

  const updateChild = (index, field, value) => {
    if (field === 'phone') {
      value = value.replace(/\D/g, '').substring(0, 10);
      if (value.length > 6) {
        value = `(${value.substring(0, 3)}) ${value.substring(3, 6)}-${value.substring(6)}`;
      } else if (value.length > 3) {
        value = `(${value.substring(0, 3)}) ${value.substring(3)}`;
      }
    }
    setForm((f) => {
      const copy = [...f.children];
      copy[index] = { ...copy[index], [field]: value };
      return { ...f, children: copy };
    });

    const errKey = `child_${index}_${field}`;
    if (errors[errKey]) {
      setErrors((errs) => {
        const copy = { ...errs };
        delete copy[errKey];
        return copy;
      });
    }
  };

  const validateStep = () => {
    const nextErrors = {};
    if (currentStep === 0) {
      if (!form.firstName.trim()) nextErrors.firstName = 'First Name is required';
      if (!form.lastName.trim()) nextErrors.lastName = 'Last Name is required';
      if (!form.email.trim()) {
        nextErrors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(form.email)) {
        nextErrors.email = 'Please enter a valid email address';
      }
      if (!form.mobilePhone.trim()) {
        nextErrors.mobilePhone = 'Mobile Phone is required';
      }
      // Birth Date is optional — only validate if any part is filled in.
      if (form.birthMonth || form.birthDay || form.birthYear) {
        if (!form.birthMonth || !form.birthDay || !form.birthYear) {
          nextErrors.birthDate = 'Complete Birth Date or leave all fields blank';
        }
      }
      
      // Spouse Validation
      if (form.hasSpouse) {
        if (!form.spouseFirstName.trim()) nextErrors.spouseFirstName = 'Spouse First Name is required';
        if (!form.spouseLastName.trim()) nextErrors.spouseLastName = 'Spouse Last Name is required';
        if (!form.spouseEmail.trim()) nextErrors.spouseEmail = 'Email is required';
      }

      // Children Validation
      if (form.hasChildren) {
        if (form.children.length === 0) {
          nextErrors.childrenList = 'Please add at least one child or select No';
        } else {
          form.children.forEach((child, index) => {
            if (!child.firstName.trim()) nextErrors[`child_${index}_firstName`] = 'First Name is required';
            if (!child.lastName.trim()) nextErrors[`child_${index}_lastName`] = 'Last Name is required';
            if (!child.email.trim()) nextErrors[`child_${index}_email`] = 'Email is required';
          });
        }
      }
    } else if (currentStep === 1) {
      if (!form.membershipTier) nextErrors.membershipTier = 'Please select a membership option';
    } else if (currentStep === 2) {
      if (form.paymentType === 'card') {
        if (!form.cardName.trim()) nextErrors.cardName = 'Cardholder name is required';
        if (form.cardNumber.replace(/\s/g, '').length < 15) nextErrors.cardNumber = 'Invalid Card Number';
        if (form.cardExpiry.length < 5) nextErrors.cardExpiry = 'Expiry is required (MM/YY)';
        if (form.cardCvv.length < 3) nextErrors.cardCvv = 'CVV is required';
      } else {
        if (!form.bankName.trim()) nextErrors.bankName = 'Bank name is required';
        if (form.bankRouting.length !== 9) nextErrors.bankRouting = 'Routing number must be 9 digits';
        if (form.bankAccount.length < 6) nextErrors.bankAccount = 'Account number is invalid';
      }
      if (!form.sameAsPrimaryAddress && !form.billingAddress.trim()) {
        nextErrors.billingAddress = 'Billing address is required';
      }
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = (e) => {
    if (e) e.preventDefault();
    if (validateStep()) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    } else {
      // Wait for error classes to paint, then focus the first invalid field.
      window.setTimeout(() => {
        const firstError = document.querySelector('.ay-input-wrap.has-error input, .ay-input-wrap.has-error select');
        if (firstError) {
          firstError.focus({ preventScroll: true });
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  const submitOnboardingApplication = async () => {
    let createdHouseholdAccountId = '';
    
    // Resolve current selected membership tier name
    const currentTier = MEMBERSHIP_TIERS.find((t) => t.id === form.membershipTier) || MEMBERSHIP_TIERS[0];
    let assignedGroup = currentTier ? currentTier.name : 'Senior Citizen Membership';
    if (assignedGroup.toLowerCase().includes('senior')) {
      assignedGroup = 'Senior Citizen Membership';
    }
    
    // 1. Create Primary Member contact & Household Account in CRM
    try {
      const primaryRes = await fetchPortalApi('/api/household/add-family-member', {
        getAuthToken: () => `dev:${form.email}`,
        method: 'POST',
        body: {
          email: form.email,
          mode: 'create',
          isOnboarding: true,
          salutation: form.salutation,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          gender: form.gender,
          contactEmail: form.email.trim(),
          mobilePhone: form.mobilePhone.trim(),
          memberType: 'primary',
          groups: assignedGroup,
        },
      });
      
      createdHouseholdAccountId = primaryRes.householdAccountId;
      console.log('Primary member & Household created in CRM with Group:', assignedGroup, 'Account ID:', createdHouseholdAccountId);
    } catch (err) {
      console.error('Failed to create primary member in CRM:', err.message);
      showToast({ message: `Primary member registration failed: ${err.message}`, type: 'error' });
      throw err;
    }

    // 2. Submit Spouse if toggle is enabled
    if (form.hasSpouse) {
      try {
        await fetchPortalApi('/api/household/add-family-member', {
          getAuthToken: () => `dev:${form.email}`,
          method: 'POST',
          body: {
            email: form.email,
            mode: 'create',
            isOnboarding: true,
            householdAccountId: createdHouseholdAccountId,
            salutation: form.spouseSalutation,
            firstName: form.spouseFirstName.trim(),
            lastName: form.spouseLastName.trim(),
            gender: form.spouseGender,
            contactEmail: form.spouseEmail.trim(),
            mobilePhone: form.spousePhone.trim(),
            memberType: 'secondary',
            groups: assignedGroup,
          },
        });
        console.log('Spouse created in CRM successfully.');
      } catch (err) {
        console.error('Failed to create spouse in CRM:', err.message);
        showToast({ message: `Spouse details save warning: ${err.message}`, type: 'warning' });
      }
    }

    // 3. Submit Children if toggle is enabled
    if (form.hasChildren && form.children.length > 0) {
      for (const child of form.children) {
        try {
          await fetchPortalApi('/api/household/add-family-member', {
            getAuthToken: () => `dev:${form.email}`,
            method: 'POST',
            body: {
              email: form.email,
              mode: 'create',
              isOnboarding: true,
              householdAccountId: createdHouseholdAccountId,
              salutation: child.salutation,
              firstName: child.firstName.trim(),
              lastName: child.lastName.trim(),
              gender: child.gender,
              contactEmail: child.email.trim(),
              mobilePhone: child.phone.trim(),
              memberType: 'child',
              groups: assignedGroup,
            },
          });
          console.log(`Child ${child.firstName} created in CRM successfully.`);
        } catch (err) {
          console.error(`Failed to create child ${child.firstName} in CRM:`, err.message);
          showToast({ message: `Child details save warning: ${err.message}`, type: 'warning' });
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep()) {
      window.setTimeout(() => {
        const firstError = document.querySelector('.ay-input-wrap.has-error input, .ay-input-wrap.has-error select');
        if (firstError) {
          firstError.focus({ preventScroll: true });
          firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 0);
      return;
    }

    // Next only — no webhook. Persist About You data and open Household.
    const existing = readDraft() || createEmptyDraft(form.email);
    writeDraft({
      ...existing,
      ownerEmail: String(form.email || '').trim().toLowerCase(),
      currentStep: HOUSEHOLD_STEP_ID,
      data: {
        ...existing.data,
        primaryMember: {
          ...existing.data.primaryMember,
          salutation: form.salutation,
          gender: form.gender,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim().toLowerCase(),
          mobilePhone: form.mobilePhone.trim(),
          birthMonth: form.birthMonth,
          birthDay: form.birthDay,
          birthYear: form.birthYear,
          hebrewName: form.hebrewName,
          fathersHebrewName: form.fatherHebrewName,
          mothersHebrewName: form.motherHebrewName,
          fatherHebrewName: form.fatherHebrewName,
          motherHebrewName: form.motherHebrewName,
          occupation: form.occupation,
          membershipTier: form.membershipTier,
          hasSpouse: form.hasSpouse,
          hasChildren: form.hasChildren,
          addYahrzeit: form.addYahrzeit,
        },
      },
    });
    goToOnboardingPath(getStepById(HOUSEHOLD_STEP_ID).path);
  };

  const selectedTierObj = MEMBERSHIP_TIERS.find((t) => t.id === form.membershipTier) || MEMBERSHIP_TIERS[0];
  const calculatedPrice = form.paymentFrequency === 'monthly'
    ? Math.floor(selectedTierObj.annualPrice / 12)
    : selectedTierObj.annualPrice;

  return (
    <div className="ay-page">
      <style>{`
        .ay-page {
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-primary);
          font-family: var(--font-body), sans-serif;
        }
        .ay-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
          border-bottom: 1px solid var(--border-color);
        }
        .ay-header-title {
          text-align: center;
        }
        .ay-header-title h1 {
          font-family: var(--font-heading), serif;
          font-size: 22px;
          font-weight: 700;
          margin: 0;
          color: var(--text-primary);
        }
        .ay-header-title p {
          font-size: 12.5px;
          color: var(--text-secondary);
          margin: 2px 0 0;
        }
        .ay-help-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: var(--color-accent);
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
          white-space: nowrap;
        }
        .ay-help-link:hover {
          text-decoration: underline;
        }
        .ay-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .ay-theme-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--bg-card, transparent);
          color: var(--text-primary);
          cursor: pointer;
        }
        .ay-theme-toggle:hover {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .ay-main {
          max-width: 1000px;
          margin: 0 auto;
          padding: 32px 24px 64px;
        }
        .ay-stepper {
          display: flex;
          align-items: flex-start;
          margin-bottom: 36px;
          justify-content: space-between;
          position: relative;
        }
        .ay-step {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 8px;
          z-index: 1;
        }
        .ay-step::before {
          content: '';
          position: absolute;
          left: calc(-50% + 28px);
          right: calc(50% + 28px);
          top: 21px;
          height: 2px;
          background: var(--border-color);
          z-index: 0;
          pointer-events: none;
        }
        .ay-step:first-child::before {
          display: none;
        }
        .ay-step.is-completed::before,
        .ay-step.is-active::before {
          background: var(--color-accent);
        }
        .ay-step-icon {
          position: relative;
          z-index: 1;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid var(--border-color);
          color: var(--text-secondary);
          background: var(--bg-main);
          transition: var(--transition-smooth);
        }
        .ay-step.is-active .ay-step-icon {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: var(--color-primary-light);
          transform: scale(1.1);
        }
        .ay-step.is-completed .ay-step-icon {
          border-color: var(--color-accent);
          color: #fff;
          background: var(--color-accent);
        }
        .ay-step-badge {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          margin-top: -12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
          color: var(--text-secondary);
          background: var(--border-color);
          border: 2px solid var(--bg-main);
          z-index: 2;
        }
        .ay-step.is-active .ay-step-badge {
          background: var(--color-accent);
          color: #fff;
        }
        .ay-step.is-completed .ay-step-badge {
          background: var(--color-primary);
          color: #fff;
        }
        .ay-step-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.3;
        }
        .ay-step.is-active .ay-step-label {
          color: var(--color-accent);
          font-weight: 700;
        }
        .ay-step.is-completed .ay-step-label {
          color: var(--text-primary);
        }
        .ay-card {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          box-shadow: var(--glass-shadow);
          padding: 32px;
          transition: var(--transition-smooth);
        }
        .ay-card-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 24px;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 16px;
        }
        .ay-card-head h2 {
          font-family: var(--font-heading), serif;
          font-size: 24px;
          font-weight: 700;
          margin: 0 0 4px;
        }
        .ay-card-head p {
          font-size: 13.5px;
          color: var(--text-secondary);
          margin: 0;
        }
        .ay-secure-note {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 12.5px;
          color: var(--text-secondary);
          white-space: nowrap;
        }
        .ay-section-label {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-accent);
          text-transform: uppercase;
          letter-spacing: 0.03em;
          margin: 0 0 14px;
        }
        .ay-section-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          cursor: pointer;
          padding: 16px 0;
          border-top: 1px solid var(--border-color);
          margin-top: 8px;
        }
        .ay-section-head-text h3 {
          font-size: 14px;
          font-weight: 700;
          margin: 0 0 2px;
          color: var(--text-primary);
        }
        .ay-section-head-text span {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .ay-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 18px;
        }
        .ay-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ay-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .ay-label span:not(.ay-optional-label) {
          color: var(--color-danger, #ef4444);
          margin-left: 2px;
        }
        .ay-optional-label {
          margin-left: 6px;
          font-size: 11.5px;
          font-weight: 500;
          color: var(--text-secondary);
        }
        .ay-input-error {
          font-size: 11.5px;
          color: var(--color-danger, #ef4444);
          margin-top: 2px;
        }
        .ay-input-wrap {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 10px 12px;
          background: var(--bg-main);
          transition: var(--transition-smooth);
        }
        .ay-input-wrap:focus-within {
          border-color: var(--border-focus);
          box-shadow: 0 0 0 2px var(--color-primary-light);
        }
        .ay-input-wrap.has-error {
          border-color: var(--color-danger);
        }
        .ay-input-wrap svg {
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .ay-input-wrap input,
        .ay-input-wrap select,
        .ay-input-wrap textarea {
          border: none;
          outline: none;
          background: none;
          color: var(--text-primary);
          font-size: 13.5px;
          font-family: var(--font-body), sans-serif;
          width: 100%;
          color-scheme: dark;
        }
        .ay-input-wrap select option {
          background-color: #1a202c;
          color: #ffffff;
        }
        .ay-birth-row {
          display: grid;
          grid-template-columns: 1.2fr 1fr 1fr;
          gap: 12px;
        }
        .ay-helper-box {
          background: var(--color-primary-light);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 18px 20px;
          margin-top: 20px;
        }
        .ay-helper-title {
          font-size: 13px;
          font-weight: 700;
          color: var(--color-accent);
          margin: 0 0 14px;
        }
        .ay-helper-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
        }
        .ay-helper-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }
        .ay-helper-item-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: var(--text-primary);
        }
        .ay-helper-item-label svg {
          color: var(--color-accent);
          flex-shrink: 0;
        }
        .ay-toggle {
          display: flex;
          border: 1px solid var(--border-color);
          border-radius: 8px;
          overflow: hidden;
        }
        .ay-toggle-btn {
          border: none;
          background: var(--bg-card);
          color: var(--text-secondary);
          font-size: 12.5px;
          font-weight: 600;
          padding: 6px 14px;
          cursor: pointer;
        }
        .ay-toggle-btn.is-active {
          background: var(--color-primary);
          color: #fff;
        }
        
        /* Membership select custom styling */
        .membership-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-top: 15px;
        }
        .membership-col-title {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-accent);
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .membership-card-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .membership-card {
          border: 1.5px solid var(--border-color);
          background: var(--bg-main);
          border-radius: 12px;
          padding: 16px;
          display: flex;
          align-items: flex-start;
          gap: 12px;
          cursor: pointer;
          position: relative;
          transition: var(--transition-smooth);
        }
        .membership-card:hover {
          border-color: var(--border-focus);
          transform: translateY(-2px);
        }
        .membership-card.is-selected {
          border-color: var(--color-accent);
          background: var(--color-primary-light);
        }
        .membership-card-radio {
          margin-top: 3px;
        }
        .membership-card-content {
          flex: 1;
        }
        .membership-card-name {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-primary);
          display: block;
        }
        .membership-card-desc {
          font-size: 12px;
          color: var(--text-secondary);
          margin-top: 4px;
          display: block;
        }
        .membership-card-price {
          font-size: 15px;
          font-weight: 800;
          color: var(--color-accent);
          margin-top: 8px;
          display: block;
        }
        
        .frequency-toggle-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 24px;
        }
        .frequency-toggle {
          display: inline-flex;
          background: var(--bg-main);
          border: 1.5px solid var(--border-color);
          border-radius: 20px;
          padding: 3px;
        }
        .frequency-btn {
          border: none;
          background: none;
          color: var(--text-secondary);
          font-size: 13px;
          font-weight: 600;
          padding: 8px 20px;
          border-radius: 16px;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .frequency-btn.is-active {
          background: var(--color-accent);
          color: #fff;
        }
        
        /* Payment methods styling */
        .payment-tabs {
          display: flex;
          border-bottom: 1.5px solid var(--border-color);
          margin-bottom: 24px;
        }
        .payment-tab-btn {
          flex: 1;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-size: 14px;
          font-weight: 600;
          padding: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: var(--transition-smooth);
        }
        .payment-tab-btn.is-active {
          border-color: var(--color-accent);
          color: var(--color-accent);
        }
        .address-checkbox {
          margin-top: 10px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          font-size: 13px;
          color: var(--text-secondary);
        }
        
        /* Confirmation Summary Custom styling */
        .summary-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
        }
        .summary-card-sub {
          background: var(--bg-main);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 16px;
        }
        .summary-card-sub h3 {
          font-size: 14px;
          font-weight: 700;
          color: var(--color-accent);
          margin: 0 0 12px 0;
          border-bottom: 1px solid var(--border-color);
          padding-bottom: 8px;
        }
        .summary-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 8px;
        }
        .summary-row:last-child {
          margin-bottom: 0;
        }
        .summary-row span:first-child {
          color: var(--text-secondary);
        }
        .summary-row span:last-child {
          color: var(--text-primary);
          font-weight: 600;
        }
        .summary-total-card {
          background: var(--color-primary-light);
          border: 1.5px solid var(--color-accent);
          border-radius: 12px;
          padding: 20px;
          text-align: center;
        }
        .summary-total-label {
          font-size: 13px;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .summary-total-price {
          font-size: 32px;
          font-weight: 800;
          color: var(--color-accent);
          margin: 8px 0;
        }
        .summary-total-freq {
          font-size: 12px;
          color: var(--text-secondary);
        }
        
        /* Success Screen layout */
        .success-wrapper {
          text-align: center;
          padding: 48px 24px;
        }
        .success-icon-wrap {
          color: var(--color-success, #10b981);
          margin-bottom: 24px;
          display: inline-flex;
          animation: scaleUp 0.5s ease-out;
        }
        .success-title {
          font-family: var(--font-heading), serif;
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 12px;
        }
        .success-desc {
          color: var(--text-secondary);
          font-size: 14.5px;
          max-width: 500px;
          margin: 0 auto 32px;
          line-height: 1.6;
        }
        
        @keyframes scaleUp {
          from { transform: scale(0.6); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ay-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 28px;
          border-top: 1px solid var(--border-color);
          padding-top: 20px;
        }
        .ay-actions-end {
          justify-content: flex-end;
        }
        .ay-btn-outline {
          display: flex;
          align-items: center;
          gap: 8px;
          background: none;
          border: 1px solid var(--border-color);
          border-radius: 10px;
          padding: 12px 20px;
          color: var(--text-primary);
          font-size: 13.5px;
          font-weight: 600;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .ay-btn-outline:hover {
          border-color: var(--color-accent);
        }
        .ay-btn-solid {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-primary);
          border: none;
          border-radius: 10px;
          padding: 12px 24px;
          color: #fff;
          font-size: 13.5px;
          font-weight: 700;
          cursor: pointer;
          transition: var(--transition-smooth);
        }
        .ay-btn-solid:hover {
          background: var(--color-primary-hover);
        }
        .ay-btn-solid:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
        .ay-footer {
          text-align: center;
          padding: 24px;
          border-top: 1px solid var(--border-color);
          font-size: 12.5px;
          color: var(--text-secondary);
        }
        .ay-footer a {
          color: var(--color-accent);
          font-weight: 600;
          text-decoration: none;
        }
        .ay-footer a:hover {
          text-decoration: underline;
        }
        @media (max-width: 780px) {
          .ay-row, .ay-birth-row, .ay-helper-grid, .membership-grid, .summary-grid {
            grid-template-columns: 1fr;
          }
          .ay-stepper {
            overflow-x: auto;
          }
        }
      `}</style>

      <header className="ay-header">
        <ChabadLogo className="chabad-logo" theme={theme} size={90} alt="Chabad of Bedford" />
        <div className="ay-header-title">
          <h1>Membership Onboarding</h1>
          <p>Join our community in a few simple steps.</p>
        </div>
        <div className="ay-header-actions">
          <button
            type="button"
            className="ay-theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            type="button"
            className="ay-help-link"
            onClick={() => setShowContactModal(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}
          >
            <HelpCircle size={16} /> Need Help?
          </button>
        </div>
      </header>

      <main className="ay-main">
        {/* HIDDEN: Stepper (code kept for later) */}
        {false && currentStep < 4 && (
          <div className="ay-stepper">
            {WIZARD_STEPS.map(({ icon, label }, i) => {
              const Icon = icon;
              const isActive = i === currentStep;
              const isCompleted = i < currentStep;
              return (
                <div key={label} className={`ay-step ${isActive ? 'is-active' : ''} ${isCompleted ? 'is-completed' : ''}`}>
                  <div className="ay-step-icon">
                    {isCompleted ? <Check size={20} /> : <Icon size={20} />}
                  </div>
                  <div className="ay-step-badge">{i + 1}</div>
                  <div className="ay-step-label">{label}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: About You */}
        {currentStep === 0 && (
          <div className="ay-card">
            <div className="ay-card-head">
              <div>
                <h2>About You</h2>
                <p>Let's begin with some basic information about you.</p>
              </div>
              <div className="ay-secure-note">
                <Lock size={14} />
                Your information is secure and encrypted.
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <p className="ay-section-label">Primary Member Info</p>

              <div className="ay-row">
                <div className="ay-field">
                  <label className="ay-label">Salutation</label>
                  <div className="ay-input-wrap">
                    <select value={form.salutation} onChange={update('salutation')}>
                      <option value="">-- Select --</option>
                      {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="ay-field">
                  <label className="ay-label">Gender</label>
                  <div className="ay-input-wrap">
                    <select value={form.gender} onChange={update('gender')}>
                      <option value="">--None--</option>
                      {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="ay-row">
                <div className="ay-field">
                  <label className="ay-label">First Name<span>*</span></label>
                  <div className={`ay-input-wrap ${errors.firstName ? 'has-error' : ''}`}>
                    <User size={16} />
                    <input type="text" placeholder="First Name" value={form.firstName} onChange={update('firstName')} />
                  </div>
                  {errors.firstName && <span className="ay-input-error">{errors.firstName}</span>}
                </div>
                <div className="ay-field">
                  <label className="ay-label">Last Name<span>*</span></label>
                  <div className={`ay-input-wrap ${errors.lastName ? 'has-error' : ''}`}>
                    <User size={16} />
                    <input type="text" placeholder="Last Name" value={form.lastName} onChange={update('lastName')} />
                  </div>
                  {errors.lastName && <span className="ay-input-error">{errors.lastName}</span>}
                </div>
              </div>

              <div className="ay-row">
                <div className="ay-field">
                  <label className="ay-label">Email<span>*</span></label>
                  <div className={`ay-input-wrap ${errors.email ? 'has-error' : ''}`}>
                    {checkingEmail ? (
                      <div className="spinner-mini" style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Mail size={16} />
                    )}
                    <input type="text" placeholder="you@example.com" value={form.email} onChange={update('email')} onBlur={handleEmailBlur} />
                  </div>
                  {errors.email && <span className="ay-input-error">{errors.email}</span>}
                </div>
                <div className="ay-field">
                  <label className="ay-label">Mobile Phone<span>*</span></label>
                  <div className={`ay-input-wrap ${errors.mobilePhone ? 'has-error' : ''}`}>
                    <Phone size={16} />
                    <input type="text" placeholder="(123) 456-7890" value={form.mobilePhone} onChange={update('mobilePhone')} />
                  </div>
                  {errors.mobilePhone && <span className="ay-input-error">{errors.mobilePhone}</span>}
                </div>
              </div>

              <div className="ay-field" style={{ marginBottom: 18 }}>
                <label className="ay-label">Birth Date <span className="ay-optional-label">(Optional)</span></label>
                <div className="ay-birth-row">
                  <div className={`ay-input-wrap ${errors.birthDate ? 'has-error' : ''}`}>
                    <Calendar size={16} />
                    <select value={form.birthMonth} onChange={update('birthMonth')}>
                      <option value="">Month</option>
                      {MONTHS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className={`ay-input-wrap ${errors.birthDate ? 'has-error' : ''}`}>
                    <select value={form.birthDay} onChange={update('birthDay')}>
                      <option value="">Day</option>
                      {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className={`ay-input-wrap ${errors.birthDate ? 'has-error' : ''}`}>
                    <select value={form.birthYear} onChange={update('birthYear')}>
                      <option value="">Year</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {errors.birthDate && <span className="ay-input-error">{errors.birthDate}</span>}
              </div>

              <div className="ay-row">
                <div className="ay-field">
                  <label className="ay-label">Hebrew Name</label>
                  <div className="ay-input-wrap">
                    <Languages size={16} />
                    <input type="text" placeholder="Hebrew Name" value={form.hebrewName} onChange={update('hebrewName')} />
                  </div>
                </div>
                <div className="ay-field">
                  <label className="ay-label">Father's Hebrew Name</label>
                  <div className="ay-input-wrap">
                    <Languages size={16} />
                    <input type="text" placeholder="Father's Hebrew Name" value={form.fatherHebrewName} onChange={update('fatherHebrewName')} />
                  </div>
                </div>
              </div>

              <div className="ay-row">
                <div className="ay-field">
                  <label className="ay-label">Mother's Hebrew Name</label>
                  <div className="ay-input-wrap">
                    <Languages size={16} />
                    <input type="text" placeholder="Mother's Hebrew Name" value={form.motherHebrewName} onChange={update('motherHebrewName')} />
                  </div>
                </div>
                <div className="ay-field">
                  <label className="ay-label">Occupation</label>
                  <div className="ay-input-wrap">
                    <Briefcase size={16} />
                    <input type="text" placeholder="Occupation" value={form.occupation} onChange={update('occupation')} />
                  </div>
                </div>
              </div>

              {/* HIDDEN — spouse/children/yahrzeit toggles (handled in later post-login steps) */}
              {false && (
              <div className="ay-section-head" onClick={() => setCommunityOpen((v) => !v)}>
                <div className="ay-section-head-text">
                  <h3>Community Information (Optional)</h3>
                  <span>This information helps us personalize your membership experience.</span>
                </div>
                {communityOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
              </div>
              )}

              {false && communityOpen && (
                <>
                  <div className="ay-helper-box">
                    <p className="ay-helper-title">Help Us Know You Better (Optional)</p>
                    <div className="ay-helper-grid">
                      <div className="ay-helper-item">
                        <span className="ay-helper-item-label"><Users size={16} /> Do you have a spouse?</span>
                        <YesNoToggle value={form.hasSpouse} onChange={(v) => setForm((f) => ({ ...f, hasSpouse: v }))} />
                      </div>
                      <div className="ay-helper-item">
                        <span className="ay-helper-item-label"><Users size={16} /> Do you have children?</span>
                        <YesNoToggle value={form.hasChildren} onChange={(v) => setForm((f) => ({ ...f, hasChildren: v }))} />
                      </div>
                    </div>
                  </div>

                  {/* Spouse creation form */}
                  {form.hasSpouse && (
                    <div className="ay-helper-box" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)' }}>
                      <p className="ay-helper-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Spouse / Secondary Member</p>
                      <div className="ay-row">
                        <div className="ay-field">
                          <label className="ay-label">Salutation</label>
                          <div className="ay-input-wrap">
                            <select value={form.spouseSalutation} onChange={update('spouseSalutation')}>
                              <option value="">-- Select --</option>
                              {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="ay-field">
                          <label className="ay-label">Gender</label>
                          <div className="ay-input-wrap">
                            <select value={form.spouseGender} onChange={update('spouseGender')}>
                              <option value="">-- None --</option>
                              {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>
                      <div className="ay-row">
                        <div className="ay-field">
                          <label className="ay-label">First Name<span>*</span></label>
                          <div className={`ay-input-wrap ${errors.spouseFirstName ? 'has-error' : ''}`}>
                            <User size={16} />
                            <input type="text" placeholder="First Name" value={form.spouseFirstName} onChange={update('spouseFirstName')} />
                          </div>
                          {errors.spouseFirstName && <span className="ay-input-error">{errors.spouseFirstName}</span>}
                        </div>
                        <div className="ay-field">
                          <label className="ay-label">Last Name<span>*</span></label>
                          <div className={`ay-input-wrap ${errors.spouseLastName ? 'has-error' : ''}`}>
                            <User size={16} />
                            <input type="text" placeholder="Last Name" value={form.spouseLastName} onChange={update('spouseLastName')} />
                          </div>
                          {errors.spouseLastName && <span className="ay-input-error">{errors.spouseLastName}</span>}
                        </div>
                      </div>
                      <div className="ay-field" style={{ marginBottom: 18 }}>
                        <label className="ay-label">Email<span>*</span></label>
                        <div className={`ay-input-wrap ${errors.spouseEmail ? 'has-error' : ''}`}>
                          <Mail size={16} />
                          <input type="text" placeholder="spouse@example.com" value={form.spouseEmail} onChange={update('spouseEmail')} />
                        </div>
                        {errors.spouseEmail && <span className="ay-input-error">{errors.spouseEmail}</span>}
                      </div>
                    </div>
                  )}

                  {/* Children list creation forms */}
                  {form.hasChildren && (
                    <div className="ay-helper-box" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)' }}>
                      <p className="ay-helper-title" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '8px', marginBottom: '16px' }}>Children Information</p>
                      
                      {errors.childrenList && (
                        <div className="ay-input-error" style={{ marginBottom: '14px', fontSize: '13px', fontWeight: '600' }}>
                          {errors.childrenList}
                        </div>
                      )}

                      {form.children.map((child, index) => (
                        <div key={index} style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', marginBottom: '16px', background: 'var(--bg-main)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px dashed var(--border-color)', paddingBottom: '8px' }}>
                            <span style={{ fontSize: '13.5px', fontWeight: '700', color: 'var(--color-accent)' }}>Child #{index + 1}</span>
                            <button
                              type="button"
                              className="ay-btn-outline"
                              style={{ padding: '4px 10px', fontSize: '12px', borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                              onClick={() => removeChild(index)}
                            >
                              Remove
                            </button>
                          </div>
                          
                          <div className="ay-row">
                            <div className="ay-field">
                              <label className="ay-label">Salutation</label>
                              <div className="ay-input-wrap">
                                <select value={child.salutation} onChange={(e) => updateChild(index, 'salutation', e.target.value)}>
                                  <option value="">-- Select --</option>
                                  {SALUTATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                              </div>
                            </div>
                            <div className="ay-field">
                              <label className="ay-label">Gender</label>
                              <div className="ay-input-wrap">
                                <select value={child.gender} onChange={(e) => updateChild(index, 'gender', e.target.value)}>
                                  <option value="">-- None --</option>
                                  {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>

                          <div className="ay-row">
                            <div className="ay-field">
                              <label className="ay-label">First Name<span>*</span></label>
                              <div className={`ay-input-wrap ${errors[`child_${index}_firstName`] ? 'has-error' : ''}`}>
                                <User size={16} />
                                <input type="text" placeholder="First Name" value={child.firstName} onChange={(e) => updateChild(index, 'firstName', e.target.value)} />
                              </div>
                              {errors[`child_${index}_firstName`] && <span className="ay-input-error">{errors[`child_${index}_firstName`]}</span>}
                            </div>
                            <div className="ay-field">
                              <label className="ay-label">Last Name<span>*</span></label>
                              <div className={`ay-input-wrap ${errors[`child_${index}_lastName`] ? 'has-error' : ''}`}>
                                <User size={16} />
                                <input type="text" placeholder="Last Name" value={child.lastName} onChange={(e) => updateChild(index, 'lastName', e.target.value)} />
                              </div>
                              {errors[`child_${index}_lastName`] && <span className="ay-input-error">{errors[`child_${index}_lastName`]}</span>}
                            </div>
                          </div>

                          <div className="ay-field" style={{ marginBottom: 18 }}>
                            <label className="ay-label">Email<span>*</span></label>
                            <div className={`ay-input-wrap ${errors[`child_${index}_email`] ? 'has-error' : ''}`}>
                              <Mail size={16} />
                              <input type="text" placeholder="child@example.com" value={child.email} onChange={(e) => updateChild(index, 'email', e.target.value)} />
                            </div>
                            {errors[`child_${index}_email`] && <span className="ay-input-error">{errors[`child_${index}_email`]}</span>}
                          </div>
                        </div>
                      ))}

                      <button type="button" className="ay-btn-outline" onClick={addChild} style={{ width: '100%', justifyContent: 'center' }}>
                        + Add Child
                      </button>
                    </div>
                  )}
                </>
              )}

              <div className="ay-actions ay-actions-end">
                <button type="submit" className="ay-btn-solid" disabled={isSubmitting}>
                  Next <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HIDDEN: Step 2 Membership Selection + Step 3 Confirmation (code kept for later) */}
        {false && currentStep === 1 && (
          <div className="ay-card">
            <div className="ay-card-head">
              <div>
                <h2>Membership Selection</h2>
                <p>Choose the membership category and plan frequency that fits you best.</p>
              </div>
              <div className="ay-secure-note">
                <Lock size={14} /> Secure Setup
              </div>
            </div>

            <form onSubmit={handleNext}>
              <div className="frequency-toggle-wrapper">
                <div className="frequency-toggle">
                  <button
                    type="button"
                    className={`frequency-btn ${form.paymentFrequency === 'monthly' ? 'is-active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, paymentFrequency: 'monthly' }))}
                  >
                    Monthly Payment
                  </button>
                  <button
                    type="button"
                    className={`frequency-btn ${form.paymentFrequency === 'annual' ? 'is-active' : ''}`}
                    onClick={() => setForm((f) => ({ ...f, paymentFrequency: 'annual' }))}
                  >
                    Annual Payment
                  </button>
                </div>
              </div>

              <div className="membership-grid">
                {/* Column 1: General Tiers */}
                <div>
                  <div className="membership-col-title">
                    <Users size={16} /> General Memberships
                  </div>
                  <div className="membership-card-list">
                    {MEMBERSHIP_TIERS.filter((t) => t.category === 'General').map((tier) => {
                      const isSelected = form.membershipTier === tier.id;
                      return (
                        <div
                          key={tier.id}
                          className={`membership-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, membershipTier: tier.id }))}
                        >
                          <input
                            type="radio"
                            name="membershipTier"
                            checked={isSelected}
                            readOnly
                            className="membership-card-radio"
                          />
                          <div className="membership-card-content">
                            <span className="membership-card-name">{tier.name}</span>
                            <span className="membership-card-desc">{tier.description}</span>
                            <span className="membership-card-price">
                              {form.paymentFrequency === 'monthly'
                                ? `$${Math.floor(tier.annualPrice / 12)} / month`
                                : `$${tier.annualPrice} / year`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Chai Club Tiers */}
                <div>
                  <div className="membership-col-title">
                    <Star size={16} /> Chai Club Partnership
                  </div>
                  <div className="membership-card-list">
                    {MEMBERSHIP_TIERS.filter((t) => t.category === 'Chai Club').map((tier) => {
                      const isSelected = form.membershipTier === tier.id;
                      return (
                        <div
                          key={tier.id}
                          className={`membership-card ${isSelected ? 'is-selected' : ''}`}
                          onClick={() => setForm((f) => ({ ...f, membershipTier: tier.id }))}
                        >
                          <input
                            type="radio"
                            name="membershipTier"
                            checked={isSelected}
                            readOnly
                            className="membership-card-radio"
                          />
                          <div className="membership-card-content">
                            <span className="membership-card-name">{tier.name}</span>
                            <span className="membership-card-desc">{tier.description}</span>
                            <span className="membership-card-price">
                              {form.paymentFrequency === 'monthly'
                                ? `$${Math.floor(tier.annualPrice / 12)} / month`
                                : `$${tier.annualPrice} / year`}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="ay-actions">
                <button type="button" className="ay-btn-outline" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="ay-btn-solid" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting Registration...' : 'Complete Registration'} <CheckCircle size={18} />
                </button>
              </div>
            </form>
          </div>
        )}

        {/* HIDDEN: Step 3 Confirmation (code kept for later) */}
        {false && currentStep === 2 && (
          <div className="ay-card">
            <div className="ay-card-head">
              <div>
                <h2>Review & Confirm</h2>
                <p>Double-check your information before submitting your membership application.</p>
              </div>
              <div className="ay-secure-note">
                <Lock size={14} /> Review Step
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="summary-grid">
                <div>
                  <div className="summary-card-sub">
                    <h3>Primary Member</h3>
                    <div className="summary-row">
                      <span>Full Name:</span>
                      <span>{form.firstName} {form.lastName}</span>
                    </div>
                    <div className="summary-row">
                      <span>Email:</span>
                      <span>{form.email}</span>
                    </div>

                    <div className="summary-row">
                      <span>Birth Date:</span>
                      <span>{form.birthMonth} {form.birthDay}, {form.birthYear}</span>
                    </div>
                    {form.occupation && (
                      <div className="summary-row">
                        <span>Occupation:</span>
                        <span>{form.occupation}</span>
                      </div>
                    )}
                  </div>

                  {form.hasSpouse && (
                    <div className="summary-card-sub">
                      <h3>Spouse Details</h3>
                      <div className="summary-row">
                        <span>Full Name:</span>
                        <span>{form.spouseSalutation} {form.spouseFirstName} {form.spouseLastName}</span>
                      </div>
                      {form.spouseEmail && (
                        <div className="summary-row">
                          <span>Email:</span>
                          <span>{form.spouseEmail}</span>
                        </div>
                      )}

                    </div>
                  )}

                  {form.hasChildren && form.children.length > 0 && (
                    <div className="summary-card-sub">
                      <h3>Children ({form.children.length})</h3>
                      {form.children.map((child, index) => (
                        <div key={index} style={{ marginBottom: index < form.children.length - 1 ? '10px' : '0', paddingBottom: index < form.children.length - 1 ? '10px' : '0', borderBottom: index < form.children.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                          <div className="summary-row">
                            <span>Child #{index + 1}:</span>
                            <span>{child.salutation} {child.firstName} {child.lastName}</span>
                          </div>
                          {child.email && (
                            <div className="summary-row">
                              <span>Email:</span>
                              <span>{child.email}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="summary-card-sub">
                    <h3>Membership Selection details</h3>
                    <div className="summary-row">
                      <span>Membership:</span>
                      <span>{selectedTierObj.name}</span>
                    </div>
                    <div className="summary-row">
                      <span>Category:</span>
                      <span>{selectedTierObj.category || 'General'}</span>
                    </div>
                    <div className="summary-row">
                      <span>Billing Frequency:</span>
                      <span>{form.paymentFrequency === 'monthly' ? 'Monthly' : 'Annually'}</span>
                    </div>
                    <div className="summary-row">
                      <span>Commitment Amount:</span>
                      <span>${calculatedPrice}</span>
                    </div>
                    <div className="summary-row" style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border-color)' }}>
                      <span>Annual Commitment:</span>
                      <span>${selectedTierObj.annualPrice}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="summary-total-card">
                    <span className="summary-total-label">Selected Membership</span>
                    <h3 style={{ margin: '10px 0 4px 0', fontSize: '18px', fontWeight: '700' }}>{selectedTierObj.name}</h3>
                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 16px 0' }}>{selectedTierObj.description}</p>
                    
                    <div style={{ borderTop: '1px solid var(--border-color)', margin: '14px 0' }}></div>
                    
                    <span className="summary-total-label">Commitment Amount</span>
                    <div className="summary-total-price">
                      ${calculatedPrice}
                    </div>
                    <span className="summary-total-freq">
                      Billed {form.paymentFrequency === 'monthly' ? 'Monthly' : 'Annually'}
                    </span>
                  </div>

                  <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    <ShieldCheck size={16} style={{ color: 'var(--color-success)' }} />
                    <span>Your details are processed through secure gateways.</span>
                  </div>
                </div>
              </div>

              <div className="ay-actions">
                <button type="button" className="ay-btn-outline" onClick={handleBack} disabled={isSubmitting}>
                  <ArrowLeft size={16} /> Back
                </button>
                <button type="submit" className="ay-btn-solid" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>Submitting Application...</>
                  ) : (
                    <>
                      Confirm & Submit <Check size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 5: Success View */}
        {currentStep === 4 && (
          <div className="ay-card">
            <div className="success-wrapper">
              <div className="success-icon-wrap">
                <CheckCircle size={64} strokeWidth={1.5} />
              </div>
              <h2 className="success-title">Welcome to the Community!</h2>
              <p className="success-desc">
                Thank you, <strong>{form.firstName}</strong>. Your membership application for <strong>{selectedTierObj.name}</strong> has been successfully received and processed. A confirmation email has been sent to <strong>{form.email}</strong>.
              </p>
              
              <button
                type="button"
                className="ay-btn-solid"
                style={{ margin: '0 auto' }}
                onClick={() => {
                  window.location.href = '/';
                }}
              >
                Go to Portal Dashboard <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="ay-footer">
        Need help?{' '}
        <button
          type="button"
          onClick={() => setShowContactModal(true)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit', color: 'inherit', padding: 0, textDecoration: 'underline' }}
        >
          Contact Us
        </button>
        {' '}at <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> | {SUPPORT_PHONE_DISPLAY}
      </footer>

      <ContactSupportModal
        open={showContactModal}
        onClose={() => setShowContactModal(false)}
      />
    </div>
  );
}
