import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, HeartIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import { toSlugSegment } from '@/lib/slug';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
    title: 'Hospitals in Nigeria - Find Federal, State & Private Hospitals',
    description: 'Discover hospitals across Nigeria. Browse our directory of federal, state, and private hospitals with verified information on services, specialists, and facilities.',
    openGraph: {
      images: ['/og-image.png'],
        title: 'Hospitals in Nigeria | NigerianDirectory',
        description: 'Find hospitals across all 36 states of Nigeria. Compare services, departments, and facilities.',
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

async function getFeaturedHospitals(type?: string): Promise<School[]> {
    try {
        const params: Record<string, string> = {};
        if (type) params.type = type;
        const response = await api.getHospitals(1, 12, params);
        return response.schools || [];
    } catch (error) {
        console.error('Error fetching featured hospitals:', error);
        return [];
    }
}

export default async function HospitalsPage({
    searchParams,
}: {
    searchParams: Promise<{ type?: string }>;
}) {
    const params = await searchParams;
    const featuredHospitals = await getFeaturedHospitals(params.type);

    return (
        <>
            {/* Top Leaderboard Ad */}
            <div className="bg-gray-100 py-2">
                <div className="mx-auto max-w-7xl flex justify-center">
                    <AdBanner slot="hospitals-top-leaderboard" size="leaderboard" />
                    <AdBanner slot="hospitals-top-mobile" size="mobile-banner" />
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
                        <li className="text-gray-900 font-medium">Hospitals</li>
                    </ol>
                </div>
            </nav>

            {/* Hero */}
            <section className="bg-gradient-to-br from-red-600 to-red-800 text-white py-16 lg:py-24">
                <div className="mx-auto max-w-7xl container-padding">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-2 mb-4">
                            <BuildingOffice2Icon className="h-8 w-8" />
                            <span className="badge bg-secondary-400 text-gray-900 font-bold uppercase tracking-wider">Health & Wellness</span>
                        </div>
                        <h1 className="text-4xl lg:text-5xl font-display font-bold leading-tight">
                            Hospitals in Nigeria
                        </h1>
                        <p className="mt-6 text-xl text-red-100 opacity-90 leading-relaxed">
                            Find verified information on federal, state, and private hospitals across Nigeria,
                            including clinical services, specialists, facilities, and patient information.
                        </p>
                    </div>
                </div>
            </section>

            {/* Browse by State */}
            <section className="py-12 lg:py-16">
                <div className="mx-auto max-w-7xl container-padding">
                    <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                        <div className="w-1 h-8 bg-red-600 rounded-full"></div>
                        Browse by State
                    </h2>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {nigerianStates.map((state) => (
                            <Link
                                key={state}
                                href={`/health/hospitals/${state.toLowerCase().replace(/ /g, '-')}/`}
                                className="group p-4 bg-white border border-gray-100 rounded-xl text-center shadow-sm hover:shadow-md hover:border-red-200 hover:bg-red-50/30 transition-all duration-200"
                            >
                                <span className="text-sm font-semibold text-gray-700 group-hover:text-red-600">{state}</span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Featured Hospitals */}
            {featuredHospitals.length > 0 && (
                <section className="py-12 lg:py-16 bg-gradient-to-b from-gray-50 to-white">
                    <div className="mx-auto max-w-7xl container-padding">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 capitalize">
                                {params.type ? `${params.type} Hospitals` : 'Featured Hospitals'}
                            </h2>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                            {featuredHospitals.map((hospital) => (
                                <Link
                                    key={hospital.slug}
                                    href={`/health/hospitals/${toSlugSegment(hospital.state)}/${toSlugSegment(hospital.city)}/${hospital.slug}/`}
                                    className="group bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300"
                                >
                                    <div className="aspect-[4/3] relative bg-gray-100">
                                        <Image
                                            src={hospital.hero_image_url || hospital.logo_url || '/placeholder-university.svg'}
                                            alt={hospital.name}
                                            fill
                                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        <div className="absolute top-4 left-4">
                                            <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-red-700 text-xs font-bold rounded-full shadow-sm capitalize">
                                                {hospital.type}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-lg font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 min-h-[3.5rem]">
                                            {hospital.name}
                                        </h3>
                                        <div className="mt-4 flex items-center text-sm text-gray-500">
                                            <MapPinIcon className="h-4 w-4 mr-2" />
                                            {hospital.city}, {hospital.state}
                                        </div>
                                        {hospital.established_year && (
                                            <div className="mt-2 flex items-center text-xs text-gray-400">
                                                <HeartIcon className="h-4 w-4 mr-2" />
                                                Est. {hospital.established_year}
                                            </div>
                                        )}
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>
            )}
        </>
    );
}
