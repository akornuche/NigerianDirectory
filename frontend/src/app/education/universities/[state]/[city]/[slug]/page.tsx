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
    BuildingLibraryIcon,
    StarIcon,
    EnvelopeIcon,
    BookOpenIcon,
    UserGroupIcon,
    TrophyIcon
} from '@heroicons/react/24/outline';
import { getSchoolByPath, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';

async function getUniversity(state: string, city: string, slug: string): Promise<School | null> {
    try {
        // We pass city as the 'area' parameter to the existing API call
        const university = await getSchoolByPath(state, city, slug);
        return university;
    } catch (error) {
        console.error('Error fetching university:', error);
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

interface ContentSection {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    content: string;
    isList?: boolean;
    listItems?: string[];
}

function generateUniversitySections(uni: School): ContentSection[] {
    const sections: ContentSection[] = [];

    if (uni.enriched_history) {
        sections.push({
            id: 'history',
            title: 'Historical Background',
            icon: BuildingLibraryIcon,
            content: uni.enriched_history,
        });
    }

    if (uni.enriched_academics) {
        sections.push({
            id: 'academics',
            title: 'Academic Programs & Research',
            icon: AcademicCapIcon,
            content: uni.enriched_academics,
        });
    }

    if (uni.enriched_campus_info) {
        sections.push({
            id: 'campus',
            title: 'Campus Life & Facilities',
            icon: SparklesIcon,
            content: uni.enriched_campus_info,
        });
    }

    if (uni.enriched_student_life) {
        sections.push({
            id: 'communities',
            title: 'Student Communities',
            icon: UserGroupIcon,
            content: uni.enriched_student_life,
        });
    }

    if (uni.enriched_notable_alumni && uni.enriched_notable_alumni.length > 0) {
        sections.push({
            id: 'alumni',
            title: 'Notable Alumni',
            icon: StarIcon,
            content: `${uni.name} has trained leaders and innovators who have made global impacts.`,
            isList: true,
            listItems: uni.enriched_notable_alumni,
        });
    }

    if (uni.achievements && uni.achievements.length > 0) {
        sections.push({
            id: 'rankings',
            title: 'Rankings & Achievements',
            icon: TrophyIcon,
            content: `The institution's commitment to excellence is reflected in its numerous recognitions.`,
            isList: true,
            listItems: uni.achievements,
        });
    }

    if (uni.principal_name) {
        sections.push({
            id: 'administration',
            title: 'University Administration',
            icon: BookOpenIcon,
            content: `Led by ${uni.principal_title || 'Vice-Chancellor'} ${uni.principal_name}, the institution continues to advance its mission of academic excellence.`,
        });
    }

    return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const uni = await getUniversity(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!uni) return { title: 'University Not Found' };

    const metaDescription = uni.meta_description ||
        `Learn about ${uni.name} in ${uni.city}, ${uni.state}. Comprehensive details on academic programs, faculties, campus life, and more.`;

    return {
        title: uni.meta_title || `${uni.name} - ${uni.city}, ${uni.state} | Higher Education Profile`,
        description: metaDescription,
    };
}

export default async function UniversityPage({ params }: Props) {
    const resolvedParams = await params;
    const uni = await getUniversity(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!uni) notFound();

    const sections = generateUniversitySections(uni);

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            {/* Premium Hero Header */}
            <section className="relative h-[60vh] min-h-[400px] overflow-hidden bg-indigo-900">
                <Image
                    src={uni.hero_image_url || '/placeholder-bridge.jpg'}
                    alt={uni.name}
                    fill
                    className="object-cover opacity-40 grayscale-[0.3]"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/40 via-indigo-900/60 to-gray-50" />

                <div className="absolute inset-0 flex flex-col justify-end">
                    <div className="mx-auto max-w-7xl w-full container-padding pb-12">
                        <div className="flex flex-col md:flex-row gap-8 items-end md:items-center">
                            {/* Logo/Shield Container */}
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-center relative translate-y-6 z-10 border-4 border-gray-50">
                                <Image
                                    src={uni.logo_url || '/placeholder-shield.svg'}
                                    alt={`${uni.name} logo`}
                                    width={120}
                                    height={120}
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex-1 text-white md:pb-6">
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <span className="px-3 py-1 bg-indigo-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                                        {uni.institution_category}
                                    </span>
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full uppercase tracking-widest backdrop-blur-sm">
                                        {uni.type}
                                    </span>
                                    {uni.verified && (
                                        <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm flex items-center gap-1">
                                            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Verified
                                        </span>
                                    )}
                                    {uni.claimed && (
                                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                                            Claimed
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-display font-black leading-tight drop-shadow-sm">
                                    {uni.name}
                                </h1>
                                <div className="flex items-center gap-4 mt-4 text-indigo-100 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <MapPinIcon className="h-5 w-5" />
                                        {uni.city}, {uni.state}
                                    </span>
                                    {uni.established_year && (
                                        <span className="flex items-center gap-1.5 opacity-80">
                                            <StarIcon className="h-5 w-5 text-yellow-400" />
                                            Founded {uni.established_year}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Main Content Layout */}
            <div className="mx-auto max-w-7xl container-padding mt-16 lg:mt-24">
                <div className="grid lg:grid-cols-3 gap-12">

                    {/* Left Column: Detailed Info Sections */}
                    <div className="lg:col-span-2 space-y-16">

                        {/* Quick View Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Category</div>
                                <div className="text-gray-900 font-bold capitalize">{uni.institution_category}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Funding</div>
                                <div className="text-gray-900 font-bold capitalize">{uni.type}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Boarding</div>
                                <div className="text-gray-900 font-bold">{uni.boarding ? 'Available' : 'Day Only'}</div>
                            </div>
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center">
                                <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Levels</div>
                                <div className="text-gray-900 font-bold truncate">{uni.levels || 'UG/PG'}</div>
                            </div>
                        </div>

                        {/* AI Enriched Dynamic Sections */}
                        {sections.length > 0 ? (
                            sections.map((section) => (
                                <div key={section.id} id={section.id} className="scroll-mt-24">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                                            <section.icon className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
                                            {section.title}
                                        </h2>
                                    </div>

                                    <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-gray-100 prose prose-indigo max-w-none">
                                        {section.isList ? (
                                            <div>
                                                <p className="mb-6 text-gray-600 italic leading-relaxed">{section.content}</p>
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {section.listItems?.map((item, idx) => (
                                                        <div key={idx} className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                            <StarIcon className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
                                                            <span className="text-gray-800 font-medium leading-snug">{item}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-gray-600 leading-loose text-lg whitespace-pre-line">
                                                {section.content}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-indigo-50 rounded-3xl p-12 text-center border-2 border-dashed border-indigo-200">
                                <SparklesIcon className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-indigo-900">Research in Progress</h3>
                                <p className="text-indigo-600 mt-2 max-w-md mx-auto">
                                    Our team is currently gathering live, verified data for {uni.name}. Check back soon for historical insights, academic programs, and more.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="space-y-8">
                        {/* Contact & Official Info */}
                        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-indigo-500/20 transition-colors" />

                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-indigo-500 rounded-full"></span>
                                Official Contact
                            </h3>

                            <div className="space-y-6">
                                {uni.website && (
                                    <Link
                                        href={uni.website}
                                        target="_blank"
                                        className="flex items-start gap-4 hover:text-indigo-400 transition-colors group/link"
                                    >
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover/link:bg-indigo-500/20">
                                            <GlobeAltIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Official Website</div>
                                            <div className="font-medium truncate max-w-[180px]">{uni.website.replace('https://', '')}</div>
                                        </div>
                                    </Link>
                                )}

                                {uni.phone && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <PhoneIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Admission Line</div>
                                            <div className="font-medium">{uni.phone}</div>
                                        </div>
                                    </div>
                                )}

                                {uni.email && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <EnvelopeIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email Registry</div>
                                            <div className="font-medium truncate max-w-[180px]">{uni.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5">
                                <Link
                                    href={`/contact?school=${uni.slug}`}
                                    className="block w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-center transition-all duration-300 transform active:scale-95"
                                >
                                    Request Official Info
                                </Link>
                            </div>
                        </div>

                        {/* Breadcrumbs Navigation */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Directory Path</h3>
                            <div className="space-y-4 text-sm">
                                <Link href="/" className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
                                    Home
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <Link href="/education/universities" className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
                                    Education / Universities
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <Link href={`/education/universities/${uni.state.toLowerCase()}`} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
                                    {uni.state} State
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <div className="font-bold text-indigo-700 truncate">
                                    {uni.name}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Ads */}
                        <AdBanner slot="university-sidebar-1" size="rectangle" />
                    </div>
                </div>
            </div>

            {/* Bottom Ad */}
            <div className="mx-auto max-w-7xl container-padding mt-24">
                <AdBanner slot="university-footer-leaderboard" size="leaderboard" className="mx-auto" />
            </div>
        </div>
    );
}
