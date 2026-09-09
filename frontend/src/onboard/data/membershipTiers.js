import { Users, Star, Users2, User, Crown, Shield } from 'lucide-react';
import MenorahIcon from '../components/icons/MenorahIcon';
import StarOfDavidIcon from '../components/icons/StarOfDavidIcon';
import { getMembershipYearSuffix } from '../../utils/portalFiscalYear';

/**
 * Salesforce group sent to MAKE_ASSIGN_GROUP_WEBHOOK_URL:
 * "{tier name} {YY}-{YY+1} (Household)" based on membership year
 * (1 Sep–31 Dec → current/next; 1 Jan–31 Aug → previous/current).
 */
export function formatMembershipSalesforceGroup(name, referenceDate = new Date()) {
  const label = String(name || 'Membership').trim();
  return `${label} ${getMembershipYearSuffix(referenceDate)}`;
}

// Previous (commented out): hardcoded 26-27 suffix
// export const MEMBERSHIP_YEAR_SUFFIX = '26-27 (Household)';
// export function formatMembershipSalesforceGroup(name) {
//   const label = String(name || 'Membership').trim();
//   return `${label} ${MEMBERSHIP_YEAR_SUFFIX}`;
// }

function withLiveSfGroup(tier) {
  return {
    ...tier,
    get sfGroup() {
      return formatMembershipSalesforceGroup(tier.name);
    },
  };
}

/**
 * Shared membership tier catalog. Annual price is stored as a number so the
 * Contribution Schedule page can compute installment/monthly amounts from
 * whichever tier the applicant picked, not just display a static string.
 */
export const GENERAL_TIERS = [
  {
    id: 'family',
    name: 'Family Membership',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Family Membership 26-27 (Household) (Household)',
    // sfGroup: 'Family Membership 26-27 (Household)',
    description: 'Perfect for families who want to be actively involved in our community and programs.',
    annualPrice: 2244,
    icon: Users,
    accent: 'blue',
  },
  {
    id: 'upgraded',
    name: 'Upgraded Membership',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Upgraded Membership 26-27 (Household) (Household)',
    // sfGroup: 'Upgraded Membership 26-27 (Household)',
    description: 'Enhanced benefits and opportunities for deeper engagement and impact.',
    annualPrice: 3000,
    icon: Star,
    accent: 'purple',
  },
  {
    id: 'single-parent',
    name: 'Single Parent Family',
    // Previous (commented out): generic Membership year, then hardcoded 26-27
    // sfGroup: 'Membership 26-27 (Household)',
    // sfGroup: 'Single Parent Family 26-27 (Household)',
    description: 'Supporting single parents and their children in our community.',
    annualPrice: 1560,
    icon: Users2,
    accent: 'green',
  },
  {
    id: 'single',
    name: 'Single Membership',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Single Membership 26-27 (Household) (Household)',
    // sfGroup: 'Single Membership 26-27 (Household)',
    description: 'For individuals seeking connection and Jewish life enrichment.',
    annualPrice: 1128,
    icon: User,
    accent: 'orange',
  },
  {
    id: 'senior',
    name: 'Senior Citizen Membership',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Senior Citizen Membership 26-27 (Household) (Household)',
    // sfGroup: 'Senior Citizen Membership 26-27 (Household)',
    description: 'Special rate for seniors (65+) to stay engaged and inspired.',
    annualPrice: 1800,
    icon: MenorahIcon,
    accent: 'blue',
  },
].map(withLiveSfGroup);

export const CHAI_TIERS = [
  {
    id: 'chai-donor',
    name: 'Chai Donor',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Chai Donor Membership 26-27 (Household) (Household)',
    // sfGroup: 'Chai Donor 26-27 (Household)',
    description: 'Your generosity helps sustain our daily operations and essential programs.',
    annualPrice: 5000,
    isOpenEnded: false,
    tagline: 'Keeps our community strong every day.',
    glyph: 'חי',
    accent: 'gold',
  },
  {
    id: 'chai-partner',
    name: 'Chai Partner',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Chai Partner Membership 26-27 (Household) (Household)',
    // sfGroup: 'Chai Partner 26-27 (Household)',
    description: 'Partner with us to expand programs and reach more families.',
    annualPrice: 10000,
    isOpenEnded: false,
    tagline: 'Empowers growth and new initiatives.',
    icon: Crown,
    accent: 'gold',
  },
  {
    id: 'chai-rabbis-circle',
    name: "Chai Rabbi's Circle",
    // Previous (commented out): hardcoded year
    // sfGroup: 'Chai Rabbi Circle Membership 26-27 (Household) (Household)',
    // sfGroup: "Chai Rabbi's Circle 26-27 (Household)",
    description: 'Invest in leadership, education, and inspiring Jewish experiences.',
    annualPrice: 18000,
    isOpenEnded: false,
    tagline: 'Strengthens Jewish life for future generations.',
    icon: StarOfDavidIcon,
    accent: 'gold',
  },
  {
    id: 'chai-leadership-circle',
    name: 'Chai Leadership Circle',
    // Previous (commented out): hardcoded year
    // sfGroup: 'Chai Leadership Circle Membership 26-27 (Household) (Household)',
    // sfGroup: 'Chai Leadership Circle 26-27 (Household)',
    description: 'Make a transformational impact and help shape the future of our community.',
    annualPrice: 36000,
    isOpenEnded: false,
    tagline: 'Leads our community to a vibrant future.',
    icon: Shield,
    accent: 'gold',
  },
].map(withLiveSfGroup);

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
