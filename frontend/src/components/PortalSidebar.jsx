import React from 'react';
import ChabadSidebarLogo from './shared/ChabadSidebarLogo';
import BuildingSketch from './shared/BuildingSketch';
import {
  Home,
  Shield,
  Users,
  CircleDollarSign,
  Landmark,
  CreditCard,
  RefreshCw,
  Bell,
  User,
  Settings,
  HelpCircle,
  Headphones,
  ArrowRight,
} from 'lucide-react';

const NAV_SECTIONS = [
  {
    label: 'MAIN',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: Home },
      { id: 'membership', label: 'Membership', icon: Shield },
      { id: 'household', label: 'Household', icon: Users },
      { id: 'financial', label: 'Financial Overview', icon: CircleDollarSign },
    ],
  },
  {
    label: 'FINANCIAL',
    items: [
      // { id: 'contributions', label: 'Contributions', icon: Landmark },
      { id: 'payments', label: 'Payments', icon: CreditCard },
      { id: 'recurring', label: 'Recurring Contributions', icon: RefreshCw },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      // HIDDEN: Notifications (kept for later)
      // { id: 'notifications', label: 'Notifications', icon: Bell },
      { id: 'profile', label: 'My Profile', icon: User },
      // HIDDEN: Settings (kept for later)
      // { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'help', label: 'Help & Support', icon: HelpCircle },
    ],
  },
];

const PAYMENT_NAV_IDS = new Set(['financial', 'contributions', 'payments', 'recurring']);

function getNavSections(paymentsDisabled) {
  if (!paymentsDisabled) return NAV_SECTIONS;

  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !PAYMENT_NAV_IDS.has(item.id)),
    }))
    .filter((section) => section.items.length > 0);
}
const ALL_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

const PAGE_TITLES = Object.fromEntries(
  ALL_ITEMS.map((item) => [item.id, item.id === 'dashboard' ? 'Member Portal' : item.label])
);

export function getPortalPageTitle(tabId) {
  if (tabId === 'member-details') return 'Member Details';
  return PAGE_TITLES[tabId] || 'Member Portal';
}

function NavLink({ item, activeTab, onNavigate }) {
  const Icon = item.icon;
  return (
    <li>
      <button
        type="button"
        className={`sidebar-link ${activeTab === item.id || (item.id === 'household' && activeTab === 'member-details') ? 'active' : ''}`}
        onClick={() => onNavigate(item.id)}
      >
        <Icon size={18} strokeWidth={1.75} className="sidebar-link-icon" />
        <span className="sidebar-link-label">{item.label}</span>
        {item.badge ? <span className="sidebar-badge">{item.badge}</span> : null}
      </button>
    </li>
  );
}

export default function PortalSidebar({ activeTab, onNavigate, isOpen, theme, paymentsDisabled = false, onContactSupport }) {
  const navSections = getNavSections(paymentsDisabled);

  return (
    <aside className={`portal-sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-brand">
        <ChabadSidebarLogo theme={theme} />
      </div>

      <div className="sidebar-body">
        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              <p className="sidebar-section-label">{section.label}</p>
              <ul className="sidebar-menu">
                {section.items.map((item) => (
                  <NavLink
                    key={item.id}
                    item={item}
                    activeTab={activeTab}
                    onNavigate={onNavigate}
                  />
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <BuildingSketch theme={theme} className="sidebar-sketch-bg" />
          <div className="sidebar-help-card">
            <Headphones size={20} className="sidebar-help-icon" />
            <button
              type="button"
              className="sidebar-help-title-btn"
              onClick={onContactSupport}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                font: 'inherit',
                color: 'inherit',
                textAlign: 'left',
              }}
            >
              <h4>Need Help?</h4>
            </button>
            <p>Our support team is here to help.</p>
            <button type="button" className="sidebar-help-link" onClick={onContactSupport} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              Contact Support
              <ArrowRight size={14} />
            </button>
          </div>
          <p className="sidebar-copyright">
            © {new Date().getFullYear()} Chabad Bedford. All rights reserved.
          </p>
        </div>
      </div>
    </aside>
  );
}
