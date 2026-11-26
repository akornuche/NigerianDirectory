import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
    MapPinIcon,
    PhoneIcon,
    GlobeAltIcon,
    AcademicCapIcon,
    SparklesIcon,
    BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import { getSchoolByPath, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

async function getCollege(state: string, city: string, slug: string): Promise<School | null> {
    try {
        return await getSchoolByPath(state, city, slug);
    } catch (error) {
        console.error('Error fetching college:', error);
        return null;
    }
}

interface Props {
    params: Promise<{
        state: string;
        city: string;
        slug: string;
    }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const school = await getCollege(resolvedParams.state, resolvedParams.city, resolvedParams.slug);
    if (!school) return { title: 'Institution Not Found' };
    return {
        title: `${school.name} - ${school.city}, ${school.state} | Polytechnic & College Profile`,
        description: school.meta_description || `Detail profile of ${school.name} in ${school.city}, ${school.state}.`,
    };
}

export default async function CollegePage({ params }: Props) {
    const resolvedParams = await params;
    const school = await getCollege(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!school) notFound();

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            {/* Emerald themed hero for Colleges/Poly */}
            <section className="relative h-[50vh] min-h-[350px] overflow-hidden bg-emerald-900">
                <Image
                    src={school.hero_image_url || '/placeholder-college-hero.jpg'}
                    alt={school.name}
                    fill
                    className="object-cover opacity-30"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/40 via-emerald-900/60 to-gray-50" />

                <div className="absolute inset-0 flex flex-col justify-end pb-12">
                    <div className="mx-auto max-w-7xl w-full container-padding">
                        <div className="flex flex-col md:flex-row gap-8 items-end">
                            <div className="w-28 h-28 bg-white rounded-2xl shadow-xl p-3 flex items-center justify-center translate-y-6 z-10 border-4 border-white">
                                <Image
                                    src={school.logo_url || '/placeholder-logo.svg'}
                                    alt={`${school.name} logo`}
                                    width={100}
                                    height={100}
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex-1 text-white md:pb-6">
                                <div className="flex gap-2 mb-3">
                                    <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-black rounded-full ">
                                        {school.institution_category}
                                    </span>
                                </div>
                                <h1 className="text-3xl lg:text-4xl font-display font-black leading-tight">
                                    {school.name}
                                </h1>
                                <div className="flex items-center gap-4 mt-3 text-emerald-100 text-sm font-medium">
                                    <span className="flex items-center gap-1.5"><MapPinIcon className="h-4 w-4" /> {school.city}, {school.state}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <div className="shell mt-20">
                <div className="grid lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-12">
                        {/* Dynamic Content Sections */}
                        {school.enriched_history && (
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <BuildingLibraryIcon className="h-6 w-6 text-emerald-600" /> Institution History
                                </h2>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{school.enriched_history}</p>
                            </div>
                        )}

                        {school.enriched_academics && (
                            <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
                                <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                    <AcademicCapIcon className="h-6 w-6 text-emerald-600" /> Programs & Certification
                                </h2>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-line">{school.enriched_academics}</p>
                            </div>
                        )}

                        {/* Placeholder for empty content */}
                        {!school.enriched_history && !school.enriched_academics && (
                            <div className="bg-emerald-50 rounded-3xl p-12 text-center border-2 border-dashed border-emerald-200">
                                <SparklesIcon className="h-12 w-12 text-emerald-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-emerald-900">Content Enrichment in Progress</h3>
                                <p className="text-emerald-600 mt-2">
                                    We are currently gathering detailed information about {school.name}. Please check back soon.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-8">
                        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl">
                            <h3 className="text-lg font-bold mb-6">Contact Details</h3>
                            <div className="space-y-4">
                                {school.website && (
                                    <Link href={school.website} target="_blank" className="flex items-center gap-3 hover:text-emerald-400 transition-colors">
                                        <GlobeAltIcon className="h-5 w-5 opacity-50" />
                                        <span className="truncate">{school.website.replace('https://', '')}</span>
                                    </Link>
                                )}
                                {school.phone && (
                                    <div className="flex items-center gap-3">
                                        <PhoneIcon className="h-5 w-5 opacity-50" />
                                        <span>{school.phone}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <AdBanner slot="college-sidebar-ad" size="rectangle" />
                    </div>
                </div>
            </div>
        </div>
    );
}
