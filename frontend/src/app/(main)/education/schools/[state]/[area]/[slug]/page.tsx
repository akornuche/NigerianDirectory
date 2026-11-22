import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  GlobeAltIcon,
  BuildingLibraryIcon,
  BookOpenIcon,
  AcademicCapIcon,
  UserGroupIcon,
  TrophyIcon,
  SparklesIcon,
  NewspaperIcon,
  StarIcon,
  LinkIcon
} from '@heroicons/react/24/outline';
import { getSchoolByPath, movedToPath, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';
import { assessContentQuality } from '@/lib/content-quality';
import { pageTitle } from '@/lib/seo';

type ManagementMember = {
  name: string;
  title: string;
  image_url?: string;
};

// Fetch school data from API. A record that was merged, renamed or moved to
// another state/area 301-redirects to its canonical URL.
async function getSchool(state: string, area: string, slug: string): Promise<School | null> {
  let redirectTo: string | null = null;
  try {
    return await getSchoolByPath(state, area, slug);
  } catch (error) {
    redirectTo = movedToPath(error);
    if (!redirectTo) {
      console.error('Error fetching school:', error);
      return null;
    }
  }
  // Outside the try: permanentRedirect works by throwing.
  permanentRedirect(redirectTo);
}

interface Props {
  params: Promise<{
    state: string;
    area: string;
    slug: string;
  }>;
}

// Content section type definition
interface ContentSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  content: string;
  isList?: boolean;
  listItems?: string[];
}

// Generate dynamic content sections based on school data
// NO FALLBACK - only shows content that exists in database
function generateSchoolSections(school: School): ContentSection[] {
  const sections: ContentSection[] = [];

  // Section 1: School History & Overview (from database only)
  if (school.enriched_history) {
    sections.push({
      id: 'history',
      title: `The Story of ${school.name}`,
      icon: BuildingLibraryIcon,
      content: school.enriched_history,
    });
  }

  // Section 2: Academic Excellence (from database only)
  if (school.enriched_academics) {
    sections.push({
      id: 'academics',
      title: 'Academic Programs & Excellence',
      icon: AcademicCapIcon,
      content: school.enriched_academics,
    });
  }

  // Section 3: Campus & Facilities (from database only)
  if (school.enriched_campus_info) {
    sections.push({
      id: 'campus',
      title: 'Campus & World-Class Facilities',
      icon: SparklesIcon,
      content: school.enriched_campus_info,
    });
  }

  // Section 4: Student Life (from database only)
  if (school.enriched_student_life) {
    sections.push({
      id: 'student-life',
      title: 'Life at ' + school.name,
      icon: UserGroupIcon,
      content: school.enriched_student_life,
    });
  }

  // Section 5: Notable Alumni (if available)
  if (school.enriched_notable_alumni && school.enriched_notable_alumni.length > 0) {
    sections.push({
      id: 'alumni',
      title: 'Distinguished Alumni',
      icon: StarIcon,
      content: `${school.name} has produced remarkable individuals who have excelled in various fields.`,
      isList: true,
      listItems: school.enriched_notable_alumni,
    });
  }

  // Section 6: Achievements & Recognition
  if (school.achievements && school.achievements.length > 0) {
    sections.push({
      id: 'achievements',
      title: 'Awards & Recognition',
      icon: TrophyIcon,
      content: `${school.name} has consistently demonstrated excellence across academics, sports, and extracurricular activities.`,
      isList: true,
      listItems: school.achievements,
    });
  }

  // Section 7: Recent News & Updates (if available)
  if (school.enriched_recent_news && school.enriched_recent_news.length > 0) {
    sections.push({
      id: 'news',
      title: 'Latest News & Updates',
      icon: NewspaperIcon,
      content: 'Stay updated with the latest happenings at ' + school.name + ':',
      isList: true,
      listItems: school.enriched_recent_news,
    });
  }

  // Section 8: Leadership (if principal info available)
  if (school.principal_name) {
    sections.push({
      id: 'leadership',
      title: 'School Leadership',
      icon: BookOpenIcon,
      content: `Under the guidance of ${school.principal_title || 'Principal'} ${school.principal_name}, ${school.name} continues to uphold its tradition of excellence.`,
    });
  }

  return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const school = await getSchool(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    return {
      title: 'School Not Found',
    };
  }

  // Enhanced meta description combining profile and blog-style content
  const metaDescription = school.meta_description ||
    `Discover ${school.name} in ${school.area}, ${school.city}. Explore programs, facilities, student life, achievements, and admissions for this ${school.type} school in ${school.state}.`;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
  const schoolUrl = `${siteUrl}/education/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`;
  const contentQuality = assessContentQuality(school);

  return {
    title: pageTitle(school.meta_title, `${school.name}, ${school.area || school.state}`),
    description: metaDescription,
    alternates: {
      canonical: schoolUrl,
    },
    robots: contentQuality.indexable
      ? { index: true, follow: true }
      : { index: false, follow: true },
    openGraph: {
      title: school.meta_title || `${school.name} - Complete School Profile`,
      description: metaDescription,
      type: 'website',
      url: schoolUrl,
      images: school.hero_image_url ? [{ url: school.hero_image_url }] : undefined,
    },
  };
}

export default async function SchoolPage({ params }: Props) {
  const resolvedParams = await params;
  const school = await getSchool(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
  const schoolUrl = `${siteUrl}/education/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`;

  // Generate dynamic content sections
  const contentSections = generateSchoolSections(school);

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

  // JSON-LD Article schema for the detailed content
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `${school.name} - Complete Profile, Programs & Student Life`,
    description: `Comprehensive guide to ${school.name} in ${school.area}, ${school.city}. Learn about academics, facilities, achievements, and admissions.`,
    image: school.hero_image_url || school.logo_url || `${siteUrl}/og-image.png`,
    datePublished: school.created_at,
    dateModified: school.updated_at,
    author: {
      '@type': 'Organization',
      name: 'NigerianDirectory',
      url: siteUrl,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NigerianDirectory',
      url: siteUrl,
    },
    mainEntityOfPage: schoolUrl,
    about: {
      '@type': 'School',
      name: school.name,
    },
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
        name: 'Education',
        item: `${siteUrl}/education/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: 'Schools',
        item: `${siteUrl}/education/schools/`,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: school.state,
        item: `${siteUrl}/education/schools/${resolvedParams.state}/`,
      },
      {
        '@type': 'ListItem',
        position: 5,
        name: school.area,
        item: `${siteUrl}/education/schools/${resolvedParams.state}/${resolvedParams.area}/`,
      },
      {
        '@type': 'ListItem',
        position: 6,
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
      {/* JSON-LD Article Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
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
              <Link href="/education/schools" className="text-gray-500 hover:text-gray-700">
                Schools
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link
                href={`/education/schools/${resolvedParams.state}/`}
                className="text-gray-500 hover:text-gray-700 capitalize"
              >
                {resolvedParams.state.replace(/-/g, ' ')}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link
                href={`/education/schools/${resolvedParams.state}/${resolvedParams.area}/`}
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
      <section className="relative">
        {/* Hero Image Banner - Full clear image */}
        <div className="relative h-64 md:h-80 lg:h-96 overflow-hidden">
          <Image
            src={school.hero_image_url || '/placeholder-school.svg'}
            alt={`${school.name} campus`}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />
          {/* Subtle bottom gradient for text readability */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 to-transparent" />
        </div>

        {/* School Info Overlay */}
        <div className="absolute inset-x-0 bottom-0 pb-6">
          <div className="mx-auto max-w-7xl container-padding">
            <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center">
              {/* School Logo */}
              <div className="w-20 h-20 lg:w-28 lg:h-28 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden relative flex-shrink-0">
                <Image
                  src={school.logo_url || '/placeholder-logo.svg'}
                  alt={`${school.name} logo`}
                  fill
                  sizes="(max-width: 1024px) 80px, 112px"
                  className="object-contain p-2"
                />
              </div>

              <div className="flex-1 text-white">
                <div className="flex flex-wrap gap-2 mb-2">
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

                <h1 className="text-2xl lg:text-4xl font-display font-bold drop-shadow-lg">
                  {school.name}
                </h1>

                <div className="mt-2 flex flex-wrap gap-4 text-white/90 text-sm lg:text-base">
                  <span className="flex items-center drop-shadow">
                    <MapPinIcon className="h-4 w-4 lg:h-5 lg:w-5 mr-1" />
                    {school.area}, {school.city}, {school.state}
                  </span>
                  {school.established_year && (
                    <span className="flex items-center drop-shadow">
                      <BuildingLibraryIcon className="h-4 w-4 lg:h-5 lg:w-5 mr-1" />
                      Est. {school.established_year}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-6">
        <div className="mx-auto max-w-3xl container-padding">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
            <p className="text-sm text-yellow-900">
              <strong>Disclaimer:</strong> While we strive to provide accurate and up-to-date information, some details on this page may contain minor errors or may not reflect the most current status. We recommend visiting the official school website or contacting the school directly to confirm important information.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Actions Bar */}
      <section className="bg-primary-600 text-white py-4">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
            {school.phone && (
              <a
                href={`tel:${school.phone}`}
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <PhoneIcon className="h-4 w-4 mr-2" />
                {school.phone}
              </a>
            )}
            {school.email && (
              <a
                href={`mailto:${school.email}`}
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <EnvelopeIcon className="h-4 w-4 mr-2" />
                Email School
              </a>
            )}
            {school.website && (
              <a
                href={school.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
              >
                <GlobeAltIcon className="h-4 w-4 mr-2" />
                Visit Website
              </a>
            )}
            <Link
              href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/register/`}
              className="inline-flex items-center px-4 py-2 bg-secondary-400 hover:bg-secondary-500 text-gray-900 font-medium rounded-lg transition-colors text-sm"
            >
              Manage This Profile
            </Link>
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

              {/* Quick Summary */}
              <div className="card p-6 lg:p-8 bg-primary-50 border-primary-100">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  About {school.name}
                </h2>
                <p className="text-gray-700 leading-relaxed">
                  {school.template_summary}
                </p>
              </div>

              {/* In-content Ad */}
              <div className="flex justify-center">
                <AdBanner slot="school-content-rect-1" size="large-rectangle" />
              </div>

              {/* Dynamic Content Sections - Unique per school for SEO */}
              {contentSections.map((section, index) => (
                <article key={section.id} id={section.id} className="card p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <section.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed mb-4">
                    {section.content}
                  </p>
                  {section.isList && section.listItems && (
                    <ul className="space-y-2 mt-4">
                      {section.listItems.map((item, i) => (
                        <li key={i} className="flex items-start">
                          <span className="mr-2 text-accent-500 flex-shrink-0">✓</span>
                          <span className="text-gray-600">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Insert ad after every 2 sections */}
                  {index === 1 && (
                    <div className="mt-6 flex justify-center">
                      <AdBanner slot="school-content-inline-1" size="rectangle" />
                    </div>
                  )}
                </article>
              ))}

              {/* Key Information Grid */}
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
                  {school.student_count && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <dt className="text-sm text-gray-500">Student Count</dt>
                      <dd className="mt-1 font-medium text-gray-900">
                        {school.student_count}
                      </dd>
                    </div>
                  )}
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

              {/* Management Team */}
              {school.management_info && school.management_info.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Management Team
                  </h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    {school.management_info.map((member: ManagementMember, idx: number) => (
                      <div key={idx} className="flex items-center gap-4 bg-gray-50 rounded-lg p-4">
                        <div className="w-14 h-14 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden relative">
                          {member.image_url ? (
                            <Image src={member.image_url} alt={member.name} fill className="object-cover" />
                          ) : (
                            <span className="text-primary-600 font-semibold text-lg">{member.name?.charAt(0)}</span>
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{member.name}</div>
                          <div className="text-sm text-gray-500">{member.title}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Student Life */}
              {school.student_life && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">
                    Student Life
                  </h2>
                  <div className="grid md:grid-cols-3 gap-4">
                    {school.student_life.clubs && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Clubs & Societies</div>
                        <div className="font-medium text-gray-900">{school.student_life.clubs}</div>
                      </div>
                    )}
                    {school.student_life.sports && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Sports</div>
                        <div className="font-medium text-gray-900">{school.student_life.sports}</div>
                      </div>
                    )}
                    {school.student_life.leadership && (
                      <div>
                        <div className="text-sm text-gray-500 mb-1">Leadership</div>
                        <div className="font-medium text-gray-900">{school.student_life.leadership}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Facilities */}
              {school.facilities && school.facilities.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <h2 className="text-xl font-semibold text-gray-900 mb-6">
                    Facilities & Amenities
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {school.facilities.map((facility) => (
                      <div key={facility} className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors">
                        <div className="w-3 h-3 bg-primary-500 rounded-full mr-3 flex-shrink-0"></div>
                        <span className="text-gray-900 font-medium">{facility}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Resources - Outbound Links for SEO */}
              {school.content_sources && school.content_sources.length > 0 && (
                <div className="card p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <LinkIcon className="h-5 w-5 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      External Resources
                    </h2>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Learn more about {school.name} from these trusted sources:
                  </p>
                  <ol className="space-y-3">
                    {school.content_sources.map((source: { url: string; title?: string; name?: string; type?: string }, index: number) => {
                      // The crawler stores machine labels such as
                      // 'official_website' and 'web_search'. Rendering those
                      // raw put strings like "(web_search)" on the page.
                      const label = source.type === 'official_website'
                        ? 'Official site'
                        : source.type === 'web_search'
                          ? 'Reference'
                          : null;

                      let host = source.url;
                      try {
                        host = new URL(source.url).hostname.replace(/^www\./, '');
                      } catch {
                        // Leave the raw value when the URL cannot be parsed.
                      }

                      return (
                        <li key={source.url || index} className="flex items-start">
                          <span
                            className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs font-bold flex items-center justify-center mr-3 mt-0.5"
                            aria-hidden="true"
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="nofollow noopener noreferrer"
                              className="text-primary-600 hover:underline font-medium break-words"
                            >
                              {source.title || source.name || host}
                            </a>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                              <GlobeAltIcon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{host}</span>
                              {label && <span>· {label}</span>}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
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

              {/* === "Manage This School" CTA — top of sidebar === */}
              <div className="card p-6 bg-primary-600 text-white">
                <h3 className="font-semibold text-lg mb-2">
                  Are you part of this school?
                </h3>
                <p className="text-primary-100 text-sm mb-4">
                  Principals, proprietors and authorised staff can manage this profile, update details and add photos.
                </p>
                <Link
                  href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/register/`}
                  className="block w-full text-center bg-white text-primary-700 hover:bg-primary-50 font-semibold px-4 py-2.5 rounded-lg transition-colors text-sm"
                >
                  Manage This School Profile
                </Link>
              </div>
              {/* Contact Card */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Contact Information
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start text-sm">
                    <MapPinIcon className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600">
                      {school.address || `${school.area}, ${school.city || ''} ${school.state}`.replace(', ,', ',').trim()}
                    </span>
                  </div>
                  <div className="flex items-center text-sm">
                    <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                    {school.phone ? (
                      <a
                        href={`tel:${school.phone}`}
                        className="text-primary-600 hover:underline"
                      >
                        {school.phone}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not available</span>
                    )}
                  </div>
                  <div className="flex items-center text-sm">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
                    {school.email ? (
                      <a
                        href={`mailto:${school.email}`}
                        className="text-primary-600 hover:underline"
                      >
                        {school.email}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not available</span>
                    )}
                  </div>
                  <div className="flex items-center text-sm">
                    <GlobeAltIcon className="h-5 w-5 text-gray-400 mr-3" />
                    {school.website ? (
                      <a
                        href={school.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline truncate"
                      >
                        {school.website.replace(/^https?:\/\//, '')}
                      </a>
                    ) : (
                      <span className="text-gray-400 italic">Not available</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Social Media Card */}
              {school.social_links && Object.keys(school.social_links).length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">
                    Follow {school.name}
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(school.social_links).map(([platform, url]) => (
                      <a
                        key={platform}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 bg-gray-50 hover:bg-primary-50 text-gray-600 hover:text-primary-600 rounded-lg transition-colors border border-gray-200"
                        title={platform.charAt(0).toUpperCase() + platform.slice(1)}
                      >
                        <span className="flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" />
                          <span className="text-xs font-medium capitalize">{platform}</span>
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}


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

              {/* CTA Card — removed duplicate, replaced above */}

              {/* Quick Facts Card */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Quick Facts</h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Type</dt>
                    <dd className="font-medium text-gray-900 capitalize">{school.type}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Curriculum</dt>
                    <dd className="font-medium text-gray-900">{school.curriculum || 'Nigerian'}</dd>
                  </div>
                  {school.established_year && (
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Established</dt>
                      <dd className="font-medium text-gray-900">{school.established_year}</dd>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Boarding</dt>
                    <dd className="font-medium text-gray-900">
                      {school.boarding && school.day_school ? 'Yes (Day & Boarding)' : school.boarding ? 'Boarding only' : 'Day only'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Gender</dt>
                    <dd className="font-medium text-gray-900 capitalize">
                      {school.gender?.replace(/-/g, ' ') || 'Co-educational'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">State</dt>
                    <dd className="font-medium text-gray-900">{school.state}</dd>
                  </div>
                </dl>
              </div>

              {/* Browse more in state */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-3">Browse More Schools</h3>
                <div className="space-y-2 text-sm">
                  <Link
                    href={`/education/schools/${resolvedParams.state}/${resolvedParams.area}/`}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                    Schools in {school.area}
                  </Link>
                  <Link
                    href={`/education/schools/${resolvedParams.state}/`}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                    Schools in {school.state}
                  </Link>
                  <Link
                    href="/education/schools/"
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800 hover:underline"
                  >
                    <span className="w-1.5 h-1.5 bg-primary-400 rounded-full flex-shrink-0" />
                    All Nigerian Schools
                  </Link>
                </div>
              </div>

              {/* Report an error */}
              <div className="card p-5 border-dashed border-2 border-gray-200 text-center">
                <p className="text-xs text-gray-500 mb-2">Spotted incorrect information?</p>
                <Link
                  href={`/contact?subject=report_error&school=${encodeURIComponent(school.name)}`}
                  className="text-xs text-primary-600 hover:underline font-medium"
                >
                  Report an error →
                </Link>
              </div>
            </div>
          </div>


          {/* Bottom Billboard Ad */}
          <div className="mt-12 flex justify-center">
            <AdBanner slot="school-bottom-billboard" size="billboard" />
            <AdBanner slot="school-bottom-mobile" size="mobile-large" />
          </div>

          {/* Disclaimer */}
          <div className="mt-8 mx-auto max-w-3xl container-padding">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p className="text-sm text-yellow-900">
                <strong>Disclaimer:</strong> While we strive to provide accurate and up-to-date information, some details on this page may contain minor errors or may not reflect the most current status. We recommend visiting the official school website or contacting the school directly to confirm important information.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
