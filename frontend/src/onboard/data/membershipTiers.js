import { Users, Star, Users2, User, Crown, Shield } from 'lucide-react';
import MenorahIcon from '../components/icons/MenorahIcon';
import StarOfDavidIcon from '../components/icons/StarOfDavidIcon';

/**
 * Shared membership tier catalog. Annual price is stored as a number so the
 * Contribution Schedule page can compute installment/monthly amounts from
 * whichever tier the applicant picked, not just display a static string.
 */
export const GENERAL_TIERS = [
  {
    id: 'family',
    name: 'Family Membership',
    description: 'Perfect for families who want to be actively involved in our community and programs.',
    annualPrice: 1800,
    icon: Users,
    accent: 'blue',
  },
  {
    id: 'upgraded',
    name: 'Upgraded Membership',
    description: 'Enhanced benefits and opportunities for deeper engagement and impact.',
    annualPrice: 2500,
    icon: Star,
    accent: 'purple',
  },
  {
    id: 'single-parent',
    name: 'Single Parent Membership',
    description: 'Supporting single parents and their children in our community.',
    annualPrice: 1200,
    icon: Users2,
    accent: 'green',
  },
  {
    id: 'single',
    name: 'Single Membership',
    description: 'For individuals seeking connection and Jewish life enrichment.',
    annualPrice: 750,
    icon: User,
    accent: 'orange',
  },
  {
    id: 'senior',
    name: 'Senior Membership (65+)',
    description: 'Special rate for seniors (65+) to stay engaged and inspired.',
    annualPrice: 600,
    icon: MenorahIcon,
    accent: 'blue',
  },
];

export const CHAI_TIERS = [
  {
    id: 'chai-donor',
    name: 'Chai Donor',
    description: 'Your generosity helps sustain our daily operations and essential programs.',
    annualPrice: 1800,
    isOpenEnded: true,
    tagline: 'Keeps our community strong every day.',
    glyph: 'חי',
    accent: 'gold',
  },
  {
    id: 'chai-partner',
    name: 'Chai Partner',
    description: 'Partner with us to expand programs and reach more families.',
    annualPrice: 3600,
    isOpenEnded: true,
    tagline: 'Empowers growth and new initiatives.',
    icon: Crown,
    accent: 'gold',
  },
  {
    id: 'chai-rabbis-circle',
    name: "Chai Rabbi's Circle",
    description: 'Invest in leadership, education, and inspiring Jewish experiences.',
    annualPrice: 5000,
    isOpenEnded: true,
    tagline: 'Strengthens Jewish life for future generations.',
    icon: StarOfDavidIcon,
    accent: 'gold',
  },
  {
    id: 'chai-leadership-circle',
    name: 'Chai Leadership Circle',
    description: 'Make a transformational impact and help shape the future of our community.',
    annualPrice: 10000,
    isOpenEnded: true,
    tagline: 'Leads our community to a vibrant future.',
    icon: Shield,
    accent: 'gold',
  },
];

export const ALL_MEMBERSHIP_TIERS = [...GENERAL_TIERS, ...CHAI_TIERS];

export function getMembershipTierById(id) {
  return ALL_MEMBERSHIP_TIERS.find((tier) => tier.id === id);
}

export function formatCurrency(amount) {
  return amount.toLocaleString('en-US', {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}
