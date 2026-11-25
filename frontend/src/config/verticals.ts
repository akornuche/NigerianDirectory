/**
 * Multi-Vertical Directory Configuration
 * 
 * This file defines the complete structure of all verticals, categories,
 * and subcategories for the NigerianDirectory platform.
 * 
 * Launch Status:
 * - 'live': Fully functional with listings
 * - 'coming-soon': Shows Coming Soon page with noindex
 */

export type LaunchStatus = 'live' | 'coming-soon';

export interface Subcategory {
  name: string;
  slug: string;
  description: string;
  status: LaunchStatus;
  icon?: string;
}

export interface Category {
  name: string;
  slug: string;
  description: string;
  status: LaunchStatus;
  icon: string;
  color: string;
  subcategories: Subcategory[];
}

export interface Vertical {
  name: string;
  slug: string;
  description: string;
  status: LaunchStatus;
  icon: string;
  color: string;
  categories: Category[];
}

// ============================================
// VERTICAL DEFINITIONS
// ============================================

export const verticals: Vertical[] = [
  // ============================================
  // EDUCATION - LIVE
  // ============================================
  {
    name: 'Education',
    slug: 'education',
    description: 'Schools, universities, and educational institutions across Nigeria',
    status: 'live',
    icon: 'AcademicCapIcon',
    color: 'primary',
    categories: [
      {
        name: 'Schools',
        slug: 'schools',
        description: 'Primary, secondary, and international schools',
        status: 'live',
        icon: 'BuildingLibraryIcon',
        color: 'primary',
        subcategories: [
          {
            name: 'Primary Schools',
            slug: 'primary',
            description: 'Nursery and primary education (ages 3-11)',
            status: 'coming-soon',
          },
          {
            name: 'Secondary Schools',
            slug: 'secondary',
            description: 'Junior and senior secondary schools (ages 11-18)',
            status: 'live',
          },
          {
            name: 'International Schools',
            slug: 'international',
            description: 'Schools offering British, American, IB curricula',
            status: 'live',
          },
          {
            name: 'Boarding Schools',
            slug: 'boarding',
            description: 'Residential schools with accommodation',
            status: 'coming-soon',
          },
          {
            name: 'Special Needs Schools',
            slug: 'special-needs',
            description: 'Schools for children with special educational needs',
            status: 'coming-soon',
          },
        ],
      },
      {
        name: 'Universities',
        slug: 'universities',
        description: 'Federal, state, and private universities',
        status: 'live',
        icon: 'AcademicCapIcon',
        color: 'primary',
        subcategories: [
          { name: 'Federal Universities', slug: 'federal', description: 'Government-owned federal universities', status: 'live' },
          { name: 'State Universities', slug: 'state', description: 'State government-owned universities', status: 'live' },
          { name: 'Private Universities', slug: 'private', description: 'Privately-owned universities', status: 'live' },
        ],
      },
      {
        name: 'Colleges & Polytechnics',
        slug: 'colleges',
        description: 'Polytechnics, colleges of education, and monotechnics',
        status: 'coming-soon',
        icon: 'BookOpenIcon',
        color: 'primary',
        subcategories: [
          { name: 'Polytechnics', slug: 'polytechnics', description: 'Technical and vocational polytechnics', status: 'coming-soon' },
          { name: 'Colleges of Education', slug: 'colleges-of-education', description: 'Teacher training institutions', status: 'coming-soon' },
        ],
      },
      {
        name: 'Training Centers',
        slug: 'training-centers',
        description: 'Professional training and skill acquisition centers',
        status: 'coming-soon',
        icon: 'ComputerDesktopIcon',
        color: 'primary',
        subcategories: [
          { name: 'IT Training', slug: 'it-training', description: 'Computer and technology training', status: 'coming-soon' },
          { name: 'Vocational Training', slug: 'vocational', description: 'Trade and vocational skills', status: 'coming-soon' },
        ],
      },
    ],
  },

  // ============================================
  // HEALTH & WELLNESS - COMING SOON
  // ============================================
  {
    name: 'Health & Wellness',
    slug: 'health',
    description: 'Hospitals, clinics, pharmacies, and wellness centers',
    status: 'coming-soon',
    icon: 'HeartIcon',
    color: 'red',
    categories: [
      {
        name: 'Hospitals',
        slug: 'hospitals',
        description: 'General and specialist hospitals',
        status: 'coming-soon',
        icon: 'BuildingOffice2Icon',
        color: 'red',
        subcategories: [
          { name: 'General Hospitals', slug: 'general', description: 'Multi-specialty hospitals', status: 'coming-soon' },
          { name: 'Teaching Hospitals', slug: 'teaching', description: 'University teaching hospitals', status: 'coming-soon' },
          { name: 'Private Hospitals', slug: 'private', description: 'Private healthcare facilities', status: 'coming-soon' },
          { name: 'Specialist Hospitals', slug: 'specialist', description: 'Single-specialty hospitals', status: 'coming-soon' },
        ],
      },
      {
        name: 'Clinics',
        slug: 'clinics',
        description: 'Medical and dental clinics',
        status: 'coming-soon',
        icon: 'HeartIcon',
        color: 'red',
        subcategories: [
          { name: 'Medical Clinics', slug: 'medical', description: 'General medical clinics', status: 'coming-soon' },
          { name: 'Dental Clinics', slug: 'dental', description: 'Dental care facilities', status: 'coming-soon' },
          { name: 'Eye Clinics', slug: 'eye', description: 'Ophthalmology clinics', status: 'coming-soon' },
        ],
      },
      {
        name: 'Pharmacies',
        slug: 'pharmacies',
        description: 'Retail and hospital pharmacies',
        status: 'coming-soon',
        icon: 'BeakerIcon',
        color: 'red',
        subcategories: [],
      },
      {
        name: 'Wellness Centers',
        slug: 'wellness',
        description: 'Gyms, spas, and fitness centers',
        status: 'coming-soon',
        icon: 'SparklesIcon',
        color: 'red',
        subcategories: [
          { name: 'Gyms & Fitness', slug: 'gyms', description: 'Fitness centers and gyms', status: 'coming-soon' },
          { name: 'Spas', slug: 'spas', description: 'Spas and relaxation centers', status: 'coming-soon' },
          { name: 'Yoga Studios', slug: 'yoga', description: 'Yoga and meditation centers', status: 'coming-soon' },
        ],
      },
    ],
  },

  // ============================================
  // FOOD & DINING - COMING SOON
  // ============================================
  {
    name: 'Food & Dining',
    slug: 'food',
    description: 'Restaurants, cafes, catering, and food services',
    status: 'coming-soon',
    icon: 'CakeIcon',
    color: 'orange',
    categories: [
      {
        name: 'Restaurants',
        slug: 'restaurants',
        description: 'Fine dining, casual, and fast food restaurants',
        status: 'coming-soon',
        icon: 'BuildingStorefrontIcon',
        color: 'orange',
        subcategories: [
          { name: 'Fine Dining', slug: 'fine-dining', description: 'Upscale restaurants', status: 'coming-soon' },
          { name: 'Casual Dining', slug: 'casual', description: 'Family restaurants', status: 'coming-soon' },
          { name: 'Fast Food', slug: 'fast-food', description: 'Quick service restaurants', status: 'coming-soon' },
          { name: 'Local Cuisine', slug: 'local', description: 'Traditional Nigerian restaurants', status: 'coming-soon' },
        ],
      },
      {
        name: 'Cafes & Bakeries',
        slug: 'cafes',
        description: 'Coffee shops, bakeries, and dessert places',
        status: 'coming-soon',
        icon: 'CakeIcon',
        color: 'orange',
        subcategories: [],
      },
      {
        name: 'Catering Services',
        slug: 'catering',
        description: 'Event catering and food services',
        status: 'coming-soon',
        icon: 'TruckIcon',
        color: 'orange',
        subcategories: [],
      },
    ],
  },

  // ============================================
  // HOME SERVICES - COMING SOON
  // ============================================
  {
    name: 'Home Services',
    slug: 'home-services',
    description: 'Plumbers, electricians, cleaners, and home repair',
    status: 'coming-soon',
    icon: 'HomeIcon',
    color: 'blue',
    categories: [
      {
        name: 'Repairs & Maintenance',
        slug: 'repairs',
        description: 'Home repair and maintenance services',
        status: 'coming-soon',
        icon: 'WrenchScrewdriverIcon',
        color: 'blue',
        subcategories: [
          { name: 'Plumbing', slug: 'plumbing', description: 'Plumbing services', status: 'coming-soon' },
          { name: 'Electrical', slug: 'electrical', description: 'Electrical services', status: 'coming-soon' },
          { name: 'HVAC', slug: 'hvac', description: 'AC and cooling services', status: 'coming-soon' },
          { name: 'Carpentry', slug: 'carpentry', description: 'Woodwork and carpentry', status: 'coming-soon' },
        ],
      },
      {
        name: 'Cleaning Services',
        slug: 'cleaning',
        description: 'Home and office cleaning',
        status: 'coming-soon',
        icon: 'SparklesIcon',
        color: 'blue',
        subcategories: [],
      },
      {
        name: 'Interior Design',
        slug: 'interior-design',
        description: 'Interior decoration and design',
        status: 'coming-soon',
        icon: 'PaintBrushIcon',
        color: 'blue',
        subcategories: [],
      },
      {
        name: 'Security Services',
        slug: 'security',
        description: 'Home security and CCTV installation',
        status: 'coming-soon',
        icon: 'ShieldCheckIcon',
        color: 'blue',
        subcategories: [],
      },
    ],
  },

  // ============================================
  // CHURCHES & RELIGIOUS - COMING SOON
  // ============================================
  {
    name: 'Churches & Religious',
    slug: 'churches',
    description: 'Churches, mosques, and religious organizations across Nigeria',
    status: 'coming-soon',
    icon: 'BuildingOfficeIcon',
    color: 'emerald',
    categories: [
      {
        name: 'Orthodox Churches',
        slug: 'orthodox',
        description: 'Catholic, Anglican, Methodist, and other mainline churches',
        status: 'coming-soon',
        icon: 'HomeModernIcon',
        color: 'emerald',
        subcategories: [
          { name: 'Catholic Churches', slug: 'catholic', description: 'Roman Catholic parishes and cathedrals', status: 'coming-soon' },
          { name: 'Anglican Churches', slug: 'anglican', description: 'Church of Nigeria (Anglican Communion)', status: 'coming-soon' },
          { name: 'Methodist Churches', slug: 'methodist', description: 'Methodist Church Nigeria', status: 'coming-soon' },
          { name: 'Baptist Churches', slug: 'baptist', description: 'Nigerian Baptist Convention churches', status: 'coming-soon' },
          { name: 'Presbyterian Churches', slug: 'presbyterian', description: 'Presbyterian Church of Nigeria', status: 'coming-soon' },
        ],
      },
      {
        name: 'Pentecostal Churches',
        slug: 'pentecostal',
        description: 'Pentecostal and charismatic churches',
        status: 'coming-soon',
        icon: 'SparklesIcon',
        color: 'emerald',
        subcategories: [
          { name: 'RCCG', slug: 'rccg', description: 'Redeemed Christian Church of God parishes', status: 'coming-soon' },
          { name: 'Winners Chapel', slug: 'winners', description: 'Living Faith Church (Winners Chapel)', status: 'coming-soon' },
          { name: 'Deeper Life', slug: 'deeper-life', description: 'Deeper Christian Life Ministry', status: 'coming-soon' },
          { name: 'MFM', slug: 'mfm', description: 'Mountain of Fire and Miracles Ministries', status: 'coming-soon' },
          { name: 'COZA', slug: 'coza', description: 'Commonwealth of Zion Assembly', status: 'coming-soon' },
          { name: 'Other Pentecostal', slug: 'other-pentecostal', description: 'Other Pentecostal ministries', status: 'coming-soon' },
        ],
      },
      {
        name: 'White Garment Churches',
        slug: 'white-garment',
        description: 'Aladura and African Instituted Churches',
        status: 'coming-soon',
        icon: 'UserGroupIcon',
        color: 'emerald',
        subcategories: [
          { name: 'Celestial Church', slug: 'celestial', description: 'Celestial Church of Christ', status: 'coming-soon' },
          { name: 'Cherubim & Seraphim', slug: 'cherubim-seraphim', description: 'C&S churches', status: 'coming-soon' },
          { name: 'Christ Apostolic Church', slug: 'cac', description: 'CAC parishes', status: 'coming-soon' },
        ],
      },
      {
        name: 'Mosques',
        slug: 'mosques',
        description: 'Islamic mosques and prayer centers',
        status: 'coming-soon',
        icon: 'BuildingOffice2Icon',
        color: 'emerald',
        subcategories: [
          { name: 'Central Mosques', slug: 'central', description: 'Major city central mosques', status: 'coming-soon' },
          { name: 'Jummah Mosques', slug: 'jummah', description: 'Friday prayer mosques', status: 'coming-soon' },
        ],
      },
    ],
  },

  // ============================================
  // AUTOMOTIVE - COMING SOON
  // ============================================
  {
    name: 'Automotive',
    slug: 'automotive',
    description: 'Car dealers, mechanics, and auto services',
    status: 'coming-soon',
    icon: 'TruckIcon',
    color: 'slate',
    categories: [
      {
        name: 'Car Dealers',
        slug: 'dealers',
        description: 'New and used car dealerships',
        status: 'coming-soon',
        icon: 'TruckIcon',
        color: 'slate',
        subcategories: [
          { name: 'New Cars', slug: 'new', description: 'Authorized new car dealers', status: 'coming-soon' },
          { name: 'Used Cars', slug: 'used', description: 'Pre-owned car dealers', status: 'coming-soon' },
        ],
      },
      {
        name: 'Auto Repair',
        slug: 'repair',
        description: 'Mechanics and repair shops',
        status: 'coming-soon',
        icon: 'WrenchScrewdriverIcon',
        color: 'slate',
        subcategories: [
          { name: 'Mechanics', slug: 'mechanics', description: 'General auto mechanics', status: 'coming-soon' },
          { name: 'Body Shops', slug: 'body-shops', description: 'Panel beating and painting', status: 'coming-soon' },
          { name: 'Auto Electricians', slug: 'auto-electrical', description: 'Auto electrical services', status: 'coming-soon' },
        ],
      },
      {
        name: 'Auto Parts',
        slug: 'parts',
        description: 'Spare parts and accessories',
        status: 'coming-soon',
        icon: 'CogIcon',
        color: 'slate',
        subcategories: [],
      },
      {
        name: 'Car Wash',
        slug: 'car-wash',
        description: 'Car wash and detailing services',
        status: 'coming-soon',
        icon: 'SparklesIcon',
        color: 'slate',
        subcategories: [],
      },
    ],
  },

  // ============================================
  // TRAVEL & ACCOMMODATION - COMING SOON
  // ============================================
  {
    name: 'Travel & Accommodation',
    slug: 'travel',
    description: 'Hotels, travel agencies, and tourism services',
    status: 'coming-soon',
    icon: 'GlobeAltIcon',
    color: 'cyan',
    categories: [
      {
        name: 'Hotels',
        slug: 'hotels',
        description: 'Hotels and resorts',
        status: 'coming-soon',
        icon: 'BuildingOffice2Icon',
        color: 'cyan',
        subcategories: [
          { name: 'Luxury Hotels', slug: 'luxury', description: '5-star and luxury hotels', status: 'coming-soon' },
          { name: 'Business Hotels', slug: 'business', description: 'Business-class hotels', status: 'coming-soon' },
          { name: 'Budget Hotels', slug: 'budget', description: 'Affordable accommodation', status: 'coming-soon' },
          { name: 'Resorts', slug: 'resorts', description: 'Beach and leisure resorts', status: 'coming-soon' },
        ],
      },
      {
        name: 'Short-let Apartments',
        slug: 'shortlet',
        description: 'Serviced apartments and short stays',
        status: 'coming-soon',
        icon: 'HomeModernIcon',
        color: 'cyan',
        subcategories: [],
      },
      {
        name: 'Travel Agencies',
        slug: 'agencies',
        description: 'Travel agents and tour operators',
        status: 'coming-soon',
        icon: 'TicketIcon',
        color: 'cyan',
        subcategories: [],
      },
      {
        name: 'Tourist Attractions',
        slug: 'attractions',
        description: 'Tourist sites and attractions',
        status: 'coming-soon',
        icon: 'MapIcon',
        color: 'cyan',
        subcategories: [],
      },
    ],
  },

  // ============================================
  // BUSINESS SERVICES - COMING SOON
  // ============================================
  {
    name: 'Business Services',
    slug: 'business',
    description: 'Professional and business support services',
    status: 'coming-soon',
    icon: 'BriefcaseIcon',
    color: 'violet',
    categories: [
      {
        name: 'Legal Services',
        slug: 'legal',
        description: 'Law firms and legal practitioners',
        status: 'coming-soon',
        icon: 'ScaleIcon',
        color: 'violet',
        subcategories: [
          { name: 'Law Firms', slug: 'law-firms', description: 'Legal practices', status: 'coming-soon' },
          { name: 'Notary Public', slug: 'notary', description: 'Notarization services', status: 'coming-soon' },
        ],
      },
      {
        name: 'Financial Services',
        slug: 'financial',
        description: 'Banks, insurance, and financial advisors',
        status: 'coming-soon',
        icon: 'BanknotesIcon',
        color: 'violet',
        subcategories: [
          { name: 'Banks', slug: 'banks', description: 'Commercial banks', status: 'coming-soon' },
          { name: 'Insurance', slug: 'insurance', description: 'Insurance companies', status: 'coming-soon' },
          { name: 'Microfinance', slug: 'microfinance', description: 'Microfinance banks', status: 'coming-soon' },
        ],
      },
      {
        name: 'IT Services',
        slug: 'it-services',
        description: 'Software, web development, and IT support',
        status: 'coming-soon',
        icon: 'ComputerDesktopIcon',
        color: 'violet',
        subcategories: [],
      },
      {
        name: 'Marketing & Advertising',
        slug: 'marketing',
        description: 'Advertising agencies and marketing firms',
        status: 'coming-soon',
        icon: 'MegaphoneIcon',
        color: 'violet',
        subcategories: [],
      },
      {
        name: 'Consulting',
        slug: 'consulting',
        description: 'Business and management consulting',
        status: 'coming-soon',
        icon: 'LightBulbIcon',
        color: 'violet',
        subcategories: [],
      },
    ],
  },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getVerticalBySlug(slug: string): Vertical | undefined {
  return verticals.find(v => v.slug === slug);
}

export function getCategoryBySlug(verticalSlug: string, categorySlug: string): Category | undefined {
  const vertical = getVerticalBySlug(verticalSlug);
  return vertical?.categories.find(c => c.slug === categorySlug);
}

export function getSubcategoryBySlug(
  verticalSlug: string,
  categorySlug: string,
  subcategorySlug: string
): Subcategory | undefined {
  const category = getCategoryBySlug(verticalSlug, categorySlug);
  return category?.subcategories.find(s => s.slug === subcategorySlug);
}

export function isLive(verticalSlug: string, categorySlug?: string, subcategorySlug?: string): boolean {
  const vertical = getVerticalBySlug(verticalSlug);
  if (!vertical || vertical.status !== 'live') return false;

  if (!categorySlug) return true;

  const category = getCategoryBySlug(verticalSlug, categorySlug);
  if (!category || category.status !== 'live') return false;

  if (!subcategorySlug) return true;

  const subcategory = getSubcategoryBySlug(verticalSlug, categorySlug, subcategorySlug);
  return subcategory?.status === 'live';
}

export function getLiveVerticals(): Vertical[] {
  return verticals.filter(v => v.status === 'live');
}

export function getAllVerticals(): Vertical[] {
  return verticals;
}

// Build path for a vertical/category/subcategory
export function buildPath(verticalSlug: string, categorySlug?: string, subcategorySlug?: string): string {
  let path = `/${verticalSlug}`;
  if (categorySlug) path += `/${categorySlug}`;
  if (subcategorySlug) path += `/${subcategorySlug}`;
  return path;
}

// Navigation menu items in specified order
export const navigationOrder = [
  'education',
  'health',
  'food',
  'home-services',
  'churches',
  'automotive',
  'travel',
  'business',
];

export function getNavigationVerticals(): Vertical[] {
  // Only return live verticals for public navigation
  // Coming-soon verticals remain in config but are hidden from menu
  return navigationOrder
    .map(slug => getVerticalBySlug(slug))
    .filter((v): v is Vertical => v !== undefined && v.status === 'live');
}

// Color mapping for Tailwind classes
// Every section shares the directory's one palette (Hallmark Grid): green
// tints for wells and text, ink for actions. The keys stay so each vertical's
// colour name still resolves.
const sectionColors = { bg: 'bg-primary-50', text: 'text-primary-700', hover: 'hover:bg-primary-50', badge: 'bg-ink' };
export const verticalColors: Record<string, { bg: string; text: string; hover: string; badge: string }> = {
  primary: sectionColors,
  red: sectionColors,
  orange: sectionColors,
  blue: sectionColors,
  emerald: sectionColors,
  slate: sectionColors,
  cyan: sectionColors,
  violet: sectionColors,
};
