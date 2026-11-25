import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound, permanentRedirect } from 'next/navigation';
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
import { api, movedToPath, School } from '@/lib/api';
import AdBanner from '@/components/ads/AdBanner';
import SourceReferences from '@/components/content/SourceReferences';
import { assessContentQuality } from '@/lib/content-quality';
import { pageTitle } from '@/lib/seo';
import { recordPath, toSlugSegment } from '@/lib/slug';

// A record that was merged, renamed or moved 301-redirects to its canonical URL.
async function getUniversity(state: string, city: string, slug: string): Promise<School | null> {
    let redirectTo: string | null = null;
    try {
        const uni = await api.getUniversityByPath(state, city, slug);
        // One address per record: a school, or a university reached through
        // the wrong city, moves to its canonical URL instead of being duplicated.
        const canonical = recordPath(uni);
        if (canonical !== `/education/universities/${state}/${city}/${slug}/`) redirectTo = canonical;
        else return uni;
    } catch (error) {
        redirectTo = movedToPath(error);
        if (!redirectTo) {
            console.error('Error fetching university:', error);
            return null;
        }
    }
    // Outside the try: permanentRedirect works by throwing.
    permanentRedirect(redirectTo);
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
            title: 'Academics and Admission',
            icon: AcademicCapIcon,
            content: uni.enriched_academics,
        });
    }

    if (uni.enriched_campus_info) {
        sections.push({
            id: 'campus',
            title: 'Campus and Location',
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
            content: `The ${(uni.principal_title || 'Vice-Chancellor').toLowerCase()} on record is ${uni.principal_name}. Appointments change, so check the university's official website for its current principal officers.`,
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
    const uniUrl = `${siteUrl}/education/universities/${resolvedParams.state}/${resolvedParams.city}/${resolvedParams.slug}/`;
    const contentQuality = assessContentQuality(uni);

    return {
        title: pageTitle(uni.meta_title, `${uni.name}, ${uni.city || uni.state}`),
        description: metaDescription,
        alternates: {
            canonical: uniUrl,
        },
        robots: contentQuality.indexable
            ? { index: true, follow: true }
            : { index: false, follow: true },
        openGraph: {
            title: uni.meta_title || `${uni.name} - Complete University Profile`,
            description: metaDescription,
            type: 'website',
            url: uniUrl,
            images: uni.hero_image_url ? [{ url: uni.hero_image_url }] : undefined,
        },
    };
}

export default async function UniversityPage({ params }: Props) {
    const resolvedParams = await params;
    const uni = await getUniversity(resolvedParams.state, resolvedParams.city, resolvedParams.slug);

    if (!uni) notFound();

    const sections = generateUniversitySections(uni);

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
    const stateSeg = toSlugSegment(uni.state);
    const uniUrl = `${siteUrl}/education/universities/${stateSeg}/${toSlugSegment(uni.city || uni.state)}/${uni.slug}/`;

    // Structured data from the record's sourced fields only; empty
    // properties are omitted rather than published as null.
    const universityJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'CollegeOrUniversity',
        '@id': uniUrl,
        name: uni.name,
        url: uni.website || undefined,
        sameAs: uni.website ? [uni.website] : undefined,
        logo: uni.logo_url || undefined,
        image: uni.hero_image_url || uni.logo_url || undefined,
        foundingDate: uni.established_year ? String(uni.established_year) : undefined,
        address: {
            '@type': 'PostalAddress',
            addressLocality: uni.city || undefined,
            addressRegion: uni.state,
            addressCountry: 'NG',
        },
        employee: uni.principal_name ? {
            '@type': 'Person',
            name: uni.principal_name,
            jobTitle: uni.principal_title || 'Vice-Chancellor',
        } : undefined,
    };
    const breadcrumbJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: `${siteUrl}/` },
            { '@type': 'ListItem', position: 2, name: 'Universities', item: `${siteUrl}/education/universities/` },
            { '@type': 'ListItem', position: 3, name: uni.state, item: `${siteUrl}/education/universities/${stateSeg}/` },
            { '@type': 'ListItem', position: 4, name: uni.name, item: uniUrl },
        ],
    };

    return (
        <div className="bg-paper min-h-screen pb-12">
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(universityJsonLd) }} />
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
            {/* Hero: the name large on paper, beside the photograph printed in
                one colour, or the founding year on a green field when the
                record has no photograph. */}
            <section className="bg-paper">
                <div className="shell grid grid-cols-1 gap-x-8 gap-y-10 pb-16 pt-12 lg:grid-cols-12 lg:pb-20 lg:pt-20">
                    <div className="lg:col-span-7 lg:self-end">
                        <div className="flex items-center gap-5">
                            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center bg-white p-2 lg:h-24 lg:w-24">
                                <Image
                                    src={uni.logo_url || '/placeholder-logo.svg'}
                                    alt={`${uni.name} logo`}
                                    width={88}
                                    height={88}
                                    className="object-contain"
                                />
                            </div>
                            <p className="text-[15px] font-medium text-ink-muted">
                                <span className="capitalize">{uni.type}</span> {uni.institution_category}
                                {uni.verified && <span className="text-primary-700"> · Verified</span>}
                                {uni.claimed && <span> · Claimed</span>}
                            </p>
                        </div>
                        <h1 className="mt-8 text-[2.75rem] leading-[0.95] tracking-poster sm:text-6xl lg:text-[5.25rem]">
                            {uni.name}
                        </h1>
                        <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-lg text-ink-2">
                            <span className="flex items-center gap-1.5">
                                <MapPinIcon className="h-5 w-5 text-primary-700" />
                                {uni.city}, {uni.state}
                            </span>
                            {uni.established_year && (
                                <span className="flex items-center gap-1.5">
                                    <StarIcon className="h-5 w-5 text-primary-700" />
                                    Founded {uni.established_year}
                                </span>
                            )}
                        </p>
                    </div>
                    <div className="lg:col-span-5">
                        {uni.hero_image_url ? (
                            <div className="duotone-well relative aspect-[4/3] overflow-hidden lg:aspect-square">
                                <Image
                                    src={uni.hero_image_url}
                                    alt={uni.name}
                                    fill
                                    className="duotone object-cover"
                                    priority
                                />
                            </div>
                        ) : (
                            <div className="field flex aspect-[4/3] flex-col justify-end p-8 lg:aspect-square">
                                {uni.established_year && (
                                    <>
                                        <p className="font-display text-[6rem] font-bold leading-none tracking-poster tabular lg:text-[8.5rem]">
                                            {uni.established_year}
                                        </p>
                                        <p className="mt-2 font-medium">Year founded</p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Main Content Layout */}
            <div className="shell mt-16 lg:mt-24">
                <div className="grid lg:grid-cols-3 gap-12">

                    {/* Left Column: Detailed Info Sections */}
                    <div className="lg:col-span-2 space-y-16">

                        {/* Quick View Stats */}
                        {/*
                          Boarding was removed here. It describes whether a
                          secondary school offers residential places and is
                          not a meaningful attribute of a university, where
                          hall accommodation is near universal. Tiles are
                          built from fields that actually hold data so the
                          page never asserts a fact we have not collected.
                        */}
                        {(() => {
                            const facts: { label: string; value: string }[] = [
                                { label: 'Category', value: uni.institution_category },
                                { label: 'Funding', value: uni.type },
                                { label: 'Levels', value: uni.levels || 'Undergraduate, Postgraduate' },
                            ];

                            if (typeof uni.student_population === 'number' && uni.student_population > 0) {
                                facts.push({
                                    label: 'Students',
                                    value: uni.student_population.toLocaleString('en-NG'),
                                });
                            } else if (uni.year_chartered) {
                                facts.push({ label: 'Chartered', value: String(uni.year_chartered) });
                            } else if (uni.accreditation) {
                                facts.push({ label: 'Accreditation', value: uni.accreditation });
                            }

                            return (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {facts.map((fact) => (
                                        <div
                                            key={fact.label}
                                            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center"
                                        >
                                            <div className="text-gray-400 text-xs font-bold mb-2">
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

                        {/* Attribution for the pages this content was compiled from */}
                        <SourceReferences
                            sources={uni.content_sources}
                            enrichedAt={uni.enriched_at}
                            institutionName={uni.name}
                        />
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
                                            <div className="text-xs font-bold text-gray-500 mb-1">Official Website</div>
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
                                            <div className="text-xs font-bold text-gray-500 mb-1">Admission Line</div>
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
                                            <div className="text-xs font-bold text-gray-500 mb-1">Email Registry</div>
                                            <div className="font-medium truncate max-w-[180px]">{uni.email}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-white/5">
                                <Link
                                    href={`/contact/?school=${encodeURIComponent(uni.slug)}`}
                                    rel="nofollow"
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
                                <Link href="/education/universities/" className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
                                    Education / Universities
                                </Link>
                                <div className="h-4 border-l-2 border-gray-100 ml-2" />
                                <Link href={`/education/universities/${toSlugSegment(uni.state)}/`} className="flex items-center text-gray-500 hover:text-indigo-600 transition-colors">
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
            <div className="shell mt-24">
                <AdBanner slot="university-footer-leaderboard" size="leaderboard" className="mx-auto" />
            </div>
        </div>
    );
}
