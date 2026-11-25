import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, AcademicCapIcon, BuildingLibraryIcon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import { toSlugSegment } from '@/lib/slug';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
    alternates: { canonical: '/education/universities/' },
    title: 'Universities in Nigeria: Federal, State & Private',
    description: 'Discover the best universities in Nigeria. Browse our comprehensive directory of Federal, State, and Private universities with verified information on programs, fees, and campus life.',
    openGraph: {
      images: ['/og-image.png'],
        title: 'Universities in Nigeria | NigerianDirectory',
        description: 'Find top universities across all 36 states of Nigeria. Compare academic programs, facilities, and rankings.',
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

// Fetch featured universities
async function getFeaturedUniversities(type?: string): Promise<School[]> {
    try {
        const params: Record<string, string> = {};
        if (type) params.type = type;
        const response = await api.getUniversities(1, 12, params);
        return response.schools || [];
    } catch (error) {
        console.error('Error fetching featured universities:', error);
        return [];
    }
}

export default async function UniversitiesPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    const params = await searchParams;
    const featuredUniversities = await getFeaturedUniversities(params.type);

    return (
        <>
            {/* Top Leaderboard Ad */}
            <div className="bg-gray-100 py-2">
                <div className="mx-auto max-w-7xl flex justify-center">
                    <AdBanner slot="universities-top-leaderboard" size="leaderboard" />
                    <AdBanner slot="universities-top-mobile" size="mobile-banner" />
                </div>
            </div>

            {/* Breadcrumb */}
            <nav className="bg-gray-50 border-b">
                <div className="shell py-3">
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
                        <li className="text-gray-900 font-medium">Universities</li>
                    </ol>
                </div>
            </nav>

            {/* Hero */}
            <section className="field py-16 lg:py-24">
                <div className="shell">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-4">
                            <BuildingLibraryIcon className="h-8 w-8" />
                            <span className="badge bg-paper text-ink font-medium">Higher Education</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                            Universities in Nigeria
                        </h1>
                        <p className="mt-6 text-xl text-indigo-100 opacity-90 leading-relaxed">
                            Explore excellence in higher education. From historic federal universities to
                            cutting-edge private institutions, find detailed information on academic
                            rankings, faculties, and student life.
                        </p>
                    </div>
                </div>
            </section>

            {/* Browse by State */}
            <section id="states" className="scroll-mt-24 py-12 lg:py-16">
                <div className="shell">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                        <div className="w-1 h-8 bg-indigo-600 rounded-full"></div>
                        Browse by State
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {nigerianStates.map((state) => (
                            <Link
                                key={state}
                                href={`/education/universities/${state.toLowerCase().replace(/ /g, '-')}/`}
                                className="group p-4 bg-white border border-gray-100 rounded-xl text-center shadow-sm hover:shadow-md hover:border-indigo-200 hover:bg-indigo-50/30 transition-all duration-200"
                            >
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600">{state}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Universities */}
            {featuredUniversities.length > 0 && (
                <section className="py-12 lg:py-16 bg-paper">
                    <div className="shell">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 capitalize">
                                {params.type ? `${params.type} Universities` : 'Top Universities'}
                            </h2>
                            <Link
                                href="#states"
                                className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center transition-transform hover:translate-x-1"
                            >
                                Browse by state <span className="ml-1">→</span>
                            </Link>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {featuredUniversities.map((uni) => (
                                <Link
                                    key={uni.slug}
                                    href={`/education/universities/${toSlugSegment(uni.state)}/${toSlugSegment(uni.city)}/${uni.slug}/`}
                                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="aspect-[4/3] relative bg-gray-100">
                                        <Image
                                            src={uni.hero_image_url || uni.logo_url || '/placeholder-university.svg'}
                                            alt={uni.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-indigo-700 text-xs font-bold rounded-full shadow-sm capitalize">
                                                {uni.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                                            {uni.name}
                                        </h3>
                                        <div className="mt-4 flex items-center text-sm text-gray-500">
                                            <MapPinIcon className="h-4 w-4 mr-2" />
                                            {uni.city}, {uni.state}
                                        </div>
                                        {uni.established_year && (
                                            <div className="mt-2 flex items-center text-xs text-gray-400">
                                                <AcademicCapIcon className="h-4 w-4 mr-2" />
                                                Est. {uni.established_year}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* Higher Ed Types */}
            <section className="py-12 lg:py-16">
                <div className="shell">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-12 text-center">
                        Higher Education in Nigeria
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <Link
                            href="/education/universities?type=federal"
                            className="group p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-indigo-600 group-hover:rotate-6 transition-all duration-300">
                                <BuildingLibraryIcon className="h-8 w-8 text-indigo-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Federal Universities</h3>
                            <p className="text-gray-600 leading-relaxed">
                                National institutions funded by the federal government, offering highly competitive
                                programs across all disciplines.
                            </p>
                        </Link>

                        <Link
                            href="/education/universities?type=state"
                            className="group p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-green-100 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-green-600 group-hover:rotate-6 transition-all duration-300">
                                <BuildingLibraryIcon className="h-8 w-8 text-green-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">State Universities</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Established and funded by state governments to provide affordable, high-quality
                                tertiary education within their regions.
                            </p>
                        </Link>

                        <Link
                            href="/education/universities?type=private"
                            className="group p-8 bg-white border border-gray-100 rounded-3xl shadow-sm hover:shadow-xl hover:border-orange-100 transition-all duration-300 transform hover:-translate-y-1"
                        >
                            <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-orange-600 group-hover:rotate-6 transition-all duration-300">
                                <BuildingLibraryIcon className="h-8 w-8 text-orange-600 group-hover:text-white" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-3">Private Universities</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Modern institutions with world-class facilities, focused on innovation,
                                fast academic calendars, and global standards.
                            </p>
                        </Link>
                    </div>
                </div>
            </section>

            {/* SEO Information */}
            <section className="py-16 lg:py-24 bg-gray-900 text-white">
                <div className="shell">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div className="prose prose-invert lg:prose-xl">
                            <h2 className="text-indigo-400 font-bold text-sm mb-4">Educational Hub</h2>
                            <h3 className="text-3xl lg:text-4xl font-bold text-white mb-8">Navigating Tertiary Education in Nigeria</h3>
                            <p className="text-gray-400">
                                With over 200 recognized universities and hundreds of specialized institutions,
                                Nigeria possesses one of the most vibrant higher education landscapes in Africa.
                                Whether you are a JAMB candidate seeking admission or a professional looking for
                                postgraduate excellence, our directory is designed to simplify your search.
                            </p>
                            <p className="text-gray-400">
                                We provide deep-researched insights into admission requirements, faculty
                                strength, and the unique campus culture of each institution. Our data is
                                sourced from live, verifiable academic records to ensure you make informed
                                choices for your future career.
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center">
                                <div className="text-4xl font-display font-bold text-indigo-400 mb-2">100+</div>
                                <div className="text-gray-400 text-sm font-medium">Federal & State Universities</div>
                            </div>
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center">
                                <div className="text-4xl font-display font-bold text-indigo-400 mb-2">90+</div>
                                <div className="text-gray-400 text-sm font-medium">Private Institutions</div>
                            </div>
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center">
                                <div className="text-4xl font-display font-bold text-indigo-400 mb-2">150+</div>
                                <div className="text-gray-400 text-sm font-medium">Polytechnics & Colleges</div>
                            </div>
                            <div className="p-8 bg-white/5 rounded-3xl border border-white/10 text-center">
                                <div className="text-4xl font-display font-bold text-indigo-400 mb-2">Verified</div>
                                <div className="text-gray-400 text-sm font-medium">Academic Data</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
