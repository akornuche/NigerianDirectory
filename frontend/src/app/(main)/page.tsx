import Link from 'next/link';
import Image from 'next/image';
import { 
  AcademicCapIcon, 
  MapPinIcon, 
  MagnifyingGlassIcon,
  BuildingLibraryIcon,
  GlobeAltIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import { toSlugSegment, toLocationSegment } from '@/lib/slug';
import AdBanner from '@/components/ads/AdBanner';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

// Nigerian states for the homepage
const popularStates = [
  { name: 'Lagos', slug: 'lagos', count: 45 },
  { name: 'FCT Abuja', slug: 'fct', count: 28 },
  { name: 'Rivers', slug: 'rivers', count: 18 },
  { name: 'Oyo', slug: 'oyo', count: 15 },
  { name: 'Kano', slug: 'kano', count: 12 },
  { name: 'Kaduna', slug: 'kaduna', count: 10 },
  { name: 'Enugu', slug: 'enugu', count: 8 },
  { name: 'Anambra', slug: 'anambra', count: 7 },
];

const schoolTypes = [
  { name: 'Private Schools', icon: BuildingLibraryIcon, count: 85 },
  { name: 'Federal Schools', icon: AcademicCapIcon, count: 42 },
  { name: 'International Schools', icon: GlobeAltIcon, count: 28 },
  { name: 'Mission Schools', icon: UserGroupIcon, count: 25 },
];

// Fetch featured schools from API
async function getFeaturedSchools(): Promise<School[]> {
  try {
    const schools = await api.getFeaturedSchools();
    return schools.slice(0, 4); // Get top 4
  } catch (error) {
    console.error('Error fetching featured schools:', error);
    // Return empty array, will show fallback
    return [];
  }
}

// Fallback featured schools if API fails
const fallbackFeaturedSchools = [
  {
    name: 'Green Springs School',
    type: 'private',
    area: 'Lekki',
    city: 'Lagos',
    state: 'Lagos',
    slug: 'green-springs-school',
  },
  {
    name: 'British International School Lagos',
    type: 'private',
    area: 'Victoria Island',
    city: 'Lagos',
    state: 'Lagos',
    slug: 'british-international-school-lagos',
  },
  {
    name: "King's College Lagos",
    type: 'federal',
    area: 'Victoria Island',
    city: 'Lagos',
    state: 'Lagos',
    slug: 'kings-college-lagos',
  },
  {
    name: 'Loyola Jesuit College',
    type: 'private',
    area: 'Gwarimpa',
    city: 'Abuja',
    state: 'FCT',
    slug: 'loyola-jesuit-college',
  },
];

export default async function HomePage() {
  // Fetch featured schools from database
  const featuredSchools = await getFeaturedSchools();
  const displaySchools = featuredSchools.length > 0 
    ? featuredSchools 
    : fallbackFeaturedSchools;

  return (
    <>
      {/* Top Leaderboard Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="home-top-leaderboard" size="large-leaderboard" />
          <AdBanner slot="home-top-mobile" size="mobile-banner" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="absolute inset-0 bg-[url('/pattern.svg')] opacity-10"></div>
        <div className="relative mx-auto max-w-7xl container-padding py-20 lg:py-32">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold leading-tight">
              Find the Best Schools in{' '}
              <span className="text-secondary-400">Nigeria</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-primary-100 max-w-2xl">
              Discover over 200 verified schools across Nigeria. Compare
              facilities, read reviews, and find the perfect school for your
              children.
            </p>

            {/* Search Box */}
            <div className="mt-8 bg-white rounded-xl shadow-xl p-2 max-w-xl">
              <div className="flex items-center">
                <div className="flex-1 flex items-center px-4">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search schools by name or location..."
                    className="flex-1 px-3 py-3 text-gray-900 placeholder-gray-500 focus:outline-none"
                  />
                </div>
                <button className="btn-primary">Search</button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-10 flex flex-wrap gap-8">
              <div>
                <div className="text-3xl font-bold">200+</div>
                <div className="text-primary-200">Schools Listed</div>
              </div>
              <div>
                <div className="text-3xl font-bold">36+</div>
                <div className="text-primary-200">States Covered</div>
              </div>
              <div>
                <div className="text-3xl font-bold">100%</div>
                <div className="text-primary-200">Verified Info</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular States */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl container-padding">
          {/* Billboard Ad above section */}
          <div className="flex justify-center mb-8">
            <AdBanner slot="home-states-billboard" size="billboard" />
            <AdBanner slot="home-states-mobile" size="mobile-large" />
          </div>
          
          <div className="text-center">
            <h2 className="section-title">Browse Schools by State</h2>
            <p className="section-subtitle mx-auto">
              Explore schools across Nigeria&apos;s major states and cities
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {popularStates.map((state) => (
              <Link
                key={state.slug}
                href={`/education/schools/${state.slug}/`}
                className="card-hover p-6 text-center group"
              >
                <div className="w-12 h-12 mx-auto bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                  <MapPinIcon className="h-6 w-6 text-primary-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{state.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {state.count} schools
                </p>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link href="/states/" className="btn-outline">
              View All States
            </Link>
          </div>
          
          {/* Rectangle Ads Row */}
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <AdBanner slot="home-states-rect-1" size="rectangle" />
            <AdBanner slot="home-states-rect-2" size="rectangle" className="hidden md:flex" />
            <AdBanner slot="home-states-rect-3" size="rectangle" className="hidden lg:flex" />
          </div>
        </div>
      </section>

      {/* School Types */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex gap-8">
            {/* Left Skyscraper Ad */}
            <div className="hidden xl:block flex-shrink-0">
              <AdBanner slot="home-types-left-sky" size="wide-skyscraper" />
            </div>
            
            <div className="flex-1">
              <div className="text-center">
            <h2 className="section-title">Types of Schools</h2>
            <p className="section-subtitle mx-auto">
              From private academies to federal unity schools, find the right
              fit
            </p>
          </div>

          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-6">
            {schoolTypes.map((type) => (
              <div key={type.name} className="card p-6 text-center">
                <div className="w-14 h-14 mx-auto bg-secondary-100 rounded-xl flex items-center justify-center">
                  <type.icon className="h-7 w-7 text-secondary-600" />
                </div>
                <h3 className="mt-4 font-semibold text-gray-900">{type.name}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {type.count} schools
                </p>
              </div>
            ))}
          </div>
            </div>
            
            {/* Right Skyscraper Ad */}
            <div className="hidden xl:block flex-shrink-0">
              <AdBanner slot="home-types-right-sky" size="wide-skyscraper" />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Schools */}
      <section className="py-16 lg:py-24 bg-white">
        <div className="mx-auto max-w-7xl container-padding">
          {/* Leaderboard Ad */}
          <div className="flex justify-center mb-8">
            <AdBanner slot="home-featured-leaderboard" size="leaderboard" />
            <AdBanner slot="home-featured-mobile" size="mobile-banner" />
          </div>
          
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="section-title">Featured Schools</h2>
              <p className="section-subtitle">
                Top-rated schools recommended by parents
              </p>
            </div>
            <Link
              href="/education/schools/"
              className="hidden md:inline-flex link text-primary-600"
            >
              View all →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {displaySchools.map((school) => (
              <Link
                key={school.slug}
                href={`/education/schools/${toSlugSegment(school.state)}/${toLocationSegment(school.area, school.city)}/${school.slug}/`}
                className="card-hover group"
              >
                <div className="aspect-[4/3] relative bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                  <Image
                    src={(school as School).hero_image_url || (school as School).logo_url || '/placeholder-school.svg'}
                    alt={school.name}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {/* Logo overlay */}
                  {(school as School).logo_url && (
                    <div className="absolute bottom-2 right-2 w-12 h-12 bg-white rounded-lg shadow-md overflow-hidden">
                      <Image
                        src={(school as School).logo_url!}
                        alt={`${school.name} logo`}
                        fill
                        className="object-contain p-1"
                      />
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <span className="badge-primary capitalize">{school.type}</span>
                  <h3 className="mt-2 font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {school.name}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500 flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {school.area}, {school.city}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          
          {/* In-feed Ad Row */}
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <AdBanner slot="home-featured-infeed-1" size="large-rectangle" />
            <AdBanner slot="home-featured-infeed-2" size="large-rectangle" className="hidden md:flex" />
          </div>
        </div>
      </section>

      {/* Mid-page Ad Section */}
      <section className="py-8 bg-gray-100">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex flex-wrap justify-center gap-4 items-center">
            <AdBanner slot="home-mid-square-1" size="square" />
            <AdBanner slot="home-mid-rect" size="rectangle" className="hidden sm:flex" />
            <AdBanner slot="home-mid-square-2" size="square" className="hidden lg:flex" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 gradient-bg">
        <div className="mx-auto max-w-7xl container-padding text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-white">
            Are You a School Administrator?
          </h2>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl mx-auto">
            Claim your school profile today and connect with thousands of
            parents looking for quality education in Nigeria.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/claim/" className="btn-secondary">
              Claim Your School
            </Link>
            <Link
              href="/advertise/"
              className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-medium rounded-lg hover:bg-white hover:text-primary-600 transition-colors"
            >
              Advertise With Us
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-16 lg:py-24 bg-gray-50">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex gap-8">
            {/* Left Ad Column */}
            <div className="hidden lg:flex flex-col gap-4 flex-shrink-0">
              <AdBanner slot="home-seo-left-1" size="rectangle" />
              <AdBanner slot="home-seo-left-2" size="rectangle" />
            </div>
            
            <div className="flex-1 max-w-3xl mx-auto prose prose-lg">
              <h2 className="section-title text-center">
                About NigerianDirectory.com
              </h2>
              <p className="text-gray-600 mt-6">
                NigerianDirectory.com is Nigeria&apos;s most comprehensive school
                directory, helping parents find the best educational institutions
                for their children. We provide verified information on over 200
                schools across all 36 states and the Federal Capital Territory.
              </p>
              <p className="text-gray-600">
                Whether you&apos;re looking for a private school in Lagos, a federal
                unity school in Abuja, or an international school in Port
                Harcourt, our directory makes it easy to compare options, read
                about facilities, and make informed decisions about your child&apos;s
                education.
              </p>
              <p className="text-gray-600">
                Our mission is to improve educational outcomes in Nigeria by
                connecting families with quality schools and providing schools
                with a platform to showcase their unique offerings.
              </p>
            </div>
            
            {/* Right Ad Column */}
            <div className="hidden lg:flex flex-col gap-4 flex-shrink-0">
              <AdBanner slot="home-seo-right-1" size="rectangle" />
              <AdBanner slot="home-seo-right-2" size="rectangle" />
            </div>
          </div>
          
          {/* Bottom Leaderboard */}
          <div className="mt-12 flex justify-center">
            <AdBanner slot="home-bottom-billboard" size="billboard" />
            <AdBanner slot="home-bottom-mobile" size="mobile-large" />
          </div>
        </div>
      </section>
    </>
  );
}
