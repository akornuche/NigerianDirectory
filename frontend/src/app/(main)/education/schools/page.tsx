import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, AcademicCapIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import { toSlugSegment, toLocationSegment } from '@/lib/slug';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
  alternates: { canonical: '/education/schools/' },
  title: 'Find Schools in Nigeria',
  description: 'Discover the best schools across Nigeria. Browse our comprehensive directory of primary, secondary, boarding, and international schools with verified information.',
  openGraph: {
    title: 'Schools in Nigeria | NigerianDirectory',
    description: 'Find top schools across all 36 states of Nigeria. Compare facilities, fees, and programs.',
  },
};

// Nigerian states for browsing
const nigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

// Fetch featured schools
async function getFeaturedSchools(): Promise<School[]> {
  try {
    const response = await api.getSchools(1, 12);
    return response.schools || [];
  } catch (error) {
    console.error('Error fetching featured schools:', error);
    return [];
  }
}

export default async function SchoolsPage() {
  const featuredSchools = await getFeaturedSchools();

  return (
    <>
      {/* Top Leaderboard Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="schools-top-leaderboard" size="leaderboard" />
          <AdBanner slot="schools-top-mobile" size="mobile-banner" />
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="bg-gray-50 border-b">
        <div className="mx-auto max-w-7xl container-padding py-3">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/education/schools" className="text-gray-500 hover:text-gray-700">
                Education
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">Schools</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16 lg:py-24">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 mb-4">
              <AcademicCapIcon className="h-8 w-8" />
              <span className="badge bg-secondary-400 text-gray-900">Education</span>
            </div>
            <h1 className="text-4xl lg:text-5xl font-display font-bold">
              Schools in Nigeria
            </h1>
            <p className="mt-6 text-xl text-primary-100">
              Discover the best primary, secondary, boarding, and international schools
              across all 36 states of Nigeria. Our comprehensive directory helps parents
              find the perfect educational institution for their children.
            </p>
          </div>
        </div>
      </section>

      {/* Browse by State */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">
            Browse Schools by State
          </h2>

          {/* Rectangle Ads */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <AdBanner slot="schools-states-rect-1" size="rectangle" />
            <AdBanner slot="schools-states-rect-2" size="rectangle" className="hidden md:flex" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {nigerianStates.map((state) => (
              <Link
                key={state}
                href={`/education/schools/${state.toLowerCase().replace(/ /g, '-')}/`}
                className="px-4 py-3 bg-white border border-gray-200 rounded-lg text-center hover:border-primary-500 hover:bg-primary-50 transition-colors"
              >
                <span className="text-sm font-medium text-gray-700">{state}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Schools */}
      {featuredSchools.length > 0 && (
        <section className="py-12 lg:py-16 bg-gray-50">
          <div className="mx-auto max-w-7xl container-padding">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900">
                Featured Schools
              </h2>
              <Link
                href="/education/schools/lagos/"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                View All →
              </Link>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {featuredSchools.slice(0, 8).map((school) => (
                <Link
                  key={school.slug}
                  href={`/education/schools/${toSlugSegment(school.state)}/${toLocationSegment(school.area, school.city)}/${school.slug}/`}
                  className="card-hover group"
                >
                  <div className="aspect-[16/9] relative bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                    <Image
                      src={school.hero_image_url || school.logo_url || '/placeholder-school.svg'}
                      alt={school.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {school.logo_url && school.hero_image_url && (
                      <div className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-lg shadow-md overflow-hidden">
                        <Image
                          src={school.logo_url}
                          alt={`${school.name} logo`}
                          fill
                          className="object-contain p-1"
                        />
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span className="badge-primary capitalize">{school.type}</span>
                    <h3 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                      {school.name}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500 flex items-center">
                      <MapPinIcon className="h-4 w-4 mr-1" />
                      {school.area}, {school.state}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            {/* Mid Section Ads */}
            <div className="flex flex-wrap justify-center gap-4 mt-8">
              <AdBanner slot="schools-featured-rect-1" size="large-rectangle" />
              <AdBanner slot="schools-featured-rect-2" size="large-rectangle" className="hidden lg:flex" />
            </div>
          </div>
        </section>
      )}

      {/* School Types */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8">
            Browse by School Type
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Link
              href="/education/schools/lagos/?type=primary"
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-primary-200 transition-colors">
                <BuildingLibraryIcon className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Primary Schools</h3>
              <p className="mt-2 text-sm text-gray-600">
                Nursery and primary education for children ages 3-11
              </p>
            </Link>

            <Link
              href="/education/schools/lagos/?type=secondary"
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-secondary-200 transition-colors">
                <AcademicCapIcon className="h-6 w-6 text-secondary-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Secondary Schools</h3>
              <p className="mt-2 text-sm text-gray-600">
                Junior and senior secondary schools for ages 11-18
              </p>
            </Link>

            <Link
              href="/education/schools/lagos/?type=international"
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-accent-200 transition-colors">
                <svg className="h-6 w-6 text-accent-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">International Schools</h3>
              <p className="mt-2 text-sm text-gray-600">
                British, American, IB, and other international curricula
              </p>
            </Link>

            <Link
              href="/education/schools/lagos/?boarding=true"
              className="card p-6 hover:shadow-lg transition-shadow group"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
                </svg>
              </div>
              <h3 className="font-semibold text-gray-900">Boarding Schools</h3>
              <p className="mt-2 text-sm text-gray-600">
                Residential schools with full accommodation
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* Higher Education Mini-Banner */}
      <section className="py-12 lg:py-16 bg-white border-y">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl text-center md:text-left">
              <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                Looking for Higher Education?
              </h2>
              <p className="text-gray-600 text-lg leading-relaxed">
                Explore our comprehensive list of over 200 Universities, Polytechnics, and Colleges across all Nigerian states.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link href="/education/universities" className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all hover:shadow-lg transform active:scale-95">
                Browse Universities
              </Link>
              <Link href="/education/colleges" className="px-8 py-4 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all hover:shadow-lg transform active:scale-95">
                Colleges & Polytechnics
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2>Finding the Right School in Nigeria</h2>
            <p>
              Nigeria&apos;s education sector offers a diverse range of schooling options
              for children at every level. From traditional public schools to prestigious
              private institutions and world-class international schools, parents have
              numerous choices when it comes to their children&apos;s education.
            </p>
            <p>
              Our comprehensive school directory covers all 36 states and the FCT,
              featuring detailed profiles of thousands of schools. Each listing includes
              essential information such as curriculum offered, facilities available,
              fee structures, and contact details to help parents make informed decisions.
            </p>
            <h3>What to Consider When Choosing a School</h3>
            <ul>
              <li><strong>Curriculum:</strong> Nigerian, British, American, or International Baccalaureate</li>
              <li><strong>Location:</strong> Proximity to home and transportation options</li>
              <li><strong>Facilities:</strong> Libraries, labs, sports facilities, and technology</li>
              <li><strong>Class Size:</strong> Student-to-teacher ratios</li>
              <li><strong>Extracurriculars:</strong> Sports, arts, clubs, and activities</li>
            </ul>
          </div>

          {/* Bottom Ads */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <AdBanner slot="schools-seo-rect-1" size="rectangle" />
            <AdBanner slot="schools-seo-rect-2" size="rectangle" className="hidden md:flex" />
            <AdBanner slot="schools-seo-rect-3" size="rectangle" className="hidden lg:flex" />
          </div>
        </div>
      </section>
    </>
  );
}
