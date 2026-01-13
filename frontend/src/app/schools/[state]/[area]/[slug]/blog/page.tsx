import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { 
  AcademicCapIcon, 
  CalendarIcon, 
  UserGroupIcon, 
  MapPinIcon,
  BuildingLibraryIcon,
  SparklesIcon,
  BookOpenIcon,
  TrophyIcon
} from '@heroicons/react/24/outline';
import { getSchoolBySlug, School } from '@/lib/api';

// Fetch school data from API
async function getSchoolBlogData(state: string, area: string, slug: string): Promise<School | null> {
  try {
    const school = await getSchoolBySlug(state, area, slug);
    return school;
  } catch (error) {
    console.error('Error fetching school for blog:', error);
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
  const school = await getSchoolBlogData(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    return {
      title: 'School Not Found',
    };
  }

  const title = `${school.name}, ${school.area}, ${school.city} – Profile, Updates & Highlights`;
  const description = `Explore ${school.name} in ${school.area}, ${school.city}. Learn about its programs, leadership, student life, and achievements.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/blog/`,
    },
  };
}

export default async function SchoolBlogPage({ params }: Props) {
  const resolvedParams = await params;
  const school = await getSchoolBlogData(resolvedParams.state, resolvedParams.area, resolvedParams.slug);

  if (!school) {
    notFound();
  }

  // Generate dynamic blog content sections
  const blogSections = [
    {
      title: 'School Overview',
      icon: AcademicCapIcon,
      content: `${school.name} is a leading ${school.type} school located in the heart of ${school.area}, ${school.city}. ${school.established_year ? `Established in ${school.established_year}, the school has` : 'The school has'} built a strong reputation for academic excellence and holistic development. Offering ${school.curriculum || 'Nigerian'} curriculum for ${school.levels || 'all levels'}, the institution caters to ${school.boarding && school.day_school ? 'both boarding and day' : school.boarding ? 'boarding' : 'day'} students.`,
    },
    {
      title: 'Academic Programs',
      icon: BookOpenIcon,
      content: `At ${school.name}, academic excellence is at the core of everything we do. The school follows the ${school.curriculum || 'Nigerian'} curriculum, offering comprehensive programs for ${school.levels || 'students of all ages'}. With a focus on critical thinking, creativity, and character development, students are prepared for success in higher education and beyond. The school maintains small class sizes to ensure personalized attention and support for every learner.`,
    },
    {
      title: 'Campus & Facilities',
      icon: BuildingLibraryIcon,
      content: school.facilities && school.facilities.length > 0
        ? `The ${school.name} campus features world-class facilities designed to enhance the learning experience. Students have access to ${school.facilities.slice(0, 4).join(', ')}${school.facilities.length > 4 ? `, and more` : ''}. These state-of-the-art amenities support both academic pursuits and extracurricular activities, creating a well-rounded educational environment.`
        : `${school.name} provides modern facilities designed to support comprehensive education. The campus is equipped with essential amenities for academic excellence and personal development.`,
    },
    {
      title: 'Student Life',
      icon: UserGroupIcon,
      content: `Life at ${school.name} extends beyond the classroom. Students participate in a vibrant community with numerous opportunities for personal growth, leadership development, and social engagement. ${school.boarding ? 'The boarding program creates a close-knit community where students develop lifelong friendships and essential life skills.' : 'Day students enjoy a full range of activities and programs that foster community and personal development.'} Various clubs, sports teams, and cultural activities ensure that every student finds their passion.`,
    },
  ];

  // Add achievements section if available
  if (school.achievements && school.achievements.length > 0) {
    blogSections.push({
      title: 'Achievements & Recognition',
      icon: TrophyIcon,
      content: `${school.name} takes pride in its many accomplishments. Recent achievements include: ${school.achievements.join('; ')}. These recognitions reflect the dedication of our students, teachers, and staff to excellence in all areas.`,
    });
  }

  // Add leadership section if available
  if (school.principal_name) {
    blogSections.push({
      title: 'Leadership & Management',
      icon: SparklesIcon,
      content: `Under the visionary leadership of ${school.principal_title || 'Principal'} ${school.principal_name}, ${school.name} continues to grow and innovate. The management team brings together experienced educators and administrators who are committed to maintaining the school's high standards while embracing modern educational approaches. Their dedication ensures that students receive the best possible education in a nurturing environment.`,
    });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nigeriandirectory.com';
  const blogUrl = `${siteUrl}/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/blog/`;
  const schoolUrl = `${siteUrl}/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`;

  // JSON-LD Article schema for blog page
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': blogUrl,
    headline: `${school.name} – Profile, Updates & Highlights`,
    description: `Explore ${school.name} in ${school.area}, ${school.city}. Learn about its programs, leadership, student life, and achievements.`,
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
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/og-image.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': blogUrl,
    },
    about: {
      '@type': 'School',
      name: school.name,
      '@id': schoolUrl,
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
        name: school.state,
        item: `${siteUrl}/schools/${resolvedParams.state}/`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: school.name,
        item: schoolUrl,
      },
      {
        '@type': 'ListItem',
        position: 4,
        name: 'Blog',
        item: blogUrl,
      },
    ],
  };

  return (
    <>
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
                href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`}
                className="text-gray-500 hover:text-gray-700"
              >
                {school.name}
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">Blog</li>
          </ol>
        </div>
      </nav>

      {/* Hero Section with Image */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
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
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* School Logo */}
            <div className="w-20 h-20 lg:w-28 lg:h-28 bg-white rounded-xl flex items-center justify-center shadow-lg overflow-hidden relative flex-shrink-0">
              <Image
                src={school.logo_url || '/placeholder-logo.svg'}
                alt={`${school.name} logo`}
                fill
                className="object-contain p-2"
              />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <span className="badge bg-secondary-400 text-gray-900 capitalize">
                  {school.type} School
                </span>
                <span className="badge bg-white/20 text-white">Blog</span>
              </div>

              <h1 className="text-3xl lg:text-4xl font-display font-bold">
                {school.name}
              </h1>
              <p className="mt-2 text-xl text-primary-100">
                Profile, Updates & Highlights
              </p>

              <div className="mt-4 flex flex-wrap gap-4 text-sm text-primary-100">
                <span className="flex items-center">
                  <MapPinIcon className="h-4 w-4 mr-1" />
                  {school.area}, {school.city}, {school.state}
                </span>
                {school.established_year && (
                  <span className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    Established {school.established_year}
                </span>
              )}
              {school.student_count && (
                <span className="flex items-center">
                  <UserGroupIcon className="h-4 w-4 mr-1" />
                  {school.student_count.toLocaleString()} Students
                </span>
              )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blog Content */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {blogSections.map((section, index) => (
                <article key={index} className="card p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-primary-100 rounded-lg">
                      <section.icon className="h-5 w-5 text-primary-600" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {section.title}
                    </h2>
                  </div>
                  <p className="text-gray-600 leading-relaxed">
                    {section.content}
                  </p>
                </article>
              ))}

              {/* Related Information */}
              <div className="card p-6 lg:p-8 bg-gray-50">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Quick Facts About {school.name}
                </h2>
                <dl className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">School Type</dt>
                    <dd className="font-medium text-gray-900 capitalize">
                      {school.type}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Curriculum</dt>
                    <dd className="font-medium text-gray-900">
                      {school.curriculum || 'Nigerian'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Levels</dt>
                    <dd className="font-medium text-gray-900">
                      {school.levels || 'All Levels'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Admission Type</dt>
                    <dd className="font-medium text-gray-900">
                      {school.boarding && school.day_school
                        ? 'Boarding & Day'
                        : school.boarding
                        ? 'Boarding'
                        : 'Day'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Gender Policy</dt>
                    <dd className="font-medium text-gray-900 capitalize">
                      {school.gender?.replace(/-/g, ' ') || 'Co-educational'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-500">Location</dt>
                    <dd className="font-medium text-gray-900">
                      {school.area}, {school.state}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Back to Profile */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  School Profile
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  View complete school details including contact information,
                  fees, and more.
                </p>
                <Link
                  href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`}
                  className="btn-primary w-full text-center"
                >
                  View Full Profile
                </Link>
              </div>

              {/* Facilities Quick View */}
              {school.facilities && school.facilities.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Facilities</h3>
                  <div className="flex flex-wrap gap-2">
                    {school.facilities.map((facility: string) => (
                      <span key={facility} className="badge-secondary text-xs">
                        {facility}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="card p-6 bg-secondary-50 border-secondary-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Interested in {school.name}?
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Contact the school directly to learn about admissions and
                  enrollment.
                </p>
                <Link
                  href={`/schools/${resolvedParams.state}/${resolvedParams.area}/${school.slug}/`}
                  className="btn-outline w-full text-center text-sm"
                >
                  Get Contact Info
                </Link>
              </div>

              {/* Share */}
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Share This Article
                </h3>
                <div className="flex gap-3">
                  <button className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                    Facebook
                  </button>
                  <button className="flex-1 py-2 px-4 bg-sky-500 text-white rounded-lg text-sm hover:bg-sky-600 transition-colors">
                    Twitter
                  </button>
                  <button className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors">
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
