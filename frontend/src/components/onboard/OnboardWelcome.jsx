import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  ClipboardList,
  Clock,
  Flame,
  HandHeart,
  HelpCircle,
  IdCard,
  Moon,
  Package,
  Shield,
  ShoppingBasket,
  Sparkles,
  Star,
  Sun,
  Tag,
  User,
  Users,
  Wheat,
} from 'lucide-react';
import ChabadLogo from '../shared/ChabadLogo';
import { SUPPORT_EMAIL } from '../../constants/supportContact';
import heroImage from './onboard-hero.jpg';
import { ONBOARD_PATH, ONBOARD_ABOUT_YOU_PATH } from './routes';

export { ONBOARD_PATH };

const BENEFITS = [
  { icon: Users, label: 'High Holiday Seats for immediate family members' },
  { icon: IdCard, label: 'Membership Directory Listing' },
  { icon: Flame, label: 'Yizkor Booklet listings' },
  { icon: Package, label: 'Shmurah Matzah for Passover' },
  { icon: Tag, label: 'Discounts on events & programs' },
  { icon: Sparkles, label: 'Menorah & Candles kit mailed to college age children' },
  { icon: ShoppingBasket, label: 'Purim Basket delivered to your home' },
  { icon: Wheat, label: 'Lulav & Etrog set for Sukkot' },
  { icon: HandHeart, label: 'Shiva services after the loss of a loved one' },
  { icon: Users, label: 'Belonging to an amazing community & lifelong friendships' },
];

const STEPS = [
  { number: 1, label: 'About You', icon: User, active: true },
  // HIDDEN for now — keep for later restore
  // { number: 2, label: 'Membership Selection', icon: Star, active: false },
  // { number: 3, label: 'Confirmation', icon: ClipboardList, active: false },
];

export default function OnboardWelcome() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

  useEffect(() => {
    document.documentElement.classList.toggle('light-theme', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleBeginApplication = () => {
    window.location.href = ONBOARD_ABOUT_YOU_PATH;
  };

  return (
    <div className="onboard-page">
      <style>{`
        .onboard-page {
          position: relative;
          min-height: 100vh;
          background: var(--bg-main);
          color: var(--text-primary);
          font-family: var(--font-body), sans-serif;
        }
        .onboard-hero-bleed {
          position: absolute;
          top: 0;
          right: 0;
          width: 58%;
          height: 640px;
          overflow: hidden;
          z-index: 0;
          border-radius: 0 0 0 24px;
        }
        .onboard-hero-bleed img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          -webkit-mask-image: linear-gradient(to right, transparent 0%, black 20%);
          mask-image: linear-gradient(to right, transparent 0%, black 20%);
        }
        .onboard-hero-bleed::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0) 40%);
          pointer-events: none;
        }
        .onboard-header {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 32px;
        }
        .onboard-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .onboard-logo-text {
          display: flex;
          flex-direction: column;
          line-height: 1.15;
        }
        .onboard-logo-text strong {
          font-family: var(--font-heading), serif;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--text-primary);
        }
        .onboard-logo-text span {
          font-family: var(--font-body), sans-serif;
          font-size: 12.5px;
          font-weight: 600;
          letter-spacing: 0.22em;
          color: var(--color-accent);
          margin-top: 2px;
        }
        .onboard-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .onboard-theme-toggle {
          background: none;
          border: none;
          color: var(--text-secondary);
          cursor: pointer;
          padding: 6px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .onboard-theme-toggle:hover {
          background: var(--color-primary-light);
          color: var(--text-primary);
        }
        .onboard-help-link {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #fff;
          text-shadow: 0 1px 4px rgba(0, 0, 0, 0.5);
          font-size: 13.5px;
          font-weight: 600;
          text-decoration: none;
        }
        .onboard-help-link:hover {
          text-decoration: underline;
        }
        .onboard-main {
          position: relative;
          z-index: 1;
          max-width: 1500px;
          margin: 0 auto;
          padding: 20px 32px 0px;
        }
        .onboard-hero {
          position: relative;
          max-width: 425px;
          min-height: 500px;
          margin-left: 50px;
        }
        .onboard-hero h1 {
          font-family: var(--font-heading), serif;
          color: var(--text-primary);
          font-size: 40px;
          line-height: 1.15;
          margin: 0 0 20px;
          font-weight: 700;
        }
        .onboard-hero p {
          color: var(--text-secondary);
          font-size: 15.5px;
          line-height: 1.7;
          margin: 0 25px 12px 0;
        }
        .onboard-time-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: var(--color-primary-light);
          border-radius: 10px;
          padding: 10px 16px;
          font-size: 13.5px;
          color: var(--text-primary);
          margin-top: 16px;
        }
        .onboard-time-badge strong {
          color: var(--color-accent);
        }
        .onboard-panel {
          background: var(--bg-card);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          box-shadow: var(--glass-shadow);
          display: grid;
          /* Application Process temporarily hidden — restore 1fr 1fr when re-enabled */
          grid-template-columns: 1fr;
          gap: 0;
          overflow: hidden;
          position: relative;
          z-index: 1;
          margin-top: -50px;
          margin-bottom: 24px;
        }
        .onboard-panel-col {
          padding: 40px 36px;
        }
        .onboard-panel-col + .onboard-panel-col {
          border-left: 1px solid var(--border-color);
        }
        .onboard-panel-title {
          text-align: center;
          font-family: var(--font-heading), serif;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-primary);
          margin: 0 0 28px;
          position: relative;
          padding-bottom: 14px;
        }
        .onboard-panel-title::after {
          content: '';
          position: absolute;
          left: 50%;
          bottom: 0;
          transform: translateX(-50%);
          width: 48px;
          height: 3px;
          background: var(--color-accent);
          border-radius: 2px;
        }
        .onboard-benefits-grid {
          display: grid;
          grid-template-columns:repeat(5, 1fr);
          gap: 28px 22px;
        }
        .onboard-benefit {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }
        .onboard-benefit-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: var(--color-primary-light);
          color: var(--color-accent);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboard-benefit span {
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.45;
          font-weight: 600;
        }
        .onboard-steps {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0;
          padding: 12px 8px 4px;
          position: relative;
        }
        .onboard-step {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
          padding: 0 8px;
          z-index: 1;
        }
        .onboard-step::before {
          content: '';
          position: absolute;
          left: calc(-50% + 28px);
          right: calc(50% + 28px);
          top: 27px;
          height: 2px;
          background: var(--border-color);
          z-index: 0;
          pointer-events: none;
        }
        .onboard-step:first-child::before {
          display: none;
        }
        .onboard-step-icon-wrap {
          position: relative;
          width: 56px;
          height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboard-step-icon {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: 2px solid rgba(148, 163, 184, 0.35);
          background: transparent;
          color: var(--text-secondary);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .onboard-step.is-active .onboard-step-icon {
          border-color: var(--color-accent);
          color: var(--color-accent);
          background: rgba(200, 148, 63, 0.08);
        }
        .onboard-step-num {
          position: absolute;
          left: 50%;
          bottom: -6px;
          transform: translateX(-50%);
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #fff;
          background: #1e293b;
          border: 2px solid var(--bg-card, #0b0e14);
          z-index: 2;
        }
        .light-theme .onboard-step-num {
          background: #334155;
          border-color: #ffffff;
        }
        .onboard-step.is-active .onboard-step-num {
          background: var(--color-accent);
          color: #fff;
        }
        .onboard-step-label {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-secondary);
          line-height: 1.35;
          margin-top: 4px;
        }
        .onboard-step.is-active .onboard-step-label {
          color: var(--color-accent);
          font-weight: 700;
        }
        .onboard-steps-note {
          display: flex;
          align-items: center;
          gap: 8px;
          justify-content: center;
          margin-top: 20px;
          font-size: 12.5px;
          color: var(--text-secondary);
        }
        .onboard-cta-bar {
          background: var(--color-primary-light);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          padding: 22px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
        }
        .onboard-cta-item {
          display: flex;
          align-items: center;
          gap: 12px;
          max-width: 340px;
        }
        .onboard-cta-item svg {
          color: var(--color-accent);
          flex-shrink: 0;
        }
        .onboard-cta-item strong {
          display: block;
          font-size: 13.5px;
          color: var(--text-primary);
        }
        .onboard-cta-item span {
          font-size: 12px;
          color: var(--text-secondary);
        }
        .onboard-cta-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--color-primary);
          color: #fff;
          border: none;
          border-radius: 10px;
          padding: 14px 24px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: var(--transition-smooth);
        }
        .onboard-cta-btn:hover {
          background: var(--color-primary-hover);
        }
        .onboard-footer {
          text-align: center;
          padding: 24px;
          font-size: 13px;
          color: var(--text-secondary);
        }
        .onboard-footer a {
          color: var(--color-accent);
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }
        .onboard-footer a:hover {
          text-decoration: underline;
        }
        @media (max-width: 860px) {
          .onboard-panel {
            grid-template-columns: 1fr;
          }
          .onboard-panel-col + .onboard-panel-col {
            border-left: none;
            border-top: 1px solid var(--border-color);
          }
          .onboard-hero-bleed {
            display: none;
          }
          .onboard-hero {
            max-width: 100%;
            min-height: 0;
          }
          .onboard-panel {
            margin-top: 24px;
          }
        }
      `}</style>

      <div className="onboard-hero-bleed">
        <img src={heroImage} alt="Chabad Bedford community gathering" />
      </div>

      <header className="onboard-header">
        <div className="onboard-header-left">
          <ChabadLogo className="chabad-logo" size={72} alt="Chabad Bedford" />
          <div className="onboard-logo-text">
            <strong>CHABAD</strong>
            <span>BEDFORD</span>
          </div>
        </div>
        <div className="onboard-header-actions">
          <button
            type="button"
            className="onboard-theme-toggle"
            onClick={toggleTheme}
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <a href={`mailto:${SUPPORT_EMAIL}`} className="onboard-help-link">
            <HelpCircle size={16} /> Need Help?
          </a>
        </div>
      </header>

      <main className="onboard-main">
        <section className="onboard-hero">
          <h1>We'd Love Your Family To Join Our Family</h1>
          <p>
            Chabad of Bedford is a thriving Jewish community. We welcome you to join our
            <strong> membership family</strong> and become part of our wonderful community.
          </p>
          <p>
            Today, more than ever, Jewish people need to stand together, support each other, and
            support our community. Joining Chabad will help guarantee the strength of your family
            and that of our community.
          </p>
          {/* HIDDEN: Estimated time badge (code kept for later) */}
          {false && (
          <div className="onboard-time-badge">
            <Clock size={16} />
            Estimated time to complete: <strong>1-3 minutes</strong>
          </div>
          )}
        </section>

        <section className="onboard-panel">
          <div className="onboard-panel-col">
            <h2 className="onboard-panel-title">Membership Benefits</h2>
            <div className="onboard-benefits-grid">
              {BENEFITS.map(({ icon, label }) => {
                const Icon = icon;
                return (
                  <div className="onboard-benefit" key={label}>
                    <div className="onboard-benefit-icon">
                      <Icon size={24} />
                    </div>
                    <span>{label}</span>
                  </div>
                );
              })}
            </div>
          </div>
          {/* HIDDEN: Application Process box (code kept for later) */}
          {false && (
          <div className="onboard-panel-col">
            <h2 className="onboard-panel-title">Application Process</h2>
            <div className="onboard-steps">
              {STEPS.map(({ number, label, icon: Icon, active }) => (
                <div className={`onboard-step${active ? ' is-active' : ''}`} key={label}>
                  <div className="onboard-step-icon-wrap">
                    <div className="onboard-step-icon">
                      <Icon size={22} strokeWidth={1.75} />
                    </div>
                    <span className="onboard-step-num">{number}</span>
                  </div>
                  <div className="onboard-step-label">{label}</div>
                </div>
              ))}
            </div>
            <div className="onboard-steps-note">
              <Clock size={14} /> Approx. 1-3 Minutes
            </div>
          </div>
          )}
        </section>

        <section className="onboard-cta-bar">
          <div className="onboard-cta-item">
            <Shield size={26} />
            <div>
              <strong>Secure Application</strong>
              <span>Your information is securely protected and used only for membership administration.</span>
            </div>
          </div>
          <div className="onboard-cta-item">
            <Users size={26} />
            <div>
              <strong>Join hundreds of members</strong>
              <span>Help sustain Jewish life and community in Bedford.</span>
            </div>
          </div>
          <button type="button" className="onboard-cta-btn" onClick={handleBeginApplication}>
            Begin Membership Application <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="onboard-footer">
        Questions? We're here to help.
        <a href={`mailto:${SUPPORT_EMAIL}`}>Contact Us →</a>
      </footer>
    </div>
  );
}
