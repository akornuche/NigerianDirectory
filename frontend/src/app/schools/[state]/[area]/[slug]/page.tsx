import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { MapPinIcon, AcademicCapIcon, PhoneIcon, EnvelopeIcon, GlobeAltIcon, BuildingLibraryIcon, BookOpenIcon } from '@heroicons/react/24/outline';
import { getSchoolBySlug, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

// Fetch school data from API
async function getSchool(state: string, area: string, slug: string): Promise<School | null> {
  try {
    const school = await getSchoolBySlug(state, area, slug);
    return school;
  } catch (error) {
    console.error('Error fetching school:', error);
    return null;
  }
}

interface Props {
  params: Promise<{
    state: string;
    area: string;
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const school = await getSchool(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    return {
      title: 'School Not Found',
    };
  }

  return {
    title: school.meta_title || `${school.name} - ${school.area}, ${school.state}`,
    description: school.meta_description || school.template_summary?.substring(0, 160),
    openGraph: {
      title: school.meta_title || school.name,
      description: school.meta_description || school.template_summary?.substring(0, 160),
      type: 'website',
      url: `/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`,
    },
  };
}

export default async function SchoolPage({ params }: Props) {
  const resolvedParams = await params;
  const school = await getSchool(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com';
  const schoolUrl = `${siteUrl}/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`;

  // JSON-LD structured data for School
  const schoolJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'School',
    '@id': schoolUrl,
    name: school.name,
    description: school.template_summary,
    image: school.hero_image_url || school.logo_url,
    logo: school.logo_url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: school.address,
      addressLocality: school.city,
      addressRegion: school.state,
      addressCountry: 'Nigeria',
    },
    geo: school.latitude && school.longitude ? {
      '@type': 'GeoCoordinates',
      latitude: school.latitude,
      longitude: school.longitude,
    } : undefined,
    telephone: school.phone,
    email: school.email,
    url: school.website,
    foundingDate: school.established_year?.toString(),
    sameAs: school.website ? [school.website] : undefined,
  };

  // JSON-LD Breadcrumb schema
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: siteUrl,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: school.state,
        item: `${siteUrl}/schools/${resolvedParams.state}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: school.area,
        item: `${siteUrl}/schools/${resolvedParams.state}/${resolvedParams.area}/`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: school.name,
        item: schoolUrl,
      },
    ],
  };

  return (
    <>
      {/* JSON-LD School Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schoolJsonLd) }}
      />
      {/* JSON-LD Breadcrumb Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Top Leaderboard Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="school-top-leaderboard" size="leaderboard" />
          <AdBanner slot="school-top-mobile" size="mobile-banner" />
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
              <Link
                href={`/schools/${resolvedParams.state}/`}
                className="text-gray-500 hover:text-gray-700 capitalize"
              >
                {resolvedParams.state.replace(/-/g, ' ')}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link
                href={`/schools/${resolvedParams.state}/${resolvedParams.area}/`}
                className="text-gray-500 hover:text-gray-700 capitalize"
              >
                {resolvedParams.area.replace(/-/g, ' ')}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium truncate">{school.name}</li>
          </ol>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800">
        {/* Hero Image Banner */}
        <div className="relative h-48 md:h-64 lg:h-80 overflow-hidden">
          <Image
            src={school.hero_image_url || '/placeholder-school.svg'}
            alt={`${school.name} campus`}
            fill
            className="object-cover opacity-30"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-primary-800/90" />
        </div>
        
        <div className="mx-auto max-w-7xl container-padding py-8 lg:py-12 -mt-24 relative z-10">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            {/* School Logo */}
            <div className="w-24 h-24 lg:w-32 lg:h-32 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden relative">
              <Image
                src={school.logo_url || '/placeholder-logo.svg'}
                alt={`${school.name} logo`}
                fill
                className="object-contain p-2"
              />
            </div>

            <div className="flex-1 text-white">
              <div className="flex flex-wrap gap-2 mb-3">
                <span className="badge bg-secondary-400 text-gray-900 capitalize">
                  {school.type}
                </span>
                {school.verified && (
                  <span className="badge bg-accent-500 text-white">Verified</span>
                )}
                {school.featured && (
                  <span className="badge bg-white/20 text-white">Featured</span>
                )}
              </div>

              <h1 className="text-3xl lg:text-4xl font-display font-bold">
                {school.name}
              </h1>

              <div className="mt-4 flex flex-wrap gap-4 text-primary-100">
                <span className="flex items-center">
                  <MapPinIcon className="h-5 w-5 mr-1" />
                  {school.area}, {school.city}, {school.state}
                </span>
                {school.established_year && (
                  <span className="flex items-center">
                    <BuildingLibraryIcon className="h-5 w-5 mr-1" />
                    Est. {school.established_year}
                  </span>
                )}
              </div>

              {/* Quick Contact */}
              <div className="mt-6 flex flex-wrap gap-4">
                {school.phone && (
                  <a
                    href={`tel:${school.phone}`}
                    className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <PhoneIcon className="h-5 w-5 mr-2" />
                    {school.phone}
                  </a>
                )}
                {school.email && (
                  <a
                    href={`mailto:${school.email}`}
                    className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <EnvelopeIcon className="h-5 w-5 mr-2" />
                    Email
                  </a>
                )}
                {school.website && (
                  <a
                    href={school.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <GlobeAltIcon className="h-5 w-5 mr-2" />
                    Website
                  </a>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/blog/`}
                  className="inline-flex items-center px-5 py-2.5 bg-secondary-400 hover:bg-secondary-500 text-gray-900 font-medium rounded-lg transition-colors shadow-lg"
                >
                  <BookOpenIcon className="h-5 w-5 mr-2" />
                  Read School Blog
                </Link>
                <Link
                  href="/claim/"
                  className="inline-flex items-center px-5 py-2.5 bg-white hover:bg-gray-100 text-primary-700 font-medium rounded-lg transition-colors shadow-lg"
                >
                  Claim This School
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Column */}
            <div className="lg:col-span-2 space-y-8">
              {/* Photo Gallery */}
              {school.gallery_images && school.gallery_images.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Photo Gallery
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {school.gallery_images.slice(0, 6).map((imageUrl, index) => (
                      <div key={index} className="relative aspect-[4/3] rounded-lg overflow-hidden bg-gray-100">
                        <Image
                          src={imageUrl}
                          alt={`${school.name} photo ${index + 1}`}
                          fill
                          className="object-cover hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* About */}
              <div className="card p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  About {school.name}
                </h2>
                <p className="text-gray-600 leading-relaxed">
                  {school.template_summary}
                </p>
              </div>

              {/* In-content Ad */}
              <div className="flex justify-center">
                <AdBanner slot="school-content-rect-1" size="large-rectangle" />
              </div>

              {/* Key Information */}
              <div className="card p-6 lg:p-8">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Key Information
                </h2>
                <dl className="grid sm:grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm text-gray-500">School Type</dt>
                    <dd className="mt-1 font-medium text-gray-900 capitalize">
                      {school.type}
                    </dd>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm text-gray-500">Curriculum</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {school.curriculum || 'Nigerian'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm text-gray-500">Levels Offered</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {school.levels || 'Not specified'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm text-gray-500">Student Type</dt>
                    <dd className="mt-1 font-medium text-gray-900">
                      {school.boarding && school.day_school
                        ? 'Boarding & Day'
                        : school.boarding
                        ? 'Boarding Only'
                        : 'Day Only'}
                    </dd>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <dt className="text-sm text-gray-500">Gender</dt>
                    <dd className="mt-1 font-medium text-gray-900 capitalize">
                      {school.gender?.replace(/-/g, ' ') || 'Co-ed'}
                    </dd>
                  </div>
                  {school.fee_range && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm text-gray-500">Fee Range</dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {school.fee_range}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Facilities */}
              {school.facilities && school.facilities.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Facilities
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {school.facilities.map((facility) => (
                      <span key={facility} className="badge-secondary">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Achievements */}
              {school.achievements && school.achievements.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Achievements
                  </h2>
                  <ul className="space-y-2">
                    {school.achievements.map((achievement, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-accent-500">✓</span>
                        <span className="text-gray-600">{achievement}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Bottom Content Ads */}
              <div className="flex flex-wrap justify-center gap-4">
                <AdBanner slot="school-content-rect-2" size="rectangle" />
                <AdBanner slot="school-content-rect-3" size="rectangle" className="hidden md:flex" />
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Sidebar Top Ad */}
              <AdBanner slot="school-sidebar-rect-top" size="rectangle" />
              {/* Contact Card */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  {school.address && (
                    <div className="flex items-start text-sm">
                      <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-600">{school.address}</span>
                    </div>
                  )}
                  {school.phone && (
                    <div className="flex items-center text-sm">
                      <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a
                        href={`tel:${school.phone}`}
                        className="text-primary-600 hover:underline"
                      >
                        {school.phone}
                      </a>
                    </div>
                  )}
                  {school.email && (
                    <div className="flex items-center text-sm">
                      <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a
                        href={`mailto:${school.email}`}
                        className="text-primary-600 hover:underline"
                      >
                        {school.email}
                      </a>
                    </div>
                  )}
                  {school.website && (
                    <div className="flex items-center text-sm">
                      <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                      <a
                        href={school.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline truncate"
                      >
                        {school.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Principal Card */}
              {school.principal_name && (
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Leadership</h3>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden relative">
                      {school.principal_image_url ? (
                        <Image
                          src={school.principal_image_url}
                          alt={school.principal_name}
                          fill
                          className="object-cover"
                        />
                      ) : (
                        <span className="text-primary-600 font-semibold text-lg">
                          {school.principal_name.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="ml-3">
                      <div className="font-medium text-gray-900">
                        {school.principal_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {school.principal_title || 'Principal'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* CTA Card */}
              <div className="card p-6 bg-primary-50 border-primary-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Is this your school?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Claim your profile to update information and respond to
                  inquiries.
                </p>
                <Link href="/claim/" className="btn-primary w-full text-center">
                  Claim This School
                </Link>
              </div>

              {/* Sidebar Rectangle Ad */}
              <AdBanner slot="school-sidebar-rect-mid" size="rectangle" />

              {/* Sidebar Skyscraper Ad */}
              <AdBanner slot="school-sidebar-skyscraper" size="skyscraper" />
            </div>
          </div>
          
          {/* Bottom Billboard Ad */}
          <div className="mt-12 flex justify-center">
            <AdBanner slot="school-bottom-billboard" size="billboard" />
            <AdBanner slot="school-bottom-mobile" size="mobile-large" />
          </div>
        </div>
      </section>
    </>
  );
}
