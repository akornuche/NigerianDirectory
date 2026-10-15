import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
    MapPinIcon,
    PhoneIcon,
    GlobeAltIcon,
    HeartIcon,
    SparklesIcon,
    BuildingOffice2Icon,
    StarIcon,
    EnvelopeIcon,
    UserGroupIcon,
    ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';
import { api, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';
import SourceReferences from '@/components/content/SourceReferences';

/**
 * Hospital detail page.
 *
 * Mirrors education/universities/[state]/[city]/[slug]/page.tsx exactly,
 * because the data behind it is produced by the same generic pipeline
 * (niche_crawler.py's NicheCrawler, see crawler/niche_config.py's HOSPITAL
 * config). The four enriched_* fields hold hospital-flavoured content —
 * clinical services instead of faculties, patient experience instead of
 * student life — but the shape is identical, so the page template is too.
 */

async function getHospital(state: string, city: string, slug: string): Promise<School | null> {
    try {
        const hospital = await api.getHospitalByPath(state, city, slug);
        return hospital;
    } catch (error) {
        console.error('Error fetching hospital:', error);
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
}

function generateHospitalSections(hospital: School): ContentSection[] {
    const sections: ContentSection[] = [];

    // Labels match HOSPITAL.section_labels in niche_config.py so the page
    // heading matches what the content was actually gathered to describe.
    if (hospital.enriched_history) {
        sections.push({
            id: 'history',
            title: 'History & Accreditation',
            icon: ClipboardDocumentCheckIcon,
            content: hospital.enriched_history,
        });
    }

    if (hospital.enriched_academics) {
        sections.push({
            id: 'services',
            title: 'Clinical Services & Departments',
            icon: HeartIcon,
            content: hospital.enriched_academics,
        });
    }

    if (hospital.enriched_campus_info) {
        sections.push({
            id: 'facilities',
            title: 'Facilities & Equipment',
            icon: SparklesIcon,
            content: hospital.enriched_campus_info,
        });
    }

    if (hospital.enriched_student_life) {
        sections.push({
            id: 'patients',
            title: 'Patient Experience',
            icon: UserGroupIcon,
            content: hospital.enriched_student_life,
        });
    }

    if (hospital.principal_name) {
        sections.push({
            id: 'administration',
            title: 'Hospital Administration',
            icon: BuildingOffice2Icon,
            content: `Led by ${hospital.principal_title || 'Chief Medical Director'} ${hospital.principal_name}, the hospital continues to deliver patient care and clinical training.`,
        });
    }

    return sections;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const resolvedParams = await params;
    const hospital = await getHospital(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!hospital) return { title: 'Hospital Not Found' };

    const metaDescription = hospital.meta_description ||
        `Learn about ${hospital.name} in ${hospital.city}, ${hospital.state}. Services, specialists, facilities and patient information.`;

    return {
        title: hospital.meta_title || `${hospital.name} - ${hospital.city}, ${hospital.state} | Hospital Profile`,
        description: metaDescription,
    };
}

export default async function HospitalPage({ params }: Props) {
    const resolvedParams = await params;
    const hospital = await getHospital(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!hospital) notFound();

    const sections = generateHospitalSections(hospital);

    return (
        <div className="bg-gray-50 min-h-screen pb-12">
            {/* Premium Hero Header */}
            <section className="relative h-[60vh] min-h-[400px] overflow-hidden bg-red-900">
                <Image
                    src={hospital.hero_image_url || '/placeholder-bridge.jpg'}
                    alt={hospital.name}
                    fill
                    className="object-cover opacity-40 grayscale-[0.3]"
                    priority
                />
                <div className="absolute inset-0 bg-gradient-to-b from-red-900/40 via-red-900/60 to-gray-50" />

                <div className="absolute inset-0 flex flex-col justify-end">
                    <div className="mx-auto max-w-7xl w-full container-padding pb-12">
                        <div className="flex flex-col md:flex-row gap-8 items-end md:items-center">
                            {/* Logo Container */}
                            <div className="w-32 h-32 md:w-40 md:h-40 bg-white rounded-2xl shadow-2xl p-4 flex items-center justify-center relative translate-y-6 z-10 border-4 border-gray-50">
                                <Image
                                    src={hospital.logo_url || '/placeholder-shield.svg'}
                                    alt={`${hospital.name} logo`}
                                    width={120}
                                    height={120}
                                    className="object-contain"
                                />
                            </div>

                            <div className="flex-1 text-white md:pb-6">
                                <div className="flex flex-wrap gap-3 mb-4">
                                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                                        {hospital.institution_category}
                                    </span>
                                    <span className="px-3 py-1 bg-white/20 text-white text-xs font-bold rounded-full uppercase tracking-widest backdrop-blur-sm">
                                        {hospital.type}
                                    </span>
                                    {hospital.verified && (
                                        <span className="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm flex items-center gap-1">
                                            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                            Verified
                                        </span>
                                    )}
                                    {hospital.claimed && (
                                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full uppercase tracking-widest bg-opacity-80 backdrop-blur-sm">
                                            Claimed
                                        </span>
                                    )}
                                </div>
                                <h1 className="text-4xl lg:text-5xl font-display font-black leading-tight drop-shadow-sm">
                                    {hospital.name}
                                </h1>
                                <div className="flex items-center gap-4 mt-4 text-red-100 font-medium">
                                    <span className="flex items-center gap-1.5">
                                        <MapPinIcon className="h-5 w-5" />
                                        {hospital.city}, {hospital.state}
                                    </span>
                                    {hospital.established_year && (
                                        <span className="flex items-center gap-1.5 opacity-80">
                                            <StarIcon className="h-5 w-5 text-yellow-400" />
                                            Founded {hospital.established_year}
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

                        {/* Quick View Stats — built only from fields that actually hold
                            data, same reasoning as the university page: a hospital has
                            no "levels" or "boarding" in the academic sense. */}
                        {(() => {
                            const facts: { label: string; value: string }[] = [
                                { label: 'Category', value: hospital.institution_category },
                                { label: 'Funding', value: hospital.type },
                            ];

                            if (hospital.established_year) {
                                facts.push({ label: 'Established', value: String(hospital.established_year) });
                            }
                            if (hospital.accreditation) {
                                facts.push({ label: 'Accreditation', value: hospital.accreditation });
                            }

                            return (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {facts.map((fact) => (
                                        <div
                                            key={fact.label}
                                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center"
                                        >
                                            <div className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">
                                                {fact.label}
                                            </div>
                                            <div className="text-gray-900 font-bold capitalize truncate">
                                                {fact.value}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* Enriched Dynamic Sections */}
                        {sections.length > 0 ? (
                            sections.map((section) => (
                                <div key={section.id} id={section.id} className="scroll-mt-24">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-600 shadow-sm">
                                            <section.icon className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl lg:text-3xl font-display font-bold text-gray-900">
                                            {section.title}
                                        </h2>
                                    </div>

                                    <div className="bg-white p-8 lg:p-10 rounded-3xl shadow-sm border border-gray-100 prose prose-red max-w-none">
                                        <p className="text-gray-600 leading-loose text-lg whitespace-pre-line">
                                            {section.content}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-red-50 rounded-3xl p-12 text-center border-2 border-dashed border-red-200">
                                <SparklesIcon className="h-12 w-12 text-red-300 mx-auto mb-4" />
                                <h3 className="text-xl font-bold text-red-900">Research in Progress</h3>
                                <p className="text-red-600 mt-2 max-w-md mx-auto">
                                    Our team is currently gathering live, verified data for {hospital.name}. Check back soon for services, facilities, and more.
                                </p>
                            </div>
                        )}

                        {/* Attribution for the pages this content was compiled from */}
                        <SourceReferences
                            sources={hospital.content_sources}
                            enrichedAt={hospital.enriched_at}
                            institutionName={hospital.name}
                        />
                    </div>

                    {/* Right Column: Sidebar */}
                    <div className="space-y-8">
                        {/* Contact & Official Info */}
                        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-red-500/20 transition-colors" />

                            <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                                <span className="w-1.5 h-6 bg-red-500 rounded-full"></span>
                                Official Contact
                            </h3>

                            <div className="space-y-6">
                                {hospital.website && (
                                    <Link
                                        href={hospital.website}
                                        target="_blank"
                                        className="flex items-start gap-4 hover:text-red-400 transition-colors group/link"
                                    >
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover/link:bg-red-500/20">
                                            <GlobeAltIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Official Website</div>
                                            <div className="font-medium truncate max-w-[180px]">{hospital.website.replace('https://', '')}</div>
                                        </div>
                                    </Link>
                                )}

                                {hospital.phone && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <PhoneIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Appointment Line</div>
                                            <div className="font-medium">{hospital.phone}</div>
                                        </div>
                                    </div>
                                )}

                                {hospital.email && (
                                    <div className="flex items-start gap-4">
                                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <EnvelopeIcon className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Email</div>
                                            <div className="font-medium truncate max-w-[180px]">{hospital.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5">
                                <Link
                                    href={`/contact?school=${hospital.slug}`}
                                    className="block w-full py-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-center transition-all duration-300 transform active:scale-95"
                                >
                                    Request Official Info
                                </Link>
                            </div>
                        </div>

                        {/* Breadcrumbs Navigation */}
                        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Directory Path</h3>
                            <div className="space-y-4 text-sm">
                                <Link href="/" className="flex items-center text-gray-500 hover:text-red-600 transition-colors">
                                    Home
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <Link href="/health/hospitals" className="flex items-center text-gray-500 hover:text-red-600 transition-colors">
                                    Health / Hospitals
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <Link href={`/health/hospitals/${hospital.state.toLowerCase()}`} className="flex items-center text-gray-500 hover:text-red-600 transition-colors">
                                    {hospital.state} State
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <div className="font-bold text-red-700 truncate">
                                    {hospital.name}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Ads */}
                        <AdBanner slot="hospital-sidebar-1" size="rectangle" />
                    </div>
                </div>
            </div>

            {/* Bottom Ad */}
            <div className="mx-auto max-w-7xl container-padding mt-24">
                <AdBanner slot="hospital-footer-leaderboard" size="leaderboard" className="mx-auto" />
            </div>
        </div>
    );
}
