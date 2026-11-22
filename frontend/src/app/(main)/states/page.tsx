import { Metadata } from 'next';
import Link from 'next/link';
import { MapPinIcon } from '@heroicons/react/24/outline';
import { api } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
  title: 'All States - Find Schools Across Nigeria',
  description: 'Browse schools in all 36 Nigerian states and FCT. Find primary, secondary, and international schools in Lagos, Abuja, Kano, Rivers, and more.',
};

// Get schools grouped by state
async function getStateStats() {
  try {
    // Fetch all schools in batches (API limits to 100 per request)
    const response1 = await api.getSchools(1, 100);
    const response2 = await api.getSchools(2, 100);
    const schools = [...(response1.schools || []), ...(response2.schools || [])];
    
    // Group by state and count
    const stateMap = new Map<string, number>();
    schools.forEach((school) => {
      const state = school.state || 'Unknown';
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });

    // Convert to array and sort by count
    return Array.from(stateMap.entries())
      .map(([name, count]) => ({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Error fetching state stats:', error);
    return [];
  }
}

// All Nigerian states for complete list
const allNigerianStates = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe',
  'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara',
  'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau',
  'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

export default async function StatesPage() {
  const stateStats = await getStateStats();
  
  // Merge with all states to show complete list
  const stateStatsMap = new Map(stateStats.map(s => [s.name, s.count]));
  const allStates = allNigerianStates.map(name => ({
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    count: stateStatsMap.get(name) || 0,
  }));

  // Sort: states with schools first (by count), then alphabetically
  allStates.sort((a, b) => {
    if (a.count > 0 && b.count === 0) return -1;
    if (a.count === 0 && b.count > 0) return 1;
    if (a.count !== b.count) return b.count - a.count;
    return a.name.localeCompare(b.name);
  });

  const totalSchools = stateStats.reduce((sum, s) => sum + s.count, 0);
  const statesWithSchools = stateStats.length;

  return (
    <div className="min-h-screen">
      {/* Top Leaderboard Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="states-top-leaderboard" size="large-leaderboard" />
          <AdBanner slot="states-top-mobile" size="mobile-banner" />
        </div>
      </div>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Schools by State
            </h1>
            <p className="text-xl text-primary-100 mb-8">
              Explore {totalSchools}+ schools across {statesWithSchools} Nigerian states
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <span className="bg-white/20 px-4 py-2 rounded-full">
                37 States & FCT
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-full">
                {totalSchools}+ Schools
              </span>
              <span className="bg-white/20 px-4 py-2 rounded-full">
                Updated Daily
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* States Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          {/* Top Rectangle Ads */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <AdBanner slot="states-grid-rect-1" size="rectangle" />
            <AdBanner slot="states-grid-rect-2" size="rectangle" className="hidden md:flex" />
            <AdBanner slot="states-grid-rect-3" size="rectangle" className="hidden lg:flex" />
          </div>
          
          {/* States with schools */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">States with School Listings</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {allStates.filter(s => s.count > 0).map((state) => (
                <Link
                  key={state.slug}
                  href={`/schools/${state.slug}/`}
                  className="group bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-500 hover:shadow-md transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center group-hover:bg-primary-600 transition-colors">
                      <MapPinIcon className="h-5 w-5 text-primary-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {state.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {state.count} {state.count === 1 ? 'school' : 'schools'}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Mid-page Billboard Ad */}
          <div className="flex justify-center my-8">
            <AdBanner slot="states-mid-billboard" size="billboard" />
            <AdBanner slot="states-mid-mobile" size="mobile-large" />
          </div>

          {/* States without schools yet */}
          {allStates.some(s => s.count === 0) && (
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
              <p className="text-gray-600 mb-6">We&apos;re working to add schools from these states.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {allStates.filter(s => s.count === 0).map((state) => (
                  <div
                    key={state.slug}
                    className="bg-gray-50 rounded-lg p-3 text-center text-gray-500"
                  >
                    <span className="text-sm">{state.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Bottom Ads */}
          <div className="flex flex-wrap justify-center gap-4 mt-12">
            <AdBanner slot="states-bottom-rect-1" size="large-rectangle" />
            <AdBanner slot="states-bottom-rect-2" size="large-rectangle" className="hidden md:flex" />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Don&apos;t See Your School?
          </h2>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Help us grow our directory by suggesting a school to be added.
          </p>
          <Link href="/contact/" className="btn-primary">
            Suggest a School
          </Link>
        </div>
      </section>
    </div>
  );
}
