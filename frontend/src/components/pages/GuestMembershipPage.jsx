import React, { useRef } from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  HandHeart,
  Heart,
  Users,
} from 'lucide-react';
import PortalPageLayout from '../shared/PortalPageLayout';
import ChabadLogo from '../shared/ChabadLogo';
import { ONBOARD_FIRST_FORM_PATH } from '../../onboard/utils/onboardingRoutes';
import { markPostLoginStepperPending } from '../../onboard/utils/postLoginStepper';

const MEMBERSHIP_BENEFITS = [
  {
    icon: Users,
    title: 'Vibrant Community',
    description: 'Connect with families and individuals who share your values and celebrate Jewish life together.',
  },
  {
    icon: BookOpen,
    title: 'Meaningful Learning',
    description: 'Access classes, programs, and resources that enrich your family\'s Jewish journey.',
  },
  {
    icon: Heart,
    title: 'Support & Guidance',
    description: 'Receive pastoral care, lifecycle support, and a caring community when you need it most.',
  },
  {
    icon: HandHeart,
    title: 'Make an Impact',
    description: 'Help sustain Jewish life in Bedford and strengthen our shared community for generations.',
  },
  {
    icon: CalendarDays,
    title: 'Exclusive Benefits',
    description: 'Enjoy member perks including holiday seats, program discounts, and special community events.',
  },
];

export default function GuestMembershipPage({ theme, onNavigate, user, sfData }) {
  const benefitsRef = useRef(null);

  const handleBecomeMember = () => {
    markPostLoginStepperPending();
    window.location.assign(ONBOARD_FIRST_FORM_PATH);
  };

  const handleLearnMore = () => {
    benefitsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <PortalPageLayout
      theme={theme}
      breadcrumbs={[
        { label: 'Dashboard', onClick: () => onNavigate('dashboard') },
        { label: 'Membership' },
      ]}
      showSketch={false}
      user={user}
      sfData={sfData}
    >
      <section className="guest-membership-cta glass-panel">
        <div className="guest-membership-cta-visual" aria-hidden="true">
          <div className="guest-membership-arch">
            <div className="guest-membership-arch-leaf guest-membership-arch-leaf--left" />
            <div className="guest-membership-arch-leaf guest-membership-arch-leaf--right" />
            <div className="guest-membership-logo-pedestal">
              <ChabadLogo className="guest-membership-logo" width={120} />
            </div>
          </div>
        </div>

        <div className="guest-membership-cta-content">
          <span className="guest-membership-heart-badge" aria-hidden="true">
            <Heart size={18} strokeWidth={1.75} />
          </span>

          <h2 className="guest-membership-title">You&apos;re Not a Member Yet</h2>

          <p className="guest-membership-lead">
            Become part of the Chabad Bedford family and enjoy access to our vibrant community,
            meaningful programs, lifecycle support, and exclusive member benefits.
          </p>

          <button type="button" className="guest-membership-primary-btn" onClick={handleBecomeMember}>
            Become a Member
            <ArrowRight size={18} aria-hidden="true" />
          </button>

          <div className="guest-membership-or-divider" role="presentation">
            <span />
            <span>OR</span>
            <span />
          </div>

          <button type="button" className="guest-membership-secondary-btn" onClick={handleLearnMore}>
            Learn More About Membership
          </button>
        </div>
      </section>

      <section className="guest-membership-benefits glass-panel" ref={benefitsRef}>
        <div className="guest-membership-benefits-heading">
          <h2>Why Members Love Being Part of Chabad Bedford</h2>
          <span className="guest-membership-benefits-underline" aria-hidden="true" />
        </div>

        <div className="guest-membership-benefits-grid">
          {MEMBERSHIP_BENEFITS.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="guest-membership-benefit">
                <span className="guest-membership-benefit-icon" aria-hidden="true">
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                <h3>{benefit.title}</h3>
                <p>{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>
    </PortalPageLayout>
  );
}
