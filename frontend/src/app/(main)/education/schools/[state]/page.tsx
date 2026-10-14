import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

// Fetch schools by state from API
async function getSchoolsByState(state: string): Promise<{ name: string; schools: School[] } | null> {
  try {
    // Capitalize the state name for the API call
    const capitalizedState = state.charAt(0).toUpperCase() + state.slice(1).toLowerCase();
    const response = await api.getSchoolsByState(capitalizedState);
    if (!response.schools || response.schools.length === 0) return null;
    
    // Get state name from response or first school
    const stateName = response.state || response.schools[0]?.state || capitalizedState;
    return {
      name: stateName,
      schools: response.schools,
    };
  } catch (error) {
    console.error('Error fetching schools by state:', error);
    return null;
  }
}

interface Props {
  params: Promise<{
    state: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resolvedParams = await params;
  const stateData = await getSchoolsByState(resolvedParams.state);
  const stateName = stateData?.name || resolvedParams.state.replace(/-/g, ' ');

  return {
    title: `Schools in ${stateName} - Find Primary & Secondary Schools`,
    description: `Discover the best schools in ${stateName}, Nigeria. Browse verified listings of private, public, and international schools with reviews and contact information.`,
    openGraph: {
      title: `Schools in ${stateName} | NigerianDirectory`,
      description: `Find top schools in ${stateName}. Compare facilities, fees, and programs.`,
    },
  };
}

export default async function StatePage({ params }: Props) {
  const resolvedParams = await params;
  const stateData = await getSchoolsByState(resolvedParams.state);

  if (!stateData) {
    // Return a page for states without data yet
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Schools in {resolvedParams.state.replace(/-/g, ' ')}
          </h1>
          <p className="text-gray-600 mb-6">
            We&apos;re currently adding schools from this state. Check back soon!
          </p>
          <Link href="/education/schools" className="btn-primary">
            Browse All Schools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Top Leaderboard Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="state-top-leaderboard" size="leaderboard" />
          <AdBanner slot="state-top-mobile" size="mobile-banner" />
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
            <li className="text-gray-900 font-medium">{stateData.name}</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <h1 className="text-3xl lg:text-4xl font-display font-bold">
            Schools in {stateData.name}
          </h1>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl">
            Discover {stateData.schools.length}+ verified schools in {stateData.name}. 
            Find the perfect school for your children with our comprehensive directory.
          </p>
        </div>
      </section>

      {/* Schools Grid */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <div className="flex gap-8">
            {/* Left Skyscraper */}
            <div className="hidden xl:block flex-shrink-0">
              <div className="sticky top-24">
                <AdBanner slot="state-left-skyscraper" size="wide-skyscraper" />
              </div>
            </div>
            
            <div className="flex-1">
              {/* Top Rectangle Ads */}
              <div className="flex flex-wrap justify-center gap-4 mb-8">
                <AdBanner slot="state-grid-rect-1" size="rectangle" />
                <AdBanner slot="state-grid-rect-2" size="rectangle" className="hidden md:flex" />
              </div>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {stateData.schools.slice(0, 6).map((school) => (
                  <Link
                    key={school.slug}
                    href={`/education/schools/${resolvedParams.state}/${school.area.toLowerCase().replace(/ /g, '-')}/${school.slug}/`}
                    className="card-hover group"
                  >
                    <div className="aspect-[16/9] relative bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
                      <Image
                        src={school.hero_image_url || school.logo_url || '/placeholder-school.svg'}
                        alt={school.name}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      {school.logo_url && school.hero_image_url && (
                        <div className="absolute bottom-2 right-2 w-10 h-10 bg-white rounded-lg shadow-md overflow-hidden">
                          <Image
                            src={school.logo_url}
                            alt={`${school.name} logo`}
                            fill
                            sizes="40px"
                            className="object-contain p-1"
                          />
                        </div>
                      )}
                    </div>
                    <div className="p-5">
                      <span className="badge-primary capitalize">{school.type}</span>
                      <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {school.name}
                      </h2>
                      <p className="mt-1 text-sm text-gray-500 flex items-center">
                        <MapPinIcon className="h-4 w-4 mr-1" />
                        {school.area}, {stateData.name}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              
              {/* Mid-list Ad Row */}
              {stateData.schools.length > 6 && (
                <>
                  <div className="flex flex-wrap justify-center gap-4 my-8">
                    <AdBanner slot="state-mid-rect-1" size="large-rectangle" />
                    <AdBanner slot="state-mid-rect-2" size="large-rectangle" className="hidden lg:flex" />
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stateData.schools.slice(6).map((school) => (
                      <Link
                        key={school.slug}
                        href={`/education/schools/${resolvedParams.state}/${school.area.toLowerCase().replace(/ /g, '-')}/${school.slug}/`}
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
                          <h2 className="mt-2 text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                            {school.name}
                          </h2>
                          <p className="mt-1 text-sm text-gray-500 flex items-center">
                            <MapPinIcon className="h-4 w-4 mr-1" />
                            {school.area}, {stateData.name}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            {/* Right Skyscraper */}
            <div className="hidden xl:block flex-shrink-0">
              <div className="sticky top-24">
                <AdBanner slot="state-right-skyscraper" size="wide-skyscraper" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content */}
      <section className="py-12 lg:py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl container-padding">
          {/* Billboard Ad */}
          <div className="flex justify-center mb-8">
            <AdBanner slot="state-seo-billboard" size="billboard" />
            <AdBanner slot="state-seo-mobile" size="mobile-large" />
          </div>
          
          <div className="max-w-3xl mx-auto prose prose-lg">
            <h2>Finding Schools in {stateData.name}</h2>
            <p>
              {stateData.name} is home to some of Nigeria&apos;s finest educational institutions. 
              From prestigious federal unity schools to world-class international academies, 
              parents have numerous options when choosing the right school for their children.
            </p>
            <p>
              Our directory includes detailed profiles of {stateData.schools.length}+ schools 
              in {stateData.name}, complete with information about curriculum, facilities, fees, 
              and contact details. Whether you&apos;re looking for a boarding school, day school, 
              or a school with a specific curriculum, NigerianDirectory makes it easy to 
              compare and find the perfect fit.
            </p>
          </div>
          
          {/* Bottom Rectangle Ads */}
          <div className="flex flex-wrap justify-center gap-4 mt-8">
            <AdBanner slot="state-bottom-rect-1" size="rectangle" />
            <AdBanner slot="state-bottom-rect-2" size="rectangle" className="hidden md:flex" />
            <AdBanner slot="state-bottom-rect-3" size="rectangle" className="hidden lg:flex" />
          </div>
        </div>
      </section>
    </>
  );
}
