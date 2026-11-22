import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { MapPinIcon, BuildingOffice2Icon } from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import { toSlugSegment } from '@/lib/slug';
import AdBanner from '@/components/ads/AdBanner';

async function getHospitalsByState(state: string): Promise<{ name: string; schools: School[] } | null> {
    try {
        const response = await api.getHospitalsByState(state, 100);
        if (!response.schools || response.schools.length === 0) return null;
        const stateName = response.schools[0]?.state || state.replace(/-/g, ' ');
        return { name: stateName, schools: response.schools };
    } catch (error) {
        console.error('Error fetching hospitals by state:', error);
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
    const stateName = resolvedParams.state.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    return {
        title: `Hospitals in ${stateName} - Federal, State & Private`,
        description: `Browse hospitals in ${stateName}. Find verified information on federal, state, and private hospitals, including services, specialists, and facilities.`,
    };
}

export default async function HospitalStatePage({ params }: Props) {
    const resolvedParams = await params;
    const stateData = await getHospitalsByState(resolvedParams.state);
    const displayStateName = resolvedParams.state.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

    if (!stateData) {
        return (
            <div className="min-h-[70vh] flex items-center justify-center bg-gray-50">
                <div className="text-center p-8 bg-white rounded-3xl shadow-sm border border-gray-100 max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-red-400">
                        <BuildingOffice2Icon className="h-10 w-10" />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Hospitals in {displayStateName}
                    </h1>
                    <p className="text-gray-600 mb-8 leading-relaxed">
                        We are currently indexing hospitals in {displayStateName}.
                        Our research team is verifying details to provide you with accurate data.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link href="/health/hospitals" className="btn-primary py-3 px-8 text-white bg-red-600 rounded-xl font-bold">
                            Browse All Hospitals
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-50 min-h-screen">
            {/* Top Banner Ad */}
            <div className="bg-white border-b py-2 hidden md:block">
                <div className="mx-auto max-w-7xl flex justify-center">
                    <AdBanner slot="hospital-state-leaderboard" size="leaderboard" />
                </div>
            </div>

            {/* Breadcrumb */}
            <nav className="mx-auto max-w-7xl container-padding py-6">
                <ol className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                    <li><Link href="/" className="hover:text-red-600 transition-colors">Home</Link></li>
                    <li>/</li>
                    <li><Link href="/health/hospitals" className="hover:text-red-600 transition-colors">Hospitals</Link></li>
                    <li>/</li>
                    <li className="text-red-600">{stateData.name}</li>
                </ol>
            </nav>

            {/* Hero Header */}
            <header className="bg-white border-y border-gray-100 py-12 lg:py-16 mb-12">
                <div className="mx-auto max-w-7xl container-padding">
                    <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
                        <div className="max-w-2xl">
                            <span className="inline-block px-3 py-1 bg-red-50 text-red-600 text-xs font-black rounded-full uppercase tracking-widest mb-4">
                                Regional Hub
                            </span>
                            <h1 className="text-4xl lg:text-5xl font-display font-black text-gray-900 leading-tight">
                                Hospitals in <span className="text-red-600">{stateData.name} State</span>
                            </h1>
                            <p className="mt-6 text-lg text-gray-500 leading-relaxed">
                                Explore the {stateData.schools.length} hospitals we have indexed in {stateData.name}.
                                From federal teaching hospitals to private specialist clinics.
                            </p>
                        </div>

                        <div className="hidden lg:block">
                            <AdBanner slot="hospital-state-hero-rect" size="rectangle" />
                        </div>
                    </div>
                </div>
            </header>

            {/* Grid Content */}
            <main className="mx-auto max-w-7xl container-padding pb-24">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {stateData.schools.map((hospital) => (
                        <Link
                            key={hospital.slug}
                            href={`/health/hospitals/${resolvedParams.state}/${toSlugSegment(hospital.city)}/${hospital.slug}/`}
                            className="group bg-white rounded-3xl overflow-hidden border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 hover:-translate-y-1 flex flex-col h-full"
                        >
                            <div className="aspect-[16/10] relative bg-gray-100">
                                <Image
                                    src={hospital.hero_image_url || hospital.logo_url || '/placeholder-university.svg'}
                                    alt={hospital.name}
                                    fill
                                    className="object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                                <div className="absolute top-4 left-4">
                                    <span className="px-3 py-1 bg-white/90 backdrop-blur text-red-700 text-[10px] font-black rounded-full shadow-sm uppercase tracking-tighter">
                                        {hospital.type}
                                    </span>
                                </div>

                                <div className="absolute bottom-4 left-4 right-4 text-white">
                                    <div className="flex items-center gap-2 text-xs font-medium opacity-90 mb-1">
                                        <MapPinIcon className="h-3 w-3" />
                                        {hospital.city}
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900 group-hover:text-red-600 transition-colors line-clamp-2 min-h-[3.5rem] leading-snug">
                                        {hospital.name}
                                    </h2>
                                </div>

                                <div className="mt-6 pt-6 border-t border-gray-50 flex items-center justify-between">
                                    <div className="flex items-center text-xs text-gray-400 font-bold uppercase tracking-wider">
                                        More Detail <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
                                    </div>
                                    {hospital.established_year && (
                                        <span className="text-[10px] font-bold text-gray-300">
                                            EST. {hospital.established_year}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Bottom Ads */}
                <div className="mt-24 grid md:grid-cols-2 gap-8">
                    <AdBanner slot="hospital-state-bottom-1" size="large-rectangle" className="w-full" />
                    <AdBanner slot="hospital-state-bottom-2" size="large-rectangle" className="w-full" />
                </div>
            </main>
        </div>
    );
}
